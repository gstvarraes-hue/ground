/**
 * assets.js - Procedural pixel art sprite generation
 * All sprites are generated on offscreen canvases at load time.
 */
var TGH = window.TGH || {};
window.TGH = TGH;

TGH.TILE = 32;

TGH.PALETTE = {
    // Player
    skin: '#f0b070',
    hair: '#483018',
    shirt: '#2888b8',
    shirtDark: '#1868a0',
    pants: '#2050a0',
    pantsDark: '#183878',
    shoes: '#483018',
    outline: '#181018',
    eyeWhite: '#ffffff',
    // Enemies
    slimeGreen: '#48b848',
    slimeDark: '#208020',
    slimeLight: '#78e078',
    sentinelPurple: '#8838a8',
    sentinelDark: '#602080',
    sentinelLight: '#b060d0',
    shooterOrange: '#e88028',
    shooterDark: '#b05818',
    bossRed: '#c83030',
    bossDark: '#901818',
    bossLight: '#e85050',
    // Tiles
    stoneA: '#505060',
    stoneB: '#606070',
    stoneC: '#404050',
    stoneD: '#707080',
    stoneLine: '#383840',
    // Spikes
    spikeMetal: '#909098',
    spikeTip: '#c0c0c8',
    spikeBase: '#505058',
    // Conveyor
    conveyorA: '#d0a030',
    conveyorB: '#a07820',
    conveyorC: '#e0c050',
    // Door/Button
    doorBrown: '#805830',
    doorDark: '#604020',
    buttonGreen: '#30b830',
    buttonRed: '#b83030',
    buttonBase: '#606068',
    // Projectile
    fireball: '#f08030',
    fireballBright: '#f8d830',
    // Exit
    exitGold: '#f8d830',
    exitGlow: '#f8f080',
    // Background
    bgDark: '#0c0c18',
    bgMid: '#141428',
    bgLight: '#1c1c38',
};

