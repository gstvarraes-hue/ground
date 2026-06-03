/**
 * engine.js - Core game engine: Input, Physics, Camera, Collision utilities
 */
var TGH = window.TGH || {};
window.TGH = TGH;

// ── INPUT ──
TGH.Input = {
    keys: {},
    justPressed: {},

    init: function () {
        var self = this;
        window.addEventListener('keydown', function (e) {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape', ' '].indexOf(e.key) !== -1) {
                e.preventDefault();
            }
            if (!self.keys[e.key]) {
                self.justPressed[e.key] = true;
            }
            self.keys[e.key] = true;
        });
        window.addEventListener('keyup', function (e) {
            self.keys[e.key] = false;
        });
        // Click/Touch support for starting/interacting
        window.addEventListener('mousedown', function () {
            self.justPressed['Click'] = true;
        });
        window.addEventListener('touchstart', function () {
            self.justPressed['Click'] = true;
        });

        // Mobile Controls
        var binds = {
            'btn-up': 'ArrowUp',
            'btn-left': 'ArrowLeft',
            'btn-right': 'ArrowRight',
            'btn-dash': 'z',
            'btn-shoot': 'c'
        };
        
        for (var id in binds) {
            var btn = document.getElementById(id);
            if (btn) {
                (function(key, b) {
                    b.addEventListener('touchstart', function(e) {
                        e.preventDefault();
                        if (!self.keys[key]) self.justPressed[key] = true;
                        self.keys[key] = true;
                        self.justPressed['Click'] = true;
                        self.justPressed['Enter'] = true;
                    }, {passive: false});
                    b.addEventListener('touchend', function(e) {
                        e.preventDefault();
                        self.keys[key] = false;
                    }, {passive: false});
                    b.addEventListener('touchcancel', function(e) {
                        e.preventDefault();
                        self.keys[key] = false;
                    }, {passive: false});
                })(binds[id], btn);
            }
        }
    },

    isDown: function (key) {
        return !!this.keys[key];
    },

    wasPressed: function (key) {
        if (this.justPressed[key] || (key === 'Enter' && this.justPressed['Click'])) {
            this.justPressed[key] = false;
            this.justPressed['Click'] = false;
            return true;
        }
        return false;
    },

    clearJustPressed: function () {
        this.justPressed = {};
    }
};

// ── CAMERA ──
TGH.Camera = {
    x: 0,
    y: 0,
    width: 960,
    height: 640,
    smoothing: 0.1,

    follow: function (target, levelWidth, levelHeight) {
        var tx = target.x + target.w / 2 - this.width / 2;
        var ty = target.y + target.h / 2 - this.height / 2;

        this.x += (tx - this.x) * this.smoothing;
        this.y += (ty - this.y) * this.smoothing;

        // Clamp
        if (this.x < 0) this.x = 0;
        if (this.y < 0) this.y = 0;
        if (this.x > levelWidth - this.width) this.x = levelWidth - this.width;
        if (this.y > levelHeight - this.height) this.y = levelHeight - this.height;
    },

    reset: function (x, y) {
        this.x = x;
        this.y = y;
    }
};

