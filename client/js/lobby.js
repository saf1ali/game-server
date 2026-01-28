// Lobby UI management
const Lobby = {
    rooms: [],
    selectedGame: 'pong',

    init() {
        // Create room modal
        document.getElementById('create-room-btn').addEventListener('click', () => {
            document.getElementById('create-modal').classList.add('active');
        });

        document.getElementById('cancel-create').addEventListener('click', () => {
            document.getElementById('create-modal').classList.remove('active');
        });

        document.getElementById('confirm-create').addEventListener('click', () => {
            this.createRoom();
        });

        // Game type selection
        document.querySelectorAll('.game-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.game-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.selectedGame = btn.dataset.game;
            });
        });

        // Socket handlers
        socket.on('lobby_state', (data) => this.updateLobby(data));
        socket.on('room_joined', (data) => this.onRoomJoined(data));
        socket.on('error', (data) => alert(data.message));
    },

    updateLobby(data) {
        this.rooms = data.rooms || [];
        document.getElementById('online-count').textContent = data.playerCount || 0;
        this.renderRooms();
    },

    renderRooms() {
        const container = document.getElementById('rooms-list');

        if (this.rooms.length === 0) {
            container.innerHTML = '<p class="empty-state">No rooms available. Create one!</p>';
            return;
        }

        container.innerHTML = this.rooms.map(room => `
            <div class="room-card" data-room-id="${room.id}">
                <div class="room-info">
                    <h4>${this.escapeHtml(room.name)}</h4>
                    <div class="room-meta">
                        <span class="game-type">${this.getGameIcon(room.game)} ${room.game}</span>
                        <span>${room.playerCount}/${room.maxPlayers} players</span>
                        ${room.inProgress ? '<span class="in-progress">In Progress</span>' : ''}
                    </div>
                </div>
                <button class="btn primary" onclick="Lobby.joinRoom('${room.id}')">Join</button>
            </div>
        `).join('');
    },

    getGameIcon(game) {
        const icons = { pong: '🏓', snake: '🐍', tetris: '🧱', checkers: '🎯', chat: '💬' };
        return icons[game] || '🎮';
    },

    createRoom() {
        const name = document.getElementById('room-name-input').value.trim() || 'My Room';
        socket.send('create_room', { game: this.selectedGame, name });
        document.getElementById('create-modal').classList.remove('active');
        document.getElementById('room-name-input').value = '';
    },

    joinRoom(roomId) {
        socket.send('join_room', { roomId });
    },

    onRoomJoined(data) {
        App.currentRoom = data;
        App.playerIndex = data.playerIndex;
        App.showScreen('game');
        Game.init(data.game, data);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
