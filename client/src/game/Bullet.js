// ============================================
// BulletManager - InstancedMesh for bullets
// ============================================

import * as THREE from 'three';

export class BulletManager {
    constructor(scene) {
        this.scene = scene;
        this.maxBullets = 500;
        
        // Create instanced mesh
        const geometry = new THREE.SphereGeometry(4, 8, 6);
        const material = new THREE.MeshPhongMaterial({
            color: 0xffcc00,
            emissive: 0xff6600,
            emissiveIntensity: 0.5
        });
        
        this.mesh = new THREE.InstancedMesh(geometry, material, this.maxBullets);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.mesh.castShadow = true;
        this.mesh.count = 0;
        this.mesh.frustumCulled = false; // Important: disable culling for instanced mesh
        
        scene.add(this.mesh);
        
        // Bullet data
        this.bullets = new Map(); // id -> { x, z, angle }
        this.dummy = new THREE.Object3D();
    }
    
    updateFromServer(bulletsData) {
        const activeIds = new Set();
        const speed = 400; // Match server config
        
        for (const data of bulletsData) {
            activeIds.add(data.id);
            
            if (this.bullets.has(data.id)) {
                // Update existing bullet
                const bullet = this.bullets.get(data.id);
                // Correct position from server
                // We rely on local update(deltaTime) for smoothness, 
                // this just corrects drift every 100ms
                bullet.x = data.x;
                bullet.z = data.z;
            } else {
                // Add new bullet
                this.bullets.set(data.id, {
                    x: data.x,
                    z: data.z,
                    angle: data.a,
                    vx: Math.sin(data.a) * speed,
                    vz: -Math.cos(data.a) * speed
                });
            }
        }
        
        // Remove old bullets
        for (const id of this.bullets.keys()) {
            if (!activeIds.has(id)) {
                this.bullets.delete(id);
            }
        }
    }
    
    updateMesh() {
        let index = 0;
        
        for (const bullet of this.bullets.values()) {
            if (index >= this.maxBullets) break;
            
            this.dummy.position.set(bullet.x, 12, bullet.z);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(index, this.dummy.matrix);
            index++;
        }
        
        this.mesh.count = index;
        this.mesh.instanceMatrix.needsUpdate = true;
    }
    
    update(deltaTime) {
        // Move bullets locally for smooth animation
        for (const bullet of this.bullets.values()) {
            bullet.x += bullet.vx * deltaTime;
            bullet.z += bullet.vz * deltaTime;
        }
        
        this.updateMesh();
    }
    
    dispose() {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.scene.remove(this.mesh);
    }
}
