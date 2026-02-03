// ============================================
// Collision - Collision detection utilities
// ============================================

export class Collision {
    constructor(gameState) {
        this.gameState = gameState;
    }
    
    // AABB collision for player (box)
    bulletHitsPlayer(bullet, player) {
        const playerHalfSize = 25; // Half of player tank size
        
        return (
            bullet.x > player.x - playerHalfSize &&
            bullet.x < player.x + playerHalfSize &&
            bullet.z > player.z - playerHalfSize &&
            bullet.z < player.z + playerHalfSize
        );
    }
    
    // AABB collision for block
    bulletHitsBlock(bullet, block) {
        const halfW = block.width / 2;
        const halfD = block.depth / 2;
        
        return (
            bullet.x > block.x - halfW &&
            bullet.x < block.x + halfW &&
            bullet.z > block.z - halfD &&
            bullet.z < block.z + halfD
        );
    }
    
    // Circle-circle collision for power-ups
    playerHitsPowerUp(player, powerUp) {
        const dx = player.x - powerUp.x;
        const dz = player.z - powerUp.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const collisionDist = 25 + powerUp.radius; // player radius + powerup radius
        
        return distance < collisionDist;
    }
    
    // AABB with pushback for player-block collision
    getPlayerBlockPushback(player, block) {
        const playerHalfSize = 25;
        const halfW = block.width / 2;
        const halfD = block.depth / 2;
        
        // Check if overlapping
        const overlapX = playerHalfSize + halfW - Math.abs(player.x - block.x);
        const overlapZ = playerHalfSize + halfD - Math.abs(player.z - block.z);
        
        if (overlapX > 0 && overlapZ > 0) {
            // Push back along the axis with smallest overlap
            if (overlapX < overlapZ) {
                return {
                    x: player.x > block.x ? overlapX : -overlapX,
                    z: 0
                };
            } else {
                return {
                    x: 0,
                    z: player.z > block.z ? overlapZ : -overlapZ
                };
            }
        }
        
        return null;
    }
    
    // Distance check utility
    distance(x1, z1, x2, z2) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        return Math.sqrt(dx * dx + dz * dz);
    }
}
