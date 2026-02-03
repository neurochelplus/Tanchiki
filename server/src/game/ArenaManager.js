// ============================================
// ArenaManager - Dynamic arena sizing
// ============================================

export class ArenaManager {
    constructor() {
        this.baseSize = 1500;
        this.perPlayerSize = 50;
        this.maxSize = 4000;
        this.minSize = 1500;
        
        this.currentSize = this.minSize;
        this.targetSize = this.minSize;
        
        // Smooth transition
        this.transitionSpeed = 100; // Units per second
    }
    
    calculateSize(playerCount) {
        const rawSize = this.baseSize + (playerCount * this.perPlayerSize);
        return Math.min(this.maxSize, Math.max(this.minSize, rawSize));
    }
    
    update(playerCount, deltaTime) {
        this.targetSize = this.calculateSize(playerCount);
        
        if (this.currentSize < this.targetSize) {
            this.currentSize = Math.min(
                this.targetSize,
                this.currentSize + this.transitionSpeed * deltaTime
            );
        } else if (this.currentSize > this.targetSize) {
            this.currentSize = Math.max(
                this.targetSize,
                this.currentSize - this.transitionSpeed * deltaTime
            );
        }
        
        return Math.round(this.currentSize);
    }
}
