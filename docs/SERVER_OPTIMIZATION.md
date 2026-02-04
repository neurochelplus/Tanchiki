# Оптимизация сервера Tanchiki.io

## Текущие ресурсы
- **RAM:** 512 MB
- **CPU:** 0.1 vCPU (очень ограниченный)

## Текущий анализ архитектуры

### Узкие места

| Компонент | Проблема | Влияние |
|-----------|----------|---------|
| `broadcastGameState()` | Отправка состояния каждому игроку отдельно | O(n) сокет-операций на тик |
| `getStateForPlayer()` | Сериализация для каждого игрока отдельно | O(n * m) где m = количество объектов |
| `checkBulletPlayerCollisions()` | O(bullets * players) без spatial hash | Квадратичная сложность |
| `checkBulletBlockCollisions()` | O(bullets * blocks) без spatial hash | Квадратичная сложность |
| Tick rate 20 Hz | Высокая нагрузка на слабый CPU | ~50ms на обработку тика |
| JSON сериализация | Создание новых объектов каждый тик | GC pressure, память |

---

## Приоритет 1: Критические оптимизации (быстрый эффект)

### 1.1 Снизить tick rate до 10-15 Hz

**Файл:** `server/src/game/GameLoop.js`

```javascript
// Было:
this.tickRate = 20; // Hz

// Рекомендация:
this.tickRate = 10; // Hz - вдвое меньше нагрузки на CPU
```

**Эффект:** -50% нагрузки на CPU

---

### 1.2 Снизить частоту broadcast до 10 Hz

**Файл:** `server/src/network/SocketHandler.js`

```javascript
// Было:
this.broadcastInterval = setInterval(() => {
    this.broadcastGameState();
}, 1000 / 20); // 20 Hz

// Рекомендация:
this.broadcastInterval = setInterval(() => {
    this.broadcastGameState();
}, 1000 / 10); // 10 Hz
```

**Эффект:** -50% сетевых операций

---

### 1.3 Использовать Binary Protocol вместо JSON

**Проблема:** JSON.stringify создаёт много временных строк, нагружает GC.

**Решение:** Использовать MessagePack или собственный бинарный протокол.

```bash
npm install @msgpack/msgpack
```

```javascript
import { encode } from '@msgpack/msgpack';

// Вместо:
socket.emit('gameState', this.gameState.getStateForPlayer(playerId));

// Использовать:
socket.emit('gameState', encode(this.gameState.getStateForPlayer(playerId)));
```

**Эффект:** -30-50% размер пакетов, -20% CPU на сериализацию

---

### 1.4 Дельта-компрессия состояния

Отправлять только изменения, а не полное состояние.

```javascript
class DeltaCompressor {
    constructor() {
        this.lastState = new Map(); // playerId -> lastSentState
    }
    
    getDelta(playerId, currentState) {
        const lastState = this.lastState.get(playerId);
        if (!lastState) {
            this.lastState.set(playerId, currentState);
            return { full: true, data: currentState };
        }
        
        const delta = {
            players: this.diffArray(lastState.players, currentState.players, 'id'),
            bullets: this.diffArray(lastState.bullets, currentState.bullets, 'id'),
            // powerUps и blocks меняются редко - можно отправлять реже
        };
        
        this.lastState.set(playerId, currentState);
        return { full: false, data: delta };
    }
    
    diffArray(oldArr, newArr, idField) {
        // Возвращает только изменённые/новые/удалённые элементы
        const changes = { added: [], updated: [], removed: [] };
        // ... реализация
        return changes;
    }
}
```

**Эффект:** -60-80% трафика при стабильной игре

---

## Приоритет 2: Оптимизация коллизий

### 2.1 Использовать SpatialHash для ВСЕХ коллизий

SpatialHash уже создан, но не используется! 

**Файл:** `server/src/game/GameLoop.js`

```javascript
tick() {
    // В начале тика перестроить spatial hash
    this.gameState.spatialHash.clear();
    
    // Добавить все объекты
    for (const player of this.gameState.players.values()) {
        if (player.isAlive) {
            this.gameState.spatialHash.insert({ ...player, type: 'player' });
        }
    }
    for (const block of this.gameState.blocks.values()) {
        this.gameState.spatialHash.insert({ ...block, type: 'block' });
    }
    
    // Далее обычный тик...
}

checkBulletPlayerCollisions() {
    for (const bullet of this.gameState.bullets.values()) {
        // Запросить только близкие объекты
        const nearby = this.gameState.spatialHash.query(bullet.x, bullet.z, 50);
        
        for (const obj of nearby) {
            if (obj.type === 'player' && obj.id !== bullet.ownerId) {
                // Проверка коллизии...
            }
        }
    }
}
```

