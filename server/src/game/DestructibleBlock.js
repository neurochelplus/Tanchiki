// ============================================
// DestructibleBlock - Server-side block entity
// ============================================

export class DestructibleBlock {
    constructor(id, x, z) {
        this.id = id;
        this.x = x;
        this.z = z;
        
        // Random size variation
        this.width = 40 + Math.random() * 40;  // 40-80
        this.height = 30 + Math.random() * 30; // 30-60
        this.depth = 40 + Math.random() * 40;  // 40-80
        
        this.hp = 75;
        this.maxHp = 75;
        
        this.createdAt = Date.now();
    }
    
    serialize() {
        return {
            id: this.id,
            x: Math.round(this.x),
            z: Math.round(this.z),
            w: Math.round(this.width),
            h: Math.round(this.height),
            d: Math.round(this.depth),
            hp: this.hp
        };
    }
}
