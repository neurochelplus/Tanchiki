import React, { useMemo } from 'react';

export function Leaderboard({ players, localPlayerId }) {
    const sortedPlayers = useMemo(() => {
        const isMobile = window.innerWidth <= 480;
        return [...players]
            .filter(p => p.a) // Only alive players
            .sort((a, b) => b.s - a.s) // Sort by score descending
            .slice(0, isMobile ? 3 : 10); // Top 3 on mobile, top 10 otherwise
    }, [players]);
    
    if (sortedPlayers.length === 0) return null;
    
    return (
        <div className="hud hud-top-right">
            <div className="leaderboard">
                <h3>Leaderboard</h3>
                {sortedPlayers.map((player, index) => (
                    <div 
                        key={player.id}
                        className={`leaderboard-entry ${player.id === localPlayerId ? 'self' : ''}`}
                    >
                        <span className="rank">#{index + 1}</span>
                        <span className="name">{player.n}</span>
                        <span className="score">{player.s}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
