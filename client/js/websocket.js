// WebSocket client wrapper
class GameWebSocket {
    constructor() {
        this.ws = null;
        this.handlers = new Map();
        this.connected = false;
    }

    connect(url = 'ws://localhost:9001') {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                this.connected = true;
                console.log('Connected to server');
                resolve();
            };

            this.ws.onclose = () => {
                this.connected = false;
                console.log('Disconnected from server');
                this.emit('disconnect');
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.emit(data.type, data);
                } catch (e) {
                    console.error('Failed to parse message:', e);
                }
            };
        });
    }

    send(type, data = {}) {
        if (!this.connected) return;
        this.ws.send(JSON.stringify({ type, ...data }));
    }

    on(type, handler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, []);
        }
        this.handlers.get(type).push(handler);
    }

    off(type, handler) {
        if (!this.handlers.has(type)) return;
        const handlers = this.handlers.get(type);
        const index = handlers.indexOf(handler);
        if (index !== -1) handlers.splice(index, 1);
    }

    emit(type, data) {
        const handlers = this.handlers.get(type) || [];
        handlers.forEach(handler => handler(data));
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Global instance
const socket = new GameWebSocket();
