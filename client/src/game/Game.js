// ============================================
// Game - Main client game controller
// ============================================

import { Renderer } from './Renderer.js';
import { Tank } from './Tank.js';
import { BulletManager } from './Bullet.js';
import { PowerUpManager } from './PowerUp.js';
import { BlockManager } from './DestructibleBlock.js';
import { Arena } from './Arena.js';
import { ParticleSystem } from './ParticleSystem.js';
import { InputManager } from '../input/InputManager.js';
import { Interpolation } from '../network/Interpolation.js';
import { AudioManager } from '../audio/AudioManager.js';

export class Game {
    constructor(container) {
        this.container = container;
        
        // Core systems
        this.renderer = new Renderer(container);
        this.inputManager = new InputManager(container, this.renderer.camera, this.renderer);
        this.interpolation = new Interpolation();
        this.audioManager = new AudioManager();
        
        // Game objects
        this.tanks = new Map();           // id -> Tank
        this.localPlayerId = null;
        
        // Managers (using InstancedMesh)
        this.bulletManager = new BulletManager(this.renderer.scene);
        this.powerUpManager = new PowerUpManager(this.renderer.scene);
        this.blockManager = new BlockManager(this.renderer.scene);
        this.particleSystem = new ParticleSystem(this.renderer.scene);
        
        // Arena
        this.arena = new Arena(this.renderer.scene);
        
        // Game loop
        this.isRunning = false;
        this.lastTime = 0;
        
        // Network callback
        this.onInput = null;
        this.onShoot = null;
    }
    
    setLocalPlayerId(id) {
        this.localPlayerId = id;
    }
    
    setNetworkCallbacks(onInput, onShoot) {
        this.onInput = onInput;
        this.onShoot = onShoot;
        
        // Connect shooting to input manager
        this.inputManager.onShoot = () => {
            if (this.onShoot) {
                this.onShoot();
                this.audioManager.play('shoot');
            }
        };
    }
    
    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.loop();
    }
    
    stop() {
        this.isRunning = false;
    }
    
    loop() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.loop());
        
        const now = performance.now();
        const deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;
        
        this.update(deltaTime);
        this.render();
    }
    
    update(deltaTime) {
        // Update input
        const input = this.inputManager.getInput();
        
        // Send input to server
        if (this.onInput && this.localPlayerId) {
            this.onInput(input);
        }
        
        // Update interpolation
        this.interpolation.update(deltaTime);
        
        // Update tanks with interpolated positions
        for (const [id, tank] of this.tanks) {
            const state = this.interpolation.getState(id);
            if (state) {
                tank.updateFromState(state, deltaTime);
            }
        }
        
        // Update local tank with immediate response (client prediction)
        const localTank = this.tanks.get(this.localPlayerId);
        if (localTank) {
            localTank.updateTurret(input.angle);
            
            // Update camera to follow local player
            this.renderer.updateCamera(localTank.position.x, localTank.position.z);
        }
        
        // Update managers
        this.bulletManager.update(deltaTime);
        this.powerUpManager.update(deltaTime);
        this.particleSystem.update(deltaTime);
    }
    
    render() {
        this.renderer.render();
    }
    
    // Called when receiving state from server
    updateFromServer(state) {
        if (!state) return;
        
        // Update arena size
        if (state.arenaSize) {
            this.arena.setSize(state.arenaSize);
        }
        
        // Update players/tanks
        if (state.players) {
            this.updateTanks(state.players);
        }
        
        // Update bullets
        if (state.bullets) {
            this.bulletManager.updateFromServer(state.bullets);
        }
        
        // Update power-ups
        if (state.powerUps) {
            this.powerUpManager.updateFromServer(state.powerUps);
        }
        
        // Update blocks
        if (state.blocks) {
            this.blockManager.updateFromServer(state.blocks);
        }
    }
    
    updateTanks(playersData) {
        const activeIds = new Set();
        
        // Find leader (highest score)
        let leaderId = null;
        let maxScore = -1;
        
        for (const data of playersData) {
            if (data.s > maxScore) {
                maxScore = data.s;
                leaderId = data.id;
            }
        }
        
        for (const data of playersData) {
            activeIds.add(data.id);
            
            // Add state to interpolation
            this.interpolation.addState(data.id, {
                x: data.x,
                z: data.z,
                bodyAngle: data.ba,
                turretAngle: data.ta,
                hp: data.hp,
                isAlive: data.a,
                invulnerable: data.inv,
                hasTripleShot: data.ts,
                hasSpeedBoost: data.sp
            });
            
            // Create tank if doesn't exist
            if (!this.tanks.has(data.id)) {
                const isLocal = data.id === this.localPlayerId;
                const tank = new Tank(data.id, data.n, isLocal, data.c);
                tank.setPosition(data.x, data.z);
                this.renderer.scene.add(tank.group);
                this.tanks.set(data.id, tank);
            }
            
            // Update tank visibility
            const tank = this.tanks.get(data.id);
            if (tank) {
                tank.setAlive(data.a);
                tank.setInvulnerable(data.inv);
                tank.setLeader(data.id === leaderId && maxScore > 0);
            }
        }
        
        // Remove tanks that are no longer in state
        for (const [id, tank] of this.tanks) {
            if (!activeIds.has(id)) {
                this.renderer.scene.remove(tank.group);
                tank.dispose();
                this.tanks.delete(id);
            }
        }
    }
    
    // Event handlers for network events
    onPlayerHit(targetId, shooterId, damage) {
        const tank = this.tanks.get(targetId);
        if (tank) {
            this.particleSystem.spawnHit(tank.position.x, 10, tank.position.z);
            this.audioManager.play('hit');
        }
    }
    
    onPlayerDeath(playerId, killerId) {
        const tank = this.tanks.get(playerId);
        if (tank) {
            this.particleSystem.spawnExplosion(tank.position.x, 10, tank.position.z);
            this.audioManager.play('explosion');
        }
    }
    
    onPowerUpCollected(playerId, type) {
        this.audioManager.play('powerup');
    }
    
    onBlockDestroyed(blockId) {
        const block = this.blockManager.blocks.get(blockId);
        if (block) {
            this.particleSystem.spawnBlockDestroy(block.x, block.y, block.z);
        }
        this.audioManager.play('blockDestroy');
    }
    
    dispose() {
        this.stop();
        
        for (const tank of this.tanks.values()) {
            tank.dispose();
        }
        this.tanks.clear();
        
        this.bulletManager.dispose();
        this.powerUpManager.dispose();
        this.blockManager.dispose();
        this.particleSystem.dispose();
        this.arena.dispose();
        this.renderer.dispose();
        this.inputManager.dispose();
    }
}
