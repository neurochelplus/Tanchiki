// ============================================
// Renderer - Three.js scene, camera, lights
// ============================================

import * as THREE from 'three';

export class Renderer {
    constructor(container) {
        this.container = container;
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        this.scene.fog = new THREE.Fog(0x87CEEB, 500, 2000);
        
        // Camera (isometric-style view from above)
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 3000);
        this.camera.position.set(0, 400, 300);
        this.camera.lookAt(0, 0, 0);
        
        // Camera follow settings
        this.cameraTarget = new THREE.Vector3();
        this.cameraOffset = new THREE.Vector3(0, 400, 300);
        this.cameraSmoothness = 0.1;
        
        // Player position for input calculations
        this.playerPosition = new THREE.Vector3();
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: window.devicePixelRatio < 2,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        container.appendChild(this.renderer.domElement);
        
        // Lighting
        this.setupLighting();
        
        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }
    
    setupLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);
        
        // Main directional light (sun)
        const sun = new THREE.DirectionalLight(0xffffff, 0.8);
        sun.position.set(100, 200, 100);
        sun.castShadow = true;
        
        // Shadow settings (optimized for performance)
        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;
        sun.shadow.camera.near = 10;
        sun.shadow.camera.far = 800;
        sun.shadow.camera.left = -400;
        sun.shadow.camera.right = 400;
        sun.shadow.camera.top = 400;
        sun.shadow.camera.bottom = -400;
        
        this.sun = sun;
        this.scene.add(sun);
        
        // Hemisphere light for nicer ambient
        const hemi = new THREE.HemisphereLight(0x87CEEB, 0x3d5c3d, 0.3);
        this.scene.add(hemi);
    }
    
    updateCamera(targetX, targetZ) {
        // Store player position for input calculations
        this.playerPosition.set(targetX, 0, targetZ);
        
        // Smoothly follow target
        this.cameraTarget.set(targetX, 0, targetZ);
        
        const targetPos = this.cameraTarget.clone().add(this.cameraOffset);
        
        this.camera.position.lerp(targetPos, this.cameraSmoothness);
        this.camera.lookAt(this.cameraTarget);
        
        // Update sun position to follow camera
        this.sun.position.set(
            this.camera.position.x + 100,
            200,
            this.camera.position.z + 100
        );
        this.sun.target.position.copy(this.cameraTarget);
    }
    
    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    dispose() {
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}
