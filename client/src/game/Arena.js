// ============================================
// Arena - Dynamic arena with grid
// ============================================

import * as THREE from 'three';

export class Arena {
    constructor(scene) {
        this.scene = scene;
        this.currentSize = 1500;
        this.targetSize = 1500;
        
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        this.createGround();
        this.createBoundary();
        this.createGrid();
    }
    
    createGround() {
        // Main ground plane
        const geometry = new THREE.PlaneGeometry(4000, 4000);
        const material = new THREE.MeshPhongMaterial({
            color: 0x3d5c3d, // Dark green grass
            shininess: 5
        });
        
        this.ground = new THREE.Mesh(geometry, material);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = 0;
        this.ground.receiveShadow = true;
        
        this.group.add(this.ground);
        
        // Grass patches removed to prevent z-fighting/visual artifacts
    }
    
    createBoundary() {
        // Boundary walls
        const wallHeight = 50;
        const wallThickness = 20;
        
        const wallMaterial = new THREE.MeshPhongMaterial({
            color: 0x666666,
            shininess: 10
        });
        
        this.walls = [];
        
        // Create 4 walls
        const wallConfigs = [
            { x: 0, z: -this.currentSize/2, rotY: 0, width: this.currentSize },
            { x: 0, z: this.currentSize/2, rotY: 0, width: this.currentSize },
            { x: -this.currentSize/2, z: 0, rotY: Math.PI/2, width: this.currentSize },
            { x: this.currentSize/2, z: 0, rotY: Math.PI/2, width: this.currentSize }
        ];
        
        for (const config of wallConfigs) {
            const geometry = new THREE.BoxGeometry(config.width + wallThickness, wallHeight, wallThickness);
            const wall = new THREE.Mesh(geometry, wallMaterial);
            wall.position.set(config.x, wallHeight/2, config.z);
            wall.rotation.y = config.rotY;
            wall.castShadow = true;
            wall.receiveShadow = true;
            
            this.walls.push(wall);
            this.group.add(wall);
        }
    }
    
    createGrid() {
        // Grid helper for visual reference
        const gridSize = 2000;
        const gridDivisions = 40;
        
        this.grid = new THREE.GridHelper(gridSize, gridDivisions, 0x2d4a2d, 0x2d4a2d);
        this.grid.position.y = 0.5;
        this.grid.material.opacity = 0.3;
        this.grid.material.transparent = true;
        
        this.group.add(this.grid);
    }
    
    setSize(newSize) {
        this.targetSize = newSize;
        
        // Animate size change
        if (Math.abs(this.currentSize - this.targetSize) > 10) {
            this.currentSize += (this.targetSize - this.currentSize) * 0.05;
            this.updateBoundary();
        }
    }
    
    updateBoundary() {
        const positions = [
            { x: 0, z: -this.currentSize/2 },
            { x: 0, z: this.currentSize/2 },
            { x: -this.currentSize/2, z: 0 },
            { x: this.currentSize/2, z: 0 }
        ];
        
        for (let i = 0; i < this.walls.length; i++) {
            this.walls[i].position.x = positions[i].x;
            this.walls[i].position.z = positions[i].z;
            
            // Update wall length
            const width = this.currentSize + 20;
            this.walls[i].scale.x = width / (i < 2 ? this.walls[i].geometry.parameters.width : this.walls[i].geometry.parameters.width);
        }
    }
    
    dispose() {
        this.group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        this.scene.remove(this.group);
    }
}
