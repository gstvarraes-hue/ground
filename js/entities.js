/**
 * entities.js - Player, Enemies, Moving Platforms, Projectiles
 */
var TGH = window.TGH || {};
window.TGH = TGH;

// ── PLAYER ──
TGH.Player = function (x, y) {
    this.x = x;
    this.y = y;
    this.w = 20;
    this.h = 30;
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.alive = true;
    this.facingRight = true;
    this.animTimer = 0;
    this.animFrame = 0;
    this.deathTimer = 0;
    this.drawOffsetX = -6;
    this.drawOffsetY = -2;
    this.speed = 220;
    this.accel = 1200;
    this.drag = 0.82;
    this.windForce = 0;
    this.isAttacking = false;
    this.attackTimer = 0;
    this.dashSpeed = 450;
    this.jumpForce = 450;
    this.isPlayer = true;
    this.powerState = 0; // 0=Small, 1=Super, 2=Fire
    this.invincibleTimer = 0;
};

TGH.Player.prototype.update = function (dt, tileMap) {
    if (!this.alive) {
        this.deathTimer -= dt;
        return;
    }

    if (this.invincibleTimer > 0) {
        this.invincibleTimer -= dt;
    }

    var input = TGH.Input;
    var moving = false;

    if (this.isAttacking) {
        this.attackTimer -= dt;
        this.vx = (this.facingRight ? 1 : -1) * this.dashSpeed;
        if (this.attackTimer <= 0) {
            this.isAttacking = false;
        }
        TGH.Particles.emit(this.x + this.w / 2, this.y + this.h / 2, 1, '#ffffff', 20);
    } else {
        if (input.wasPressed('z') || input.wasPressed('x') || input.wasPressed(' ')) {
            this.isAttacking = true;
            this.attackTimer = 0.25;
            TGH.Particles.emit(this.x + this.w / 2, this.y + this.h / 2, 15, '#ffffff', 100);
        } else {
            // Horizontal movement with inertia
            if (input.isDown('ArrowLeft')) {
                this.vx -= this.accel * dt;
                if (this.vx < -this.speed) this.vx = -this.speed;
                this.facingRight = false;
                moving = true;
            }
            if (input.isDown('ArrowRight')) {
                this.vx += this.accel * dt;
                if (this.vx > this.speed) this.vx = this.speed;
                this.facingRight = true;
                moving = true;
            }
            if (input.wasPressed('ArrowUp')) {
                this.vy = -this.jumpForce;
                this.grounded = false;
                TGH.Particles.emit(this.x + this.w / 2, this.y + this.h, 10, '#ffffff', 50);
                if (TGH.Assets.jumpSound) {
                    TGH.Assets.jumpSound.currentTime = 0;
                    TGH.Assets.jumpSound.play().catch(function(e){});
                }
            }
        }
        
        // Apply drag when not pressing keys
        if (!moving) {
            this.vx *= this.drag;
            if (Math.abs(this.vx) < 5) this.vx = 0;
        }
    }

    // Apply wind
    if (this.windForce !== 0 && !this.isAttacking) {
        this.vx += this.windForce * dt;
    }

    // Conveyor
    var conv = TGH.Physics.getConveyor(this, tileMap);
    if (conv !== 0 && this.grounded) {
        this.vx += conv * 180 * dt;
    }

    // Gravity
    this.vy += TGH.Physics.GRAVITY * dt;
    if (this.vy > TGH.Physics.MAX_FALL) this.vy = TGH.Physics.MAX_FALL;

    // Resolve collisions with tilemap
    TGH.Physics.resolveCollisions(this, tileMap, dt);

    // Check deadly tiles
    if (TGH.Physics.checkDeadlyTiles(this, tileMap)) {
        this.die();
    }

    // Animation
    this.animFrame = 0;
    this.animTimer = 0;

    // Clamp to level bounds
    if (this.x < 0) { this.x = 0; this.vx = 0; }
    if (this.y > tileMap.length * TGH.TILE + 100) {
        this.die();
    }
};

