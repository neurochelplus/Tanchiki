// ============================================
// PowerUpManager - InstancedMesh for power-ups
// ============================================

import * as THREE from 'three';

export class PowerUpManager {
    constructor(scene) {
        this.scene = scene;
        this.maxPowerUps = 50;
        
        // Different meshes for different power-up types
        this.meshes = {};
        this.powerUps = new Map();
        this.dummy = new THREE.Object3D();
        
        this.createMeshes();
        
        // Animation
        this.time = 0;
    }
    
    createMeshes() {
        const types = {
            tripleShot: { color: 0xf97316, emissive: 0xff4500 },
            speed: { color: 0x3b82f6, emissive: 0x0066ff },
            heal: { color: 0x22c55e, emissive: 0x00ff00 }
        };
        
        for (const [type, colors] of Object.entries(types)) {
            // Octahedron looks like a power-up crystal
            const geometry = new THREE.OctahedronGeometry(12, 0);
            const material = new THREE.MeshPhongMaterial({
                color: colors.color,
                emissive: colors.emissive,
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.9
            });
            
            const mesh = new THREE.InstancedMesh(geometry, material, this.maxPowerUps);
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            mesh.castShadow = true;
            mesh.count = 0;
            
            // IMPORTANT: Disable frustum culling to prevent disappearing
            mesh.frustumCulled = false;
            
            // Initialize all matrices to identity (off-screen)
            const dummy = new THREE.Object3D();
            dummy.position.set(0, -1000, 0); // Far below the scene
            dummy.updateMatrix();
            for (let i = 0; i < this.maxPowerUps; i++) {
                mesh.setMatrixAt(i, dummy.matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;
            
            this.scene.add(mesh);
            this.meshes[type] = mesh;
        }
    }
    
    updateFromServer(powerUpsData) {
        this.powerUps.clear();
        
        for (const data of powerUpsData) {
            this.powerUps.set(data.id, {
                type: data.t,
                x: data.x,
                z: data.z
            });
        }
        
        this.updateMeshes();
    }
    
    updateMeshes() {
        // Count by type
        const counts = { tripleShot: 0, speed: 0, heal: 0 };
        
        // First, reset all matrices to hidden position
        const hiddenMatrix = new THREE.Matrix4();
        hiddenMatrix.setPosition(0, -1000, 0);
        
        for (const mesh of Object.values(this.meshes)) {
            for (let i = 0; i < this.maxPowerUps; i++) {
                mesh.setMatrixAt(i, hiddenMatrix);
            }
        }
        
        for (const powerUp of this.powerUps.values()) {
            const mesh = this.meshes[powerUp.type];
            if (!mesh) continue;
            
            const index = counts[powerUp.type];
            if (index >= this.maxPowerUps) continue;
            
            // Floating and rotating animation
            const floatY = Math.sin(this.time * 3 + powerUp.x) * 5 + 20;
            
            this.dummy.position.set(powerUp.x, floatY, powerUp.z);
            this.dummy.rotation.y = this.time * 2;
            this.dummy.rotation.x = Math.sin(this.time) * 0.3;
            this.dummy.scale.set(1, 1, 1);
            this.dummy.updateMatrix();
            
            mesh.setMatrixAt(index, this.dummy.matrix);
            counts[powerUp.type]++;
        }
        
        // Update counts and matrices
        for (const [type, mesh] of Object.entries(this.meshes)) {
            // Always use maxPowerUps as count - hidden ones are just off-screen
            mesh.count = this.maxPowerUps;
            mesh.instanceMatrix.needsUpdate = true;
        }
    }
    
    update(deltaTime) {
        this.time += deltaTime;
        this.updateMeshes();
    }
    
    dispose() {
        for (const mesh of Object.values(this.meshes)) {
            mesh.geometry.dispose();
            mesh.material.dispose();
            this.scene.remove(mesh);
        }
    }
}