// ── PHYSICS / COLLISION ──
TGH.Physics = {
    GRAVITY: 980,
    MAX_FALL: 600,

    // Check if a rectangle overlaps with a solid tile in the map
    isSolid: function (tileMap, col, row) {
        if (row < 0 || row >= tileMap.length || col < 0 || col >= tileMap[0].length) {
            return true; // Out of bounds = solid
        }
        var t = tileMap[row][col];
        return t === 1 || t === 9; // 1=wall, 9=closed door
    },

    // Get tile type at position
    getTile: function (tileMap, col, row) {
        if (row < 0 || row >= tileMap.length || col < 0 || col >= tileMap[0].length) {
            return 1;
        }
        return tileMap[row][col];
    },

    // AABB overlap check
    overlap: function (a, b) {
        return a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y;
    },

    // Resolve player collision with tilemap
    resolveCollisions: function (entity, tileMap, dt) {
        var T = TGH.TILE;

        // Move X
        entity.x += entity.vx * dt;
        // Check horizontal collisions
        var left = Math.floor(entity.x / T);
        var right = Math.floor((entity.x + entity.w - 1) / T);
        var top = Math.floor(entity.y / T);
        var bottom = Math.floor((entity.y + entity.h - 1) / T);

        for (var row = top; row <= bottom; row++) {
            for (var col = left; col <= right; col++) {
                if (this.isSolid(tileMap, col, row)) {
                    if (entity.vx > 0) {
                        entity.x = col * T - entity.w;
                        entity.vx = 0;
                    } else if (entity.vx < 0) {
                        entity.x = (col + 1) * T;
                        entity.vx = 0;
                    }
                }
            }
        }

        // Move Y
        entity.y += entity.vy * dt;
        entity.grounded = false;

        left = Math.floor(entity.x / T);
        right = Math.floor((entity.x + entity.w - 1) / T);
        top = Math.floor(entity.y / T);
        bottom = Math.floor((entity.y + entity.h - 1) / T);

        for (var row = top; row <= bottom; row++) {
            for (var col = left; col <= right; col++) {
                if (this.isSolid(tileMap, col, row)) {
                    if (entity.vy > 0) {
                        entity.y = row * T - entity.h;
                        entity.vy = 0;
                        entity.grounded = true;
                    } else if (entity.vy < 0) {
                        entity.y = (row + 1) * T;
                        entity.vy = 0;
                    }
                }
            }
        }
    },

    // Check if entity is on a deadly tile
    checkDeadlyTiles: function (entity, tileMap) {
        var T = TGH.TILE;
        var left = Math.floor(entity.x / T);
        var right = Math.floor((entity.x + entity.w - 1) / T);
        var top = Math.floor(entity.y / T);
        var bottom = Math.floor((entity.y + entity.h - 1) / T);

        for (var row = top; row <= bottom; row++) {
            for (var col = left; col <= right; col++) {
                var t = this.getTile(tileMap, col, row);
                if (t === 2 || t === 3) return true; // spikes
            }
        }
        return false;
    },

    // Check if entity is on conveyor
    getConveyor: function (entity, tileMap) {
        var T = TGH.TILE;
        var col = Math.floor((entity.x + entity.w / 2) / T);
        var row = Math.floor((entity.y + entity.h + 1) / T);
        var t = this.getTile(tileMap, col, row);
        if (t === 4) return -1; // conveyor left
        if (t === 5) return 1;  // conveyor right
        return 0;
    },

    // Check if entity is on button
    checkButton: function (entity, tileMap) {
        var T = TGH.TILE;
        var col = Math.floor((entity.x + entity.w / 2) / T);
        var row = Math.floor((entity.y + entity.h) / T);
        var t = this.getTile(tileMap, col, row);
        if (t === 6) return { col: col, row: row };
        return null;
    },

    // Check exit (Flagpole)
    checkExit: function (entity, tileMap) {
        var T = TGH.TILE;
        var col = Math.floor((entity.x + entity.w / 2) / T);
        var bottomRow = Math.floor((entity.y + entity.h) / T);
        
        // The flagpole can be up to 6 tiles tall. We check if there's an exit tile (8) directly below us within 6 tiles.
        for (var r = bottomRow; r <= bottomRow + 6; r++) {
            var t = this.getTile(tileMap, col, r);
            if (t === 8) return true;
        }
        return false;
    }
};

// ── PARTICLE SYSTEM ──
TGH.Particles = {
    particles: [],

    emit: function (x, y, count, color, speed) {
        for (var i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * speed,
                vy: (Math.random() - 0.8) * speed,
                life: 0.5 + Math.random() * 0.5,
                maxLife: 0.5 + Math.random() * 0.5,
                size: 2 + Math.random() * 4,
                color: color
            });
        }
    },

    update: function (dt) {
        for (var i = this.particles.length - 1; i >= 0; i--) {
            var p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 300 * dt;
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    },

    render: function (ctx, camX, camY) {
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            var alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(
                Math.floor(p.x - camX),
                Math.floor(p.y - camY),
                p.size, p.size
            );
        }
        ctx.globalAlpha = 1;
    },

    clear: function () {
        this.particles = [];
    }
};
