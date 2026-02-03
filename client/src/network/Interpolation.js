// ============================================
// Interpolation - Smooth entity movement
// ============================================

export class Interpolation {
    constructor() {
        // Store state history for each entity
        this.stateHistory = new Map(); // id -> [{timestamp, state}]
        
        // Interpolation delay (100ms buffer)
        this.interpolationDelay = 100;
        
        // Max history length
        this.maxHistoryLength = 10;
    }
    
    addState(entityId, state) {
        if (!this.stateHistory.has(entityId)) {
            this.stateHistory.set(entityId, []);
        }
        
        const history = this.stateHistory.get(entityId);
        
        history.push({
            timestamp: Date.now(),
            state: { ...state }
        });
        
        // Trim old states
        while (history.length > this.maxHistoryLength) {
            history.shift();
        }
    }
    
    getState(entityId) {
        const history = this.stateHistory.get(entityId);
        if (!history || history.length === 0) return null;
        
        // Render time is current time minus interpolation delay
        const renderTime = Date.now() - this.interpolationDelay;
        
        // Find two states to interpolate between
        let before = null;
        let after = null;
        
        for (let i = 0; i < history.length - 1; i++) {
            if (history[i].timestamp <= renderTime && history[i + 1].timestamp >= renderTime) {
                before = history[i];
                after = history[i + 1];
                break;
            }
        }
        
        // If no interpolation possible, use latest state (extrapolate)
        if (!before || !after) {
            return history[history.length - 1].state;
        }
        
        // Calculate interpolation factor
        const range = after.timestamp - before.timestamp;
        const t = range > 0 ? (renderTime - before.timestamp) / range : 0;
        
        // Interpolate
        return this.lerpState(before.state, after.state, t);
    }
    
    lerpState(stateA, stateB, t) {
        return {
            x: this.lerp(stateA.x, stateB.x, t),
            z: this.lerp(stateA.z, stateB.z, t),
            bodyAngle: this.lerpAngle(stateA.bodyAngle, stateB.bodyAngle, t),
            turretAngle: this.lerpAngle(stateA.turretAngle, stateB.turretAngle, t),
            hp: stateB.hp, // Don't interpolate HP
            isAlive: stateB.isAlive,
            invulnerable: stateB.invulnerable,
            hasTripleShot: stateB.hasTripleShot,
            hasSpeedBoost: stateB.hasSpeedBoost
        };
    }
    
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    lerpAngle(a, b, t) {
        // Handle angle wrapping
        let diff = b - a;
        
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        return a + diff * t;
    }
    
    removeEntity(entityId) {
        this.stateHistory.delete(entityId);
    }
    
    update(deltaTime) {
        // Clean up old history entries
        const cutoffTime = Date.now() - 1000; // Keep 1 second of history
        
        for (const [id, history] of this.stateHistory) {
            while (history.length > 0 && history[0].timestamp < cutoffTime) {
                history.shift();
            }
            
            if (history.length === 0) {
                this.stateHistory.delete(id);
            }
        }
    }
}