TGH.Assets = {
    sprites: {},
    tiles: {},

    init: function () {
        this.generatePlayerSprites();
        this.generateEnemySprites();
        this.generateTileSprites();
        this.generateObstacleSprites();
        this.generateUISprites();
    },

    _createCanvas: function (w, h) {
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    },

    _rect: function (ctx, x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
    },

    // ── PLAYER ──
    generatePlayerSprites: function () {
        var self = this;

        var colors = {
            'R': '#e52521', // Red
            'B': '#004fe8', // Blue
            'S': '#ffcca5', // Skin
            'H': '#6e3c19', // Brown
            'Y': '#fced23', // Yellow
            'K': '#000000'  // Black
        };

        var marioIdle = [
            "     RRRRR      ",
            "    RRRRRRRRR   ",
            "    HHHSKSS     ",
            "   HHSKSSSKSSS  ",
            "   HHSKSSSSSS   ",
            "   HHHHKKSSS    ",
            "     SSSSSSS    ",
            "    RRBBRRR     ",
            "   RRRBBRBBRRR  ",
            "  RRRRBBBBRRRR  ",
            "  SS RBYYBR SS  ",
            "  SSSBBBBBBSSS  ",
            "  SS BBBBBB SS  ",
            "     BBB BBB    ",
            "    HHH   HHH   ",
            "   HHHH   HHHH  "
        ];

        var marioWalk1 = [
            "     RRRRR      ",
            "    RRRRRRRRR   ",
            "    HHHSKSS     ",
            "   HHSKSSSKSSS  ",
            "   HHSKSSSSSS   ",
            "   HHHHKKSSS    ",
            "     SSSSSSS    ",
            "    RRBBRR      ",
            "   RRRBBRBBRR   ",
            "  RRRRBBBBRRRS  ",
            "  SS RBYYBR SSS ",
            "  SSSBBBBBB  SS ",
            "  SS BBBBBB     ",
            "     BB  BBBB   ",
            "    HHH    HHH  ",
            "   HHHH    HHHH "
        ];

        var marioWalk2 = [
            "     RRRRR      ",
            "    RRRRRRRRR   ",
            "    HHHSKSS     ",
            "   HHSKSSSKSSS  ",
            "   HHSKSSSSSS   ",
            "   HHHHKKSSS    ",
            "     SSSSSSS    ",
            "      RRBBRRR   ",
            "    RRRRBBRBBRRR",
            "   S RBBBBRRRR  ",
            "  SSS BBYYB SS  ",
            "   SS BBBBB SSS ",
            "      BBBBBB SS ",
            "    BBBB  BB    ",
            "   HHH     HHH  ",
            "  HHHH     HHHH "
        ];

        var marioJump = [
            "     RRRRR      ",
            "    RRRRRRRRR   ",
            "    HHHSKSS     ",
            "   HHSKSSSKSSS  ",
            "   HHSKSSSSSS S ",
            "   HHHHKKSSS SS ",
            "     SSSSSSS  S ",
            "    RRBBRRR   R ",
            "   RRRBBRBBRRRR ",
            "  RRRRBBBBRRRR  ",
            "  SS RBYYBR     ",
            "  SSSBBBBBB     ",
            "  SS BBBBBB     ",
            "     BBB  BBB   ",
            "    HHH     HHH ",
            "   HHHH     HHHH"
        ];

        function drawPixelArt(ctx, art) {
            for (var y = 0; y < art.length; y++) {
                for (var x = 0; x < art[y].length; x++) {
                    var c = art[y][x];
                    if (colors[c]) {
                        ctx.fillStyle = colors[c];
                        ctx.fillRect(x * 2, y * 2, 2, 2);
                    }
                }
            }
        }

        this.sprites.playerIdle = this._createCanvas(32, 32);
        drawPixelArt(this.sprites.playerIdle.getContext('2d'), marioIdle);

        this.sprites.playerWalk1 = this._createCanvas(32, 32);
        drawPixelArt(this.sprites.playerWalk1.getContext('2d'), marioWalk1);

        this.sprites.playerWalk2 = this._createCanvas(32, 32);
        drawPixelArt(this.sprites.playerWalk2.getContext('2d'), marioWalk2);

        this.sprites.playerJump = this._createCanvas(32, 32);
        drawPixelArt(this.sprites.playerJump.getContext('2d'), marioJump);

        this.sprites.playerDead = this._createCanvas(32, 32);
        var dctx = this.sprites.playerDead.getContext('2d');
        drawPixelArt(dctx, marioIdle);
        dctx.globalCompositeOperation = 'source-atop';
        dctx.fillStyle = 'rgba(255,0,0,0.5)';
        dctx.fillRect(0, 0, 32, 32);
    },

    // ── ENEMIES ──
    generateEnemySprites: function () {
        var P = TGH.PALETTE;
        var r;

        // Patroller (slime)
        this.sprites.patroller1 = this._createCanvas(32, 32);
        var ctx = this.sprites.patroller1.getContext('2d');
        r = this._rect.bind(this, ctx);
        r(4, 16, 24, 14, P.slimeDark);
        r(6, 12, 20, 6, P.slimeGreen);
        r(8, 10, 16, 4, P.slimeGreen);
        r(10, 8, 12, 4, P.slimeGreen);
        r(6, 18, 20, 10, P.slimeGreen);
        r(8, 14, 4, 4, P.slimeLight);
        r(10, 16, 4, 2, P.eyeWhite);
        r(18, 16, 4, 2, P.eyeWhite);
        r(11, 17, 2, 1, P.outline);
        r(19, 17, 2, 1, P.outline);
        r(2, 28, 28, 2, P.slimeDark);
        r(4, 30, 24, 2, P.slimeDark);

        this.sprites.patroller2 = this._createCanvas(32, 32);
        ctx = this.sprites.patroller2.getContext('2d');
        r = this._rect.bind(this, ctx);
        r(4, 18, 24, 12, P.slimeDark);
        r(6, 14, 20, 6, P.slimeGreen);
        r(8, 12, 16, 4, P.slimeGreen);
        r(10, 10, 12, 4, P.slimeGreen);
        r(6, 20, 20, 8, P.slimeGreen);
        r(8, 16, 4, 4, P.slimeLight);
        r(10, 18, 4, 2, P.eyeWhite);
        r(18, 18, 4, 2, P.eyeWhite);
        r(11, 19, 2, 1, P.outline);
        r(19, 19, 2, 1, P.outline);
        r(2, 28, 28, 2, P.slimeDark);
        r(4, 30, 24, 2, P.slimeDark);

        // Sentinel (eye creature)
        this.sprites.sentinel = this._createCanvas(32, 32);
        ctx = this.sprites.sentinel.getContext('2d');
        r = this._rect.bind(this, ctx);
        r(4, 8, 24, 20, P.sentinelDark);
        r(6, 6, 20, 20, P.sentinelPurple);
        r(8, 4, 16, 4, P.sentinelPurple);
        r(8, 10, 16, 12, P.sentinelLight);
        r(10, 12, 12, 8, P.eyeWhite);
        r(14, 14, 6, 6, P.sentinelPurple);
        r(15, 15, 4, 4, P.outline);
        r(4, 28, 8, 4, P.sentinelDark);
        r(20, 28, 8, 4, P.sentinelDark);

        // Shooter (cannon)
        this.sprites.shooterLeft = this._createCanvas(32, 32);
        ctx = this.sprites.shooterLeft.getContext('2d');
        r = this._rect.bind(this, ctx);
        r(12, 6, 18, 20, P.shooterDark);
        r(14, 8, 14, 16, P.shooterOrange);
        r(2, 12, 12, 8, P.shooterDark);
        r(4, 14, 10, 4, P.shooterOrange);
        r(0, 13, 4, 6, P.shooterDark);
        r(18, 10, 4, 4, P.outline);
        r(12, 26, 18, 4, P.shooterDark);

        this.sprites.shooterRight = this._createCanvas(32, 32);
        ctx = this.sprites.shooterRight.getContext('2d');
        r = this._rect.bind(this, ctx);
        r(2, 6, 18, 20, P.shooterDark);
        r(4, 8, 14, 16, P.shooterOrange);
        r(18, 12, 12, 8, P.shooterDark);
        r(18, 14, 10, 4, P.shooterOrange);
        r(28, 13, 4, 6, P.shooterDark);
        r(10, 10, 4, 4, P.outline);
        r(2, 26, 18, 4, P.shooterDark);

        // Boss
        this.sprites.boss = this._createCanvas(128, 128);
        ctx = this.sprites.boss.getContext('2d');
        r = this._rect.bind(this, ctx);
        // Body
        r(16, 20, 96, 90, P.bossDark);
        r(24, 16, 80, 90, P.bossRed);
        r(32, 8, 64, 16, P.bossRed);
        // Eyes
        r(36, 32, 20, 16, P.eyeWhite);
        r(72, 32, 20, 16, P.eyeWhite);
        r(42, 36, 10, 10, P.outline);
        r(78, 36, 10, 10, P.outline);
        r(44, 38, 4, 4, P.bossRed);
        r(80, 38, 4, 4, P.bossRed);
        // Mouth
        r(40, 60, 48, 8, P.outline);
        r(44, 64, 8, 4, P.eyeWhite);
        r(56, 64, 8, 4, P.eyeWhite);
        r(68, 64, 8, 4, P.eyeWhite);
        r(80, 64, 8, 4, P.eyeWhite);
        // Horns
        r(24, 4, 12, 16, P.bossDark);
        r(92, 4, 12, 16, P.bossDark);
        r(28, 0, 8, 8, P.bossLight);
        r(92, 0, 8, 8, P.bossLight);
        // Legs
        r(24, 108, 16, 20, P.bossDark);
        r(88, 108, 16, 20, P.bossDark);
        // Arms
        r(4, 40, 16, 12, P.bossRed);
        r(108, 40, 16, 12, P.bossRed);
        r(0, 44, 8, 16, P.bossDark);
        r(120, 44, 8, 16, P.bossDark);

        // Projectile
        this.sprites.projectile = this._createCanvas(16, 16);
        ctx = this.sprites.projectile.getContext('2d');
        r = this._rect.bind(this, ctx);
        r(4, 2, 8, 12, P.fireball);
        r(2, 4, 12, 8, P.fireball);
        r(6, 4, 4, 8, P.fireballBright);
        r(4, 6, 8, 4, P.fireballBright);
    },

    // ── TILES ──
    generateTileSprites: function () {
        var P = TGH.PALETTE;
        var T = TGH.TILE;
        var r;

        // Solid wall/ground
        this.tiles.solid = this._createCanvas(T, T);
        var ctx = this.tiles.solid.getContext('2d');
        r = this._rect.bind(this, ctx);
        r(0, 0, T, T, P.stoneA);
        r(1, 1, 14, 14, P.stoneB);
        r(17, 1, 14, 14, P.stoneC);
        r(1, 17, 14, 14, P.stoneC);
        r(17, 17, 14, 14, P.stoneB);
        r(0, 0, T, 1, P.stoneLine);
        r(0, 16, T, 1, P.stoneLine);
        r(0, 0, 1, T, P.stoneLine);
        r(16, 0, 1, T, P.stoneLine);
        r(2, 2, 4, 3, P.stoneD);
        r(20, 18, 4, 3, P.stoneD);

        // Spike floor
        this.tiles.spikeUp = this._createCanvas(T, T);
        ctx = this.tiles.spikeUp.getContext('2d');
        r = this._rect.bind(this, ctx);
        r(0, 28, T, 4, P.spikeBase);
        for (var i = 0; i < 4; i++) {
            var sx = i * 8;
            r(sx + 3, 16, 2, 12, P.spikeMetal);
            r(sx + 2, 20, 4, 8, P.spikeMetal);
            r(sx + 1, 24, 6, 4, P.spikeMetal);
            r(sx + 3, 14, 2, 4, P.spikeTip);
        }

        // Spike ceiling
        this.tiles.spikeDown = this._createCanvas(T, T);
        ctx = this.tiles.spikeDown.getContext('2d');
        r = this._rect.bind(this, ctx);
        r(0, 0, T, 4, P.spikeBase);
        for (var i = 0; i < 4; i++) {
            var sx = i * 8;
            r(sx + 3, 4, 2, 12, P.spikeMetal);
            r(sx + 2, 4, 4, 8, P.spikeMetal);
            r(sx + 1, 4, 6, 4, P.spikeMetal);
            r(sx + 3, 14, 2, 4, P.spikeTip);
        }

        // Conveyor left (3 frames)
        this.tiles.conveyorLeft = [];
        for (var f = 0; f < 3; f++) {
            var cv = this._createCanvas(T, T);
            ctx = cv.getContext('2d');
            r = this._rect.bind(this, ctx);
            r(0, 0, T, T, P.conveyorB);
            r(0, 2, T, 28, P.conveyorA);
            for (var ci = 0; ci < 5; ci++) {
                var cx = ((ci * 8) + f * 3) % 32 - 4;
                r(cx, 4, 4, 24, P.conveyorC);
            }
            // Arrows
            r(0, 0, T, 2, P.conveyorB);
            r(0, 30, T, 2, P.conveyorB);
            this.tiles.conveyorLeft.push(cv);
        }

        // Conveyor right (3 frames)
        this.tiles.conveyorRight = [];
        for (var f = 0; f < 3; f++) {
            var cv = this._createCanvas(T, T);
            ctx = cv.getContext('2d');
            r = this._rect.bind(this, ctx);
            r(0, 0, T, T, P.conveyorB);
            r(0, 2, T, 28, P.conveyorA);
            for (var ci = 0; ci < 5; ci++) {
                var cx = ((ci * 8) - f * 3 + 32) % 32 - 4;
                r(cx, 4, 4, 24, P.conveyorC);
            }
            r(0, 0, T, 2, P.conveyorB);
            r(0, 30, T, 2, P.conveyorB);
            this.tiles.conveyorRight.push(cv);
        }

        // Button (off)
        this.tiles.buttonOff = this._createCanvas(T, T);
        ctx = this.tiles.buttonOff.getContext('2d');
        r = this._rect.bind(this, ctx);
        r(0, 24, T, 8, P.buttonBase);
        r(8, 16, 16, 8, P.buttonGreen);
        r(10, 18, 12, 4, '#50d850');

        // Button (on)
        this.tiles.buttonOn = this._createCanvas(T, T);
        ctx = this.tiles.buttonOn.getContext('2d');
        r = this._rect.bind(this, ctx);
        r(0, 24, T, 8, P.buttonBase);
        r(8, 22, 16, 4, P.buttonRed);
        r(10, 22, 12, 2, '#d85050');

        // Door (closed)
        this.tiles.doorClosed = this._createCanvas(T, T);
        ctx = this.tiles.doorClosed.getContext('2d');
        r = this._rect.bind(this, ctx);
        r(0, 0, T, T, P.doorDark);
        r(2, 2, 28, 28, P.doorBrown);
        r(4, 4, 10, 12, P.doorDark);
        r(18, 4, 10, 12, P.doorDark);
        r(4, 18, 10, 10, P.doorDark);
        r(18, 18, 10, 10, P.doorDark);
        r(14, 16, 4, 4, P.conveyorA);

        // Door (open) - just empty
        this.tiles.doorOpen = this._createCanvas(T, T);

        // Exit portal
        this.tiles.exit = [];
        for (var f = 0; f < 4; f++) {
            var ex = this._createCanvas(T, T);
            ctx = ex.getContext('2d');
            r = this._rect.bind(this, ctx);
            var glow = f < 2 ? P.exitGold : P.exitGlow;
            r(4, 2, 24, 28, P.outline);
            r(6, 4, 20, 24, glow);
            r(8, 6, 16, 20, P.exitGold);
            r(10, 8 + f, 12, 4, '#fff');
            r(12, 14 - f, 8, 4, '#fff8d0');
            this.tiles.exit.push(ex);
        }

        // Moving platform
        this.tiles.platform = this._createCanvas(T, T);
        ctx = this.tiles.platform.getContext('2d');
        r = this._rect.bind(this, ctx);
        r(0, 0, T, 8, P.stoneD);
        r(0, 0, T, 2, '#a0a0b0');
        r(0, 8, T, 4, P.stoneLine);
        r(2, 2, 4, 4, '#8888a0');
        r(14, 2, 4, 4, '#8888a0');
        r(26, 2, 4, 4, '#8888a0');

        // Background tile
        this.tiles.bg = this._createCanvas(T, T);
        ctx = this.tiles.bg.getContext('2d');
        r = this._rect.bind(this, ctx);
        r(0, 0, T, T, P.bgDark);
        r(4, 4, 2, 2, P.bgMid);
        r(20, 12, 2, 2, P.bgMid);
        r(12, 24, 2, 2, P.bgMid);
    },

    // ── OBSTACLES ──
    generateObstacleSprites: function () {
        // Wind particles
        this.sprites.windParticle = this._createCanvas(8, 4);
        var ctx = this.sprites.windParticle.getContext('2d');
        ctx.fillStyle = 'rgba(180,200,255,0.5)';
        ctx.fillRect(0, 1, 8, 2);
        ctx.fillStyle = 'rgba(200,220,255,0.8)';
        ctx.fillRect(2, 1, 4, 2);
    },

    // ── UI ──
    generateUISprites: function () {
        // Heart
        this.sprites.heart = this._createCanvas(16, 16);
        var ctx = this.sprites.heart.getContext('2d');
        var r = this._rect.bind(this, ctx);
        r(2, 2, 4, 4, '#e83030');
        r(8, 2, 4, 4, '#e83030');
        r(0, 4, 14, 4, '#e83030');
        r(2, 8, 10, 4, '#e83030');
        r(4, 12, 6, 2, '#e83030');
        r(6, 14, 2, 2, '#e83030');
        r(2, 2, 2, 2, '#ff6060');
    }
};
