// ============================================
// AudioManager - Sound effects
// ============================================

export class AudioManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.5;
        
        // Create audio context on user interaction
        this.audioContext = null;
        this.initialized = false;
        
        // Sound URLs (using base64 encoded simple sounds or URLs)
        this.soundConfigs = {
            shoot: { frequency: 200, duration: 0.1, type: 'square' },
            hit: { frequency: 300, duration: 0.15, type: 'sawtooth' },
            explosion: { frequency: 100, duration: 0.4, type: 'sawtooth' },
            powerup: { frequency: 600, duration: 0.2, type: 'sine' },
            blockDestroy: { frequency: 150, duration: 0.2, type: 'triangle' }
        };
        
        // Initialize on first user interaction
        this.initOnInteraction();
    }
    
    initOnInteraction() {
        const init = () => {
            if (!this.initialized) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.initialized = true;
                console.log('Audio initialized');
            }
            
            document.removeEventListener('click', init);
            document.removeEventListener('touchstart', init);
            document.removeEventListener('keydown', init);
        };
        
        document.addEventListener('click', init);
        document.addEventListener('touchstart', init);
        document.addEventListener('keydown', init);
    }
    
    play(soundName) {
        if (!this.enabled || !this.initialized || !this.audioContext) return;
        
        const config = this.soundConfigs[soundName];
        if (!config) return;
        
        try {
            // Create oscillator for simple synthesized sounds
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = config.type;
            oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);
            
            // Quick fade out
            gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + config.duration);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + config.duration);
            
            // Add some variation
            if (soundName === 'explosion') {
                // Add noise burst for explosion
                this.playNoiseBurst(0.3);
            }
        } catch (e) {
            console.warn('Audio playback failed:', e);
        }
    }
    
    playNoiseBurst(duration) {
        if (!this.audioContext) return;
        
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = buffer;
        gainNode.gain.setValueAtTime(this.volume * 0.3, this.audioContext.currentTime);
        
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.start();
    }
    
    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
    dispose() {
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}
