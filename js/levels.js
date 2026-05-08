/**
 * levels.js - All 7 level definitions (redesigned for solvability)
 * 
 * Design principle: The player CANNOT jump or attack.
 * Every level must have:
 * - Safe zones between enemy patrol ranges
 * - Wide enough corridors (3+ tiles height)
 * - Timing windows to pass enemies
 * - Clear path from start to exit
 *
 * Tile legend:
 *   0=air, 1=solid, 2=spike floor, 3=spike ceiling,
 *   4=conveyor left, 5=conveyor right, 6=button,
 *   8=exit, 9=door(closed)
 */
var TGH = window.TGH || {};
window.TGH = TGH;

TGH.Levels = {
    _charMap: {
        '.': 0, '#': 1, '^': 2, 'v': 3, '<': 4, '>': 5,
        'B': 6, 'D': 9, 'E': 8, ' ': 0
    },

    _parse: function (rows) {
        var map = [];
        for (var i = 0; i < rows.length; i++) {
            var row = [];
            for (var j = 0; j < rows[i].length; j++) {
                var c = rows[i][j];
                row.push(this._charMap[c] !== undefined ? this._charMap[c] : 0);
            }
            map.push(row);
        }
        return map;
    },

    get: function (index) {
        var data = this.data[index];
        return {
            name: data.name,
            subtitle: data.subtitle,
            tiles: this._parse(data.map),
            playerSpawn: data.playerSpawn,
            enemies: data.enemies || [],
            platforms: data.platforms || [],
            shooters: data.shooters || [],
            windZones: data.windZones || [],
            buttons: data.buttons || [],
            boss: data.boss || null,
            bgColor: data.bgColor || '#0c0c18'
        };
    },

    count: 7,

    data: [
        // ═══════════════════════════════════════
        // FASE 1: O Labirinto Simples
        // Safe zones between each enemy patrol.
        // Player walks right, waits, times, runs.
        // ═══════════════════════════════════════
        {
            name: "Fase 1: O Labirinto Simples",
            subtitle: "Espere o momento certo para passar!",
            bgColor: '#0c0c18',
            playerSpawn: { x: 1, y: 8 },
            map: [
                "##############################",
                "#............................#",
                "#..##........##........##....#",
                "#..##........##........##....#",
                "#............................#",
                "#............................#",
                "#..##........##........##....#",
                "#..##........##........##....#",
                "#............................#",
                "#...........................E#",
                "##############################",
            ],
            // Enemies patrol SECTIONS with gaps between them
            // Patrol zone 1: tiles 4-9, safe at 1-3 and 10-12
            // Patrol zone 2: tiles 14-19, safe at 10-13 and 20-22
            // Patrol zone 3: tiles 24-27, safe at 20-23
            enemies: [
                { type: 'patroller', x: 4, y: 8, range: 5, speed: 55 },
                { type: 'patroller', x: 14, y: 8, range: 5, speed: 65 },
                { type: 'patroller', x: 23, y: 8, range: 4, speed: 75 },
            ]
        },

        // ═══════════════════════════════════════
        // FASE 2: O Elevador
        // Multiple floors. Moving platforms carry
        // the player up. Enemies on some floors.
        // ═══════════════════════════════════════
        {
            name: "Fase 2: O Elevador",
            subtitle: "Use as plataformas para subir!",
            bgColor: '#0a1018',
            playerSpawn: { x: 2, y: 18 },
            map: [
                "##############################",
                "#............................#",
                "#...E........................#",
                "#..####......................#",
                "#............................#",
                "#............................#",
                "#............####............#",
                "#............................#",
                "#............................#",
                "#............................#",
                "#............................#",
                "#............................#",
                "#..........####..............#",
                "#............................#",
                "#............................#",
                "#............................#",
                "#............................#",
                "#....#####...................#",
                "#............................#",
                "#............................#",
                "##############################",
            ],
            enemies: [
                { type: 'patroller', x: 8, y: 17, range: 6, speed: 50 },
                { type: 'patroller', x: 14, y: 11, range: 5, speed: 55 },
            ],
            platforms: [
                { x: 2, y: 18, tx: 2, ty: 14, speed: 30 },
                { x: 10, y: 14, tx: 10, ty: 8, speed: 35 },
                { x: 6, y: 8, tx: 6, ty: 4, speed: 30 },
            ]
        },

        // ═══════════════════════════════════════
        // FASE 3: Queda Livre Controlada
        // Fall through the right holes.
        // Wrong holes have spikes below.
        // ═══════════════════════════════════════
        {
            name: "Fase 3: Queda Livre Controlada",
            subtitle: "Caia no buraco certo! Espere o momento!",
            bgColor: '#100c18',
            playerSpawn: { x: 2, y: 2 },
            map: [
                "################################",
                "#..............................#",
                "#..............................#",
                "################.###############",
                "#..............................#",
                "#..............................#",
                "#..............................#",
                "########.#######################",
                "#..............................#",
                "#..............................#",
                "#..............................#",
                "######################.#########",
                "#..............................#",
                "#..............................#",
                "#.............................E#",
                "################################",
            ],
            enemies: [
                { type: 'patroller', x: 4, y: 5, range: 6, speed: 55 },
                { type: 'patroller', x: 14, y: 9, range: 6, speed: 60 },
                { type: 'patroller', x: 8, y: 13, range: 6, speed: 65 },
            ]
        },

        // ═══════════════════════════════════════
        // FASE 4: Esteiras Rolantes
        // Conveyor belts push toward spikes.
        // Counter-move to survive.
        // ═══════════════════════════════════════
        {
            name: "Fase 4: Esteiras Rolantes",
            subtitle: "Lute contra a corrente!",
            bgColor: '#181008',
            playerSpawn: { x: 1, y: 3 },
            map: [
                "####################################",
                "#..................................#",
                "#..................................#",
                "#..................................#",
                "#>>>>>>>>>>>>>>>>>>>>>>>>>>..####..#",
                "############################.#^^#..#",
                "#..................................#",
                "#..................................#",
                "#..####..<<<<<<<<<<<<<<<<<<<<<<<<<.#",
                "#..#^^#.############################",
                "#..................................#",
                "#..................................#",
                "#>>>>>>>>>>>>>>>>>>>>>>>>>>..####..#",
                "############################.#^^#..#",
                "#..................................#",
                "#.................................E#",
                "####################################",
            ],
            enemies: [
                { type: 'patroller', x: 6, y: 3, range: 6, speed: 40 },
                { type: 'patroller', x: 12, y: 7, range: 6, speed: 40 },
                { type: 'patroller', x: 6, y: 11, range: 6, speed: 40 },
            ]
        },

        // ═══════════════════════════════════════
        // FASE 5: A Caverna de Projeteis
        // Shooters fire across corridors.
        // Wait for gaps between shots.
        // ═══════════════════════════════════════
        {
            name: "Fase 5: A Caverna de Projeteis",
            subtitle: "Espere o intervalo entre os tiros!",
            bgColor: '#0c1008',
            playerSpawn: { x: 2, y: 3 },
            map: [
                "##################################",
                "#................................#",
                "#................................#",
                "#................................#",
                "###########..#####################",
                "#................................#",
                "#................................#",
                "#................................#",
                "#####################..###########",
                "#................................#",
                "#................................#",
                "#................................#",
                "###########..#####################",
                "#................................#",
                "#................................#",
                "#...............................E#",
                "##################################",
            ],
            enemies: [
                { type: 'patroller', x: 14, y: 3, range: 5, speed: 50 },
                { type: 'patroller', x: 10, y: 7, range: 5, speed: 55 },
                { type: 'patroller', x: 16, y: 11, range: 5, speed: 60 },
            ],
            shooters: [
                { x: 1, y: 3, dir: 1, interval: 3.0 },
                { x: 31, y: 7, dir: -1, interval: 2.5 },
                { x: 1, y: 11, dir: 1, interval: 2.8 },
                { x: 31, y: 14, dir: -1, interval: 2.2 },
            ]
        },

        // ═══════════════════════════════════════
        // FASE 6: O Corredor de Vento
        // Wind pushes the player. Counter-move.
        // ═══════════════════════════════════════
        {
            name: "Fase 6: O Corredor de Vento",
            subtitle: "O vento empurra! Mantenha o controle!",
            bgColor: '#081018',
            playerSpawn: { x: 2, y: 8 },
            map: [
                "##################################",
                "#................................#",
                "#..####..........................#",
                "#................................#",
                "#................................#",
                "#................####............#",
                "#................................#",
                "#................................#",
                "#................................#",
                "#...............................E#",
                "##################################",
            ],
            enemies: [
                { type: 'patroller', x: 8, y: 8, range: 5, speed: 80 },
                { type: 'patroller', x: 20, y: 8, range: 5, speed: 90 },
                { type: 'sentinel', x: 14, y: 4 },
            ],
            windZones: [
                { x: 1, y: 1, w: 16, h: 9, force: 200 },
                { x: 17, y: 1, w: 15, h: 9, force: -250 },
            ]
        },

        // ═══════════════════════════════════════
        // FASE 7: O Grande Castelo Final
        // Boss chases from the left.
        // Zigzag path to escape.
        // ═══════════════════════════════════════
        {
            name: "Fase 7: O Grande Castelo Final",
            subtitle: "Fuja do Boss! Corra!",
            bgColor: '#180808',
            playerSpawn: { x: 3, y: 8 },
            boss: { x: -6, y: 4 },
            map: [
                "################################################################",
                "#..............................................................#",
                "#..............................................................#",
                "#..............................................................#",
                "#..............................................................#",
                "#......####............####............####............####.....#",
                "#..............................................................#",
                "#..............................................................#",
                "#..............................................................#",
                "#.............................................................E#",
                "################################################################",
            ],
            enemies: [
                { type: 'patroller', x: 16, y: 8, range: 4, speed: 70 },
                { type: 'patroller', x: 30, y: 8, range: 4, speed: 80 },
                { type: 'patroller', x: 44, y: 8, range: 4, speed: 85 },
            ]
        }
    ]
};
