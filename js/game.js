/**
 * game.js - Game state management, rendering, main loop
 */
var TGH = window.TGH || {};
window.TGH = TGH;

TGH.STATE = { MENU: 0, PLAYING: 1, DEAD: 2, LEVEL_INTRO: 3, VICTORY: 4 };

TGH.Game = function () {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.state = TGH.STATE.MENU;
    this.currentLevel = 0;
    this.lives = 5;
    this.levelData = null;
    this.tileMap = null;
    this.player = null;
    this.enemies = [];
    this.platforms = [];
    this.shooters = [];
    this.projectiles = [];
    this.windZones = [];
    this.lasers = [];
    this.boss = null;
    this.buttons = [];
    this.doorLinks = {};
    this.introTimer = 0;
    this.animTime = 0;
    this.menuSelection = 0;
    this.screenShake = 0;
    this.lastTime = 0;
};

TGH.Game.prototype.init = function () {
    TGH.Assets.init();
    TGH.Input.init();
    TGH.Camera.reset(0, 0);
    this.lastTime = performance.now();
    var self = this;
    function loop(ts) {
        var dt = Math.min((ts - self.lastTime) / 1000, 1 / 20);
        self.lastTime = ts;
        if (TGH.Input.updateGamepad) TGH.Input.updateGamepad();
        self.update(dt);
        self.render();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
};

// ── LEVEL LOADING ──
TGH.Game.prototype.loadLevel = function (index) {
    this.currentLevel = index;
    this.levelData = TGH.Levels.get(index);
    this.tileMap = this.levelData.tiles;
    this.projectiles = [];
    this.enemies = [];
    this.platforms = [];
    this.shooters = [];
    this.windZones = [];
    this.lasers = [];
    this.boss = null;
    this.buttons = [];
    this.doorLinks = {};
    this.powerUps = [];
    TGH.onBlockHit = this.onBlockHit.bind(this);
    TGH.Particles.clear();

    var T = TGH.TILE;
    var sp = this.levelData.playerSpawn;
    this.player = new TGH.Player(sp.x * T + 6, sp.y * T - 30);

    // Enemies
    var en = this.levelData.enemies;
    for (var i = 0; i < en.length; i++) {
        var e = en[i];
        if (e.type === 'patroller') {
            this.enemies.push(new TGH.Patroller(e.x * T, e.y * T - 28, e.range, e.speed));
        } else if (e.type === 'sentinel') {
            this.enemies.push(new TGH.Sentinel(e.x * T + 2, e.y * T - 28));
        } else if (e.type === 'police') {
            this.enemies.push(new TGH.Police(e.x * T, e.y * T - 28, e.speed));
        } else if (e.type === 'muscle') {
            this.enemies.push(new TGH.MuscleGuard(e.x * T, e.y * T - 40));
        } else if (e.type === 'police_car') {
            this.enemies.push(new TGH.PoliceCar(e.x * T, e.y * T - 32, e.dir));
        }
    }

    // Moving platforms
    var pl = this.levelData.platforms;
    for (var i = 0; i < pl.length; i++) {
        var p = pl[i];
        this.platforms.push(new TGH.MovingPlatform(
            p.x * T, p.y * T, p.tx * T, p.ty * T, p.speed
        ));
    }

    // Shooters
    var sh = this.levelData.shooters;
    for (var i = 0; i < sh.length; i++) {
        var s = sh[i];
        this.shooters.push(new TGH.Shooter(s.x * T, s.y * T, s.dir, s.interval));
    }

    // Wind zones
    var wz = this.levelData.windZones;
    for (var i = 0; i < wz.length; i++) {
        var w = wz[i];
        this.windZones.push(new TGH.WindZone(w.x * T, w.y * T, w.w * T, w.h * T, w.force));
    }

    // Lasers
    var lz = this.levelData.lasers || [];
    for (var i = 0; i < lz.length; i++) {
        var l = lz[i];
        this.lasers.push(new TGH.Laser(l.x * T, l.y * T, l.h));
    }

    // Boss
    if (this.levelData.boss) {
        var b = this.levelData.boss;
        if (b.type === 'dragon') {
            this.boss = new TGH.DragonBoss(b.x * T, b.y * T, b.hp);
        } else {
            this.boss = new TGH.Boss(b.x * T, b.y * T, b.isJunior);
            if (b.speed) this.boss.speed = b.speed;
            if (b.maxSpeed) this.boss.maxSpeed = b.maxSpeed;
            if (b.hp) {
                this.boss.hp = b.hp;
                this.boss.maxHp = b.hp;
            }
            if (b.shootInterval) this.boss.shootInterval = b.shootInterval;
            if (b.flying) this.boss.isFlying = true;
        }
    }

    // Car level
    if (this.levelData.isCarLevel) {
        this.player.isCar = true;
        this.player.speed = 500;
        this.player.accel = 3000;
        this.player.w = 40;
        this.player.h = 20;
    }

    // Find buttons and link to doors
    this._linkButtonsAndDoors();

    // Camera
    var lw = this.tileMap[0].length * T;
    var lh = this.tileMap.length * T;
    TGH.Camera.x = Math.max(0, this.player.x - TGH.Camera.width / 2);
    TGH.Camera.y = Math.max(0, this.player.y - TGH.Camera.height / 2);
    if (TGH.Camera.x > lw - TGH.Camera.width) TGH.Camera.x = lw - TGH.Camera.width;
    if (TGH.Camera.y > lh - TGH.Camera.height) TGH.Camera.y = lh - TGH.Camera.height;
};

TGH.Game.prototype._linkButtonsAndDoors = function () {
    // Find all buttons (tile=6) and doors (tile=9), link them in order
    var btns = [];
    var doors = [];
    for (var r = 0; r < this.tileMap.length; r++) {
        for (var c = 0; c < this.tileMap[r].length; c++) {
            if (this.tileMap[r][c] === 6) btns.push({ col: c, row: r, pressed: false });
            if (this.tileMap[r][c] === 9) doors.push({ col: c, row: r });
        }
    }
    this.buttons = btns;
    // Link each button to corresponding door
    for (var i = 0; i < btns.length; i++) {
        if (i < doors.length) {
            btns[i].door = doors[i];
        }
    }
};

TGH.Game.prototype.onBlockHit = function(col, row) {
    if (this.tileMap[row][col] === 10) {
        this.tileMap[row][col] = 11; // Change to empty block
        TGH.Particles.emit(col * TGH.TILE + 16, row * TGH.TILE, 10, '#e8a038', 100);
        
        // Spawn item based on player's power state
        var type = 0; // Mushroom
        if (this.player.powerState >= 1) {
            type = (Math.random() < 0.2) ? 2 : 1; // 20% Star, 80% Fire Flower
        }
        if (this.currentLevel === 13) {
            type = 2; // Always drop star in Phase 14
        }
        this.powerUps.push(new TGH.PowerUp(col * TGH.TILE + 4, row * TGH.TILE, type));
    }
};

// ── UPDATE ──
TGH.Game.prototype.update = function (dt) {
    this.animTime += dt;

    if (this.state === TGH.STATE.MENU) {
        this.updateMenu(dt);
    } else if (this.state === TGH.STATE.LEVEL_INTRO) {
        var ld = TGH.Levels.data[this.currentLevel];
        if (!ld || !ld.dialog) {
            this.introTimer -= dt;
        }
        
        var canSkip = (ld && ld.dialog) ? true : (this.introTimer <= 0);
        
        if (canSkip && (TGH.Input.wasPressed('Enter') || TGH.Input.wasPressed(' ') || (!ld.dialog && this.introTimer <= 0))) {
            this.state = TGH.STATE.PLAYING;
            if (TGH.Assets.victoryBgm) {
                TGH.Assets.victoryBgm.pause();
                TGH.Assets.victoryBgm.currentTime = 0;
            }
            if (this.currentLevel === 6 || this.currentLevel === 7) {
                if (TGH.Assets.castleBgm && TGH.Assets.castleBgm.paused) {
                    TGH.Assets.castleBgm.play().catch(function(e){});
                }
            } else {
                if (TGH.Assets.bgm && TGH.Assets.bgm.paused) {
                    TGH.Assets.bgm.play().catch(function(e){});
                }
            }
        }
    } else if (this.state === TGH.STATE.PLAYING) {
        this.updatePlaying(dt);
    } else if (this.state === TGH.STATE.DEAD) {
        this.updateDead(dt);
    } else if (this.state === TGH.STATE.VICTORY) {
        if (TGH.Input.wasPressed('Enter') || TGH.Input.wasPressed(' ')) {
            this.state = TGH.STATE.MENU;
            this.lives = 5;
            this.currentLevel = 0;
            if (TGH.Assets.victoryBgm) {
                TGH.Assets.victoryBgm.pause();
                TGH.Assets.victoryBgm.currentTime = 0;
            }
        }
    }

    TGH.Particles.update(dt);
    if (this.screenShake > 0) this.screenShake -= dt;
};

TGH.Game.prototype.updateMenu = function (dt) {
    if (TGH.Input.wasPressed('Enter') || TGH.Input.wasPressed(' ')) {
        this.lives = 5;
        this.loadLevel(0);
        this.state = TGH.STATE.LEVEL_INTRO;
        this.introTimer = 3;
        if (TGH.Assets.gameOverBgm) {
            TGH.Assets.gameOverBgm.pause();
            TGH.Assets.gameOverBgm.currentTime = 0;
        }
        if (TGH.Assets.victoryBgm) {
            TGH.Assets.victoryBgm.pause();
            TGH.Assets.victoryBgm.currentTime = 0;
        }
        if (TGH.Assets.castleBgm) {
            TGH.Assets.castleBgm.pause();
            TGH.Assets.castleBgm.currentTime = 0;
        }
        if (TGH.Assets.bgm) {
            if (!TGH.Assets.bgm.paused) TGH.Assets.bgm.pause();
            TGH.Assets.bgm.currentTime = 0;
            TGH.Assets.bgm.play().catch(function(e) { console.log('Audio error:', e); });
        }
    }
};

TGH.Game.prototype.updatePlaying = function (dt) {
    var T = TGH.TILE;

    // Update player
    // Wind
    this.player.windForce = 0;
    for (var i = 0; i < this.windZones.length; i++) {
        var wz = this.windZones[i];
        if (TGH.Physics.overlap(this.player, wz)) {
            this.player.windForce += wz.force;
        }
    }

    this.player.update(dt, this.tileMap);

    // Platform collision
    for (var i = 0; i < this.platforms.length; i++) {
        var plat = this.platforms[i];
        plat.update(dt);
        // Check if player lands on platform
        var onPlat = this.player.y + this.player.h >= plat.y &&
            this.player.y + this.player.h <= plat.y + plat.h + 8 &&
            this.player.x + this.player.w > plat.x &&
            this.player.x < plat.x + plat.w &&
            this.player.vy >= 0;
        if (onPlat) {
            this.player.y = plat.y - this.player.h;
            this.player.vy = 0;
            this.player.grounded = true;
            this.player.x += plat.getDeltaX();
            this.player.y += plat.getDeltaY();
        }
    }

    // Update enemies
    for (var i = 0; i < this.enemies.length; i++) {
        var en = this.enemies[i];
        if (en.update.length > 1) {
            en.update(dt, this.tileMap, this.player);
        } else {
            en.update(dt);
        }
        // Check collision with player
        if (this.player.alive && TGH.Physics.overlap(this.player, en)) {
            var playerBottom = this.player.y + this.player.h;
            var enemyCenterY = en.y + en.h / 2;
            
            if (this.player.invincibleTimer > 2.0) {
                // Star power kills enemies
                en.alive = false;
                TGH.Particles.emit(en.x + en.w / 2, en.y + en.h / 2, 20, '#ffaa40', 150);
                this.enemies.splice(i, 1);
                i--;
            } else if (this.player.vy > 0 && playerBottom < enemyCenterY + 12) {
                // Stomp
                en.alive = false;
                TGH.Particles.emit(en.x + en.w / 2, en.y + en.h / 2, 20, '#ffaa40', 150);
                this.enemies.splice(i, 1);
                i--;
                this.player.vy = -350; // Bounce
            } else if (this.player.isAttacking) {
                en.alive = false;
                TGH.Particles.emit(en.x + en.w / 2, en.y + en.h / 2, 20, '#ffaa40', 150);
                this.enemies.splice(i, 1);
                i--;
            } else {
                this.player.die();
                this.screenShake = 0.3;
            }
        }
    }

    // Update PowerUps
    for (var i = this.powerUps.length - 1; i >= 0; i--) {
        var pu = this.powerUps[i];
        pu.update(dt, this.tileMap);
        if (this.player.alive && TGH.Physics.overlap(this.player, pu)) {
            // Collect power up
            if (pu.type === 0) {
                this.player.powerState = Math.max(this.player.powerState, 1);
                TGH.Particles.emit(this.player.x + this.player.w/2, this.player.y + this.player.h/2, 20, '#ff4040', 150);
            } else if (pu.type === 1) {
                this.player.powerState = 2;
                TGH.Particles.emit(this.player.x + this.player.w/2, this.player.y + this.player.h/2, 20, '#ffaa40', 150);
            } else if (pu.type === 2) {
                this.player.invincibleTimer = 12.0; // 10s star power (plus 2s margin)
                TGH.Particles.emit(this.player.x + this.player.w/2, this.player.y + this.player.h/2, 30, '#f8d830', 200);
            }
            this.powerUps.splice(i, 1);
        }
    }

    // Player shooting (only Fire Mario)
    if ((TGH.Input.wasPressed('c') || TGH.Input.wasPressed('C')) && this.player.powerState === 2) {
        var dir = this.player.facingRight ? 1 : -1;
        var px = this.player.facingRight ? this.player.x + this.player.w : this.player.x - 12;
        var py = this.player.y + this.player.h / 2 - 6;
        var proj = new TGH.Projectile(px, py, dir);
        proj.isPlayerProjectile = true;
        this.projectiles.push(proj);
    }

    // Update shooters and projectiles
    for (var i = 0; i < this.shooters.length; i++) {
        var sh = this.shooters[i];
        sh.update(dt);
        if (sh.shouldFire()) {
            var px = sh.dir > 0 ? sh.x + sh.w : sh.x - 12;
            var py = sh.y + sh.h / 2 - 6;
            this.projectiles.push(new TGH.Projectile(px, py, sh.dir));
        }
    }

    for (var i = this.projectiles.length - 1; i >= 0; i--) {
        var proj = this.projectiles[i];
        proj.update(dt, this.tileMap);
        if (!proj.alive) {
            this.projectiles.splice(i, 1);
            continue;
        }
        
        if (proj.isPlayerProjectile) {
            // Hit enemies
            for (var j = 0; j < this.enemies.length; j++) {
                if (this.enemies[j].alive && TGH.Physics.overlap(this.enemies[j], proj)) {
                    this.enemies[j].alive = false;
                    proj.alive = false;
                    TGH.Particles.emit(this.enemies[j].x + this.enemies[j].w / 2, this.enemies[j].y + this.enemies[j].h / 2, 20, '#ffaa40', 150);
                }
            }
            // Hit boss
            if (this.boss && this.boss.alive && TGH.Physics.overlap(this.boss, proj)) {
                this.boss.takeDamage();
                proj.alive = false;
            }
            if (!proj.alive) this.projectiles.splice(i, 1);
        } else {
            // Enemy projectile hits player
            if (this.player.alive && TGH.Physics.overlap(this.player, proj)) {
                if (this.player.isAttacking) {
                    this.projectiles.splice(i, 1);
                    TGH.Particles.emit(proj.x, proj.y, 10, '#ffffff', 100);
                } else {
                    this.player.die();
                    this.screenShake = 0.3;
                    this.projectiles.splice(i, 1);
                }
            }
        }
    }

    // Update wind zones
    for (var i = 0; i < this.windZones.length; i++) {
        this.windZones[i].update(dt);
    }

    // Update lasers
    for (var i = 0; i < this.lasers.length; i++) {
        var l = this.lasers[i];
        l.update(dt);
        if (l.on && this.player.alive && TGH.Physics.overlap(this.player, l)) {
            this.player.die();
            this.screenShake = 0.3;
        }
    }

    // Update boss
    if (this.boss && this.boss.alive) {
        if (this.boss.isDragon) {
            this.boss.update(dt, this);
        } else {
            var shouldShoot = this.boss.update(dt, this.player.x);
            
            if (shouldShoot) {
                var px = this.boss.x < this.player.x ? this.boss.x + this.boss.w : this.boss.x - 12;
                var dir = this.boss.x < this.player.x ? 1 : -1;
                var py = this.boss.y + this.boss.h / 2 - 6;
                this.projectiles.push(new TGH.Projectile(px, py, dir));
                this.projectiles.push(new TGH.Projectile(px, py - 20, dir)); // shoot 2 at once
                if (this.boss.shootInterval < 2.0) {
                    this.projectiles.push(new TGH.Projectile(px, py + 20, dir));
                }
                if (this.boss.shootInterval < 1.0) {
                    this.projectiles.push(new TGH.Projectile(px, py - 40, dir));
                }
            }
            
            // Check if boss falls into lava (Y out of bounds)
            if (this.boss.y > this.tileMap.length * TGH.TILE) {
                this.boss.alive = false;
            }
        }
        
        if (this.player.alive && TGH.Physics.overlap(this.player, this.boss)) {
            var playerBottom = this.player.y + this.player.h;
            var bossCenterY = this.boss.y + this.boss.h / 2;
            
            if (this.boss.isDragon) {
                if (this.player.invincibleTimer > 2.0) {
                    this.boss.takeDamage();
                    this.player.vx = (this.player.x < this.boss.x ? -1 : 1) * 400;
                    this.player.vy = -300;
                    this.screenShake = 0.4;
                } else {
                    this.player.die();
                    this.screenShake = 0.5;
                }
            } else {
                if (this.player.vy > 0 && playerBottom < bossCenterY + 20) {
                    this.player.vy = -400; // Bounce
                    TGH.Particles.emit(this.boss.x + this.boss.w/2, this.boss.y + this.boss.h/2, 30, '#ff4040', 200);
                    this.screenShake = 0.2;
                } else if (this.player.isAttacking) {
                    this.player.vx = (this.player.x < this.boss.x ? -1 : 1) * 300;
                    this.player.isAttacking = false;
                    TGH.Particles.emit(this.boss.x + this.boss.w/2, this.boss.y + this.boss.h/2, 30, '#ff4040', 200);
                    this.screenShake = 0.2;
                } else {
                    this.player.die();
                    this.screenShake = 0.5;
                }
            }
        }
    }

    // Buttons
    for (var i = 0; i < this.buttons.length; i++) {
        var btn = this.buttons[i];
        if (btn.pressed) continue;
        var bx = btn.col * T;
        var by = btn.row * T;
        var btnRect = { x: bx, y: by, w: T, h: T };
        if (TGH.Physics.overlap(this.player, btnRect)) {
            btn.pressed = true;
            if (btn.door) {
                this.tileMap[btn.door.row][btn.door.col] = 0;
            }
            if (this.levelData.isCarLevel && this.boss) {
                // Trap the flying boss!
                this.boss.isFlying = false;
                this.boss.speed = 0; // stop moving horizontally
                TGH.Particles.emit(this.boss.x + this.boss.w/2, this.boss.y + this.boss.h/2, 50, '#ff4040', 300);
                this.screenShake = 1.0;
            }
            TGH.Particles.emit(bx + T / 2, by + T / 2, 8, '#30ff30', 100);
        }
    }

    // Check exit
    if (this.player.alive && TGH.Physics.checkExit(this.player, this.tileMap)) {
        this.nextLevel();
    }

    // Player death handling
    if (!this.player.alive && this.player.deathTimer <= 0) {
        this.lives--;
        if (this.lives <= 0) {
            this.state = TGH.STATE.DEAD;
            if (TGH.Assets.bgm) TGH.Assets.bgm.pause();
            if (TGH.Assets.castleBgm) TGH.Assets.castleBgm.pause();
            if (TGH.Assets.gameOverBgm) {
                TGH.Assets.gameOverBgm.currentTime = 0;
                TGH.Assets.gameOverBgm.play().catch(function(e){});
            }
        } else {
            this.loadLevel(this.currentLevel);
        }
    }

    // Camera
    var lw = this.tileMap[0].length * T;
    var lh = this.tileMap.length * T;
    TGH.Camera.follow(this.player, lw, lh);
};

TGH.Game.prototype.updateDead = function (dt) {
    if (TGH.Input.wasPressed('Enter') || TGH.Input.wasPressed(' ')) {
        this.state = TGH.STATE.MENU;
        this.lives = 5;
        if (TGH.Assets.gameOverBgm) {
            TGH.Assets.gameOverBgm.pause();
            TGH.Assets.gameOverBgm.currentTime = 0;
        }
    }
};

TGH.Game.prototype.nextLevel = function () {
    TGH.Particles.emit(this.player.x + 10, this.player.y + 15, 30, '#f8d830', 200);
    TGH.Particles.emit(this.player.x + 10, this.player.y + 15, 20, '#f8f080', 150);
    
    if (TGH.Assets.bgm) TGH.Assets.bgm.pause();
    if (TGH.Assets.castleBgm) TGH.Assets.castleBgm.pause();
    if (TGH.Assets.victoryBgm) {
        TGH.Assets.victoryBgm.currentTime = 0;
        TGH.Assets.victoryBgm.play().catch(function(e){});
    }

    if (this.currentLevel >= TGH.Levels.count - 1) {
        this.state = TGH.STATE.VICTORY;
    } else {
        this.loadLevel(this.currentLevel + 1);
        this.state = TGH.STATE.LEVEL_INTRO;
        this.introTimer = 3;
    }
};

// ── RENDER ──
TGH.Game.prototype.render = function () {
    var ctx = this.ctx;
    var W = this.canvas.width;
    var H = this.canvas.height;

    ctx.save();

    // Screen shake
    if (this.screenShake > 0) {
        var sx = (Math.random() - 0.5) * 8;
        var sy = (Math.random() - 0.5) * 8;
        ctx.translate(sx, sy);
    }

    if (this.state === TGH.STATE.MENU) {
        this.renderMenu(ctx, W, H);
    } else if (this.state === TGH.STATE.LEVEL_INTRO) {
        this.renderLevel(ctx, W, H);
        this.renderLevelIntro(ctx, W, H);
    } else if (this.state === TGH.STATE.PLAYING) {
        this.renderLevel(ctx, W, H);
        this.renderHUD(ctx, W, H);
    } else if (this.state === TGH.STATE.DEAD) {
        this.renderLevel(ctx, W, H);
        this.renderGameOver(ctx, W, H);
    } else if (this.state === TGH.STATE.VICTORY) {
        this.renderVictory(ctx, W, H);
    }

    ctx.restore();
};

TGH.Game.prototype.renderMenu = function (ctx, W, H) {
    // Background
    ctx.fillStyle = '#05050f';
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (var i = 0; i < 60; i++) {
        var sx = ((i * 137 + 50) % W);
        var sy = ((i * 89 + 30) % H);
        var bright = 0.3 + Math.sin(this.animTime * 2 + i) * 0.3;
        ctx.globalAlpha = bright;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8d830';
    ctx.font = '28px "Press Start 2P", monospace';
    ctx.fillText('SUPER MARIO', W / 2, H / 2 - 100);
    ctx.fillStyle = '#f08030';
    ctx.fillText('BROS 4', W / 2, H / 2 - 60);

    // Subtitle
    ctx.fillStyle = '#8080a0';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText('O encanador mais famoso do mundo!', W / 2, H / 2 - 20);
    ctx.fillText('agora com mais desafios!', W / 2, H / 2);

    // Prompt
    var blink = Math.sin(this.animTime * 6) > 0;
    if (blink) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillText('PRESSIONE ENTER OU CLIQUE', W / 2, H / 2 + 80);
    }

    // Controls info
    ctx.fillStyle = '#8080a0';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('SETAS PARA MOVER E PULAR (CIMA)', W / 2, H - 70);
    ctx.fillText('Z / X / ESPAÇO: DASH | C: ATIRAR', W / 2, H - 50);
    ctx.fillText('12 FASES DE PURA ESTRATÉGIA', W / 2, H - 30);
};

TGH.Game.prototype.renderLevel = function (ctx, W, H) {
    var T = TGH.TILE;
    var camX = TGH.Camera.x;
    var camY = TGH.Camera.y;
    var tiles = TGH.Assets.tiles;

    // Background
    ctx.fillStyle = this.levelData.bgColor || '#0c0c18';
    ctx.fillRect(0, 0, W, H);


    // Background tiles
    var startCol = Math.floor(camX / T);
    var startRow = Math.floor(camY / T);
    var endCol = startCol + Math.ceil(W / T) + 1;
    var endRow = startRow + Math.ceil(H / T) + 1;

    for (var r = startRow; r <= endRow; r++) {
        for (var c = startCol; c <= endCol; c++) {
            if (r < 0 || r >= this.tileMap.length || c < 0 || c >= this.tileMap[0].length) continue;
            var t = this.tileMap[r][c];
            var dx = Math.floor(c * T - camX);
            var dy = Math.floor(r * T - camY);

            if (t === 0) {
                ctx.drawImage(tiles.bg, dx, dy);
            } else if (t === 1) {
                ctx.drawImage(tiles.solid, dx, dy);
            } else if (t === 2) {
                ctx.drawImage(tiles.spikeUp, dx, dy);
            } else if (t === 3) {
                ctx.drawImage(tiles.spikeDown, dx, dy);
            } else if (t === 4) {
                var cf = Math.floor(this.animTime * 6) % 3;
                ctx.drawImage(tiles.conveyorLeft[cf], dx, dy);
            } else if (t === 5) {
                var cf = Math.floor(this.animTime * 6) % 3;
                ctx.drawImage(tiles.conveyorRight[cf], dx, dy);
            } else if (t === 6) {
                // Button - check if pressed
                var pressed = false;
                for (var bi = 0; bi < this.buttons.length; bi++) {
                    if (this.buttons[bi].col === c && this.buttons[bi].row === r) {
                        pressed = this.buttons[bi].pressed;
                        break;
                    }
                }
                ctx.drawImage(tiles.bg, dx, dy);
                ctx.drawImage(pressed ? tiles.buttonOn : tiles.buttonOff, dx, dy);
            } else if (t === 8) {
                var ef = Math.floor(this.animTime * 4) % 4;
                ctx.drawImage(tiles.exit[ef], dx, dy - (tiles.exit[ef].height - T));
            } else if (t === 9) {
                ctx.drawImage(tiles.doorClosed, dx, dy);
            } else if (t === 10) {
                var qf = Math.floor(this.animTime * 6) % 3;
                ctx.drawImage(tiles.questionBlock[qf], dx, dy);
            } else if (t === 11) {
                ctx.drawImage(tiles.emptyBlock, dx, dy);
            }
        }
    }

    if (this.levelData.isVictoryLevel) {
        var cx = 150 - camX; // Ship base position
        var groundY = 10 * T - camY; // Floor Y

        // Ship Hull
        ctx.fillStyle = '#5c3a21'; // Dark wood
        ctx.beginPath();
        // Back of ship
        ctx.moveTo(cx + 50, groundY);
        ctx.lineTo(cx + 30, groundY - 80);
        ctx.lineTo(cx + 100, groundY - 100);
        ctx.lineTo(cx + 350, groundY - 80);
        // Front of ship (bow)
        ctx.lineTo(cx + 450, groundY - 20);
        ctx.lineTo(cx + 420, groundY);
        ctx.fill();
        
        // Deck / Upper structure
        ctx.fillStyle = '#422511';
        ctx.fillRect(cx + 80, groundY - 130, 120, 30);
        ctx.fillRect(cx + 100, groundY - 160, 60, 30);

        // Broken mast 1
        ctx.fillStyle = '#2b1608';
        ctx.fillRect(cx + 180, groundY - 220, 15, 140);
        ctx.save();
        ctx.translate(cx + 180, groundY - 180);
        ctx.rotate(0.8);
        ctx.fillRect(0, 0, 12, 100);
        ctx.restore();

        // Broken mast 2
        ctx.fillStyle = '#2b1608';
        ctx.fillRect(cx + 300, groundY - 160, 12, 80);
        ctx.save();
        ctx.translate(cx + 300, groundY - 150);
        ctx.rotate(-1.2);
        ctx.fillRect(0, 0, 10, 120);
        ctx.restore();

        // Bowser head figurehead (broken)
        ctx.fillStyle = '#1e5928'; // Green
        ctx.beginPath();
        ctx.arc(cx + 460, groundY - 30, 25, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.fillRect(cx + 465, groundY - 40, 15, 10); // broken eye
        
        // Giant cracks/holes in hull
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(cx + 250, groundY - 40, 30, 0, Math.PI);
        ctx.arc(cx + 120, groundY - 60, 20, 0, Math.PI*2);
        ctx.fill();

        // Animated Fire and Smoke
        var tAnim = this.animTime * 3;
        
        // Smoke
        ctx.save();
        for (var i = 0; i < 20; i++) {
            var sx = cx + 100 + (i * 15) + Math.sin(tAnim + i) * 20;
            var syOffset = (tAnim * 50 + i * 40) % 150;
            var sy = groundY - 50 - syOffset;
            var alpha = Math.max(0, 1 - (syOffset / 150));
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(sx, sy, 20 + (syOffset / 5), 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();

        // Fire
        for (var i = 0; i < 30; i++) {
            var phase = tAnim * 5 + i;
            var fx = cx + 80 + Math.random() * 320;
            if (i < 10) fx = cx + 230 + Math.random() * 40; // hole 1
            else if (i < 20) fx = cx + 110 + Math.random() * 30; // hole 2
            else if (i < 25) fx = cx + 180 + Math.random() * 40; // deck

            var fyBase = groundY - 40 - Math.random() * 40;
            if (fx > cx + 80 && fx < cx + 200 && fyBase > groundY - 80) fyBase = groundY - 130;

            var fy = fyBase + Math.sin(phase) * 15;
            var size = 10 + Math.random() * 15;
            
            ctx.fillStyle = '#cc0000';
            ctx.beginPath();
            ctx.arc(fx, fy, size, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.arc(fx, fy + 2, size * 0.7, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(fx, fy + 4, size * 0.4, 0, Math.PI*2);
            ctx.fill();
        }
        
        // Embers / Sparks
        ctx.fillStyle = '#ffff66';
        for (var i = 0; i < 15; i++) {
            var ex = cx + 100 + (tAnim * 100 + i * 73) % 300;
            var ey = groundY - 20 - ((tAnim * 150 + i * 91) % 200);
            var eSize = Math.random() * 3 + 1;
            ctx.fillRect(ex + Math.sin(tAnim * 10 + i) * 10, ey, eSize, eSize);
        }


        // Toads
        var drawToad = function(tx, ty, bounce) {
            var by = ty - Math.abs(Math.sin(this.animTime * 8 + bounce)) * 10;
            ctx.fillStyle = '#ffffff'; // mushroom head
            ctx.beginPath();
            ctx.arc(tx, by - 15, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff0000'; // red spots
            ctx.beginPath();
            ctx.arc(tx - 6, by - 18, 4, 0, Math.PI * 2);
            ctx.arc(tx + 6, by - 18, 4, 0, Math.PI * 2);
            ctx.arc(tx, by - 22, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fce5cd'; // face
            ctx.fillRect(tx - 8, by - 10, 16, 12);
            ctx.fillStyle = '#0000ff'; // body
            ctx.fillRect(tx - 6, by + 2, 12, 10);
            ctx.fillStyle = '#000000'; // eyes
            ctx.fillRect(tx - 4, by - 6, 2, 4);
            ctx.fillRect(tx + 2, by - 6, 2, 4);
        }.bind(this);

        drawToad(200 - camX, groundY - 12, 0);
        drawToad(280 - camX, groundY - 12, 1);
        drawToad(350 - camX, groundY - 12, 2);

        // Peach
        var px = 240 - camX;
        var py = groundY - 20 - Math.abs(Math.sin(this.animTime * 6)) * 5;
        ctx.fillStyle = '#ff88aa'; // dress
        ctx.beginPath();
        ctx.moveTo(px, py - 20);
        ctx.lineTo(px - 15, py + 20);
        ctx.lineTo(px + 15, py + 20);
        ctx.fill();
        ctx.fillStyle = '#fce5cd'; // face
        ctx.fillRect(px - 8, py - 35, 16, 16);
        ctx.fillStyle = '#ffcc00'; // hair
        ctx.fillRect(px - 10, py - 35, 20, 8);
        ctx.fillRect(px - 12, py - 27, 6, 15);
        ctx.fillRect(px + 6, py - 27, 6, 15);
        // crown
        ctx.fillStyle = '#ffdd00';
        ctx.fillRect(px - 6, py - 42, 12, 7);
        ctx.fillStyle = '#000000'; // eyes
        ctx.fillRect(px - 4, py - 30, 2, 4);
        ctx.fillRect(px + 2, py - 30, 2, 4);
    }

    // Wind zones
    for (var i = 0; i < this.windZones.length; i++) {
        this.windZones[i].render(ctx, camX, camY);
    }

    // Moving platforms
    for (var i = 0; i < this.platforms.length; i++) {
        this.platforms[i].render(ctx, camX, camY);
    }

    // Enemies
    for (var i = 0; i < this.enemies.length; i++) {
        this.enemies[i].render(ctx, camX, camY);
    }

    // Shooters
    for (var i = 0; i < this.shooters.length; i++) {
        this.shooters[i].render(ctx, camX, camY);
    }

    // Lasers
    for (var i = 0; i < this.lasers.length; i++) {
        this.lasers[i].render(ctx, camX, camY);
    }

    // Power Ups
    for (var i = 0; i < this.powerUps.length; i++) {
        this.powerUps[i].render(ctx, camX, camY);
    }

    // Projectiles
    for (var i = 0; i < this.projectiles.length; i++) {
        this.projectiles[i].render(ctx, camX, camY);
    }

    // Boss
    if (this.boss) {
        this.boss.render(ctx, camX, camY);
    }

    // Player
    if (this.player) {
        this.player.render(ctx, camX, camY);
    }

    // Particles
    TGH.Particles.render(ctx, camX, camY);
};

TGH.Game.prototype.renderHUD = function (ctx, W, H) {
    // Semi-transparent bar
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, 36);

    // Level name
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8d830';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText(this.levelData.name, 10, 24);

    // Lives
    ctx.textAlign = 'right';
    var heart = TGH.Assets.sprites.heart;
    for (var i = 0; i < this.lives; i++) {
        ctx.drawImage(heart, W - 30 - i * 22, 10);
    }
};

TGH.Game.prototype.renderLevelIntro = function (ctx, W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8d830';
    ctx.font = '20px "Press Start 2P", monospace';
    ctx.fillText(this.levelData.name, W / 2, H / 2 - 40);

    ctx.fillStyle = '#a0a0c0';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText(this.levelData.subtitle, W / 2, H / 2 + 10);

    if (this.levelData.dialog) {
        var dW = 600;
        var dH = 100;
        var dX = W / 2 - dW / 2;
        var dY = H / 2 + 40;
        
        ctx.fillStyle = 'rgba(20, 20, 40, 0.9)';
        ctx.fillRect(dX, dY, dW, dH);
        ctx.strokeStyle = '#f8d830';
        ctx.lineWidth = 2;
        ctx.strokeRect(dX, dY, dW, dH);
        
        var textOffsetX = 20;
        var sprite = null;
        if (this.levelData.dialog.speaker === 'Peach') sprite = TGH.Assets.sprites.portraitPeach;
        else if (this.levelData.dialog.speaker === 'Bowser') sprite = TGH.Assets.sprites.portraitBowser;
        else if (this.levelData.dialog.speaker === 'Kamek') sprite = TGH.Assets.sprites.portraitKamek;
        else if (this.levelData.dialog.speaker === 'Bowser Jr.') sprite = TGH.Assets.sprites.portraitBowserJr;

        if (sprite) {
            ctx.drawImage(sprite, dX + 18, dY + 18);
            textOffsetX = 100;
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = '#f8d830';
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.fillText(this.levelData.dialog.speaker + ":", dX + textOffsetX, dY + 30);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Press Start 2P", monospace';
        
        var words = this.levelData.dialog.text.split(' ');
        var line = '';
        var lineY = dY + 60;
        for (var i = 0; i < words.length; i++) {
            var testLine = line + words[i] + ' ';
            var metrics = ctx.measureText(testLine);
            if (metrics.width > dW - textOffsetX - 20 && i > 0) {
                ctx.fillText(line, dX + textOffsetX, lineY);
                line = words[i] + ' ';
                lineY += 20;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, dX + textOffsetX, lineY);
    }

    var blink = Math.sin(this.animTime * 6) > 0;
    if (blink) {
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.font = '8px "Press Start 2P", monospace';
        var blinkY = this.levelData.dialog ? H - 40 : H / 2 + 60;
        ctx.fillText('PRESSIONE ENTER OU CLIQUE', W / 2, blinkY);
    }
};

TGH.Game.prototype.renderGameOver = function (ctx, W, H) {
    ctx.fillStyle = 'rgba(80,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff3030';
    ctx.font = '28px "Press Start 2P", monospace';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 30);

    ctx.fillStyle = '#a0a0c0';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText('Você não conseguiu escapar...', W / 2, H / 2 + 20);

    var blink = Math.sin(this.animTime * 6) > 0;
    if (blink) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillText('PRESSIONE ENTER OU CLIQUE', W / 2, H / 2 + 70);
    }
};

TGH.Game.prototype.renderVictory = function (ctx, W, H) {
    ctx.fillStyle = '#05050f';
    ctx.fillRect(0, 0, W, H);

    // Confetti particles
    for (var i = 0; i < 80; i++) {
        var px = ((i * 137 + 50) % W);
        var py = ((i * 89 + this.animTime * 40 * (1 + i % 3)) % (H + 20)) - 10;
        var colors = ['#f8d830', '#e83030', '#30b830', '#3080e8', '#e830e8'];
        ctx.fillStyle = colors[i % 5];
        ctx.globalAlpha = 0.7;
        ctx.fillRect(px, py, 4, 4);
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8d830';
    ctx.font = '24px "Press Start 2P", monospace';
    ctx.fillText('PARABÉNS!', W / 2, H / 2 - 60);

    ctx.fillStyle = '#f08030';
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillText('VOCÊ VENCEU!', W / 2, H / 2 - 20);

    ctx.fillStyle = '#a0a0c0';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText('O Mario completou', W / 2, H / 2 + 30);
    ctx.fillText('todas as fases!', W / 2, H / 2 + 50);

    var blink = Math.sin(this.animTime * 6) > 0;
    if (blink) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillText('PRESSIONE ENTER OU CLIQUE', W / 2, H / 2 + 100);
    }

    TGH.Particles.render(ctx, 0, 0);
};
