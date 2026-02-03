import React, { useEffect, useRef, useCallback } from 'react';
import nipplejs from 'nipplejs';

export function MobileControls({ onInput }) {
    const leftZoneRef = useRef(null);
    const rightZoneRef = useRef(null);
    const leftJoystickRef = useRef(null);
    const rightJoystickRef = useRef(null);
    
    useEffect(() => {
        // Left joystick - Movement
        if (leftZoneRef.current) {
            leftJoystickRef.current = nipplejs.create({
                zone: leftZoneRef.current,
                mode: 'static',
                position: { left: '75px', bottom: '75px' },
                color: 'rgba(74, 222, 128, 0.5)',
                size: 120
            });
            
            leftJoystickRef.current.on('move', (evt, data) => {
                const x = data.vector.x;
                const y = data.vector.y;
                onInput('move', { x, y: -y }); // Invert Y for game coords
            });
            
            leftJoystickRef.current.on('end', () => {
                onInput('move', { x: 0, y: 0 });
            });
        }
        
        // Right joystick - Aim & Shoot
        if (rightZoneRef.current) {
            rightJoystickRef.current = nipplejs.create({
                zone: rightZoneRef.current,
                mode: 'static',
                position: { right: '75px', bottom: '75px' },
                color: 'rgba(239, 68, 68, 0.5)',
                size: 120
            });
            
            rightJoystickRef.current.on('move', (evt, data) => {
                const x = data.vector.x;
                const y = data.vector.y;
                // Pass raw joystick values, inversion is handled in InputManager
                onInput('aim', { x, y, active: true });
            });
            
            rightJoystickRef.current.on('end', () => {
                onInput('aim', { x: 0, y: 0, active: false });
            });
        }
        
        return () => {
            if (leftJoystickRef.current) {
                leftJoystickRef.current.destroy();
            }
            if (rightJoystickRef.current) {
                rightJoystickRef.current.destroy();
            }
        };
    }, [onInput]);
    
    return (
        <div className="mobile-controls">
            <div ref={leftZoneRef} className="joystick-zone left" />
            <div ref={rightZoneRef} className="joystick-zone right" />
        </div>
    );
}
