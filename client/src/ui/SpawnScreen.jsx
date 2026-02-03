import React, { useState, useCallback } from 'react';

export function SpawnScreen({ onJoin, connected, isDeath = false, killedBy = null, nickname = '' }) {
    const [inputNickname, setInputNickname] = useState(nickname || '');
    
    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        const name = inputNickname.trim() || 'Player';
        onJoin(name);
    }, [inputNickname, onJoin]);
    
    return (
        <div className="spawn-screen">
            <h1>TANCHIKI.io</h1>
            
            {isDeath && killedBy && (
                <div className="death-info">
                    Killed by {killedBy}
                </div>
            )}
            
            <p className="subtitle">
                {isDeath ? 'Try again?' : 'Multiplayer Tank Battle'}
            </p>
            
            <form onSubmit={handleSubmit}>
                {!isDeath && (
                    <input
                        type="text"
                        placeholder="Enter your nickname"
                        value={inputNickname}
                        onChange={(e) => setInputNickname(e.target.value)}
                        maxLength={16}
                        autoFocus
                    />
                )}
                
                <button type="submit" disabled={!connected}>
                    {!connected ? 'Connecting...' : (isDeath ? 'RESPAWN' : 'PLAY')}
                </button>
            </form>
            
            <div className="controls-hint">
                <p><strong>Desktop:</strong> WASD to move, Mouse to aim, Click to shoot</p>
                <p><strong>Mobile:</strong> Left joystick to move, Right joystick to aim & shoot</p>
            </div>
        </div>
    );
}
