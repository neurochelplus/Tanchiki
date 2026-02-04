// ============================================
// Tank - Detailed tank 3D model
// ============================================

import * as THREE from 'three';

export class Tank {
    constructor(id, nickname, isLocal = false, color = null) {
        this.id = id;
        this.nickname = nickname;
        this.isLocal = isLocal;
        this.tankColor = color; // Color from server
        
        this.group = new THREE.Group();
        this.turretGroup = new THREE.Group();
        
        this.isAlive = true;
        this.isInvulnerable = false;
        
        // Create tank model
        this.createModel();
        this.createCrown();
        this.createNameLabel();
        
        // Animation
        this.targetBodyAngle = 0;
        this.targetTurretAngle = 0;
    }
    
    createModel() {
        // Use color from server, or fallback to default
        const bodyColor = this.tankColor || 0x4ade80;
        const trackColor = 0x2c3e50;
        // Slightly darker shade for turret
        const turretColor = this.tankColor ? this.darkenColor(this.tankColor, 0.15) : 0x22c55e;
        const gunColor = 0x1a1a1a;
        
        // Materials (Phong for performance + nice look)
        const bodyMat = new THREE.MeshPhongMaterial({ 
            color: bodyColor,
            shininess: 30
        });
        const trackMat = new THREE.MeshPhongMaterial({ 
            color: trackColor,
            shininess: 10
        });
        const turretMat = new THREE.MeshPhongMaterial({ 
            color: turretColor,
            shininess: 40
        });
        const gunMat = new THREE.MeshPhongMaterial({ 
            color: gunColor,
            shininess: 50
        });
        
        // Body (main hull with beveled edges look)
        const bodyGeo = new THREE.BoxGeometry(40, 15, 50);
        this.body = new THREE.Mesh(bodyGeo, bodyMat);
        this.body.position.y = 10;
        this.body.castShadow = true;
        this.body.receiveShadow = true;
        this.group.add(this.body);
        
        // Body top slope (front)
        const slopeGeo = new THREE.BoxGeometry(36, 8, 15);
        const slope = new THREE.Mesh(slopeGeo, bodyMat);
        slope.position.set(0, 20, -15);
        slope.rotation.x = -0.3;
        slope.castShadow = true;
        this.group.add(slope);
        
        // Tracks (left and right)
        const trackGeo = new THREE.BoxGeometry(10, 12, 55);
        
        const leftTrack = new THREE.Mesh(trackGeo, trackMat);
        leftTrack.position.set(-22, 6, 0);
        leftTrack.castShadow = true;
        this.group.add(leftTrack);
        
        const rightTrack = new THREE.Mesh(trackGeo, trackMat);
        rightTrack.position.set(22, 6, 0);
        rightTrack.castShadow = true;
        this.group.add(rightTrack);
        
        // Track wheels (simplified)
        const wheelGeo = new THREE.CylinderGeometry(5, 5, 8, 8);
        const wheelMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
        
        for (let side = -1; side <= 1; side += 2) {
            for (let i = -2; i <= 2; i++) {
                const wheel = new THREE.Mesh(wheelGeo, wheelMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(side * 22, 6, i * 12);
                this.group.add(wheel);
            }
        }
        
        // Turret base (cylinder)
        const turretBaseGeo = new THREE.CylinderGeometry(14, 16, 10, 12);
        const turretBase = new THREE.Mesh(turretBaseGeo, turretMat);
        turretBase.position.y = 5;
        turretBase.castShadow = true;
        this.turretGroup.add(turretBase);
        
        // Turret top
        const turretTopGeo = new THREE.CylinderGeometry(10, 14, 8, 12);
        const turretTop = new THREE.Mesh(turretTopGeo, turretMat);
        turretTop.position.y = 12;
        turretTop.castShadow = true;
        this.turretGroup.add(turretTop);
        
        // Gun barrel
        const gunGeo = new THREE.CylinderGeometry(3, 3, 35, 8);
        this.gun = new THREE.Mesh(gunGeo, gunMat);
        this.gun.rotation.x = Math.PI / 2;
        this.gun.position.set(0, 10, -25);
        this.gun.castShadow = true;
        this.turretGroup.add(this.gun);
        
        // Gun muzzle
        const muzzleGeo = new THREE.CylinderGeometry(4, 3, 5, 8);
        const muzzle = new THREE.Mesh(muzzleGeo, gunMat);
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.set(0, 10, -40);
        this.turretGroup.add(muzzle);
        
        // Hatch on turret
        const hatchGeo = new THREE.CylinderGeometry(4, 4, 2, 8);
        const hatch = new THREE.Mesh(hatchGeo, new THREE.MeshPhongMaterial({ color: 0x333333 }));
        hatch.position.set(0, 17, 3);
        this.turretGroup.add(hatch);
        
        // Position turret group
        this.turretGroup.position.y = 17;
        this.group.add(this.turretGroup);
        
        // Store materials for effects
        this.bodyMaterial = bodyMat;
        this.turretMaterial = turretMat;
    }
    
    createCrown() {
        // Crown group
        this.crownGroup = new THREE.Group();
        
        const crownMat = new THREE.MeshPhongMaterial({ 
            color: 0xffd700, // Gold
            shininess: 80,
            emissive: 0x443300,
            emissiveIntensity: 0.2
        });
        
        // Base ring
        const ringGeo = new THREE.TorusGeometry(5, 1, 8, 12);
        const ring = new THREE.Mesh(ringGeo, crownMat);
        ring.rotation.x = Math.PI / 2;
        this.crownGroup.add(ring);
        
        // Spikes
        const spikeGeo = new THREE.ConeGeometry(1.5, 5, 4);
        for (let i = 0; i < 4; i++) {
            const spike = new THREE.Mesh(spikeGeo, crownMat);
            const angle = (i / 4) * Math.PI * 2;
            spike.position.set(Math.sin(angle) * 5, 2, Math.cos(angle) * 5);
            // Rotate spike to face outward slightly? No, simple vertical is fine.
            this.crownGroup.add(spike);
        }
        
        // Position above name
        this.crownGroup.position.y = 70;
        this.crownGroup.visible = false;
        
        this.group.add(this.crownGroup);
    }
    
    setLeader(isLeader) {
        if (this.crownGroup) {
            this.crownGroup.visible = isLeader;
        }
    }

    // Helper to darken a hex color
    darkenColor(hex, factor) {
        const r = Math.floor(((hex >> 16) & 0xff) * (1 - factor));
        const g = Math.floor(((hex >> 8) & 0xff) * (1 - factor));
        const b = Math.floor((hex & 0xff) * (1 - factor));
        return (r << 16) | (g << 8) | b;
    }
    
    // Convert hex color to CSS string
    hexToCSS(hex) {
        return '#' + hex.toString(16).padStart(6, '0');
    }
    
    createNameLabel() {
        // Create canvas for name
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, 256, 64);
        
        ctx.font = 'bold 32px Arial';
        // Use tank color for name, highlight local player
        const nameColor = this.tankColor ? this.hexToCSS(this.tankColor) : '#ffffff';
        ctx.fillStyle = this.isLocal ? nameColor : '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(this.nickname.substring(0, 12), 128, 42);
        
        // Add outline for local player to highlight
        if (this.isLocal) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeText(this.nickname.substring(0, 12), 128, 42);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        
        this.nameSprite = new THREE.Sprite(spriteMat);
        this.nameSprite.scale.set(60, 15, 1);
        this.nameSprite.position.y = 50;
        this.group.add(this.nameSprite);
    }
    