**Эффект:** O(n) вместо O(n*m) для коллизий

---

### 2.2 Оптимизация SpatialHash

```javascript
export class SpatialHash {
    constructor(cellSize = 100) {
        this.cellSize = cellSize;
        this.cells = new Map();
        this.invCellSize = 1 / cellSize; // Избегаем деления
    }
    
    getKey(x, z) {
        // Битовые операции быстрее
        const cellX = (x * this.invCellSize) | 0;
        const cellZ = (z * this.invCellSize) | 0;
        return (cellX << 16) | (cellZ & 0xFFFF); // Number вместо String
    }
    
    query(x, z, radius) {
        const results = [];
        const cellRadius = (radius * this.invCellSize + 1) | 0;
        const centerCellX = (x * this.invCellSize) | 0;
        const centerCellZ = (z * this.invCellSize) | 0;
        const radiusSq = radius * radius; // Избегаем sqrt
        
        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dz = -cellRadius; dz <= cellRadius; dz++) {
                const key = ((centerCellX + dx) << 16) | ((centerCellZ + dz) & 0xFFFF);
                const cell = this.cells.get(key);
                
                if (cell) {
                    for (let i = 0; i < cell.length; i++) {
                        const entity = cell[i];
                        const edx = entity.x - x;
                        const edz = entity.z - z;
                        // Сравнение квадратов вместо sqrt
                        if (edx * edx + edz * edz <= radiusSq) {
                            results.push(entity);
                        }
                    }
                }
            }
        }
        
        return results;
    }
}
```

---

## Приоритет 3: Оптимизация памяти

### 3.1 Object Pooling для пуль

Пули создаются и удаляются часто. Используйте пул объектов:

```javascript
class BulletPool {
    constructor(size = 500) {
        this.pool = [];
        this.active = new Map();
        
        // Предварительное создание
        for (let i = 0; i < size; i++) {
            this.pool.push(new Bullet());
        }
    }
    
    acquire(id, ownerId, x, z, angle, speed, damage) {
        const bullet = this.pool.pop() || new Bullet();
        bullet.reset(id, ownerId, x, z, angle, speed, damage);
        this.active.set(id, bullet);
        return bullet;
    }
    
    release(id) {
        const bullet = this.active.get(id);
        if (bullet) {
            this.active.delete(id);
            this.pool.push(bullet);
        }
    }
}
```

**Эффект:** Уменьшение GC pauses, стабильное использование памяти

---

### 3.2 Переиспользование объектов сериализации

```javascript
// Вместо создания новых объектов:
serialize() {
    return {
        id: this.id,
        x: this.x,
        // ...
    };
}

// Переиспользовать объект:
class Player {
    constructor() {
        this._serialized = {}; // Кэшированный объект
    }
    
    serialize() {
        const s = this._serialized;
        s.id = this.id;
        s.n = this.nickname;
        s.x = (this.x * 10 + 0.5) | 0; // Быстрее Math.round
        s.z = (this.z * 10 + 0.5) | 0;
        // ...
        return s;
    }
}
```

---

### 3.3 Ограничение максимального количества игроков

```javascript
// server.js
const MAX_PLAYERS = 20; // Для 512MB RAM

io.on('connection', (socket) => {
    if (gameLoop.gameState.getPlayerCount() >= MAX_PLAYERS) {
        socket.emit('serverFull', { message: 'Server is full' });
        socket.disconnect();
        return;
    }
    socketHandler.handleConnection(socket);
});
```

---

## Приоритет 4: Архитектурные улучшения

### 4.1 Area of Interest (AOI) оптимизация

Текущая реализация `getStateForPlayer()` проходит по ВСЕМ объектам.

```javascript
getStateForPlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return null;
    
    const viewRadius = 800;
    const viewRadiusSq = viewRadius * viewRadius;
    const px = player.x;
    const pz = player.z;
    
    // Использовать spatial hash для быстрого запроса
    const nearbyBullets = [];
    const nearbyPowerUps = [];
    const nearbyBlocks = [];
    
    // Запрос через spatial hash
    const nearby = this.spatialHash.query(px, pz, viewRadius);
    
    for (const obj of nearby) {
        switch (obj.type) {
            case 'bullet': nearbyBullets.push(obj); break;
            case 'powerUp': nearbyPowerUps.push(obj); break;
            case 'block': nearbyBlocks.push(obj); break;
        }
    }
    
    return {
        players: this.serializePlayers(), // Все игроки всегда видны
        bullets: nearbyBullets.map(b => b.serialize()),
        powerUps: nearbyPowerUps.map(p => p.serialize()),
        blocks: nearbyBlocks.map(b => b.serialize()),
        arenaSize: this.arenaSize
    };
}
```

