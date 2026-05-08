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
};

TGH.Player.prototype.update = function (dt, tileMap) {
    if (!this.alive) {
        this.deathTimer -= dt;
        return;
    }

    var input = TGH.Input;
    var moving = false;

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

    // Apply drag when not pressing keys
    if (!moving) {
        this.vx *= this.drag;
        if (Math.abs(this.vx) < 5) this.vx = 0;
    }

    // Apply wind
    if (this.windForce !== 0) {
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
    if (moving && this.grounded) {
        this.animTimer += dt;
        if (this.animTimer > 0.15) {
            this.animTimer = 0;
            this.animFrame = this.animFrame === 1 ? 2 : 1;
        }
    } else {
        this.animFrame = 0;
        this.animTimer = 0;
    }

    // Clamp to level bounds
    if (this.x < 0) { this.x = 0; this.vx = 0; }
    if (this.y > tileMap.length * TGH.TILE + 100) {
        this.die();
    }
};

TGH.Player.prototype.die = function () {
    if (!this.alive) return;
    this.alive = false;
    this.deathTimer = 1.5;
    TGH.Particles.emit(this.x + this.w / 2, this.y + this.h / 2, 20, '#ff4040', 200);
    TGH.Particles.emit(this.x + this.w / 2, this.y + this.h / 2, 10, '#ffaa40', 150);
};

TGH.Player.prototype.render = function (ctx, camX, camY) {
    var sprites = TGH.Assets.sprites;
    var sprite;

    if (!this.alive) {
        sprite = sprites.playerDead;
        var alpha = this.deathTimer / 1.5;
        ctx.globalAlpha = alpha;
    } else {
        if (this.animFrame === 0) sprite = sprites.playerIdle;
        else if (this.animFrame === 1) sprite = sprites.playerWalk1;
        else sprite = sprites.playerWalk2;
    }

    var dx = Math.floor(this.x + this.drawOffsetX - camX);
    var dy = Math.floor(this.y + this.drawOffsetY - camY);

    ctx.save();
    if (!this.facingRight) {
        ctx.translate(dx + 32, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, 0, 0);
    } else {
        ctx.drawImage(sprite, dx, dy);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
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
TGH.Boss = function (x, y) {
    this.x = x;
    this.y = y;
    this.w = 96;
    this.h = 96;
    this.speed = 70;
    this.alive = true;
    this.animTimer = 0;
    this.offsetY = 0;
};

TGH.Boss.prototype.update = function (dt, playerX) {
    // Chase player
    if (playerX > this.x + this.w / 2) {
        this.x += this.speed * dt;
    } else {
        this.x -= this.speed * dt;
    }

    // Bobbing animation
    this.animTimer += dt * 3;
    this.offsetY = Math.sin(this.animTimer) * 4;

    // Gradually speed up
    this.speed += dt * 2;
    if (this.speed > 180) this.speed = 180;
};

TGH.Boss.prototype.render = function (ctx, camX, camY) {
    ctx.drawImage(TGH.Assets.sprites.boss,
        Math.floor(this.x - camX),
        Math.floor(this.y + this.offsetY - camY));
};
