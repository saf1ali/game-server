// Node.js test server for game-server (mirrors C++ implementation)
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9001;

// Simple HTTP server for client files
const httpServer = http.createServer((req, res) => {
    let filePath = path.join(__dirname, '..', 'client', req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);
    const contentTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript'
    };

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
        res.end(data);
    });
});

const wss = new WebSocket.Server({ server: httpServer });

// Game state
let nextConnId = 1;
let nextRoomId = 1;
const connections = new Map();
const rooms = new Map();
const lobbyPlayers = new Set();

// Connection class
class Connection {
    constructor(ws, id) {
        this.ws = ws;
        this.id = id;
        this.username = '';
        this.roomId = '';
        this.playerIndex = -1;
        this.inLobby = false;
    }
    send(data) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
}

// Pong Game
class PongGame {
    constructor() {
        this.type = 'pong';
        this.minPlayers = 2;
        this.maxPlayers = 2;
        this.started = false;
        this.gameOver = false;
        this.winner = -1;
        this.config = { canvasWidth: 800, canvasHeight: 600, paddleWidth: 15, paddleHeight: 100, paddleMargin: 30, ballRadius: 10 };
        this.paddles = [{ y: 250, dir: 0 }, { y: 250, dir: 0 }];
        this.ball = { x: 400, y: 300, vx: 300, vy: 150 };
        this.scores = [0, 0];
    }
    start() { this.started = true; }
    handleInput(playerId, input) {
        if (playerId < 0 || playerId > 1) return;
        const dir = input.direction;
        this.paddles[playerId].dir = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    }
    update(dt) {
        if (!this.started || this.gameOver) return;
        // Move paddles
        for (let i = 0; i < 2; i++) {
            this.paddles[i].y += this.paddles[i].dir * 400 * dt;
            this.paddles[i].y = Math.max(0, Math.min(500, this.paddles[i].y));
        }
        // Move ball
        this.ball.x += this.ball.vx * dt;
        this.ball.y += this.ball.vy * dt;
        // Wall bounce
        if (this.ball.y < 10 || this.ball.y > 590) this.ball.vy *= -1;
        // Paddle collision
        if (this.ball.x < 55 && this.ball.y > this.paddles[0].y && this.ball.y < this.paddles[0].y + 100) {
            this.ball.vx = Math.abs(this.ball.vx) * 1.05;
        }
        if (this.ball.x > 745 && this.ball.y > this.paddles[1].y && this.ball.y < this.paddles[1].y + 100) {
            this.ball.vx = -Math.abs(this.ball.vx) * 1.05;
        }
        // Scoring
        if (this.ball.x < 0) { this.scores[1]++; this.resetBall(); }
        if (this.ball.x > 800) { this.scores[0]++; this.resetBall(); }
        if (this.scores[0] >= 10 || this.scores[1] >= 10) {
            this.gameOver = true;
            this.winner = this.scores[0] >= 10 ? 0 : 1;
        }
    }
    resetBall() {
        this.ball = { x: 400, y: 300, vx: (Math.random() > 0.5 ? 1 : -1) * 300, vy: (Math.random() - 0.5) * 300 };
    }
    getState() {
        return {
            ball: { x: this.ball.x, y: this.ball.y },
            paddles: [{ y: this.paddles[0].y }, { y: this.paddles[1].y }],
            scores: this.scores,
            gameOver: this.gameOver,
            winner: this.winner,
            config: this.config
        };
    }
    isOver() { return this.gameOver; }
}

