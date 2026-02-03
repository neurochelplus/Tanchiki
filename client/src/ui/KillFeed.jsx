import React from 'react';

export function KillFeed({ kills }) {
    return (
        <div className="kill-feed">
            {kills.map((kill) => (
                <div key={kill.id} className="kill-entry">
                    <span className="killer">{kill.killer}</span>
                    {' killed '}
                    <span className="victim">{kill.victim}</span>
                </div>
            ))}
        </div>
    );
}
