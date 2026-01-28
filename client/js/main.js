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
            document.getElementById('start-game-btn').style.display = 'none';
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
        socket.send('leave_room');
        Game.cleanup();
        this.currentRoom = null;
        this.showScreen('lobby');
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

    init(type, roomData) {
        this.type = type;
        document.getElementById('room-title').textContent = roomData.roomName;

        // Show/hide start button
        const startBtn = document.getElementById('start-game-btn');
        startBtn.style.display = App.playerIndex === 0 ? 'inline-block' : 'none';

        // Setup renderer
        const canvas = document.getElementById('game-canvas');

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
        } else if (type === 'chat') {
            this.renderer = ChatRenderer;
            this.renderer.init();
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
        });
    },

    cleanup() {
        if (this.renderer && this.renderer.cleanup) {
            this.renderer.cleanup();
        }
        this.renderer = null;
        this.type = null;
        socket.off('game_state');
        socket.off('game_over');
        document.getElementById('start-game-btn').style.display = 'inline-block';
    }
};

// Start app
document.addEventListener('DOMContentLoaded', () => App.init());