// Snake Game
class SnakeGame {
    constructor() {
        this.type = 'snake';
        this.minPlayers = 1;
        this.maxPlayers = 4;
        this.started = false;
        this.gameOver = false;
        this.winner = -1;
        this.config = { gridWidth: 40, gridHeight: 30, cellSize: 20 };
        this.snakes = [];
        this.food = [];
        this.moveTimer = 0;
        this.colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63'];
    }
    onPlayerJoin(id) {
        const spawns = [[10, 7], [30, 7], [10, 22], [30, 22]];
        const [sx, sy] = spawns[id % 4];
        this.snakes[id] = {
            body: [{x: sx, y: sy}, {x: sx-1, y: sy}, {x: sx-2, y: sy}],
            dir: 'right', nextDir: 'right', alive: true, score: 0, color: this.colors[id % 4]
        };
    }
    start() {
        this.started = true;
        this.spawnFood();
    }
    spawnFood() {
        let x, y;
        do {
            x = Math.floor(Math.random() * 40);
            y = Math.floor(Math.random() * 30);
        } while (this.snakes.some(s => s && s.body.some(b => b.x === x && b.y === y)));
        this.food.push({x, y});
    }
    handleInput(playerId, input) {
        const s = this.snakes[playerId];
        if (!s || !s.alive) return;
        const d = input.direction;
        const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
        if (d && opposite[d] !== s.dir) s.nextDir = d;
    }
    update(dt) {
        if (!this.started || this.gameOver) return;
        this.moveTimer += dt;
        if (this.moveTimer < 0.1) return;
        this.moveTimer = 0;

        let alive = 0, lastAlive = -1;
        this.snakes.forEach((s, i) => {
            if (!s || !s.alive) return;
            s.dir = s.nextDir;
            const head = {...s.body[0]};
            if (s.dir === 'up') head.y--;
            if (s.dir === 'down') head.y++;
            if (s.dir === 'left') head.x--;
            if (s.dir === 'right') head.x++;

            // Collision check
            if (head.x < 0 || head.x >= 40 || head.y < 0 || head.y >= 30) { s.alive = false; return; }
            for (const other of this.snakes) {
                if (!other || !other.alive) continue;
                if (other.body.some(b => b.x === head.x && b.y === head.y)) { s.alive = false; return; }
            }

            s.body.unshift(head);
            const foodIdx = this.food.findIndex(f => f.x === head.x && f.y === head.y);
            if (foodIdx >= 0) {
                s.score += 10;
                this.food.splice(foodIdx, 1);
                this.spawnFood();
            } else {
                s.body.pop();
            }
            alive++; lastAlive = i;
        });

        if (alive <= (this.snakes.filter(s => s).length > 1 ? 1 : 0)) {
            this.gameOver = true;
            this.winner = lastAlive;
        }
    }
    getState() {
        return {
            snakes: this.snakes.map(s => s ? { body: s.body, alive: s.alive, score: s.score, color: s.color } : null).filter(Boolean),
            food: this.food,
            gameOver: this.gameOver,
            winner: this.winner,
            config: this.config
        };
    }
    isOver() { return this.gameOver; }
}