TGH.Player.prototype.die = function () {
    if (!this.alive) return;
    if (this.invincibleTimer > 0) return; // Invincible!

    if (this.powerState > 0) {
        this.powerState = 0;
        this.invincibleTimer = 2.0; // 2 seconds i-frames
        TGH.Particles.emit(this.x + this.w / 2, this.y + this.h / 2, 15, '#ffffff', 100);
        return;
    }

    this.alive = false;
    this.deathTimer = 1.5;
    TGH.Particles.emit(this.x + this.w / 2, this.y + this.h / 2, 20, '#ff4040', 200);
    TGH.Particles.emit(this.x + this.w / 2, this.y + this.h / 2, 10, '#ffaa40', 150);
};

TGH.Player.prototype.render = function (ctx, camX, camY) {
    var sprites = TGH.Assets.sprites;
    var sprite;

    var dx = Math.floor(this.x + this.drawOffsetX - camX);
    var dy = Math.floor(this.y + this.drawOffsetY - camY);

    ctx.save();
    if (this.isAttacking) {
        ctx.globalAlpha = 0.7;
        ctx.filter = 'brightness(200%)';
    }

    if (this.isCar) {
        ctx.fillStyle = '#ff4040';
        ctx.fillRect(dx + 6, dy + 10, 40, 15);
        ctx.fillStyle = '#80d0ff';
        ctx.fillRect(dx + 26, dy + 10, 10, 8);
        ctx.fillStyle = '#303030';
        ctx.fillRect(dx + 10, dy + 25, 8, 8);
        ctx.fillRect(dx + 34, dy + 25, 8, 8);
        
        if (Math.random() < 0.3) {
            TGH.Particles.emit(this.x, this.y + 15, 1, '#ffaa40', 20);
        }
    } else {
        if (!this.alive) {
            sprite = sprites.playerDead;
            var alpha = this.deathTimer / 1.5;
            ctx.globalAlpha = alpha;
        } else {
            sprite = sprites.playerIdle;
        }

        if (this.invincibleTimer > 0) {
            if (Math.floor(this.invincibleTimer * 10) % 2 === 0) {
                ctx.globalAlpha = 0.5;
            }
            if (this.invincibleTimer > 2.0) {
                var hue = Math.floor(this.invincibleTimer * 360 * 3) % 360;
                ctx.filter = 'hue-rotate(' + hue + 'deg) saturate(300%)';
            }
        } else if (this.powerState === 2) {
            ctx.filter = 'hue-rotate(180deg) saturate(150%) brightness(120%)';
        }

        var scaleY = (this.powerState > 0) ? 1.3 : 1.0;
        var drawH = 32 * scaleY;
        var dyAdjust = 32 - drawH;

        if (!this.facingRight) {
            ctx.translate(dx + 32, dy + dyAdjust);
            ctx.scale(-1, 1);
            ctx.drawImage(sprite, 0, 0, 32, 32, 0, 0, 32, drawH);
        } else {
            ctx.drawImage(sprite, 0, 0, 32, 32, dx, dy + dyAdjust, 32, drawH);
        }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
};

// ── POWER UP ──
TGH.PowerUp = function (x, y, type) {
    this.x = x;
    this.y = y;
    this.w = 24;
    this.h = 24;
    this.type = type; // 0=Mushroom, 1=Flower, 2=Star
    this.vx = (this.type === 1) ? 0 : 80;
    this.vy = -150; // Pops out of block
    this.alive = true;
};

TGH.PowerUp.prototype.update = function (dt, tileMap) {
    if (this.type === 1) {
        if (this.vy < 0) {
            this.y += this.vy * dt;
            this.vy += 800 * dt;
        }
        return;
    }

    this.x += this.vx * dt;

    var T = TGH.TILE;
    var checkCol = Math.floor((this.x + (this.vx > 0 ? this.w : 0)) / T);
    var checkRow = Math.floor((this.y + this.h / 2) / T);
    if (TGH.Physics.isSolid(tileMap, checkCol, checkRow)) {
        this.vx *= -1;
    }

    this.vy += TGH.Physics.GRAVITY * dt;
    if (this.vy > TGH.Physics.MAX_FALL) this.vy = TGH.Physics.MAX_FALL;

    this.y += this.vy * dt;
    var bottom = Math.floor((this.y + this.h) / T);
    var col = Math.floor((this.x + this.w / 2) / T);
    if (TGH.Physics.isSolid(tileMap, col, bottom)) {
        this.y = bottom * T - this.h;
        if (this.type === 2) {
            this.vy = -300; // Star bounces
        } else {
            this.vy = 0;
        }
    }
};

TGH.PowerUp.prototype.render = function (ctx, camX, camY) {
    var sprite = TGH.Assets.sprites.mushroom;
    if (this.type === 1) sprite = TGH.Assets.sprites.fireFlower;
    if (this.type === 2) sprite = TGH.Assets.sprites.star;
    ctx.drawImage(sprite, Math.floor(this.x - 4 - camX), Math.floor(this.y - 8 - camY));
};

// ── PATROLLER ENEMY ──
TGH.Patroller = function (x, y, range, speed) {
    this.x = x;
    this.y = y;
    this.w = 28;
    this.h = 28;
    this.startX = x;
    this.range = range * TGH.TILE;
    this.speed = speed || 80;
    this.dir = 1;
    this.animTimer = 0;
    this.animFrame = 0;
    this.alive = true;
    this.vy = 0;
    this.vx = 0;
};

TGH.Patroller.prototype.update = function (dt, tileMap) {
    this.x += this.speed * this.dir * dt;

    // Range limits
    if (this.x > this.startX + this.range) {
        this.dir = -1;
        this.x = this.startX + this.range;
    }
    if (this.x < this.startX) {
        this.dir = 1;
        this.x = this.startX;
    }

    // Horizontal wall collision - reverse on hitting walls
    var T = TGH.TILE;
    var checkCol, checkRow;
    if (this.dir > 0) {
        checkCol = Math.floor((this.x + this.w) / T);
    } else {
        checkCol = Math.floor(this.x / T);
    }
    checkRow = Math.floor((this.y + this.h / 2) / T);
    if (TGH.Physics.isSolid(tileMap, checkCol, checkRow)) {
        this.dir *= -1;
        if (this.dir > 0) {
            this.x = (checkCol + 1) * T;
        } else {
            this.x = checkCol * T - this.w;
        }
    }

    // Gravity
    this.vy += TGH.Physics.GRAVITY * dt;
    if (this.vy > TGH.Physics.MAX_FALL) this.vy = TGH.Physics.MAX_FALL;

    // Y collision
    this.y += this.vy * dt;
    var bottom = Math.floor((this.y + this.h) / T);
    var col = Math.floor((this.x + this.w / 2) / T);
    if (TGH.Physics.isSolid(tileMap, col, bottom)) {
        this.y = bottom * T - this.h;
        this.vy = 0;
    }

    // Animation
    this.animTimer += dt;
    if (this.animTimer > 0.3) {
        this.animTimer = 0;
        this.animFrame = this.animFrame === 0 ? 1 : 0;
    }
};

TGH.Patroller.prototype.render = function (ctx, camX, camY) {
    var sprite = this.animFrame === 0 ? TGH.Assets.sprites.patroller1 : TGH.Assets.sprites.patroller2;
    var dx = Math.floor(this.x - 2 - camX);
    var dy = Math.floor(this.y - 2 - camY);

    ctx.save();
    if (this.dir < 0) {
        ctx.translate(dx + 32, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, 0, 0);
    } else {
        ctx.drawImage(sprite, dx, dy);
    }
    ctx.restore();
};

// ── POLICE ENEMY ──
TGH.Police = function (x, y, speed) {
    this.x = x;
    this.y = y;
    this.w = 28;
    this.h = 28;
    this.speed = speed || 100;
    this.animTimer = 0;
    this.animFrame = 0;
    this.alive = true;
    this.vy = 0;
    this.vx = 0;
    this.dir = 1;
};

TGH.Police.prototype.update = function (dt, tileMap, player) {
    if (!player || !player.alive) {
        this.vx = 0;
    } else {
        // Chase player
        if (player.x > this.x) {
            this.dir = 1;
            this.vx = this.speed;
        } else {
            this.dir = -1;
            this.vx = -this.speed;
        }
    }

    this.x += this.vx * dt;

    // Horizontal wall collision
    var T = TGH.TILE;
    var checkCol, checkRow;
    if (this.dir > 0) {
        checkCol = Math.floor((this.x + this.w) / T);
    } else {
        checkCol = Math.floor(this.x / T);
    }
    checkRow = Math.floor((this.y + this.h / 2) / T);
    if (TGH.Physics.isSolid(tileMap, checkCol, checkRow)) {
        if (this.dir > 0) {
            this.x = checkCol * T - this.w;
        } else {
            this.x = (checkCol + 1) * T;
        }
        // Jump if stuck
        if (this.vy === 0) {
            this.vy = -350;
        }
    }

    // Gravity
    this.vy += TGH.Physics.GRAVITY * dt;
    if (this.vy > TGH.Physics.MAX_FALL) this.vy = TGH.Physics.MAX_FALL;

    // Y collision
    this.y += this.vy * dt;
    var bottom = Math.floor((this.y + this.h) / T);
    var col = Math.floor((this.x + this.w / 2) / T);
    if (TGH.Physics.isSolid(tileMap, col, bottom)) {
        this.y = bottom * T - this.h;
        this.vy = 0;
    }

    // Animation
    this.animTimer += dt;
    if (this.animTimer > 0.15) {
        this.animTimer = 0;
        this.animFrame = this.animFrame === 0 ? 1 : 0;
    }
};

TGH.Police.prototype.render = function (ctx, camX, camY) {
    var sprite = this.animFrame === 0 ? TGH.Assets.sprites.koopa1 : TGH.Assets.sprites.koopa2;
    var dx = Math.floor(this.x - 2 - camX);
    var dy = Math.floor(this.y - 2 - camY);

    ctx.save();
    if (this.dir < 0) {
        ctx.translate(dx + 32, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, 0, 0);
    } else {
        ctx.drawImage(sprite, dx, dy);
    }
    ctx.restore();
};

// ── SENTINEL ENEMY ──
TGH.Sentinel = function (x, y) {
    this.x = x;
    this.y = y;
    this.w = 28;
    this.h = 28;
    this.alive = true;
    this.timer = 0;
    this.facingRight = true;
    this.switchInterval = 1.5 + Math.random() * 2;
};

TGH.Sentinel.prototype.update = function (dt) {
    this.timer += dt;
    if (this.timer > this.switchInterval) {
        this.timer = 0;
        this.facingRight = !this.facingRight;
        this.switchInterval = 1 + Math.random() * 2;
    }
};

TGH.Sentinel.prototype.render = function (ctx, camX, camY) {
    var sprite = TGH.Assets.sprites.sentinel;
    var dx = Math.floor(this.x - 2 - camX);
    var dy = Math.floor(this.y - 2 - camY);

    ctx.save();
    if (!this.facingRight) {
        ctx.translate(dx + 32, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, 0, 0);
    } else {
        ctx.drawImage(sprite, dx, dy);
    }
    ctx.restore();
};

// ── SHOOTER ENEMY ──
TGH.Shooter = function (x, y, dir, interval) {
    this.x = x;
    this.y = y;
    this.w = 32;
    this.h = 32;
    this.dir = dir; // -1 left, 1 right
    this.interval = interval || 2;
    this.timer = 0;
    this.alive = true;
};

TGH.Shooter.prototype.update = function (dt) {
    this.timer += dt;
};

TGH.Shooter.prototype.shouldFire = function () {
    if (this.timer >= this.interval) {
        this.timer = 0;
        return true;
    }
    return false;
};

TGH.Shooter.prototype.render = function (ctx, camX, camY) {
    var sprite = this.dir < 0 ? TGH.Assets.sprites.shooterLeft : TGH.Assets.sprites.shooterRight;
    ctx.drawImage(sprite, Math.floor(this.x - camX), Math.floor(this.y - camY));
};

// ── PROJECTILE ──
TGH.Projectile = function (x, y, dir) {
    this.x = x;
    this.y = y;
    this.w = 12;
    this.h = 12;
    this.vx = dir * 250;
    this.alive = true;
};

TGH.Projectile.prototype.update = function (dt, tileMap) {
    this.x += this.vx * dt;

    // Check wall collision
    var T = TGH.TILE;
    var col = Math.floor((this.x + this.w / 2) / T);
    var row = Math.floor((this.y + this.h / 2) / T);
    if (TGH.Physics.isSolid(tileMap, col, row)) {
        this.alive = false;
    }

    // Out of bounds
    if (this.x < -50 || this.x > tileMap[0].length * T + 50) {
        this.alive = false;
    }
};

TGH.Projectile.prototype.render = function (ctx, camX, camY) {
    ctx.drawImage(TGH.Assets.sprites.projectile,
        Math.floor(this.x - 2 - camX), Math.floor(this.y - 2 - camY));
};

// ── MOVING PLATFORM ──
TGH.MovingPlatform = function (x, y, targetX, targetY, speed) {
    this.x = x;
    this.y = y;
    this.w = TGH.TILE * 3;
    this.h = 12;
    this.startX = x;
    this.startY = y;
    this.targetX = targetX;
    this.targetY = targetY;
    this.speed = speed || 60;
    this.progress = 0;
    this.dir = 1;
    this.prevX = x;
    this.prevY = y;
};

TGH.MovingPlatform.prototype.update = function (dt) {
    this.prevX = this.x;
    this.prevY = this.y;

    this.progress += this.dir * this.speed * dt / 100;
    if (this.progress >= 1) { this.progress = 1; this.dir = -1; }
    if (this.progress <= 0) { this.progress = 0; this.dir = 1; }

    this.x = this.startX + (this.targetX - this.startX) * this.progress;
    this.y = this.startY + (this.targetY - this.startY) * this.progress;
};

TGH.MovingPlatform.prototype.getDeltaX = function () {
    return this.x - this.prevX;
};

TGH.MovingPlatform.prototype.getDeltaY = function () {
    return this.y - this.prevY;
};

TGH.MovingPlatform.prototype.render = function (ctx, camX, camY) {
    var T = TGH.TILE;
    var tile = TGH.Assets.tiles.platform;
    var px = Math.floor(this.x - camX);
    var py = Math.floor(this.y - camY);
    for (var i = 0; i < 3; i++) {
        ctx.drawImage(tile, px + i * T, py);
    }
};

// ── WIND ZONE ──
TGH.WindZone = function (x, y, w, h, force) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.force = force;
    this.windParticles = [];
    this.spawnTimer = 0;
};

