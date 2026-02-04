// ============================================
// Player - Server-side player entity
// ============================================

// Predefined tank colors for variety
const TANK_COLORS = [
    0x4ade80, // Green
    0xe74c3c, // Red
    0x3b82f6, // Blue
    0xf59e0b, // Orange
    0x8b5cf6, // Purple
    0xec4899, // Pink
    0x14b8a6, // Teal
    0xeab308, // Yellow
    0x6366f1, // Indigo
    0x06b6d4, // Cyan
];

export class Player {
    constructor(id, nickname, x, z) {
        this.id = id;
        this.nickname = nickname || 'Player';
        
        // Random tank color (consistent for this player)
        this.color = TANK_COLORS[Math.floor(Math.random() * TANK_COLORS.length)];
        
        // Position & rotation
        this.x = x;
        this.z = z;
        this.bodyAngle = 0;      // Tank body rotation
        this.turretAngle = 0;    // Turret/gun rotation
        
        // Stats
        this.hp = 100;
        this.maxHp = 100;
        this.score = 0;
        this.kills = 0;
        this.deaths = 0;
        
        // State
        this.isAlive = true;
        this.invulnerableUntil = 0;
        this.cantShootUntil = 0;
        
        // Power-ups
        this.hasTripleShot = false;
        this.tripleShotUntil = 0;
        this.hasSpeedBoost = false;
        this.speedBoostUntil = 0;
        
        // Input state
        this.input = {
            up: false,
            down: false,
            left: false,
            right: false,
            angle: 0,
            shooting: false
        };
        
        // Timing
        this.lastShotTime = 0;
        this.lastUpdateTime = Date.now();
    }
    
    updateInput(inputData) {
        this.input.up = inputData.up || false;
        this.input.down = inputData.down || false;
        this.input.left = inputData.left || false;
        this.input.right = inputData.right || false;
        this.input.angle = inputData.angle || 0;
        this.input.shooting = inputData.shooting || false;
        this.lastUpdateTime = Date.now();
    }
    
    serialize() {
        return {
            id: this.id,
            n: this.nickname,
            c: this.color, // Tank color
            x: Math.round(this.x * 10) / 10,
            z: Math.round(this.z * 10) / 10,
            ba: Math.round(this.bodyAngle * 100) / 100,
            ta: Math.round(this.turretAngle * 100) / 100,
            hp: this.hp,
            s: this.score,
            k: this.kills,
            d: this.deaths,
            a: this.isAlive,
            inv: Date.now() < this.invulnerableUntil,
            ts: this.hasTripleShot && Date.now() < this.tripleShotUntil,
            sp: this.hasSpeedBoost && Date.now() < this.speedBoostUntil
        };
    }
}