// Tetris Game
class TetrisGame {
    constructor() {
        this.type = 'tetris';
        this.minPlayers = 1;
        this.maxPlayers = 2;
        this.started = false;
        this.gameOver = false;
        this.winner = -1;
        this.config = { boardWidth: 10, boardHeight: 20, cellSize: 30 };
        this.players = [];
        this.shapes = [
            [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
            [[1,1],[1,1]], // O
            [[0,1,0],[1,1,1],[0,0,0]], // T
            [[0,1,1],[1,1,0],[0,0,0]], // S
            [[1,1,0],[0,1,1],[0,0,0]], // Z
            [[1,0,0],[1,1,1],[0,0,0]], // J
            [[0,0,1],[1,1,1],[0,0,0]]  // L
        ];
        this.colors = ['#00f5ff', '#ffff00', '#a000f0', '#00f000', '#f00000', '#0000f0', '#f0a000'];
    }
    onPlayerJoin(id) {
        this.players[id] = {
            board: Array(20).fill(null).map(() => Array(10).fill(0)),
            piece: null, pieceX: 0, pieceY: 0, pieceType: -1, rotation: 0,
            nextPiece: Math.floor(Math.random() * 7),
            score: 0, lines: 0, level: 1, alive: true, softDrop: false, dropTimer: 0
        };
    }
    start() {
        this.started = true;
        this.players.forEach((p, i) => { if (p) this.spawnPiece(i); });
    }
    spawnPiece(id) {
        const p = this.players[id];
        p.pieceType = p.nextPiece;
        p.nextPiece = Math.floor(Math.random() * 7);
        p.rotation = 0;
        p.pieceX = 3;
        p.pieceY = 0;
        p.piece = this.getRotatedPiece(p.pieceType, 0);
        if (!this.canPlace(id, p.pieceX, p.pieceY)) p.alive = false;
    }
    getRotatedPiece(type, rot) {
        let shape = this.shapes[type].map(r => [...r]);
        for (let r = 0; r < rot % 4; r++) {
            const n = shape.length;
            const rotated = Array(n).fill(null).map(() => Array(n).fill(0));
            for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) rotated[j][n-1-i] = shape[i][j];
            shape = rotated;
        }
        return shape;
    }
    canPlace(id, px, py, rot = null) {
        const p = this.players[id];
        const piece = rot !== null ? this.getRotatedPiece(p.pieceType, rot) : p.piece;
        for (let y = 0; y < piece.length; y++) {
            for (let x = 0; x < piece[y].length; x++) {
                if (!piece[y][x]) continue;
                const bx = px + x, by = py + y;
                if (bx < 0 || bx >= 10 || by >= 20) return false;
                if (by >= 0 && p.board[by][bx]) return false;
            }
        }
        return true;
    }
    lockPiece(id) {
        const p = this.players[id];
        for (let y = 0; y < p.piece.length; y++) {
            for (let x = 0; x < p.piece[y].length; x++) {
                if (p.piece[y][x] && p.pieceY + y >= 0) {
                    p.board[p.pieceY + y][p.pieceX + x] = p.pieceType + 1;
                }
            }
        }
        this.clearLines(id);
        this.spawnPiece(id);
    }
    clearLines(id) {
        const p = this.players[id];
        let cleared = 0;
        for (let y = 19; y >= 0; y--) {
            if (p.board[y].every(c => c > 0)) {
                p.board.splice(y, 1);
                p.board.unshift(Array(10).fill(0));
                cleared++; y++;
            }
        }
        if (cleared) {
            p.score += [0, 100, 300, 500, 800][cleared] * p.level;
            p.lines += cleared;
            p.level = 1 + Math.floor(p.lines / 10);
        }
    }
    handleInput(playerId, input) {
        const p = this.players[playerId];
        if (!p || !p.alive) return;
        const a = input.action;
        if (a === 'left' && this.canPlace(playerId, p.pieceX - 1, p.pieceY)) p.pieceX--;
        if (a === 'right' && this.canPlace(playerId, p.pieceX + 1, p.pieceY)) p.pieceX++;
        if (a === 'rotate_cw') {
            const newRot = (p.rotation + 1) % 4;
            if (this.canPlace(playerId, p.pieceX, p.pieceY, newRot)) {
                p.rotation = newRot;
                p.piece = this.getRotatedPiece(p.pieceType, newRot);
            }
        }
        if (a === 'soft_drop_start') p.softDrop = true;
        if (a === 'soft_drop_end') p.softDrop = false;
        if (a === 'hard_drop') {
            while (this.canPlace(playerId, p.pieceX, p.pieceY + 1)) { p.pieceY++; p.score += 2; }
            this.lockPiece(playerId);
        }
    }
    update(dt) {
        if (!this.started || this.gameOver) return;
        let alive = 0, lastAlive = -1;
        this.players.forEach((p, i) => {
            if (!p || !p.alive) return;
            const interval = p.softDrop ? 0.05 : (0.8 / p.level);
            p.dropTimer += dt;
            if (p.dropTimer >= interval) {
                p.dropTimer = 0;
                if (this.canPlace(i, p.pieceX, p.pieceY + 1)) {
                    p.pieceY++;
                    if (p.softDrop) p.score++;
                } else {
                    this.lockPiece(i);
                }
            }
            if (p.alive) { alive++; lastAlive = i; }
        });
        if (alive === 0) { this.gameOver = true; this.winner = lastAlive; }
    }
    getState() {
        return {
            players: this.players.map(p => p ? {
                board: p.board,
                piece: p.piece ? p.piece.map((r, y) => r.map((c, x) => c ? p.pieceType + 1 : 0)) : [],
                pieceX: p.pieceX, pieceY: p.pieceY, nextPiece: p.nextPiece,
                score: p.score, lines: p.lines, level: p.level, alive: p.alive
            } : null).filter(Boolean),
            colors: this.colors,
            gameOver: this.gameOver,
            winner: this.winner,
            config: this.config
        };
    }
    isOver() { return this.gameOver; }
}

