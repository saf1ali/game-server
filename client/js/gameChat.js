// In-game chat component for all games
const GameChat = {
    container: null,
    messagesEl: null,
    inputEl: null,
    messages: [],
    isMinimized: false,
    unreadCount: 0,

    init() {
        this.createUI();
        this.setupSocketHandlers();
    },

    createUI() {
        // Remove existing if present
        const existing = document.getElementById('game-chat');
        if (existing) existing.remove();

        // Create chat container
        this.container = document.createElement('div');
        this.container.id = 'game-chat';
        this.container.innerHTML = `
            <div class="game-chat-header">
                <span class="game-chat-title">Chat</span>
                <span class="game-chat-unread" style="display: none;">0</span>
                <button class="game-chat-toggle">_</button>
            </div>
            <div class="game-chat-body">
                <div class="game-chat-messages"></div>
                <div class="game-chat-input-area">
                    <input type="text" class="game-chat-input" placeholder="Type a message..." maxlength="200">
                    <button class="game-chat-send">Send</button>
                </div>
            </div>
        `;

        // Add styles
        this.addStyles();

        // Add to game container
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.appendChild(this.container);
        }

        // Get elements
        this.messagesEl = this.container.querySelector('.game-chat-messages');
        this.inputEl = this.container.querySelector('.game-chat-input');

        // Setup event listeners
        this.container.querySelector('.game-chat-toggle').addEventListener('click', () => this.toggleMinimize());
        this.container.querySelector('.game-chat-send').addEventListener('click', () => this.sendMessage());
        this.inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Prevent game inputs while typing
        this.inputEl.addEventListener('keydown', (e) => e.stopPropagation());
    },

    addStyles() {
        if (document.getElementById('game-chat-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'game-chat-styles';
        styles.textContent = `
            #game-chat {
                position: absolute;
                bottom: 10px;
                right: 10px;
                width: 280px;
                background: rgba(10, 10, 20, 0.95);
                border: 1px solid rgba(5, 217, 232, 0.3);
                border-radius: 8px;
                font-family: 'Rajdhani', sans-serif;
                z-index: 100;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                box-shadow: 0 0 20px rgba(5, 217, 232, 0.2);
            }

            #game-chat.minimized {
                width: 120px;
            }

            #game-chat.minimized .game-chat-body {
                display: none;
            }

            .game-chat-header {
                display: flex;
                align-items: center;
                padding: 8px 12px;
                background: linear-gradient(135deg, rgba(255, 42, 109, 0.2), rgba(5, 217, 232, 0.2));
                border-radius: 8px 8px 0 0;
                cursor: pointer;
                user-select: none;
                border-bottom: 1px solid rgba(5, 217, 232, 0.2);
            }

            .game-chat-title {
                flex: 1;
                color: #05d9e8;
                font-size: 14px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .game-chat-unread {
                background: linear-gradient(135deg, #ff2a6d, #d300c5);
                color: white;
                font-size: 11px;
                padding: 2px 8px;
                border-radius: 10px;
                margin-right: 8px;
                animation: neonPulse 1s infinite;
                box-shadow: 0 0 10px rgba(255, 42, 109, 0.5);
            }

            @keyframes neonPulse {
                0%, 100% { transform: scale(1); box-shadow: 0 0 10px rgba(255, 42, 109, 0.5); }
                50% { transform: scale(1.1); box-shadow: 0 0 20px rgba(255, 42, 109, 0.8); }
            }

            .game-chat-toggle {
                background: none;
                border: none;
                color: #05d9e8;
                cursor: pointer;
                font-size: 16px;
                padding: 0 4px;
                transition: all 0.2s;
            }

            .game-chat-toggle:hover {
                color: #ff2a6d;
                text-shadow: 0 0 10px rgba(255, 42, 109, 0.8);
            }

            .game-chat-body {
                display: flex;
                flex-direction: column;
                height: 200px;
            }

            .game-chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 8px;
                font-size: 13px;
            }

            .game-chat-messages::-webkit-scrollbar {
                width: 6px;
            }

            .game-chat-messages::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, #ff2a6d, #05d9e8);
                border-radius: 3px;
            }

            .game-chat-msg {
                margin-bottom: 6px;
                padding: 6px 10px;
                border-radius: 4px;
                animation: slideIn 0.2s ease;
            }

            @keyframes slideIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .game-chat-msg.self {
                background: rgba(5, 217, 232, 0.15);
                border-left: 2px solid #05d9e8;
                text-align: right;
            }

            .game-chat-msg.other {
                background: rgba(255, 42, 109, 0.1);
                border-left: 2px solid #ff2a6d;
            }

            .game-chat-msg.system {
                background: none;
                color: #8a8a8a;
                font-style: italic;
                text-align: center;
                font-size: 11px;
                border: none;
            }

            .game-chat-msg-user {
                color: #ff2a6d;
                font-weight: 600;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .game-chat-msg.self .game-chat-msg-user {
                color: #05d9e8;
            }

            .game-chat-msg-text {
                color: #e0e0e0;
                word-wrap: break-word;
            }

            .game-chat-input-area {
                display: flex;
                gap: 6px;
                padding: 8px;
                border-top: 1px solid rgba(5, 217, 232, 0.2);
                overflow: hidden;
            }

            .game-chat-input {
                flex: 1;
                min-width: 0;
                padding: 8px 12px;
                border: 1px solid rgba(5, 217, 232, 0.3);
                border-radius: 4px;
                background: rgba(10, 10, 20, 0.8);
                color: #e0e0e0;
                font-size: 13px;
                font-family: 'Rajdhani', sans-serif;
                outline: none;
                transition: all 0.2s;
            }

            .game-chat-input:focus {
                border-color: #05d9e8;
                box-shadow: 0 0 10px rgba(5, 217, 232, 0.3);
            }

            .game-chat-send {
                padding: 8px 14px;
                background: linear-gradient(135deg, #ff2a6d, #d300c5);
                border: none;
                border-radius: 4px;
                color: white;
                font-size: 12px;
                font-family: 'Rajdhani', sans-serif;
                font-weight: 600;
                text-transform: uppercase;
                cursor: pointer;
                transition: all 0.2s;
                flex-shrink: 0;
                white-space: nowrap;
            }

            .game-chat-send:hover {
                box-shadow: 0 0 15px rgba(255, 42, 109, 0.5);
                transform: translateY(-1px);
            }

            .game-chat-typing {
                padding: 4px 8px;
                color: #8a8a8a;
                font-size: 11px;
                font-style: italic;
            }
        `;
        document.head.appendChild(styles);
    },

    setupSocketHandlers() {
        socket.on('chat', (data) => {
            // Skip our own messages - we already added them locally in sendMessage()
            if (data.from === App.username) return;
            this.addMessage(data.from, data.message, false);
        });

        socket.on('player_joined', (data) => {
            this.addSystemMessage(`${data.username} joined the game`);
        });

        socket.on('player_left', (data) => {
            this.addSystemMessage(`${data.username} left the game`);
        });
    },

    addMessage(username, text, isSelf = false) {
        const msgEl = document.createElement('div');
        msgEl.className = `game-chat-msg ${isSelf ? 'self' : 'other'}`;
        msgEl.innerHTML = `
            <div class="game-chat-msg-user">${this.escapeHtml(username)}</div>
            <div class="game-chat-msg-text">${this.escapeHtml(text)}</div>
        `;

        this.messagesEl.appendChild(msgEl);
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;

        // Update unread count if minimized
        if (this.isMinimized && !isSelf) {
            this.unreadCount++;
            this.updateUnreadBadge();
        }

        // Play sound effect (subtle)
        this.playMessageSound(isSelf);
    },

    addSystemMessage(text) {
        const msgEl = document.createElement('div');
        msgEl.className = 'game-chat-msg system';
        msgEl.innerHTML = `<div class="game-chat-msg-text">${this.escapeHtml(text)}</div>`;

        this.messagesEl.appendChild(msgEl);
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    },

    sendMessage() {
        const text = this.inputEl.value.trim();
        if (!text) return;

        socket.send('chat', { message: text });
        this.addMessage(App.username, text, true);
        this.inputEl.value = '';
    },

    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        this.container.classList.toggle('minimized', this.isMinimized);

        if (!this.isMinimized) {
            this.unreadCount = 0;
            this.updateUnreadBadge();
        }

        const toggleBtn = this.container.querySelector('.game-chat-toggle');
        toggleBtn.textContent = this.isMinimized ? '+' : '_';
    },

    updateUnreadBadge() {
        const badge = this.container.querySelector('.game-chat-unread');
        if (this.unreadCount > 0) {
            badge.textContent = this.unreadCount;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }
    },

    playMessageSound(isSelf) {
        // Create a subtle notification sound using Web Audio API
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.frequency.value = isSelf ? 800 : 600;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.05;

            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
            oscillator.stop(audioCtx.currentTime + 0.1);
        } catch (e) {
            // Audio not supported or blocked
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    cleanup() {
        if (this.container) {
            this.container.remove();
        }
        this.messages = [];
        this.unreadCount = 0;
    }
};
