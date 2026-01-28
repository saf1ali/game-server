// Chat room renderer
const ChatRenderer = {
    container: null,
    messagesEl: null,
    inputEl: null,

    init() {
        this.container = document.getElementById('chat-container');
        this.messagesEl = document.getElementById('chat-messages');
        this.inputEl = document.getElementById('chat-input');

        document.getElementById('game-canvas').style.display = 'none';
        this.container.classList.remove('hidden');

        document.getElementById('send-chat').addEventListener('click', () => this.sendMessage());
        this.inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    },

    sendMessage() {
        const text = this.inputEl.value.trim();
        if (!text) return;

        socket.send('input', { message: text });
        this.inputEl.value = '';
    },

    updateState(state) {
        this.messagesEl.innerHTML = state.messages.map(msg => {
            if (msg.type === 'join' || msg.type === 'leave') {
                return `<div class="chat-message system">${this.escapeHtml(msg.from)} ${msg.text}</div>`;
            }
            return `
                <div class="chat-message">
                    <div class="meta">
                        <span class="username">${this.escapeHtml(msg.from)}</span>
                        <span class="time">${msg.timestamp}</span>
                    </div>
                    <div class="text">${this.escapeHtml(msg.text)}</div>
                </div>
            `;
        }).join('');

        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    cleanup() {
        this.container.classList.add('hidden');
        document.getElementById('game-canvas').style.display = 'block';
    }
};
