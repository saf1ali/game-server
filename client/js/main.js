// Main application controller
const App = {
    username: '',
    currentRoom: null,
    playerIndex: -1,

    async init() {
        // Login handler
        document.getElementById('join-btn').addEventListener('click', () => this.login());
        document.getElementById('username-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });

        // Leave room handler
        document.getElementById('leave-room-btn').addEventListener('click', () => this.leaveRoom());

        // Start game handler
        document.getElementById('start-game-btn').addEventListener('click', () => {
            socket.send('start_game');
        });

        // Back to menu handler
        document.getElementById('back-to-menu-btn').addEventListener('click', () => this.backToMenu());

        // Initialize lobby
        Lobby.init();

        // Socket handlers
        socket.on('disconnect', () => {
            alert('Disconnected from server');
            this.showScreen('login');
        });

        socket.on('player_joined', (data) => this.updatePlayerList());
        socket.on('player_left', (data) => this.updatePlayerList());
        socket.on('game_started', () => {
            const startBtn = document.getElementById('start-game-btn');
            startBtn.style.display = 'none';
            startBtn.textContent = 'Start Game';
            // Reset game state for fresh start
            if (Game.renderer && Game.renderer.reset) {
                Game.renderer.reset();
            }
        });
    },

    async login() {
        const input = document.getElementById('username-input');
        this.username = input.value.trim() || 'Player';

        try {
            await socket.connect();
            socket.send('join_lobby', { username: this.username });
            this.showScreen('lobby');
        } catch (error) {
            alert('Failed to connect to server. Make sure the server is running.');
        }
    },

    leaveRoom() {
        // Only send leave_room for multiplayer games
        if (!Game.isSinglePlayer) {
            socket.send('leave_room');
        }
        Game.cleanup();
        this.currentRoom = null;
        this.showScreen('lobby');
    },

    backToMenu() {
        socket.disconnect();
        this.username = '';
        this.currentRoom = null;
        this.playerIndex = -1;
        this.showScreen('login');
    },

    updatePlayerList() {
        if (!this.currentRoom) return;

        const container = document.getElementById('player-list');
        const players = this.currentRoom.players || [];
        container.innerHTML = players.map((p, i) =>
            `<span class="player-tag ${i === this.playerIndex ? 'you' : ''}">${Lobby.escapeHtml(p.username)}</span>`
        ).join('');
    },

    showScreen(name) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`${name}-screen`).classList.add('active');
    }
};

// Game controller
const Game = {
    type: null,
    renderer: null,
    isSinglePlayer: false,

    init(type, roomData) {
        // Clean up any previous game first
        this.cleanup();

        this.type = type;
        this.isSinglePlayer = false;
        document.getElementById('room-title').textContent = roomData.roomName;

        // Show/hide start button
        const startBtn = document.getElementById('start-game-btn');
        startBtn.style.display = App.playerIndex === 0 ? 'inline-block' : 'none';

        // Setup renderer
        const canvas = document.getElementById('game-canvas');

        // Clear canvas before starting new game
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (type === 'pong') {
            this.renderer = PongRenderer;
            this.renderer.init(canvas);
        } else if (type === 'snake') {
            this.renderer = SnakeRenderer;
            this.renderer.init(canvas);
        } else if (type === 'tetris') {
            this.renderer = TetrisRenderer;
            this.renderer.init(canvas);
        } else if (type === 'checkers') {
            this.renderer = CheckersRenderer;
            this.renderer.init(canvas);
        } else if (type === 'connect4') {
            this.renderer = Connect4Renderer;
            this.renderer.init(canvas);
        } else if (type === 'breakout') {
            this.renderer = BreakoutGame;
            this.renderer.init(canvas);
        } else if (type === 'chat') {
            this.renderer = ChatRenderer;
            this.renderer.init();
        }

        // Initialize in-game chat for all games except chat room
        if (type !== 'chat' && typeof GameChat !== 'undefined') {
            GameChat.init();
        }

        // Update player list
        App.currentRoom.players = roomData.players;
        App.updatePlayerList();

        // Listen for game state
        socket.on('game_state', (data) => {
            if (this.renderer) {
                this.renderer.updateState(data.state);
            }
        });

        // Listen for player updates
        socket.on('player_joined', (data) => {
            if (!App.currentRoom.players) App.currentRoom.players = [];
            App.currentRoom.players.push({ username: data.username, index: data.playerIndex });
            App.updatePlayerList();
        });

        socket.on('player_left', (data) => {
            if (App.currentRoom.players) {
                App.currentRoom.players = App.currentRoom.players.filter(p => p.username !== data.username);
                App.updatePlayerList();
            }
        });

        socket.on('game_over', (data) => {
            if (this.renderer) {
                this.renderer.updateState(data.state);
            }
            // Show restart button for player 1
            if (App.playerIndex === 0) {
                const startBtn = document.getElementById('start-game-btn');
                startBtn.textContent = 'Restart Game';
                startBtn.style.display = 'inline-block';
            }
        });
    },

    cleanup() {
        if (this.renderer && this.renderer.cleanup) {
            this.renderer.cleanup();
        }
        this.renderer = null;
        this.type = null;
        this.isSinglePlayer = false;
        socket.off('game_state');
        socket.off('game_over');
        const startBtn = document.getElementById('start-game-btn');
        startBtn.textContent = 'Start Game';
        startBtn.style.display = 'inline-block';

        // Cleanup in-game chat
        if (typeof GameChat !== 'undefined') {
            GameChat.cleanup();
        }
    },

    // Initialize single-player games (run entirely in browser)
    initSinglePlayer(type) {
        // Clean up any previous game first
        this.cleanup();

        this.type = type;
        this.isSinglePlayer = true;
        document.getElementById('room-title').textContent = type.charAt(0).toUpperCase() + type.slice(1);

        // Hide start button for single-player games (they start immediately)
        const startBtn = document.getElementById('start-game-btn');
        startBtn.style.display = 'none';

        // Hide player list for single-player
        document.getElementById('player-list').innerHTML = '';

        // Setup renderer
        const canvas = document.getElementById('game-canvas');

        // Clear canvas before starting new game
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (type === 'breakout') {
            this.renderer = BreakoutGame;
            this.renderer.init(canvas);
        }
        // Add more single-player games here
    }
};

// Start app
document.addEventListener('DOMContentLoaded', () => App.init());