TGH.WindZone.prototype.update = function (dt) {
    this.spawnTimer += dt;
    if (this.spawnTimer > 0.1) {
        this.spawnTimer = 0;
        this.windParticles.push({
            x: this.force > 0 ? this.x : this.x + this.w,
            y: this.y + Math.random() * this.h,
            life: 1
        });
    }

    for (var i = this.windParticles.length - 1; i >= 0; i--) {
        var p = this.windParticles[i];
        p.x += this.force * dt * 0.5;
        p.life -= dt;
        if (p.life <= 0) this.windParticles.splice(i, 1);
    }
};

TGH.WindZone.prototype.render = function (ctx, camX, camY) {
    // Draw wind indicator
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = this.force > 0 ? '#8080ff' : '#ff8080';
    ctx.fillRect(this.x - camX, this.y - camY, this.w, this.h);
    ctx.globalAlpha = 1;

    // Draw particles
    var sprite = TGH.Assets.sprites.windParticle;
    for (var i = 0; i < this.windParticles.length; i++) {
        var p = this.windParticles[i];
        ctx.globalAlpha = p.life * 0.6;
        ctx.drawImage(sprite, Math.floor(p.x - camX), Math.floor(p.y - camY));
    }
    ctx.globalAlpha = 1;
};

// ── BOSS ──
TGH.Boss = function (x, y, isJunior) {
    this.isJunior = isJunior || false;
    this.x = x;
    this.y = y;
    this.w = this.isJunior ? 64 : 96;
    this.h = this.isJunior ? 64 : 96;
    this.speed = this.isJunior ? 80 : 40;
    this.alive = true;
    this.animTimer = 0;
    this.offsetY = 0;
    this.hp = this.isJunior ? 10 : 15;
    this.maxHp = this.hp;
    this.shootTimer = 0;
    this.shootInterval = this.isJunior ? 1.5 : 2.5;
    this.colorOverlay = 0;
    this.vy = 0;
    this.maxSpeed = this.isJunior ? 150 : 100;
    this.jumpTimer = 0;
    this.startY = y;
};

