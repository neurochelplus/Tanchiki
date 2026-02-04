// ============================================
// Game State - Central state management
// ============================================

import { Player } from './Player.js';
import { Bullet } from './Bullet.js';
import { PowerUp } from './PowerUp.js';
import { DestructibleBlock } from './DestructibleBlock.js';
import { ArenaManager } from './ArenaManager.js';
import { SpatialHash } from '../utils/SpatialHash.js';

export class GameState {
    constructor() {
        this.players = new Map();        // id -> Player
        this.bullets = new Map();         // id -> Bullet
        this.powerUps = new Map();        // id -> PowerUp
        this.blocks = new Map();          // id -> DestructibleBlock
        
        this.arenaManager = new ArenaManager();
        this.arenaSize = this.arenaManager.currentSize;
        
        // Spatial hashing for collision optimization
        this.spatialHash = new SpatialHash(100); // 100 unit cells
        
        // ID counters
        this.bulletIdCounter = 0;
        this.powerUpIdCounter = 0;
        this.blockIdCounter = 0;
        
        // Configuration
        this.config = {
            maxPowerUps: 15,
            maxBlocks: 50,
            powerUpSpawnInterval: 5000,  // ms
            blockRespawnInterval: 3000,  // ms - faster respawn for blocks
            bulletSpeed: 400,
            bulletLifetime: 750,         // ms (Reduced range: 400 * 0.75 = 300 units)
            playerMaxHp: 100,
            playerSpeed: 150,
            playerSize: 30,
            bulletDamage: 25,
            respawnInvulnerability: 2000 // ms
        };
        
        // Timers
        this.lastPowerUpSpawn = Date.now();
        this.lastBlockSpawn = Date.now();
        
        // Initialize some blocks
        this.initializeBlocks();
    }
    
    initializeBlocks() {
        const blockCount = 20;
        for (let i = 0; i < blockCount; i++) {
            this.spawnBlock();
        }
    }
    
    // Player management
    addPlayer(id, nickname) {
        const spawnPos = this.getRandomSpawnPosition();
        const player = new Player(id, nickname, spawnPos.x, spawnPos.z);
        player.invulnerableUntil = Date.now() + this.config.respawnInvulnerability;
        this.players.set(id, player);
        this.updateArenaSize();
        return player;
    }
    
    removePlayer(id) {
        this.players.delete(id);
        this.updateArenaSize();
    }
    
    getPlayer(id) {
        return this.players.get(id);
    }
    
    getPlayerCount() {
        return this.players.size;
    }
    
    // Arena size management
    updateArenaSize() {
        const newSize = this.arenaManager.calculateSize(this.players.size);
        if (newSize !== this.arenaSize) {
            this.arenaSize = newSize;
            this.clampPlayersToArena();
            this.clampBlocksToArena();
            return true;
        }
        return false;
    }
    
    clampPlayersToArena() {
        const halfSize = this.arenaSize / 2 - 50;
        for (const player of this.players.values()) {
            player.x = Math.max(-halfSize, Math.min(halfSize, player.x));
            player.z = Math.max(-halfSize, Math.min(halfSize, player.z));
        }
    }
    
    clampBlocksToArena() {
        const halfSize = this.arenaSize / 2 - 50;
        for (const [id, block] of this.blocks) {
            if (Math.abs(block.x) > halfSize || Math.abs(block.z) > halfSize) {
                this.blocks.delete(id);
            }
        }
    }
    
    getRandomSpawnPosition() {
        const halfSize = this.arenaSize / 2 - 100;
        return {
            x: (Math.random() - 0.5) * 2 * halfSize,
            z: (Math.random() - 0.5) * 2 * halfSize
        };
    }
    
    // Bullet management
    addBullet(playerId, x, z, angle, isTriple = false) {
        const player = this.players.get(playerId);
        if (!player) return [];
        
        const bullets = [];
        const angles = isTriple ? [angle - 0.2, angle, angle + 0.2] : [angle];
        
        for (const bulletAngle of angles) {
            const id = `b_${this.bulletIdCounter++}`;
            const bullet = new Bullet(
                id,
                playerId,
                x,
                z,
                bulletAngle,
                this.config.bulletSpeed,
                this.config.bulletDamage
            );
            this.bullets.set(id, bullet);
            bullets.push(bullet);
        }
        
        return bullets;
    }
    
    removeBullet(id) {
        this.bullets.delete(id);
    }
    
    // PowerUp management
    spawnPowerUp() {
        if (this.powerUps.size >= this.config.maxPowerUps) return null;
        
        const types = ['tripleShot', 'speed', 'heal'];
        const type = types[Math.floor(Math.random() * types.length)];
        const pos = this.getRandomSpawnPosition();
        
        const id = `p_${this.powerUpIdCounter++}`;
        const powerUp = new PowerUp(id, type, pos.x, pos.z);
        this.powerUps.set(id, powerUp);
        
        return powerUp;
    }
    
    removePowerUp(id) {
        this.powerUps.delete(id);
    }
    
    // Block management
    spawnBlock() {
        if (this.blocks.size >= this.config.maxBlocks) return null;
        
        const pos = this.getRandomSpawnPosition();
        const id = `bl_${this.blockIdCounter++}`;
        const block = new DestructibleBlock(id, pos.x, pos.z);
        this.blocks.set(id, block);
        
        return block;
    }
    
    removeBlock(id) {
        this.blocks.delete(id);
    }
    
    // Periodic spawning
    updateSpawns() {
        const now = Date.now();
        
        if (now - this.lastPowerUpSpawn > this.config.powerUpSpawnInterval) {
            this.spawnPowerUp();
            this.lastPowerUpSpawn = now;
        }
        
        // Respawn blocks more aggressively - spawn if below 80% capacity
        if (now - this.lastBlockSpawn > this.config.blockRespawnInterval) {
            if (this.blocks.size < this.config.maxBlocks * 0.8) {
                this.spawnBlock();
            }
            this.lastBlockSpawn = now;
        }
    }
    
    // Serialization for network
    getFullState() {
        return {
            players: Array.from(this.players.values()).map(p => p.serialize()),
            bullets: Array.from(this.bullets.values()).map(b => b.serialize()),
            powerUps: Array.from(this.powerUps.values()).map(p => p.serialize()),
            blocks: Array.from(this.blocks.values()).map(b => b.serialize()),
            arenaSize: this.arenaSize
        };
    }
    
    // Get state for specific player (with area of interest filtering)
    getStateForPlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return this.getFullState();
        
        const viewRadius = 1000; // Units visible around player
        
        const isInRange = (obj) => {
            const dx = obj.x - player.x;
            const dz = obj.z - player.z;
            return dx * dx + dz * dz < viewRadius * viewRadius;
        };
        
        return {
            players: Array.from(this.players.values()).map(p => p.serialize()),
            bullets: Array.from(this.bullets.values())
                .filter(isInRange)
                .map(b => b.serialize()),
            powerUps: Array.from(this.powerUps.values())
                .filter(isInRange)
                .map(p => p.serialize()),
            blocks: Array.from(this.blocks.values())
                .filter(isInRange)
                .map(b => b.serialize()),
            arenaSize: this.arenaSize
        };
    }
}
