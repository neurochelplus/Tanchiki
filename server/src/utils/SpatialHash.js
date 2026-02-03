// ============================================
// SpatialHash - Spatial partitioning for collision optimization
// ============================================

export class SpatialHash {
    constructor(cellSize = 100) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }
    
    clear() {
        this.cells.clear();
    }
    
    getKey(x, z) {
        const cellX = Math.floor(x / this.cellSize);
        const cellZ = Math.floor(z / this.cellSize);
        return `${cellX},${cellZ}`;
    }
    
    insert(entity) {
        const key = this.getKey(entity.x, entity.z);
        
        if (!this.cells.has(key)) {
            this.cells.set(key, []);
        }
        
        this.cells.get(key).push(entity);
    }
    
    query(x, z, radius) {
        const results = [];
        const cellRadius = Math.ceil(radius / this.cellSize);
        
        const centerCellX = Math.floor(x / this.cellSize);
        const centerCellZ = Math.floor(z / this.cellSize);
        
        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dz = -cellRadius; dz <= cellRadius; dz++) {
                const key = `${centerCellX + dx},${centerCellZ + dz}`;
                const cell = this.cells.get(key);
                
                if (cell) {
                    for (const entity of cell) {
                        const dist = Math.sqrt(
                            (entity.x - x) ** 2 + (entity.z - z) ** 2
                        );
                        if (dist <= radius) {
                            results.push(entity);
                        }
                    }
                }
            }
        }
        
        return results;
    }
    
    // Rebuild hash with all entities
    rebuild(entities) {
        this.clear();
        for (const entity of entities) {
            this.insert(entity);
        }
    }
}