TGH.Boss.prototype.takeDamage = function () {
    this.hp--;
    this.colorOverlay = 1.0;
    TGH.Particles.emit(this.x + this.w / 2, this.y + this.h / 2, 30, '#ffffff', 200);
    if (this.hp <= 0) {
        this.alive = false;
        TGH.Particles.emit(this.x + this.w / 2, this.y + this.h / 2, 100, '#ffaa40', 300);
    }
};

TGH.Boss.prototype.update = function (dt, playerX) {
    if (!this.alive) return false;

    if (this.colorOverlay > 0) {
        this.colorOverlay -= dt * 3;
        if (this.colorOverlay < 0) this.colorOverlay = 0;
    }

    // Chase player
    if (playerX > this.x + this.w / 2) {
        this.x += this.speed * dt;
    } else {
        this.x -= this.speed * dt;
    }

    if (this.isJunior && !this.isFlying) {
        this.vy += 980 * dt; // gravity
        this.y += this.vy * dt;
        if (this.y >= this.startY) {
            this.y = this.startY;
            this.vy = 0;
            this.jumpTimer += dt;
            if (this.jumpTimer > 1.5) {
                this.jumpTimer = 0;
                this.vy = -500; // Jump
            }
        }
    } else if (!this.isFlying && this.speed === 0) {
        this.vy += 980 * dt; // gravity
        this.y += this.vy * dt;
    }

    // Bobbing animation
    this.animTimer += dt * (this.isFlying ? 8 : 3);
    this.offsetY = Math.sin(this.animTimer) * (this.isFlying ? 10 : 4);

    if (!this.isFlying && this.speed > 0) {
        // Gradually speed up
        this.speed += dt;
        var maxS = this.maxSpeed || 100;
        if (this.speed > maxS) this.speed = maxS;
    }
    
    // Emit flying particles
    if (this.isFlying) {
        TGH.Particles.emit(this.x, this.y + this.h/2 + this.offsetY, 2, '#ff4040', 50);
    }
    
    // Shoot projectiles
    this.shootTimer += dt;
    if (this.shootTimer > this.shootInterval) {
        this.shootTimer = 0;
        return true; // Should shoot
    }
    return false;
};

