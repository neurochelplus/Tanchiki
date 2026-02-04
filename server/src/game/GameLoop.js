// ============================================
// Game Loop - Main server tick loop (optimized)
// ============================================

import { GameState } from './GameState.js';
import { Collision } from './Collision.js';

export class GameLoop {
    constructor() {
        this.gameState = new GameState();
        this.collision = new Collision(this.gameState);
        
        this.tickRate = 10; // Hz (optimized from 20)
        this.tickInterval = 1000 / this.tickRate;
        this.lastTick = Date.now();
        this.isRunning = false;
        this.intervalId = null;
        
        // Performance monitoring
        this.tickTimes = [];
        this.maxTickSamples = 50;
        
        // Event callbacks
        this.onPlayerHit = null;
        this.onPlayerDeath = null;
        this.onPowerUpCollected = null;
        this.onBlockDestroyed = null;
        this.onArenaResize = null;
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTick = Date.now();
        
        this.intervalId = setInterval(() => {
            this.tick();
        }, this.tickInterval);
        
        console.log(`🎮 Game loop started at ${this.tickRate} Hz`);
    }
    
    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log('🛑 Game loop stopped');
    }
    
    tick() {
        const tickStart = Date.now();
        const now = tickStart;
        const deltaTime = (now - this.lastTick) / 1000; // Convert to seconds
        this.lastTick = now;
        
        // Rebuild spatial hash for optimized collision detection
        this.rebuildSpatialHash();
        
        // Update all game entities
        this.updatePlayers(deltaTime);
        this.updateBullets(deltaTime, now);
        this.updatePowerUps();
        
        // Check collisions (now using spatial hash)
        this.checkCollisions();
        
        // Spawn new entities
        this.gameState.updateSpawns();
        
        // Check arena resize
        if (this.gameState.updateArenaSize() && this.onArenaResize) {
            this.onArenaResize(this.gameState.arenaSize);
        }
        
        // Track performance
        const tickTime = Date.now() - tickStart;
        this.tickTimes.push(tickTime);
        if (this.tickTimes.length > this.maxTickSamples) {
            this.tickTimes.shift();
        }
    }
    
    rebuildSpatialHash() {
        const spatialHash = this.gameState.spatialHash;
        spatialHash.clear();
        
        // Add players
        for (const player of this.gameState.players.values()) {
            if (player.isAlive) {
                spatialHash.insert(player, 'player');
            }
        }
        
        // Add blocks
        for (const block of this.gameState.blocks.values()) {
            spatialHash.insert(block, 'block');
        }
        
        // Add power-ups
        for (const powerUp of this.gameState.powerUps.values()) {
            spatialHash.insert(powerUp, 'powerUp');
        }
    }
    
    getPerformanceStats() {
        if (this.tickTimes.length === 0) return null;
        const avg = this.tickTimes.reduce((a, b) => a + b, 0) / this.tickTimes.length;
        const max = Math.max(...this.tickTimes);
        return { avgTickMs: avg.toFixed(2), maxTickMs: max.toFixed(2) };
    }
    
    updatePlayers(deltaTime) {
        const halfArena = this.gameState.arenaSize / 2 - 30;
        
        for (const player of this.gameState.players.values()) {
            if (!player.isAlive) continue;
            
            // Apply movement based on input
            let speed = this.gameState.config.playerSpeed;
            
            // Speed boost from power-up
            if (player.hasSpeedBoost && Date.now() < player.speedBoostUntil) {
                speed *= 1.5;
            } else {
                player.hasSpeedBoost = false;
            }
            
            // Calculate movement vector
            let dx = 0, dz = 0;
            
            if (player.input.up) dz -= 1;
            if (player.input.down) dz += 1;
            if (player.input.left) dx -= 1;
            if (player.input.right) dx += 1;
            
            // Normalize diagonal movement
            if (dx !== 0 && dz !== 0) {
                const len = Math.sqrt(dx * dx + dz * dz);
                dx /= len;
                dz /= len;
            }
            
            // Apply movement
            player.x += dx * speed * deltaTime;
            player.z += dz * speed * deltaTime;
            
            // Clamp to arena bounds
            player.x = Math.max(-halfArena, Math.min(halfArena, player.x));
            player.z = Math.max(-halfArena, Math.min(halfArena, player.z));
            
            // Update turret rotation
            player.turretAngle = player.input.angle;
            
            // Update body rotation based on movement direction
            if (dx !== 0 || dz !== 0) {
                player.bodyAngle = Math.atan2(dx, -dz);
            }
        }
    }
    
    updateBullets(deltaTime, now) {
        const halfArena = this.gameState.arenaSize / 2;
        const bulletsToRemove = [];
        
        // Use lifetime from config (750ms = 300 units range)
        const lifetime = this.gameState.config.bulletLifetime;
        
        for (const [id, bullet] of this.gameState.bullets) {
            // Move bullet
            bullet.x += bullet.vx * deltaTime;
            bullet.z += bullet.vz * deltaTime;
            
            // Check lifetime
            if (now - bullet.createdAt > lifetime) {
                bulletsToRemove.push(id);
                continue;
            }
            
            // Check arena bounds
            if (Math.abs(bullet.x) > halfArena || Math.abs(bullet.z) > halfArena) {
                bulletsToRemove.push(id);
            }
        }
        
        for (const id of bulletsToRemove) {
            this.gameState.removeBullet(id);
        }
    }
    
    updatePowerUps() {
        const now = Date.now();
        const toRemove = [];
        
        for (const [id, powerUp] of this.gameState.powerUps) {
            // Power-ups expire after 30 seconds
            if (now - powerUp.createdAt > 30000) {
                toRemove.push(id);
            }
        }
        
        for (const id of toRemove) {
            this.gameState.removePowerUp(id);
        }
    }
    
    checkCollisions() {
        // Optimized collision detection using SpatialHash
        // Single pass for bullets against players and blocks
        this.checkBulletCollisions();
        // Single pass for players against powerups and blocks
        this.checkPlayerCollisions();
    }
    
    checkBulletCollisions() {
        const bulletsToRemove = new Set();
        const blocksToRemove = new Set();
        const spatialHash = this.gameState.spatialHash;
        
        for (const [bulletId, bullet] of this.gameState.bullets) {
            if (bulletsToRemove.has(bulletId)) continue;
            
            // Query nearby objects (radius 50 covers player and block sizes)
            const nearby = spatialHash.query(bullet.x, bullet.z, 50);
            
            for (const item of nearby) {
                const { entity, type } = item;
                
                if (type === 'player') {
                    const player = entity;
                    // Skip own bullets and dead players
                    if (bullet.ownerId === player.id || !player.isAlive) continue;
                    // Skip invulnerable players
                    if (Date.now() < player.invulnerableUntil) continue;
                    
                    if (this.collision.bulletHitsPlayer(bullet, player)) {
                        bulletsToRemove.add(bulletId);
                        
                        // Apply damage
                        player.hp -= bullet.damage;
                        
                        // Get shooter for score
                        const shooter = this.gameState.getPlayer(bullet.ownerId);
                        
                        if (this.onPlayerHit) {
                            this.onPlayerHit(player.id, bullet.ownerId, bullet.damage);
                        }
                        
                        if (player.hp <= 0) {
                            player.isAlive = false;
                            player.deaths++;
                            
                            if (shooter) {
                                shooter.score += 100;
                                shooter.kills++;
                            }
                            
                            if (this.onPlayerDeath) {
                                this.onPlayerDeath(player.id, bullet.ownerId);
                            }
                        }
                        break; // Bullet can only hit one player
                    }
                } else if (type === 'block') {
                    const block = entity;
                    if (blocksToRemove.has(block.id)) continue;
                    
                    if (this.collision.bulletHitsBlock(bullet, block)) {
                        bulletsToRemove.add(bulletId);
                        
                        block.hp -= bullet.damage;
                        if (block.hp <= 0) {
                            blocksToRemove.add(block.id);
                            
                            if (this.onBlockDestroyed) {
                                this.onBlockDestroyed(block.id);
                            }
                        }
                        break; // Bullet hits block
                    }
                }
            }
        }
        
        for (const id of bulletsToRemove) {
            this.gameState.removeBullet(id);
        }
        
        for (const id of blocksToRemove) {
            this.gameState.removeBlock(id);
        }
    }
    
    checkPlayerCollisions() {
        const powerUpsToRemove = new Set();
        const spatialHash = this.gameState.spatialHash;
        
        for (const player of this.gameState.players.values()) {
            if (!player.isAlive) continue;
            
            // Query nearby objects (radius 60 covers blocks and powerups)
            const nearby = spatialHash.query(player.x, player.z, 60);
            
            for (const item of nearby) {
                const { entity, type } = item;
                
                if (type === 'powerUp') {
                    const powerUp = entity;
                    if (powerUpsToRemove.has(powerUp.id)) continue;
                    
                    if (this.collision.playerHitsPowerUp(player, powerUp)) {
                        powerUpsToRemove.add(powerUp.id);
                        
                        // Apply power-up effect
                        this.applyPowerUp(player, powerUp);
                        
                        if (this.onPowerUpCollected) {
                            this.onPowerUpCollected(player.id, powerUp.type);
                        }
                    }
                } else if (type === 'block') {
                    const block = entity;
                    const pushback = this.collision.getPlayerBlockPushback(player, block);
                    if (pushback) {
                        player.x += pushback.x;
                        player.z += pushback.z;
                    }
                }
            }
        }
        
        for (const id of powerUpsToRemove) {
            this.gameState.removePowerUp(id);
        }
    }
    
    applyPowerUp(player, powerUp) {
        const now = Date.now();
        
        switch (powerUp.type) {
            case 'tripleShot':
                player.hasTripleShot = true;
                player.tripleShotUntil = now + 10000; // 10 seconds
                break;
                
            case 'speed':
                player.hasSpeedBoost = true;
                player.speedBoostUntil = now + 8000; // 8 seconds
                break;
                
            case 'heal':
                player.hp = Math.min(
                    this.gameState.config.playerMaxHp,
                    player.hp + 50
                );
                break;
        }
    }
    
    // Called from SocketHandler when player shoots
    playerShoot(playerId) {
        const player = this.gameState.getPlayer(playerId);
        if (!player || !player.isAlive) return [];
        
        const now = Date.now();
        
        // Check respawn shooting cooldown
        if (now < player.cantShootUntil) return [];
        
        // Fire rate limiting (1000ms = 1 second between shots)
        if (now - player.lastShotTime < 1000) return [];
        player.lastShotTime = now;
        
        // Check if triple shot is active
        const isTriple = player.hasTripleShot && now < player.tripleShotUntil;
        if (now >= player.tripleShotUntil) {
            player.hasTripleShot = false;
        }
        
        // Calculate bullet spawn position (at gun tip)
        const gunLength = 35;
        const spawnX = player.x + Math.sin(player.turretAngle) * gunLength;
        const spawnZ = player.z - Math.cos(player.turretAngle) * gunLength;
        
        return this.gameState.addBullet(
            playerId,
            spawnX,
            spawnZ,
            player.turretAngle,
            isTriple
        );
    }
    
    // Called when player respawns
    respawnPlayer(playerId) {
        const player = this.gameState.getPlayer(playerId);
        if (!player) return null;
        
        const pos = this.gameState.getRandomSpawnPosition();
        player.x = pos.x;
        player.z = pos.z;
        player.hp = this.gameState.config.playerMaxHp;
        player.isAlive = true;
        player.score = 0;
        player.hasTripleShot = false;
        player.hasSpeedBoost = false;
        player.invulnerableUntil = Date.now() + this.gameState.config.respawnInvulnerability;
        player.cantShootUntil = Date.now() + 2000; // 2 seconds shooting cooldown
        
        return player;
    }
}
