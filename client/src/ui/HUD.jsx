import React from 'react';

export function HUD({ playerData }) {
    if (!playerData) return null;
    
    const hp = playerData.hp || 0;
    const maxHp = 100;
    const hpPercent = (hp / maxHp) * 100;
    
    const score = playerData.s || 0;
    const kills = playerData.k || 0;
    const deaths = playerData.d || 0;
    
    const hasTripleShot = playerData.ts;
    const hasSpeedBoost = playerData.sp;
    
    // HP bar color based on health
    const getHpColor = () => {
        if (hpPercent > 60) return '#22c55e';
        if (hpPercent > 30) return '#eab308';
        return '#ef4444';
    };
    
    return (
        <div className="hud hud-top-left">
            <div className="hp-bar">
                <div 
                    className="hp-bar-fill"
                    style={{ 
                        width: `${hpPercent}%`,
                        background: getHpColor()
                    }}
                />
                <span className="hp-text">{Math.round(hp)} / {maxHp}</span>
            </div>
            
            <div className="score-display">
                <div>Score: {score}</div>
                <div>K/D: {kills} / {deaths}</div>
            </div>
            
            <div className="power-ups-active">
                {hasTripleShot && (
                    <div className="power-up-icon triple" title="Triple Shot">
                        3x
                    </div>
                )}
                {hasSpeedBoost && (
                    <div className="power-up-icon speed" title="Speed Boost">
                        +
                    </div>
                )}
            </div>
        </div>
    );
}
