// ============================================
// NetworkManager - Socket.io client
// ============================================

import { io } from 'socket.io-client';

export class NetworkManager {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.socket = null;
        this.playerId = null;
        
        this.listeners = new Map();
        this.pingInterval = null;
        this.lastPingTime = 0;
    }
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    emit(event, ...args) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(cb => cb(...args));
        }
    }
    
    connect() {
        this.socket = io(this.serverUrl, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.emit('connected');
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.emit('disconnected');
            this.stopPing();
        });
        
        this.socket.on('init', (data) => {
            this.playerId = data.playerId;
            console.log('Player ID:', this.playerId);
            this.emit('init', data);
        });
        
        this.socket.on('gameState', (state) => {
            this.emit('gameState', state);
        });
        
        this.socket.on('playerJoined', (data) => {
            this.emit('playerJoined', data);
        });
        
        this.socket.on('playerLeft', (data) => {
            this.emit('playerLeft', data);
        });
        
        this.socket.on('playerHit', (data) => {
            this.emit('playerHit', data);
        });
        
        this.socket.on('playerDeath', (data) => {
            this.emit('playerDeath', data);
        });
        
        this.socket.on('respawned', (data) => {
            this.emit('respawned', data);
        });
        
        this.socket.on('powerUpCollected', (data) => {
            this.emit('powerUpCollected', data);
        });
        
        this.socket.on('blockDestroyed', (data) => {
            this.emit('blockDestroyed', data);
        });
        
        this.socket.on('bulletsCreated', (data) => {
            this.emit('bulletsCreated', data);
        });
        
        this.socket.on('arenaResize', (data) => {
            this.emit('arenaResize', data);
        });
        
        this.socket.on('serverFull', (data) => {
            this.emit('serverFull', data);
        });
        
        // Ping/pong for latency
        this.socket.on('pong', (timestamp) => {
            const ping = Date.now() - timestamp;
            this.emit('ping', ping);
        });
    }
    
    startPing() {
        this.pingInterval = setInterval(() => {
            if (this.socket?.connected) {
                this.socket.emit('ping', Date.now());
            }
        }, 2000);
    }
    
    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    join(nickname) {
        if (this.socket) {
            this.socket.emit('join', { nickname });
            this.startPing();
        }
    }
    
    sendInput(input) {
        if (this.socket?.connected) {
            this.socket.volatile.emit('input', input);
        }
    }
    
    shoot() {
        if (this.socket?.connected) {
            this.socket.emit('shoot');
        }
    }
    
    respawn() {
        if (this.socket?.connected) {
            this.socket.emit('respawn');
        }
    }
    
    disconnect() {
        this.stopPing();
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}