// Checkers Game
class CheckersGame {
    constructor() {
        this.type = 'checkers';
        this.minPlayers = 2;
        this.maxPlayers = 2;
        this.started = false;
        this.gameOver = false;
        this.winner = -1;
        this.config = { boardSize: 8, cellSize: 60 };
        this.board = Array(8).fill(null).map(() => Array(8).fill(0));
        this.currentPlayer = 0;
        this.selectedX = -1;
        this.selectedY = -1;
        // Setup: 1=red, 2=red king, 3=black, 4=black king
        for (let y = 0; y < 3; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2 === 1) this.board[y][x] = 3;
        for (let y = 5; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2 === 1) this.board[y][x] = 1;
    }
    start() { this.started = true; }
    isPlayerPiece(player, piece) {
        return player === 0 ? (piece === 1 || piece === 2) : (piece === 3 || piece === 4);
    }
    getValidMoves() {
        const moves = [], captures = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (!this.isPlayerPiece(this.currentPlayer, this.board[y][x])) continue;
                const piece = this.board[y][x];
                const isKing = piece === 2 || piece === 4;
                const dirs = isKing ? [-1, 1] : (this.currentPlayer === 0 ? [-1] : [1]);
                for (const dy of dirs) {
                    for (const dx of [-1, 1]) {
                        const nx = x + dx, ny = y + dy;
                        if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) {
                            if (this.board[ny][nx] === 0) {
                                moves.push({ fromX: x, fromY: y, toX: nx, toY: ny, isCapture: false });
                            } else if (!this.isPlayerPiece(this.currentPlayer, this.board[ny][nx])) {
                                const jx = x + dx * 2, jy = y + dy * 2;
                                if (jx >= 0 && jx < 8 && jy >= 0 && jy < 8 && this.board[jy][jx] === 0) {
                                    captures.push({ fromX: x, fromY: y, toX: jx, toY: jy, isCapture: true });
                                }
                            }
                        }
                    }
                }
            }
        }
        return captures.length > 0 ? captures : moves;
    }
    handleInput(playerId, input) {
        if (playerId !== this.currentPlayer || this.gameOver) return;
        if (input.action === 'select') {
            const { x, y } = input;
            if (this.isPlayerPiece(playerId, this.board[y][x])) {
                this.selectedX = x;
                this.selectedY = y;
            }
        } else if (input.action === 'move' && this.selectedX >= 0) {
            const { x: toX, y: toY } = input;
            const validMoves = this.getValidMoves().filter(m => m.fromX === this.selectedX && m.fromY === this.selectedY);
            const move = validMoves.find(m => m.toX === toX && m.toY === toY);
            if (move) {
                this.board[toY][toX] = this.board[this.selectedY][this.selectedX];
                this.board[this.selectedY][this.selectedX] = 0;
                if (move.isCapture) {
                    this.board[(this.selectedY + toY) / 2][(this.selectedX + toX) / 2] = 0;
                }
                // King promotion
                if (toY === 0 && this.board[toY][toX] === 1) this.board[toY][toX] = 2;
                if (toY === 7 && this.board[toY][toX] === 3) this.board[toY][toX] = 4;

                this.selectedX = -1;
                this.selectedY = -1;
                this.currentPlayer = 1 - this.currentPlayer;

                // Check win
                if (this.getValidMoves().length === 0) {
                    this.gameOver = true;
                    this.winner = 1 - this.currentPlayer;
                }
            }
        }
    }
    update(dt) {}
    getState() {
        const pieces = [0, 0];
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
            if (this.board[y][x] === 1 || this.board[y][x] === 2) pieces[0]++;
            if (this.board[y][x] === 3 || this.board[y][x] === 4) pieces[1]++;
        }
        return {
            board: this.board,
            currentPlayer: this.currentPlayer,
            selectedX: this.selectedX,
            selectedY: this.selectedY,
            validMoves: this.getValidMoves(),
            pieces,
            gameOver: this.gameOver,
            winner: this.winner,
            config: this.config
        };
    }
    isOver() { return this.gameOver; }
}

// Chat Room
class ChatRoom {
    constructor() {
        this.type = 'chat';
        this.minPlayers = 1;
        this.maxPlayers = 100;
        this.started = false;
        this.messages = [];
    }
    start() { this.started = true; }
    onPlayerJoin(id) {
        this.messages.push({ from: `User${id}`, text: 'joined the chat', timestamp: new Date().toLocaleTimeString(), type: 'join' });
    }
    handleInput(playerId, input) {
        if (input.message) {
            this.messages.push({ from: `User${playerId}`, text: input.message, timestamp: new Date().toLocaleTimeString(), type: 'message' });
            if (this.messages.length > 50) this.messages.shift();
        }
    }
    update(dt) {}
    getState() { return { messages: this.messages, users: [], gameOver: false }; }
    isOver() { return false; }
}

// Room class
class Room {
    constructor(id, name, gameType) {
        this.id = id;
        this.name = name;
        this.gameType = gameType;
        this.players = [];
        this.game = this.createGame(gameType);
    }
    createGame(type) {
        const games = { pong: PongGame, snake: SnakeGame, tetris: TetrisGame, checkers: CheckersGame, chat: ChatRoom };
        return new (games[type] || ChatRoom)();
    }
    addPlayer(conn) {
        if (this.players.length >= this.game.maxPlayers) return false;
        const idx = this.players.length;
        conn.playerIndex = idx;
        conn.roomId = this.id;
        this.players.push(conn);
        if (this.game.onPlayerJoin) this.game.onPlayerJoin(idx);
        return true;
    }
    removePlayer(conn) {
        this.players = this.players.filter(p => p !== conn);
        conn.roomId = '';
        conn.playerIndex = -1;
    }
    broadcast(data) {
        this.players.forEach(p => p.send(data));
    }
    canStart() { return this.players.length >= this.game.minPlayers; }
}