---

### 4.2 Группировка broadcast по комнатам Socket.io

```javascript
broadcastGameState() {
    // Вместо отправки каждому отдельно - использовать rooms
    const state = this.gameState.getFullState();
    
    // Один broadcast всем
    this.io.emit('gameState', state);
}
```

Или для AOI - разделить арену на зоны:

```javascript
// При подключении присоединять к комнате зоны
function getZoneRoom(x, z) {
    const zoneX = Math.floor(x / 500);
    const zoneZ = Math.floor(z / 500);
    return `zone_${zoneX}_${zoneZ}`;
}

// При движении игрока переключать комнаты
function updatePlayerZone(socket, player) {
    const newRoom = getZoneRoom(player.x, player.z);
    if (player.currentRoom !== newRoom) {
        socket.leave(player.currentRoom);
        socket.join(newRoom);
        player.currentRoom = newRoom;
    }
}
```

---

## Приоритет 5: Мониторинг и профилирование

### 5.1 Добавить метрики производительности

```javascript
class PerformanceMonitor {
    constructor() {
        this.tickTimes = [];
        this.maxSamples = 100;
    }
    
    measureTick(fn) {
        const start = process.hrtime.bigint();
        fn();
        const end = process.hrtime.bigint();
        const ms = Number(end - start) / 1_000_000;
        
        this.tickTimes.push(ms);
        if (this.tickTimes.length > this.maxSamples) {
            this.tickTimes.shift();
        }
    }
    
    getStats() {
        if (this.tickTimes.length === 0) return null;
        
        const avg = this.tickTimes.reduce((a, b) => a + b) / this.tickTimes.length;
        const max = Math.max(...this.tickTimes);
        
        return {
            avgTickMs: avg.toFixed(2),
            maxTickMs: max.toFixed(2),
            memoryMB: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
        };
    }
}
```

### 5.2 Endpoint для мониторинга

```javascript
app.get('/stats', (req, res) => {
    res.json({
        players: gameLoop.gameState.getPlayerCount(),
        bullets: gameLoop.gameState.bullets.size,
        powerUps: gameLoop.gameState.powerUps.size,
        blocks: gameLoop.gameState.blocks.size,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        performance: performanceMonitor.getStats()
    });
});
```

---

## Оценка ёмкости

### При текущей архитектуре (без оптимизаций)

| Игроки | RAM | CPU | Статус |
|--------|-----|-----|--------|
| 5 | ~100 MB | ~5% | OK |
| 10 | ~150 MB | ~15% | OK |
| 20 | ~250 MB | ~40% | Предел |
| 30+ | ~350 MB | ~70%+ | Лаги |

### После оптимизаций Приоритета 1-2

| Игроки | RAM | CPU | Статус |
|--------|-----|-----|--------|
| 10 | ~80 MB | ~5% | OK |
| 20 | ~120 MB | ~12% | OK |
| 30 | ~180 MB | ~20% | OK |
| 50 | ~280 MB | ~35% | OK |
| 70+ | ~400 MB | ~50%+ | Предел |

---

## Быстрый план внедрения

### Неделя 1 (критично)
1. [x] Снизить tick rate до 10 Hz
2. [x] Снизить broadcast rate до 10 Hz  
3. [ ] Включить использование SpatialHash для коллизий

### Неделя 2
4. [ ] Добавить Object Pool для пуль
5. [ ] Оптимизировать сериализацию (переиспользование объектов)
6. [ ] Добавить мониторинг производительности

### Неделя 3
7. [ ] Внедрить дельта-компрессию
8. [ ] Рассмотреть MessagePack

---

## Альтернативные решения

### Если нужно больше 50 игроков

1. **Вертикальное масштабирование** - увеличить RAM до 1GB, CPU до 0.5
2. **Горизонтальное масштабирование** - несколько серверов с разными "комнатами"
3. **Edge computing** - использовать Cloudflare Workers или Deno Deploy для приближения к игрокам

### Если нужна стабильность при пиках

1. **Rate limiting** на входящие сообщения
2. **Очередь подключений** при перегрузке
3. **Graceful degradation** - снижение tick rate при высокой нагрузке

```javascript
// Адаптивный tick rate
tick() {
    const start = Date.now();
    // ... game logic
    const elapsed = Date.now() - start;
    
    if (elapsed > this.tickInterval * 0.8) {
        this.tickRate = Math.max(5, this.tickRate - 1);
        console.warn(`Reducing tick rate to ${this.tickRate} Hz`);
    }
}
```
