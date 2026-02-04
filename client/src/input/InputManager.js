// ============================================
// InputManager - Unified input handling
// ============================================

import { KeyboardMouse } from './KeyboardMouse.js';
import { TouchControls } from './TouchControls.js';
import { isMobile } from '../utils/DeviceDetector.js';

export class InputManager {
    constructor(container, camera, renderer = null) {
        this.container = container;
        this.camera = camera;
        this.renderer = renderer;
        
        this.currentInput = {
            up: false,
            down: false,
            left: false,
            right: false,
            angle: 0,
            shooting: false
        };
        
        // Callbacks
        this.onShoot = null;
        
        // Mobile shooting cooldown
        this.lastMobileShootTime = 0;
        this.shootCooldown = 1000; // ms (1 second between shots)
        
        // Initialize appropriate input handler
        this.isMobile = isMobile();
        
        if (this.isMobile) {
            this.touchControls = new TouchControls();
        } else {
            this.keyboardMouse = new KeyboardMouse(container, camera, renderer);
            this.keyboardMouse.onShoot = () => {
                if (this.onShoot) this.onShoot();
            };
        }
        
        // Mobile joystick data
        this.mobileMove = { x: 0, y: 0 };
        this.mobileAim = { x: 0, y: 0, active: false };
    }
    
    getInput() {
        if (this.isMobile) {
            return this.getMobileInput();
        } else {
            return this.getDesktopInput();
        }
    }
    
    getDesktopInput() {
        if (!this.keyboardMouse) return this.currentInput;
        
        const kb = this.keyboardMouse;
        
        this.currentInput.up = kb.keys.KeyW || kb.keys.ArrowUp;
        this.currentInput.down = kb.keys.KeyS || kb.keys.ArrowDown;
        this.currentInput.left = kb.keys.KeyA || kb.keys.ArrowLeft;
        this.currentInput.right = kb.keys.KeyD || kb.keys.ArrowRight;
        this.currentInput.angle = kb.mouseAngle;
        this.currentInput.shooting = kb.mouseDown;
        
        return this.currentInput;
    }
    
    getMobileInput() {
        // Convert joystick position to directional input
        const deadzone = 0.2;
        
        this.currentInput.up = this.mobileMove.y < -deadzone;
        this.currentInput.down = this.mobileMove.y > deadzone;
        this.currentInput.left = this.mobileMove.x < -deadzone;
        this.currentInput.right = this.mobileMove.x > deadzone;
        
        // Aim angle from right joystick
        if (this.mobileAim.active) {
            // Use atan2(x, y) - nipplejs y+ is up, which matches game's forward direction
            this.currentInput.angle = Math.atan2(this.mobileAim.x, this.mobileAim.y);
            this.currentInput.shooting = true;
            
            // Trigger shoot callback with cooldown
            const now = Date.now();
            if (now - this.lastMobileShootTime >= this.shootCooldown) {
                this.lastMobileShootTime = now;
                if (this.onShoot) {
                    this.onShoot();
                }
            }
        } else {
            this.currentInput.shooting = false;
        }
        
        return this.currentInput;
    }
    
    setMobileMove(data) {
        this.mobileMove.x = data.x || 0;
        this.mobileMove.y = data.y || 0;
    }
    
    setMobileAim(data) {
        this.mobileAim.x = data.x || 0;
        this.mobileAim.y = data.y || 0;
        this.mobileAim.active = data.active || false;
    }
    
    dispose() {
        if (this.keyboardMouse) {
            this.keyboardMouse.dispose();
        }
        if (this.touchControls) {
            this.touchControls.dispose();
        }
    }
}