// Game loop
let lastTime = Date.now();
setInterval(() => {
    const now = Date.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    rooms.forEach(room => {
        if (room.game.started && !room.game.isOver()) {
            room.game.update(dt);
            room.broadcast({ type: 'game_state', state: room.game.getState() });
        }
    });
}, 1000 / 60);

// Broadcast lobby state
function broadcastLobbyState() {
    const state = {
        type: 'lobby_state',
        rooms: Array.from(rooms.values()).map(r => ({
            id: r.id, name: r.name, game: r.gameType,
            playerCount: r.players.length, maxPlayers: r.game.maxPlayers,
            players: r.players.map(p => p.username), inProgress: r.game.started
        })),
        playerCount: lobbyPlayers.size,
        games: ['pong', 'snake', 'tetris', 'checkers', 'chat']
    };
    lobbyPlayers.forEach(conn => conn.send(state));
}

// WebSocket handlers
wss.on('connection', (ws) => {
    const conn = new Connection(ws, nextConnId++);
    connections.set(conn.id, conn);

    conn.send({ type: 'welcome', id: conn.id, games: ['pong', 'snake', 'tetris', 'checkers', 'chat'] });

    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);

            if (data.type === 'join_lobby') {
                conn.username = data.username || 'Player';
                conn.inLobby = true;
                lobbyPlayers.add(conn);
                broadcastLobbyState();
            }
            else if (data.type === 'create_room') {
                lobbyPlayers.delete(conn);
                const room = new Room(String(nextRoomId++), data.name || "Room", data.game || 'pong');
                rooms.set(room.id, room);
                room.addPlayer(conn);
                conn.send({ type: 'room_joined', roomId: room.id, roomName: room.name, game: room.gameType, playerIndex: conn.playerIndex, players: room.players.map(p => ({ username: p.username, index: p.playerIndex })) });
                broadcastLobbyState();
            }
            else if (data.type === 'join_room') {
                const room = rooms.get(data.roomId);
                if (room && room.addPlayer(conn)) {
                    lobbyPlayers.delete(conn);
                    conn.send({ type: 'room_joined', roomId: room.id, roomName: room.name, game: room.gameType, playerIndex: conn.playerIndex, players: room.players.map(p => ({ username: p.username, index: p.playerIndex })) });
                    room.broadcast({ type: 'player_joined', username: conn.username, playerIndex: conn.playerIndex });
                    broadcastLobbyState();
                }
            }
            else if (data.type === 'leave_room') {
                const room = rooms.get(conn.roomId);
                if (room) {
                    room.removePlayer(conn);
                    room.broadcast({ type: 'player_left', username: conn.username });
                    if (room.players.length === 0) rooms.delete(room.id);
                }
                conn.inLobby = true;
                lobbyPlayers.add(conn);
                broadcastLobbyState();
            }
            else if (data.type === 'start_game') {
                const room = rooms.get(conn.roomId);
                if (room && conn.playerIndex === 0 && room.canStart()) {
                    room.game.start();
                    room.broadcast({ type: 'game_started', game: room.gameType });
                    broadcastLobbyState();
                }
            }
            else if (data.type === 'input') {
                const room = rooms.get(conn.roomId);
                if (room && room.game.started) {
                    room.game.handleInput(conn.playerIndex, data);
                }
            }
        } catch (e) {
            console.error('Message error:', e);
        }
    });

    ws.on('close', () => {
        const room = rooms.get(conn.roomId);
        if (room) {
            room.removePlayer(conn);
            room.broadcast({ type: 'player_left', username: conn.username });
            if (room.players.length === 0) rooms.delete(room.id);
        }
        lobbyPlayers.delete(conn);
        connections.delete(conn.id);
        broadcastLobbyState();
    });
});

httpServer.listen(PORT, () => {
    console.log('=================================');
    console.log('    Game Server (Node.js)');
    console.log('=================================');
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Open that URL in your browser to play!');
    console.log('');
    console.log('Supported games: Pong, Snake, Tetris, Checkers, Chat');
});
