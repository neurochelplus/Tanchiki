import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Game } from './game/Game';
import { NetworkManager } from './network/NetworkManager';
import { SpawnScreen } from './ui/SpawnScreen';
import { HUD } from './ui/HUD';
import { Leaderboard } from './ui/Leaderboard';
import { MobileControls } from './ui/MobileControls';
import { KillFeed } from './ui/KillFeed';
import { isMobile } from './utils/DeviceDetector';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

function App() {
    const containerRef = useRef(null);
    const gameRef = useRef(null);
    const networkRef = useRef(null);
    
    const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'dead'
    const [playerData, setPlayerData] = useState(null);
    const [players, setPlayers] = useState([]);
    const [connected, setConnected] = useState(false);
    const [ping, setPing] = useState(0);
    const [kills, setKills] = useState([]);
    const [killedBy, setKilledBy] = useState(null);
    const [respawnTimer, setRespawnTimer] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const mobile = isMobile();
    
    // Respawn timer countdown
    useEffect(() => {
        if (respawnTimer > 0) {
            const timerId = setTimeout(() => {
                setRespawnTimer(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timerId);
        }
    }, [respawnTimer]);
    
    // Initialize game and network
    useEffect(() => {
        if (!containerRef.current) return;
        
        // Create game instance
        const game = new Game(containerRef.current);
        gameRef.current = game;
        
        // Create network manager
        const network = new NetworkManager(SERVER_URL);
        networkRef.current = network;
        
        // Network event handlers
        network.on('connected', () => {
            setConnected(true);
            console.log('Connected to server');
        });
        
        network.on('disconnected', () => {
            setConnected(false);
            setGameState('menu');
        });
        
        network.on('serverFull', (data) => {
            alert(data.message || 'Server is full!');
            // Ensure we stay in menu
            setGameState('menu');
        });
        
        network.on('gameState', (state) => {
            game.updateFromServer(state);
            
            // Update player list for leaderboard
            setPlayers(state.players || []);
            
            // Update local player data
            const localPlayer = state.players?.find(p => p.id === network.playerId);
            if (localPlayer) {
                setPlayerData(localPlayer);
            }
        });
        
        network.on('playerDeath', (data) => {
            addKill(data.killerName, data.victimName);
            
            if (data.playerId === network.playerId) {
                setKilledBy(data.killerName);
                setGameState('dead');
                setRespawnTimer(4); // Start 4 second cooldown
            }
        });
        
        network.on('respawned', (data) => {
            setGameState('playing');
            setKilledBy(null);
        });
        
        network.on('ping', (pingValue) => {
            setPing(pingValue);
        });
        
        // Connect network callbacks to game
        game.setLocalPlayerId(network.playerId);
        game.setNetworkCallbacks(
            (input) => network.sendInput(input),
            () => network.shoot()
        );
        
        // Update local player ID when received
        network.on('init', (data) => {
            game.setLocalPlayerId(data.playerId);
        });
        
        // Handle hit effects
        network.on('playerHit', (data) => {
            game.onPlayerHit(data.targetId, data.shooterId, data.damage);
        });
        
        // Handle power-up effects
        network.on('powerUpCollected', (data) => {
            game.onPowerUpCollected(data.playerId, data.type);
        });
        
        // Handle block destruction
        network.on('blockDestroyed', (data) => {
            game.onBlockDestroyed(data.blockId);
        });
        
        // Connect to server
        network.connect();
        
        // Start game loop
        game.start();
        
        return () => {
            network.disconnect();
            game.dispose();
        };
    }, []);
    
    // Add kill to feed
    const addKill = useCallback((killer, victim) => {
        const id = Date.now();
        setKills(prev => [...prev.slice(-4), { id, killer, victim }]);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            setKills(prev => prev.filter(k => k.id !== id));
        }, 5000);
    }, []);
    
    // Handle join game
    const handleJoin = useCallback((nickname) => {
        if (networkRef.current) {
            networkRef.current.join(nickname);
            setGameState('playing');
        }
    }, []);
    
    // Handle respawn
    const handleRespawn = useCallback(() => {
        if (networkRef.current) {
            networkRef.current.respawn();
        }
    }, []);
    
    // Toggle fullscreen mode
    const toggleFullscreen = useCallback(() => {
        const elem = document.documentElement;
        
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            // Enter fullscreen
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                // Safari/iOS
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                // IE/Edge
                elem.msRequestFullscreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }, []);
    
    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(
                !!document.fullscreenElement || 
                !!document.webkitFullscreenElement ||
                !!document.msFullscreenElement
            );
        };
        
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
        
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);
    
    // Handle mobile joystick input
    const handleMobileInput = useCallback((type, data) => {
        if (gameRef.current && networkRef.current) {
            if (type === 'move') {
                gameRef.current.inputManager.setMobileMove(data);
            } else if (type === 'aim') {
                gameRef.current.inputManager.setMobileAim(data);
            }
        }
    }, []);
    
    return (
        <>
            <div id="game-container" ref={containerRef} />
            
            {/* Fullscreen button - always visible */}
            <button 
                className="fullscreen-button" 
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
                {isFullscreen ? (
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                    </svg>
                )}
            </button>
            
            {gameState === 'menu' && (
                <SpawnScreen 
                    onJoin={handleJoin}
                    connected={connected}
                />
            )}
            
            {gameState === 'dead' && (
                <SpawnScreen 
                    onJoin={handleRespawn}
                    connected={connected}
                    isDeath={true}
                    killedBy={killedBy}
                    nickname={playerData?.n}
                    respawnTimer={respawnTimer}
                />
            )}
            
            {gameState === 'playing' && (
                <>
                    <HUD playerData={playerData} />
                    <Leaderboard 
                        players={players} 
                        localPlayerId={networkRef.current?.playerId}
                    />
                    <KillFeed kills={kills} />
                    
                    {mobile && (
                        <MobileControls onInput={handleMobileInput} />
                    )}
                    
                    <div className="connection-status">
                        <div className={`connection-dot ${connected ? 'connected' : 'disconnected'}`} />
                        <span className="ping-display">{ping}ms</span>
                    </div>
                </>
            )}
        </>
    );
}

export default App;
