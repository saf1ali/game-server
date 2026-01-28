# Potential Games - Game Server Expansion

A comprehensive list of games to add to the game server, categorized by difficulty and player mode.

---

## Current Games
- **Pong** - 2-player paddle game
- **Snake** - 1-4 player multiplayer
- **Tetris** - 1-2 player puzzle
- **Checkers** - 2-player strategy
- **Chat** - Unlimited text chat

---

## Architecture

| Game Type | Tech Stack | Why |
|-----------|------------|-----|
| **Multiplayer** | C++ Server + JS Client | Real-time sync, networking, performance |
| **Single Player** | Pure JavaScript | No server needed, offline capable |
| **.io Games** | C++ Server + JS Client | Scaling for 100+ players |

---

## Easy Games (1-3 days)

### Single Player

| Game | Description | Save Data |
|------|-------------|-----------|
| **2048** | Slide tiles, merge to 2048 | High score, best tile |
| **Breakout** | Bounce ball, destroy bricks | Level, score, lives |
| **Minesweeper** | Reveal cells, avoid mines | Best times |
| **Flappy Bird** | Tap to fly through pipes | High score |
| **Space Invaders** | Shoot descending aliens | High score, level |

### Multiplayer

| Game | Players | Description |
|------|---------|-------------|
| **Tic-Tac-Toe** | 2 | Classic X and O |
| **Connect Four** | 2 | Drop discs, get 4 in a row |
| **Memory Match** | 1-2 | Flip cards, find pairs |

---

## Medium Games (1-2 weeks)

### Single Player

| Game | Description | Key Features |
|------|-------------|--------------|
| **Hill Climb Racing** | Physics-based driving | Vehicle unlocks, terrain variety |
| **Tower Defense** | Place towers, stop enemies | Upgrade system, waves |
| **Platformer** | Run, jump, collect | Wall-jump, momentum physics |

### Multiplayer

| Game | Players | Description |
|------|---------|-------------|
| **Agar.io Clone** | Many | Eat cells to grow, split/eject |
| **Slither.io Clone** | Many | Snake MMO with boost |
| **Zombie Horde** | 1-4 | Survive waves of zombies |
| **Racing** | 2-4 | Top-down with power-ups |
| **Uno Clone** | 2-4 | Card matching game |

---

## Hard Games (2-4 weeks)

| Game | Type | Description |
|------|------|-------------|
| **Beat 'Em Up** | Co-op 1-4 | Castle Crashers-style brawler with RPG elements |
| **Roguelike** | Single | Procedural dungeons, permadeath |
| **Battle Royale** | Many | Shrinking zone, last standing wins |
| **Physics Puzzler** | Single | Blockhead Zombies-style physics action |

---

## New Features Needed

### Save System (localStorage)
```javascript
SaveSystem.save('2048', { score: 5000, bestTile: 512 });
SaveSystem.load('2048'); // Returns saved data
```

### Pause Menu (Single Player)
- Press ESC or P to pause
- Resume, Restart, Settings, Quit options
- Game loop stops but render continues

### UI Updates
- Separate Single Player / Multiplayer sections on lobby
- High score display
- Settings menu

---

## Implementation Priority

1. **Phase 1**: 2048, Breakout, Minesweeper, Flappy Bird
2. **Phase 2**: Tic-Tac-Toe, Connect Four
3. **Phase 3**: Agar.io, Slither.io clones
4. **Phase 4**: Hill Climb, Tower Defense
5. **Phase 5**: Zombie Horde, Racing
6. **Phase 6**: Beat 'Em Up, Roguelike

---

## Technical Notes

### .io Game Scaling
- Spatial partitioning (quadtree) for collision
- Interest management - only send nearby entities
- Target: 100+ players per server instance

### Physics Games
- Custom 2D physics or integrate Box2D
- Terrain generation with Perlin noise
- Vehicle suspension simulation

### Platformer
- Tile-based collision
- Variable jump height
- Momentum-based movement (Sonic/Fancy Pants style)

---

*Last updated: January 28, 2026*
