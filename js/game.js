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
        this.boss = new TGH.Boss(b.x * T, b.y * T);
        if (b.speed) this.boss.speed = b.speed;
        if (b.maxSpeed) this.boss.maxSpeed = b.maxSpeed;
        if (b.hp) {
            this.boss.hp = b.hp;
            this.boss.maxHp = b.hp;
        }
        if (b.shootInterval) this.boss.shootInterval = b.shootInterval;
        if (b.flying) this.boss.isFlying = true;
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

// ── UPDATE ──
TGH.Game.prototype.update = function (dt) {
    this.animTime += dt;

    if (this.state === TGH.STATE.MENU) {
        this.updateMenu(dt);
    } else if (this.state === TGH.STATE.LEVEL_INTRO) {
        this.introTimer -= dt;
        if (this.introTimer <= 0 || TGH.Input.wasPressed('Enter') || TGH.Input.wasPressed(' ')) {
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
            
            if (this.player.vy > 0 && playerBottom < enemyCenterY + 12) {
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

    // Player shooting
    if (TGH.Input.wasPressed('c') || TGH.Input.wasPressed('C')) {
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
        
        if (this.player.alive && TGH.Physics.overlap(this.player, this.boss)) {
            var playerBottom = this.player.y + this.player.h;
            var bossCenterY = this.boss.y + this.boss.h / 2;
            
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
            }
        }
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

    var blink = Math.sin(this.animTime * 6) > 0;
    if (blink) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillText('PRESSIONE ENTER OU CLIQUE', W / 2, H / 2 + 60);
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
