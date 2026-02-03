// ============================================
// PowerUp - Server-side power-up entity
// ============================================

export class PowerUp {
    constructor(id, type, x, z) {
        this.id = id;
        this.type = type; // 'tripleShot', 'speed', 'heal'
        this.x = x;
        this.z = z;
        this.radius = 15;
        this.createdAt = Date.now();
    }
    
    serialize() {
        return {
            id: this.id,
            t: this.type,
            x: Math.round(this.x),
            z: Math.round(this.z)
        };
    }
}