TGH.Boss.prototype.render = function (ctx, camX, camY) {
    if (!this.alive) return;
    ctx.save();
    if (this.colorOverlay > 0) {
        ctx.globalAlpha = 0.5 + 0.5 * this.colorOverlay;
        ctx.filter = 'sepia(100%) hue-rotate(300deg) saturate(500%) brightness(150%)'; // Red flash
    } else if (this.isJunior) {
        ctx.filter = 'hue-rotate(50deg) saturate(150%)'; // Junior color
    }
    
    if (this.isJunior) {
        ctx.drawImage(TGH.Assets.sprites.boss,
            0, 0, 128, 128,
            Math.floor(this.x - camX), Math.floor(this.y + this.offsetY - camY), this.w, this.h);
    } else {
        ctx.drawImage(TGH.Assets.sprites.boss,
            Math.floor(this.x - camX),
            Math.floor(this.y + this.offsetY - camY));
    }
    ctx.restore();
    
    // Health bar
    ctx.fillStyle = 'red';
    var hpWidth = (this.hp / this.maxHp) * this.w;
    ctx.fillRect(Math.floor(this.x - camX), Math.floor(this.y - camY - 10), hpWidth, 6);
};

// ── MUSCLE GUARD ──
TGH.MuscleGuard = function (x, y) {
    this.x = x;
    this.y = y;
    this.w = 40;
    this.h = 40;
    this.speed = 30;
    this.animTimer = 0;
    this.animFrame = 0;
    this.alive = true;
    this.vy = 0;
    this.vx = 0;
    this.dir = -1;
};

