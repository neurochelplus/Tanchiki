// ============================================
// SpatialHash - Spatial partitioning for collision optimization
// ============================================

export class SpatialHash {
    constructor(cellSize = 100) {
        this.cellSize = cellSize;
        this.invCellSize = 1 / cellSize;
        this.cells = new Map();
    }
    
    clear() {
        this.cells.clear();
    }
    
    // Optimized key generation using bit manipulation
    // Supports coordinates up to +/- 32767 * cellSize
    getKey(x, z) {
        const cellX = Math.floor(x * this.invCellSize);
        const cellZ = Math.floor(z * this.invCellSize);
        // Shift 16 bits to pack two 16-bit integers into one 32-bit integer
        // Use >>> 0 to treat as unsigned for map keys if needed, but simple bitwise is fine for Map
        return (cellX << 16) | (cellZ & 0xFFFF);
    }
    
    insert(entity, type) {
        const key = this.getKey(entity.x, entity.z);
        
        if (!this.cells.has(key)) {
            this.cells.set(key, []);
        }
        
        // Store wrapper with type if provided, otherwise just entity
        // To save memory, we attach type to entity temporarily or use a lightweight wrapper
        // Since we rebuild every frame, a wrapper object { entity, type } is clean but creates GC
        // Better: Assumes entity has 'x' and 'z'. We can pass type separately or expect it on entity.
        // In GameLoop we passed (entity, type). Let's store { entity, type }
        this.cells.get(key).push({ entity, type });
    }
    
    query(x, z, radius) {
        const results = [];
        const cellRadius = Math.ceil(radius * this.invCellSize);
        
        const centerCellX = Math.floor(x * this.invCellSize);
        const centerCellZ = Math.floor(z * this.invCellSize);
        const radiusSq = radius * radius;
        
        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dz = -cellRadius; dz <= cellRadius; dz++) {
                // Construct key manually to match getKey logic
                const cx = centerCellX + dx;
                const cz = centerCellZ + dz;
                const key = (cx << 16) | (cz & 0xFFFF);
                
                const cell = this.cells.get(key);
                
                if (cell) {
                    for (let i = 0; i < cell.length; i++) {
                        const item = cell[i];
                        const dx = item.entity.x - x;
                        const dz = item.entity.z - z;
                        
                        if (dx * dx + dz * dz <= radiusSq) {
                            results.push(item);
                        }
                    }
                }
            }
        }
        
        return results;
    }
}
