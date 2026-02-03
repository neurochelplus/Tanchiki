// ============================================
// ParticleSystem - Simple particle effects
// ============================================

import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        
        // Shared geometry and material
        this.particleGeometry = new THREE.SphereGeometry(2, 4, 4);
    }
    
    spawnHit(x, y, z) {
        const color = 0xffaa00;
        this.spawnBurst(x, y, z, color, 8, 50, 0.3);
    }
    
    spawnExplosion(x, y, z) {
        // Fire particles
        this.spawnBurst(x, y, z, 0xff4400, 20, 100, 0.8);
        // Smoke particles
        this.spawnBurst(x, y + 10, z, 0x444444, 15, 80, 1.0);
    }
    
    spawnBlockDestroy(x, y, z) {
        this.spawnBurst(x, y, z, 0x8B4513, 12, 60, 0.5);
    }
    
    spawnBurst(x, y, z, color, count, speed, lifetime) {
        const material = new THREE.MeshBasicMaterial({ 
            color,
            transparent: true,
            opacity: 1
        });
        
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.particleGeometry, material.clone());
            mesh.position.set(x, y, z);
            
            // Random velocity
            const angle = Math.random() * Math.PI * 2;
            const elevation = Math.random() * Math.PI - Math.PI / 2;
            const vel = speed * (0.5 + Math.random() * 0.5);
            
            this.scene.add(mesh);
            
            this.particles.push({
                mesh,
                vx: Math.cos(angle) * Math.cos(elevation) * vel,
                vy: Math.sin(elevation) * vel + 50,
                vz: Math.sin(angle) * Math.cos(elevation) * vel,
                lifetime,
                age: 0,
                gravity: -200
            });
        }
    }
    
    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Update position
            p.mesh.position.x += p.vx * deltaTime;
            p.mesh.position.y += p.vy * deltaTime;
            p.mesh.position.z += p.vz * deltaTime;
            
            // Apply gravity
            p.vy += p.gravity * deltaTime;
            
            // Update age
            p.age += deltaTime;
            
            // Fade out
            const lifeRatio = 1 - (p.age / p.lifetime);
            p.mesh.material.opacity = Math.max(0, lifeRatio);
            p.mesh.scale.setScalar(lifeRatio);
            
            // Remove dead particles
            if (p.age >= p.lifetime || p.mesh.position.y < 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }
    
    dispose() {
        for (const p of this.particles) {
            this.scene.remove(p.mesh);
            p.mesh.material.dispose();
        }
        this.particles = [];
        this.particleGeometry.dispose();
    }
}