TGH.MuscleGuard.prototype.update = function (dt, tileMap) {
    this.x += this.speed * this.dir * dt;

    var T = TGH.TILE;
    var checkCol, checkRow;
    if (this.dir > 0) {
        checkCol = Math.floor((this.x + this.w) / T);
    } else {
        checkCol = Math.floor(this.x / T);
    }
    checkRow = Math.floor((this.y + this.h / 2) / T);
    if (TGH.Physics.isSolid(tileMap, checkCol, checkRow)) {
        this.dir *= -1;
        if (this.dir > 0) {
            this.x = (checkCol + 1) * T;
        } else {
            this.x = checkCol * T - this.w;
        }
    }

    this.vy += TGH.Physics.GRAVITY * dt;
    if (this.vy > TGH.Physics.MAX_FALL) this.vy = TGH.Physics.MAX_FALL;

    this.y += this.vy * dt;
    var bottom = Math.floor((this.y + this.h) / T);
    var col = Math.floor((this.x + this.w / 2) / T);
    if (TGH.Physics.isSolid(tileMap, col, bottom)) {
        this.y = bottom * T - this.h;
        this.vy = 0;
    }

    this.animTimer += dt;
    if (this.animTimer > 0.4) {
        this.animTimer = 0;
        this.animFrame = this.animFrame === 0 ? 1 : 0;
    }
};

