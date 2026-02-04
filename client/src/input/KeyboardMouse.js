// ============================================
// KeyboardMouse - Desktop input handler
// ============================================

import * as THREE from 'three';

export class KeyboardMouse {
    constructor(container, camera, renderer = null) {
        this.container = container;
        this.camera = camera;
        this.renderer = renderer; // Reference to renderer for player position
        
        this.keys = {
            KeyW: false,
            KeyA: false,
            KeyS: false,
            KeyD: false,
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };
        
        this.mouseDown = false;
        this.mouseAngle = 0;
        this.mousePosition = new THREE.Vector2();
        
        // For raycasting to get world position
        this.raycaster = new THREE.Raycaster();
        this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        
        // Callbacks
        this.onShoot = null;
        this.lastShootTime = 0;
        this.shootCooldown = 1000; // ms (1 second between shots)
        
        this.bindEvents();
    }
    
    bindEvents() {
        this.onKeyDown = (e) => {
            if (e.code in this.keys) {
                this.keys[e.code] = true;
            }
        };
        
        this.onKeyUp = (e) => {
            if (e.code in this.keys) {
                this.keys[e.code] = false;
            }
        };
        
        this.onMouseMove = (e) => {
            // Convert screen position to normalized device coordinates
            const rect = this.container.getBoundingClientRect();
            this.mousePosition.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mousePosition.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            
            this.updateMouseAngle();
        };
        
        this.onMouseDown = (e) => {
            if (e.button === 0) { // Left click
                this.mouseDown = true;
                this.tryShoot();
            }
        };
        
        this.onMouseUp = (e) => {
            if (e.button === 0) {
                this.mouseDown = false;
            }
        };
        
        this.onContextMenu = (e) => {
            e.preventDefault();
        };
        
        // Bind events
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        this.container.addEventListener('mousemove', this.onMouseMove);
        this.container.addEventListener('mousedown', this.onMouseDown);
        this.container.addEventListener('mouseup', this.onMouseUp);
        this.container.addEventListener('contextmenu', this.onContextMenu);
        
        // Continuous shooting while mouse held
        this.shootInterval = setInterval(() => {
            if (this.mouseDown) {
                this.tryShoot();
            }
        }, this.shootCooldown);
    }
    
    updateMouseAngle() {
        // Cast ray from camera through mouse position
        this.raycaster.setFromCamera(this.mousePosition, this.camera);
        
        // Find intersection with ground plane
        const intersect = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.groundPlane, intersect);
        
        if (intersect) {
            // Get player position from renderer (more accurate)
            let playerX = 0, playerZ = 0;
            
            if (this.renderer && this.renderer.playerPosition) {
                playerX = this.renderer.playerPosition.x;
                playerZ = this.renderer.playerPosition.z;
            }
            
            const dx = intersect.x - playerX;
            const dz = intersect.z - playerZ;
            
            // Calculate angle: atan2(dx, -dz) for server-compatible orientation
            // Positive angle = Right (CW from North if viewed from below? No, sin(PI/2)=1)
            this.mouseAngle = Math.atan2(dx, -dz);
        }
    }
    
    tryShoot() {
        const now = Date.now();
        if (now - this.lastShootTime >= this.shootCooldown) {
            this.lastShootTime = now;
            if (this.onShoot) {
                this.onShoot();
            }
        }
    }
    
    dispose() {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        this.container.removeEventListener('mousemove', this.onMouseMove);
        this.container.removeEventListener('mousedown', this.onMouseDown);
        this.container.removeEventListener('mouseup', this.onMouseUp);
        this.container.removeEventListener('contextmenu', this.onContextMenu);
        
        if (this.shootInterval) {
            clearInterval(this.shootInterval);
        }
    }
}
