// ============================================
// Bullet - Server-side bullet entity
// ============================================

export class Bullet {
    constructor(id, ownerId, x, z, angle, speed, damage) {
        this.id = id;
        this.ownerId = ownerId;
        
        this.x = x;
        this.z = z;
        this.angle = angle;
        
        // Velocity components
        this.vx = Math.sin(angle) * speed;
        this.vz = -Math.cos(angle) * speed;
        
        this.damage = damage;
        this.radius = 5;
        
        this.createdAt = Date.now();
    }
    
    serialize() {
        return {
            id: this.id,
            x: Math.round(this.x),
            z: Math.round(this.z),
            a: Math.round(this.angle * 100) / 100
        };
    }
}