TGH.MuscleGuard.prototype.render = function (ctx, camX, camY) {
    var sprite = this.animFrame === 0 ? TGH.Assets.sprites.koopa1 : TGH.Assets.sprites.koopa2;
    var dx = Math.floor(this.x - 2 - camX);
    var dy = Math.floor(this.y - 2 - camY);

    ctx.save();
    ctx.filter = 'hue-rotate(320deg) saturate(150%)'; // Make it slightly reddish/dark for muscle Koopa
    if (this.dir < 0) {
        ctx.translate(dx + 44, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, 0, 0, 32, 32, 0, 0, 44, 44);
    } else {
        ctx.drawImage(sprite, 0, 0, 32, 32, dx, dy, 44, 44);
    }
    ctx.restore();
};

// ── LASER TRAP ──
TGH.Laser = function (x, y, h) {
    this.x = x;
    this.y = y;
    this.w = 6;
    this.h = h;
    this.timer = 0;
    this.on = true;
    this.interval = 1.5;
    this.alive = true; // For overlap checks
};

TGH.Laser.prototype.update = function(dt) {
    this.timer += dt;
    if (this.timer > this.interval) {
        this.timer = 0;
        this.on = !this.on;
    }
};

TGH.Laser.prototype.render = function(ctx, camX, camY) {
    if (this.on) {
        ctx.save();
        ctx.fillStyle = '#ff0000';
        ctx.globalAlpha = 0.7 + Math.random() * 0.3; // flicker effect
        ctx.fillRect(Math.floor(this.x - camX), Math.floor(this.y - camY), this.w, this.h);
        
        // Inner white beam
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.9;
        ctx.fillRect(Math.floor(this.x - camX + 2), Math.floor(this.y - camY), this.w - 4, this.h);
        
        ctx.restore();
    }
};

// ── POLICE CAR ──
TGH.PoliceCar = function (x, y, dir) {
    this.x = x;
    this.y = y;
    this.w = 64;
    this.h = 32;
    this.speed = 180;
    this.animTimer = 0;
    this.alive = true;
    this.vy = 0;
    this.vx = 0;
    this.dir = dir || -1;
};

TGH.PoliceCar.prototype.update = function (dt, tileMap) {
    this.x += this.speed * this.dir * dt;

    // Gravity
    this.vy += TGH.Physics.GRAVITY * dt;
    if (this.vy > TGH.Physics.MAX_FALL) this.vy = TGH.Physics.MAX_FALL;

    // Y collision
    this.y += this.vy * dt;
    var T = TGH.TILE;
    var bottom = Math.floor((this.y + this.h) / T);
    var col = Math.floor((this.x + this.w / 2) / T);
    if (TGH.Physics.isSolid(tileMap, col, bottom)) {
        this.y = bottom * T - this.h;
        this.vy = 0;
    }

    this.animTimer += dt;
    if (this.animTimer > 0.1) {
        this.animTimer = 0;
        // spawn siren particles
        if (Math.random() > 0.5) {
            TGH.Particles.emit(this.x + (this.dir > 0 ? 10 : 40), this.y, 1, '#ff0000', 30);
        } else {
            TGH.Particles.emit(this.x + (this.dir > 0 ? 10 : 40), this.y, 1, '#0000ff', 30);
        }
    }
};

TGH.PoliceCar.prototype.render = function (ctx, camX, camY) {
    var sprite = TGH.Assets.sprites.policeCar;
    var dx = Math.floor(this.x - camX);
    var dy = Math.floor(this.y - camY);

    ctx.save();
    if (this.dir < 0) {
        ctx.drawImage(sprite, dx, dy);
    } else {
        ctx.translate(dx + this.w, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, 0, 0);
    }
    ctx.restore();
};
