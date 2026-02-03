// ============================================
// BlockManager - Destructible blocks
// ============================================

import * as THREE from 'three';

export class BlockManager {
    constructor(scene) {
        this.scene = scene;
        this.blocks = new Map(); // id -> mesh
        
        // Shared material
        this.material = new THREE.MeshPhongMaterial({
            color: 0x8B4513,
            shininess: 10
        });
        
        this.damagedMaterial = new THREE.MeshPhongMaterial({
            color: 0x5D3A1A,
            shininess: 5
        });
    }
    
    updateFromServer(blocksData) {
        const activeIds = new Set();
        
        for (const data of blocksData) {
            activeIds.add(data.id);
            
            if (this.blocks.has(data.id)) {
                // Update existing block (hp for damage visual)
                const block = this.blocks.get(data.id);
                const healthPercent = data.hp / 75;
                
                if (healthPercent < 0.5) {
                    block.mesh.material = this.damagedMaterial;
                }
            } else {
                // Create new block
                this.createBlock(data);
            }
        }
        
        // Remove destroyed blocks
        for (const [id, block] of this.blocks) {
            if (!activeIds.has(id)) {
                this.scene.remove(block.mesh);
                block.mesh.geometry.dispose();
                this.blocks.delete(id);
            }
        }
    }
    
    createBlock(data) {
        const geometry = new THREE.BoxGeometry(data.w, data.h, data.d);
        const mesh = new THREE.Mesh(geometry, this.material);
        
        mesh.position.set(data.x, data.h / 2, data.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        this.scene.add(mesh);
        
        this.blocks.set(data.id, {
            mesh,
            x: data.x,
            y: data.h / 2,
            z: data.z
        });
    }
    
    dispose() {
        for (const block of this.blocks.values()) {
            block.mesh.geometry.dispose();
            this.scene.remove(block.mesh);
        }
        this.blocks.clear();
        
        this.material.dispose();
        this.damagedMaterial.dispose();
    }
}
