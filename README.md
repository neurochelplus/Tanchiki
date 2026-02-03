# Tanchiki.io - Multiplayer 3D Tank Battle Game

A real-time multiplayer .io game built with Three.js and Socket.io.

## Features

- **Real-time multiplayer** - Battle against other players online
- **Dynamic arena** - Arena size adapts to player count (1500-4000 units)
- **Power-ups** - Triple shot, speed boost, and healing
- **Destructible blocks** - Tactical cover that can be destroyed
- **Cross-platform** - Works on desktop and mobile devices
- **Smooth gameplay** - Client-side interpolation for lag compensation

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React + Vite |
| 3D Engine | Three.js |
| Networking | Socket.io |
| Backend | Node.js + Express |
| Mobile Controls | nipplejs |

## Project Structure

```
tanchiki/
├── client/                 # React frontend
│   ├── src/
│   │   ├── game/          # Three.js game logic
│   │   ├── network/       # Socket.io client
│   │   ├── input/         # Input handling
│   │   ├── audio/         # Sound effects
│   │   └── ui/            # React UI components
│   └── package.json
│
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── game/          # Game state & logic
│   │   ├── network/       # Socket handlers
│   │   └── utils/         # Utilities
│   └── package.json
│
└── README.md
```

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd tanchiki
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Create environment files**
   ```bash
   # In client folder
   cp .env.example .env
   
   # In server folder
   cp .env.example .env
   ```

5. **Start the server**
   ```bash
   cd server
   npm run dev
   ```

6. **Start the client** (in a new terminal)
   ```bash
   cd client
   npm run dev
   ```

7. **Open the game**
   Navigate to `http://localhost:5173`

## Deployment

### Server (Render.com)

1. **Create account** at [render.com](https://render.com)

2. **Create new Web Service**
   - Connect your GitHub repository
   - Set root directory: `server`
   - Build command: `npm install`
   - Start command: `npm start`

3. **Add environment variables**
   ```
   NODE_ENV=production
   CLIENT_URL=https://your-app.vercel.app
   ```

4. **Deploy** - Render will automatically deploy on push

5. **Note your server URL** (e.g., `https://tanchiki-server.onrender.com`)

### Client (Vercel)

1. **Create account** at [vercel.com](https://vercel.com)

2. **Import project**
   - Connect your GitHub repository
   - Set root directory: `client`
   - Framework preset: Vite

3. **Add environment variables**
   ```
   VITE_SERVER_URL=https://your-server.onrender.com
   ```

4. **Deploy** - Vercel will automatically deploy

### Connecting Client to Server

After both are deployed:

1. Update server's `CLIENT_URL` to your Vercel app URL
2. Update client's `VITE_SERVER_URL` to your Render server URL
3. Redeploy both if needed

## Game Controls

### Desktop
- **WASD** or **Arrow Keys** - Move tank
- **Mouse** - Aim turret
- **Left Click** - Shoot (hold for continuous fire)

### Mobile
- **Left Joystick** - Move tank
- **Right Joystick** - Aim and shoot (release to stop)

## Game Mechanics

### Scoring
- Kill enemy: **+100 points**
- Death: Score resets to 0

### Power-ups

| Power-up | Effect | Duration |
|----------|--------|----------|
| Triple Shot (orange) | Fires 3 bullets in a spread | 10 seconds |
| Speed Boost (blue) | 50% movement speed increase | 8 seconds |
| Heal (green) | Restores 50 HP | Instant |

### Tank Stats
- **HP**: 100
- **Bullet damage**: 25
- **Fire rate**: 5 shots/second
- **Respawn invulnerability**: 2 seconds

## Configuration

### Server config (`server/src/game/GameState.js`)
```javascript
this.config = {
    maxPowerUps: 15,
    maxBlocks: 50,
    powerUpSpawnInterval: 5000,
    bulletSpeed: 400,
    bulletLifetime: 3000,
    playerMaxHp: 100,
    playerSpeed: 150,
    bulletDamage: 25
};
```

### Arena scaling (`server/src/game/ArenaManager.js`)
```javascript
// Arena size = 1500 + (50 * playerCount), max 4000
this.baseSize = 1500;
this.perPlayerSize = 50;
this.maxSize = 4000;
```

## Optimization Notes

- **InstancedMesh** used for bullets and power-ups (GPU optimization)
- **Area of Interest** filtering reduces network traffic
- **Client-side interpolation** for smooth movement
- **Simple geometry** (~100 triangles per tank)
- **MeshPhongMaterial** for balanced performance/quality

## Troubleshooting

### "Cannot connect to server"
- Check server is running
- Verify VITE_SERVER_URL is correct
- Check browser console for CORS errors

### "Laggy movement"
- Check network connection
- Server might be cold-starting (Render free tier)
- Try refreshing the page

### "No sound"
- Click/tap the screen to initialize audio (browser requirement)
- Check device volume

## License

MIT License - feel free to use and modify!
