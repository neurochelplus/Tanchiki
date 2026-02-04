// ============================================
// TANCHIKI.IO - Main Server Entry Point
// ============================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameLoop } from './game/GameLoop.js';
import { SocketHandler } from './network/SocketHandler.js';

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Express setup
const app = express();
app.use(cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:4173'],
    credentials: true
}));

app.get('/', (req, res) => {
    res.json({ 
        status: 'Tanchiki.io server is running',
        players: gameLoop.gameState.getPlayerCount(),
        arenaSize: gameLoop.gameState.arenaSize,
        performance: gameLoop.getPerformanceStats()
    });
});

app.get('/stats', (req, res) => {
    res.json({
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        players: gameLoop.gameState.getPlayerCount(),
        bullets: gameLoop.gameState.bullets.size,
        powerUps: gameLoop.gameState.powerUps.size,
        blocks: gameLoop.gameState.blocks.size,
        arenaSize: gameLoop.gameState.arenaSize,
        performance: gameLoop.getPerformanceStats()
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// HTTP & Socket.io server
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:4173'],
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Initialize game
const gameLoop = new GameLoop();
const socketHandler = new SocketHandler(io, gameLoop);

// Start game loop
gameLoop.start();

// Handle socket connections
io.on('connection', (socket) => {
    socketHandler.handleConnection(socket);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    gameLoop.stop();
    httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

httpServer.listen(PORT, () => {
    console.log(`🎮 Tanchiki.io server running on port ${PORT}`);
    console.log(`📡 Accepting connections from: ${CLIENT_URL}`);
});