    setPosition(x, z) {
        this.group.position.x = x;
        this.group.position.z = z;
    }
    
    get position() {
        return this.group.position;
    }
    
    updateFromState(state, deltaTime) {
        // Interpolate position
        this.group.position.x += (state.x - this.group.position.x) * 0.2;
        this.group.position.z += (state.z - this.group.position.z) * 0.2;
        
        // Interpolate body rotation
        // Invert angle for Three.js (Server: CW+, Three: CCW+)
        this.targetBodyAngle = -state.bodyAngle;
        let bodyAngleDiff = this.targetBodyAngle - this.group.rotation.y;
        while (bodyAngleDiff > Math.PI) bodyAngleDiff -= Math.PI * 2;
        while (bodyAngleDiff < -Math.PI) bodyAngleDiff += Math.PI * 2;
        this.group.rotation.y += bodyAngleDiff * 0.15;
        
        // Interpolate turret rotation (relative to body)
        this.targetTurretAngle = -state.turretAngle;
        // Turret rotation is absolute in state, but relative to body in scene graph
        const currentTurretAbs = this.group.rotation.y + this.turretGroup.rotation.y;
        let turretAngleDiff = this.targetTurretAngle - currentTurretAbs;
        while (turretAngleDiff > Math.PI) turretAngleDiff -= Math.PI * 2;
        while (turretAngleDiff < -Math.PI) turretAngleDiff += Math.PI * 2;
        
        this.turretGroup.rotation.y += turretAngleDiff * 0.2;
        
        // Update alive state
        this.setAlive(state.isAlive);
        this.setInvulnerable(state.invulnerable);
        
        // Rotate crown
        if (this.crownGroup && this.crownGroup.visible) {
            this.crownGroup.rotation.y += deltaTime * 2;
            // Bobbing effect
            this.crownGroup.position.y = 70 + Math.sin(Date.now() / 200) * 2;
        }
    }
    
    updateTurret(angle) {
        // For local player - immediate turret response
        if (this.isLocal) {
            // Invert angle for Three.js
            this.turretGroup.rotation.y = -angle - this.group.rotation.y;
        }
    }
    
    setAlive(alive) {
        this.isAlive = alive;
        this.group.visible = alive;
    }
    
    setInvulnerable(invulnerable) {
        if (this.isInvulnerable !== invulnerable) {
            this.isInvulnerable = invulnerable;
            
            // Visual effect for invulnerability
            if (invulnerable) {
                this.bodyMaterial.transparent = true;
                this.bodyMaterial.opacity = 0.6;
                this.turretMaterial.transparent = true;
                this.turretMaterial.opacity = 0.6;
            } else {
                this.bodyMaterial.transparent = false;
                this.bodyMaterial.opacity = 1;
                this.turretMaterial.transparent = false;
                this.turretMaterial.opacity = 1;
            }
        }
    }
    
    dispose() {
        this.group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
}
