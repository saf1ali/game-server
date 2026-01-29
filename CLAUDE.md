# Game Server - Claude Instructions

> **Quick Start**: Building a new game? Jump to [Adding a New Game](#adding-a-new-game).
> **Debugging?** Check [Troubleshooting](#troubleshooting) and [Known Issues & Solutions](#known-issues--solutions).

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Building & Running](#building--running)
4. [Adding a New Game](#adding-a-new-game)
5. [Code Patterns & Best Practices](#code-patterns--best-practices)
6. [Troubleshooting](#troubleshooting)
7. [Known Issues & Solutions](#known-issues--solutions)

---

## Project Overview

C++ WebSocket game server supporting multiple real-time multiplayer games.

| Component | Library |
|-----------|---------|
| Networking | uWebSockets |
| Serialization | nlohmann/json |
| Build | CMake + MinGW |

---

## Architecture

### Threading Model

> ⚠️ **CRITICAL**: uWebSockets is **NOT thread-safe**. All WebSocket operations MUST run on the event loop thread.

The server uses a **single-threaded event loop** with a repeating timer for game updates:

```
┌─────────────────────────────────────────────────────────────┐
│                     Event Loop Thread                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  WebSocket   │    │  Game Timer  │    │   I/O Ops    │  │
│  │   Messages   │    │  (16ms tick) │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Why timer-based, not threaded?**
- uWebSockets uses single-threaded event loop (like Node.js)
- Timer callbacks run on same thread as WebSocket I/O
- No mutexes needed for WebSocket sends
- `ws->send()` is always safe from timer callbacks

### Component Hierarchy

```
Server (event loop + timer)
  └── Lobby (room management)
        └── Room (game instance + players)
              └── Game (game logic)
```

### Key Files

| File | Purpose |
|------|---------|
| `src/server/Server.cpp` | WebSocket server, event loop, game timer |
| `src/lobby/Room.cpp` | Room management, mutex-protected game access |
| `src/games/Game.hpp` | Base game interface (abstract class) |
| `src/games/Game.cpp` | Game factory, type registration |

### State Sync Flow

```
SERVER                                    CLIENT
───────                                   ──────
game_->update(dt)
       │
game_->getState() → JSON
       │
broadcastState() ──────────────────────→ updateState(state)
                                                │
                                          render()
```

**Games are server-authoritative**: Clients send input only, never modify state.

---

## Building & Running

```bash
cd build
mingw32-make
./game-server.exe
```

Open `client/index.html` in browser to play.

---

## Adding a New Game

### Workflow Overview

```
1. Plan Mode      →  Design mechanics, state shape, rendering
2. Create Branch  →  git checkout -b feature/game-name
3. Server Code    →  Game class (hpp/cpp)
4. Register Game  →  Game.cpp factory + CMakeLists.txt
5. Client Code    →  Renderer (js)
6. Register UI    →  main.js + index.html + lobby.js
7. Test           →  Build, run, play in browser
8. Commit         →  Small, focused commits
9. Merge          →  git checkout main && git merge feature/game-name
```

### Step 1: Plan the Game

Before writing code, define:

- **State shape**: What JSON does `getState()` return?
- **Input format**: What JSON does client send for input?
- **Update logic**: What happens each tick?
- **Win/lose conditions**: When is `isOver()` true?
- **Player limits**: Min/max players?

### Step 2: Create Files

```
src/games/MyGame.hpp      # Header
src/games/MyGame.cpp      # Implementation
client/js/mygame.js       # Renderer
```

### Step 3: Implement Server Game Class

#### Header (`src/games/MyGame.hpp`)

```cpp
#pragma once
#include "Game.hpp"

class MyGame : public Game {
public:
    MyGame();

    // Lifecycle
    void start() override;
    void update(float deltaTime) override;
    
    // Player events
    void onPlayerJoin(int playerId, const std::string& username = "") override;
    void onPlayerLeave(int playerId) override;
    
    // Input/Output
    void handleInput(int playerId, const json& input) override;
    json getState() const override;
    
    // Metadata
    bool isOver() const override { return gameOver_; }
    std::string getType() const override { return "mygame"; }
    int getMinPlayers() const override { return 2; }
    int getMaxPlayers() const override { return 4; }

private:
    bool gameOver_ = false;
    // Add game-specific state here
};
```

#### Implementation (`src/games/MyGame.cpp`)

```cpp
#include "MyGame.hpp"

MyGame::MyGame() {
    // Initialize default state
}

void MyGame::onPlayerJoin(int playerId, const std::string& username) {
    // Setup player-specific state
    // This runs BEFORE start()
}

void MyGame::onPlayerLeave(int playerId) {
    // Cleanup player state
}

void MyGame::start() {
    // Initialize game world
    // Spawn entities, reset scores, etc.
    
    // ⚠️ CRITICAL: Set started_ = true LAST
    started_ = true;
}

void MyGame::update(float deltaTime) {
    // ⚠️ CRITICAL: Always guard against uninitialized state
    if (!started_ || gameOver_) return;
    
    // Update game logic
    // Check win conditions
}

void MyGame::handleInput(int playerId, const json& input) {
    if (!started_ || gameOver_) return;
    
    // Process player input
    // e.g., input["action"], input["direction"]
}

json MyGame::getState() const {
    return {
        {"players", /* player data */},
        {"entities", /* game entities */},
        {"gameOver", gameOver_}
    };
}
```

### Step 4: Register Server Game

#### In `src/games/Game.cpp`

```cpp
#include "MyGame.hpp"

// In create() function:
std::unique_ptr<Game> Game::create(const std::string& type) {
    if (type == "pong") return std::make_unique<PongGame>();
    if (type == "snake") return std::make_unique<SnakeGame>();
    if (type == "mygame") return std::make_unique<MyGame>();  // ← Add this
    return nullptr;
}

// In getAvailableTypes():
std::vector<std::string> Game::getAvailableTypes() {
    return {"pong", "snake", "mygame"};  // ← Add to list
}
```

#### In `CMakeLists.txt`

```cmake
set(SOURCES
    ...
    src/games/MyGame.cpp  # ← Add this
)
set(HEADERS
    ...
    src/games/MyGame.hpp  # ← Add this
)
```

### Step 5: Implement Client Renderer

#### Create `client/js/mygame.js`

```javascript
const MyGameRenderer = {
    canvas: null,
    ctx: null,
    state: null,
    animationId: null,
    
    // Called once when game starts
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.state = null;
        
        this.setupInput();
        this.startRenderLoop();
    },
    
    setupInput() {
        // Keyboard
        this.keyHandler = (e) => {
            if (!this.state) return;
            socket.send('input', { key: e.key });
        };
        window.addEventListener('keydown', this.keyHandler);
        
        // Mouse (if needed)
        this.clickHandler = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            socket.send('input', { click: { x, y } });
        };
        this.canvas.addEventListener('click', this.clickHandler);
    },
    
    // Called every frame from server
    updateState(state) {
        this.state = state;
    },
    
    startRenderLoop() {
        const loop = () => {
            this.render();
            this.animationId = requestAnimationFrame(loop);
        };
        loop();
    },
    
    render() {
        const ctx = this.ctx;
        
        // Clear
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.state) {
            ctx.fillStyle = '#fff';
            ctx.fillText('Waiting for game...', 100, 100);
            return;
        }
        
        // Draw game based on this.state
        // Example:
        // this.state.players.forEach(p => this.drawPlayer(p));
    },
    
    // Called when leaving game
    cleanup() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('keydown', this.keyHandler);
        this.canvas.removeEventListener('click', this.clickHandler);
        this.state = null;
    }
};
```

### Step 6: Register Client UI

#### In `client/js/main.js`

```javascript
// In App.initGame():
initGame(type) {
    const canvas = document.getElementById('game-canvas');
    
    if (type === 'pong') {
        this.renderer = PongRenderer;
    } else if (type === 'snake') {
        this.renderer = SnakeRenderer;
    } else if (type === 'mygame') {      // ← Add this block
        this.renderer = MyGameRenderer;
    }
    
    this.renderer.init(canvas);
}
```

#### In `client/index.html`

```html
<!-- Add script -->
<script src="js/mygame.js"></script>

<!-- In game-select modal, add button -->
<button class="game-option" data-game="mygame">🎮 My Game</button>

<!-- In games-preview section, add card -->
<div class="game-card">
    <span class="icon">🎮</span>
    <span>My Game</span>
</div>
```

#### In `client/js/lobby.js`

```javascript
getGameIcon(game) {
    const icons = {
        pong: '🏓',
        snake: '🐍',
        mygame: '🎮'  // ← Add this
    };
    return icons[game] || '🎮';
}
```

### Step 7: Test

```bash
cd build
mingw32-make
./game-server.exe
# Open client/index.html in browser
# Create room, select game, start
```

### Step 8: Commit

Use conventional commits, no Claude attribution:

```bash
git add -A
git commit -m "feat(mygame): add basic game mechanics"
git commit -m "feat(mygame): implement client renderer"
git commit -m "fix(mygame): resolve collision detection"
git commit -m "style(mygame): polish UI elements"
```

---

## Code Patterns & Best Practices

### Server-Side Patterns

#### Safe `start()` Function
```cpp
void MyGame::start() {
    // 1. Initialize ALL state first
    players_.clear();
    for (auto& [id, player] : playerMap_) {
        spawnPlayer(id);
    }
    spawnEntities();
    
    // 2. Set started_ LAST (prevents race condition)
    started_ = true;
}
```

#### Safe `update()` Function
```cpp
void MyGame::update(float deltaTime) {
    // Guard clauses first
    if (!started_) return;
    if (gameOver_) return;
    if (players_.empty()) return;
    
    // Safe to update
    for (auto& player : players_) {
        updatePlayer(player, deltaTime);
    }
}
```

#### Clean State JSON
```cpp
json MyGame::getState() const {
    json state;
    state["gameOver"] = gameOver_;
    state["winner"] = winner_;
    
    // Use arrays for collections
    state["players"] = json::array();
    for (const auto& p : players_) {
        state["players"].push_back({
            {"id", p.id},
            {"x", p.x},
            {"y", p.y},
            {"score", p.score}
        });
    }
    
    return state;
}
```

### Client-Side Patterns

#### Smooth Rendering
```javascript
render() {
    // Always clear first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Guard against null state
    if (!this.state) return;
    
    // Draw in layers (back to front)
    this.drawBackground();
    this.drawEntities();
    this.drawPlayers();
    this.drawUI();
}
```

#### Input Debouncing
```javascript
setupInput() {
    let lastInput = 0;
    const DEBOUNCE_MS = 50;
    
    this.keyHandler = (e) => {
        const now = Date.now();
        if (now - lastInput < DEBOUNCE_MS) return;
        lastInput = now;
        
        socket.send('input', { key: e.key });
    };
}
```

---

## Troubleshooting

### Quick Diagnosis

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Server crashes on game start | `started_ = true` set too early | Move to END of `start()` |
| Server crashes on restart | WebSocket called from wrong thread | Ensure timer-based game loop |
| "Cork buffer" error | Thread-safety violation | All `ws->send()` on event loop |
| Game won't start (hangs) | Deadlock in mutex | Use `recursive_mutex` |
| State not updating | `getState()` returning stale data | Check `started_` flag |
| Client not receiving state | Renderer not registered | Check `main.js` switch statement |

### Debug Checklist

1. **Server compiles?**
   - Check `CMakeLists.txt` includes new files
   - Check `#include` statements

2. **Game registered?**
   - Check `Game::create()` has your type
   - Check `Game::getAvailableTypes()` includes it

3. **Client shows game?**
   - Check `index.html` has script tag
   - Check `index.html` has game button
   - Check `main.js` has renderer case
   - Check `lobby.js` has icon mapping

4. **State flowing?**
   - Add `console.log(state)` in `updateState()`
   - Check server logs for broadcast

---

## Known Issues & Solutions

### Issue: Race Condition Crash on Start

**Symptom**: Server crashes instantly when game starts.

**Cause**: `started_ = true` at BEGINNING of `start()`. Game loop sees `started_ == true` and calls `update()` before state is initialized.

**Fix**:
```cpp
void MyGame::start() {
    // Initialize everything FIRST
    spawnPlayers();
    spawnEntities();
    
    // Set started_ LAST
    started_ = true;
}
```

---

### Issue: Cork Buffer Error After First Round

**Symptom**: After completing one round, server crashes:
```
Error: Cork buffer must not be acquired without checking canCork!
```

**Cause**: Game loop running in separate thread called `ws->send()`. uWebSockets is not thread-safe.

**Fix**: Use timer on event loop (current architecture):
```cpp
// ✅ Correct: Timer callback runs on event loop
us_timer_set(gameTimer, [](struct us_timer_t* timer) {
    server->lobby_.update(deltaTime);
}, 16, 16);

// ❌ Wrong: Separate thread
// gameLoopThread_ = std::thread(&Server::gameLoop, this);
```

---

### Issue: Deadlock on Start

**Symptom**: Clicking "Start Game" does nothing, server hangs.

**Cause**: `start()` acquires lock, calls `canStart()` which tries to acquire same lock.

**Fix**: Use `std::recursive_mutex`:
```cpp
mutable std::recursive_mutex gameMutex_;
```

---

### Issue: Players Not Appearing

**Symptom**: Game starts but players are invisible.

**Cause**: `onPlayerJoin()` not populating player state, or `getState()` not including players.

**Fix**: Ensure `onPlayerJoin()` creates player data and `getState()` serializes it.

---

## Commit Message Format

```
type(scope): description

feat(mygame): add power-up system
fix(mygame): prevent players from spawning in walls  
refactor(mygame): extract collision detection to helper
style(mygame): improve health bar visuals
docs(mygame): add gameplay instructions
test(mygame): add unit tests for scoring
```

Types: `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`