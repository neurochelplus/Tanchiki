// ============================================
// SocketHandler - Network message handling
// ============================================

export class SocketHandler {
    constructor(io, gameLoop) {
        this.io = io;
        this.gameLoop = gameLoop;
        this.gameState = gameLoop.gameState;
        
        // Setup game loop callbacks
        this.setupGameCallbacks();
        
        // Broadcast state at fixed interval (optimized to 10 Hz)
        this.broadcastInterval = setInterval(() => {
            this.broadcastGameState();
        }, 1000 / 10); // 10 Hz (was 20 Hz)
    }
    
    setupGameCallbacks() {
        this.gameLoop.onPlayerHit = (targetId, shooterId, damage) => {
            this.io.emit('playerHit', { targetId, shooterId, damage });
        };
        
        this.gameLoop.onPlayerDeath = (playerId, killerId) => {
            const killer = this.gameState.getPlayer(killerId);
            const victim = this.gameState.getPlayer(playerId);
            
            this.io.emit('playerDeath', {
                playerId,
                killerId,
                killerName: killer?.nickname || 'Unknown',
                victimName: victim?.nickname || 'Unknown'
            });
        };
        
        this.gameLoop.onPowerUpCollected = (playerId, type) => {
            this.io.emit('powerUpCollected', { playerId, type });
        };
        
        this.gameLoop.onBlockDestroyed = (blockId) => {
            this.io.emit('blockDestroyed', { blockId });
        };
        
        this.gameLoop.onArenaResize = (newSize) => {
            this.io.emit('arenaResize', { size: newSize });
        };
    }
    
    handleConnection(socket) {
        console.log(`🔌 Client connected: ${socket.id}`);
        
        // Send initial game state
        socket.emit('init', {
            playerId: socket.id,
            state: this.gameState.getFullState()
        });
        
        // Handle player join
        socket.on('join', (data) => {
            this.handleJoin(socket, data);
        });
        
        // Handle player input
        socket.on('input', (data) => {
            this.handleInput(socket, data);
        });
        
        // Handle shooting
        socket.on('shoot', () => {
            this.handleShoot(socket);
        });
        
        // Handle respawn request
        socket.on('respawn', () => {
            this.handleRespawn(socket);
        });
        
        // Handle ping for latency measurement
        socket.on('ping', (timestamp) => {
            socket.emit('pong', timestamp);
        });
        
        // Handle disconnect
        socket.on('disconnect', () => {
            this.handleDisconnect(socket);
        });
    }
    
    handleJoin(socket, data) {
        // Check if server is full (limit 50 players)
        if (this.gameState.getPlayerCount() >= 50) {
            socket.emit('serverFull', { message: 'На арене сейчас слишком жарко! Сервер переполнен. Попробуй зайти через 5 минут или загляни в мой Telegram, чтобы узнать, когда мы расширим мощности' });
            return;
        }

        const nickname = (data.nickname || 'Player').substring(0, 16);
        const player = this.gameState.addPlayer(socket.id, nickname);
        
        console.log(`🎮 ${nickname} joined the game`);
        
        // Notify all players
        this.io.emit('playerJoined', {
            id: player.id,
            nickname: player.nickname
        });
        
        // Send full state to new player
        socket.emit('gameState', this.gameState.getFullState());
    }
    
    handleInput(socket, data) {
        const player = this.gameState.getPlayer(socket.id);
        if (player) {
            player.updateInput(data);
        }
    }
    
    handleShoot(socket) {
        const bullets = this.gameLoop.playerShoot(socket.id);
        
        if (bullets.length > 0) {
            // Broadcast new bullets
            this.io.emit('bulletsCreated', {
                playerId: socket.id,
                bullets: bullets.map(b => b.serialize())
            });
        }
    }
    
    handleRespawn(socket) {
        const player = this.gameLoop.respawnPlayer(socket.id);
        
        if (player) {
            socket.emit('respawned', {
                player: player.serialize()
            });
            
            this.io.emit('playerRespawned', {
                playerId: socket.id
            });
        }
    }
    
    handleDisconnect(socket) {
        const player = this.gameState.getPlayer(socket.id);
        const nickname = player?.nickname || 'Unknown';
        
        this.gameState.removePlayer(socket.id);
        
        console.log(`👋 ${nickname} left the game`);
        
        this.io.emit('playerLeft', {
            id: socket.id,
            nickname
        });
    }
    
    broadcastGameState() {
        // Optimized: send different states to different players based on AOI
        for (const [playerId, player] of this.gameState.players) {
            const socket = this.io.sockets.sockets.get(playerId);
            if (socket) {
                socket.emit('gameState', this.gameState.getStateForPlayer(playerId));
            }
        }
    }
}
