# Game Server - Claude Instructions

## Project Overview
C++ WebSocket game server supporting multiple real-time multiplayer games. Uses uWebSockets for networking and nlohmann/json for serialization.

## Architecture

### Threading Model
**CRITICAL**: uWebSockets is NOT thread-safe. All WebSocket operations and game updates MUST run on the same thread (the event loop thread). The game loop uses a `us_timer_t` repeating timer to schedule updates on the main event loop.

#### How the Timer Works
```cpp
// In Server::run() - creates a REPEATING timer, not one-shot
us_timer_set(gameTimer, callback, 16, 16);  // fires every 16ms forever
```
- First `16` = initial delay (ms)
- Second `16` = repeat interval (ms)
- Timer fires forever until server stops (~60 updates/second)
- Each tick calls `lobby_.update(deltaTime)` which updates all game rooms

#### Why Timer-Based (Not Threaded)?
This is the **correct architecture** for uWebSockets:
- uWebSockets uses a single-threaded event loop model (like Node.js)
- All I/O (WebSocket reads/writes) happens on the event loop thread
- Timer callbacks run on the same thread, so `ws->send()` is safe
- No mutexes needed for WebSocket operations (only for shared game state)

### Core Components
```
Server (event loop + timer-based game loop)
  └── Lobby (room management)
        └── Room (game instance + players)
              └── Game (game logic)
```

### Key Files
- `src/server/Server.cpp` - WebSocket server and game loop timer
- `src/lobby/Room.cpp` - Room management with mutex protection
- `src/games/Game.hpp` - Base game class interface
- `src/games/Game.cpp` - Game factory (registers all game types)

## Building

```bash
cd build
mingw32-make
./game-server.exe
```

Open `client/index.html` in browser to play.

## Adding a New Game

### Workflow
1. **Plan Mode**: Enter plan mode to design the game mechanics, state, and client rendering
2. **Create Branch**: `git checkout -b feature/game-name`
3. **Multiple Commits**: Make small, focused commits with conventional messages
4. **Test**: Run server and test in browser
5. **Merge**: `git checkout main && git merge feature/game-name`

### Implementation Steps

#### 1. Create Game Files
```
src/games/MyGame.hpp
src/games/MyGame.cpp
client/js/mygame.js
```

#### 2. Implement Game Class (Server)

```cpp
// MyGame.hpp
#pragma once
#include "Game.hpp"

class MyGame : public Game {
public:
    MyGame();

    void start() override;
    void update(float deltaTime) override;
    void handleInput(int playerId, const json& input) override;
    json getState() const override;

    bool isOver() const override { return gameOver_; }
    std::string getType() const override { return "mygame"; }
    int getMinPlayers() const override { return 2; }
    int getMaxPlayers() const override { return 4; }

    void onPlayerJoin(int playerId, const std::string& username = "") override;
    void onPlayerLeave(int playerId) override;

private:
    bool gameOver_ = false;
    // Game-specific state
};
```

Key points:
- Set `started_ = true` at END of `start()` to avoid race conditions
- Always check `started_`, `gameOver_`, and collection emptiness in `update()`
- `getState()` returns JSON sent to all clients every frame

#### 3. Register Game (Server)

In `src/games/Game.cpp`:
```cpp
#include "MyGame.hpp"

// In create() function:
if (type == "mygame") return std::make_unique<MyGame>();

// In getAvailableTypes():
return {"pong", "snake", ..., "mygame"};
```

In `CMakeLists.txt`:
```cmake
set(SOURCES
    ...
    src/games/MyGame.cpp
)
set(HEADERS
    ...
    src/games/MyGame.hpp
)
```

#### 4. Create Renderer (Client)

```javascript
// client/js/mygame.js
const MyGameRenderer = {
    canvas: null,
    ctx: null,
    state: null,

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.setupInput();
        this.startRenderLoop();
    },

    setupInput() {
        // Add event listeners, send via socket.send('input', {...})
    },

    updateState(state) {
        this.state = state;
    },

    render() {
        // Draw game based on this.state
    },

    cleanup() {
        // Remove event listeners, clear state
    }
};
```

#### 5. Register Renderer (Client)

In `client/js/main.js`:
```javascript
// In App.initGame():
} else if (type === 'mygame') {
    this.renderer = MyGameRenderer;
    this.renderer.init(canvas);
}
```

In `client/index.html`:
```html
<script src="js/mygame.js"></script>

<!-- In game-select modal -->
<button class="game-option" data-game="mygame">🎮 My Game</button>

<!-- In games-preview -->
<div class="game-card">
    <span class="icon">🎮</span>
    <span>My Game</span>
</div>
```

In `client/js/lobby.js`:
```javascript
getGameIcon(game) {
    const icons = {
        ...,
        mygame: '🎮'
    };
}
```

## Commit Message Format
Use conventional commits without Claude attribution:

```
feat(mygame): add basic game mechanics
fix(mygame): resolve collision detection issue
refactor(mygame): extract helper functions
style(mygame): improve UI layout
```

## Common Issues

### Server Crashes on Game Start
- Check that `started_ = true` is set LAST in `start()`
- Ensure all vectors/collections are initialized before `started_` is set
- Add null/empty checks in `update()` loops

### Server Crashes on Restart
- The mutex (`gameMutex_`) in Room protects game access between timer and message handlers
- Don't modify game state without holding the lock

### WebSocket Cork Buffer Error
- All WebSocket sends must happen on the event loop thread
- Game loop runs on timer, not separate thread
- Never call `ws->send()` from background threads

## State Sync Pattern
1. Server calls `game_->update(deltaTime)` on timer
2. Server calls `game_->getState()` to get JSON
3. Server broadcasts state to all room players
4. Client `updateState(state)` receives the state
5. Client `render()` draws based on state

Games are authoritative on server - clients only send input, never modify state directly.

---

## Historical Issues & Solutions

### Issue: Slither Game Crashed Server on Start (Race Condition)

**Symptom**: Server crashed instantly when Slither game started, but other games worked fine.

**Root Cause**: In `SlitherGame::start()`, `started_ = true` was set at the BEGINNING of the function. The game loop thread saw `started_ == true` and immediately called `update()` before snake bodies were initialized.

**Solution**: Move `started_ = true` to the END of `start()`, after all snakes and pellets are spawned:
```cpp
void SlitherGame::start() {
    // Initialize everything FIRST
    for (int i = 0; i < snakes_.size(); i++) {
        spawnSnake(i);
    }
    pellets_.clear();
    for (int i = 0; i < INITIAL_PELLETS; i++) {
        spawnPellet();
    }

    // Set started_ LAST
    started_ = true;
}
```

**Why SnakeGame Didn't Crash**: SnakeGame initializes snake bodies in `onPlayerJoin()`, which runs before `start()`. So bodies were already populated.

---

### Issue: Server Crashed After First Round (Cork Buffer Error)

**Symptom**: After completing one round of Slither, server crashed with:
```
Error: Cork buffer must not be acquired without checking canCork!
terminate called without an active exception
```

**Root Cause**: Original architecture used a **separate thread** for the game loop:
```cpp
// OLD (BROKEN) - game loop in separate thread
gameLoopThread_ = std::thread(&Server::gameLoop, this);
```
This thread called `ws->send()` via `Room::broadcastState()`, but uWebSockets is not thread-safe. Calling WebSocket methods from a non-event-loop thread causes undefined behavior.

**Solution**: Use a **timer on the event loop** instead of a separate thread:
```cpp
// NEW (CORRECT) - game loop on event loop via timer
struct us_timer_t* gameTimer = us_create_timer(loop, 0, sizeof(Server*));
us_timer_set(gameTimer, [](struct us_timer_t* timer) {
    Server* server = *static_cast<Server**>(us_timer_ext(timer));
    server->lobby_.update(deltaTime);
}, 16, 16);  // Repeating every 16ms
```

**Why This Is Better**:
1. Thread-safe: All WebSocket operations on same thread
2. Simpler: No mutexes needed for WebSocket sends
3. Standard: This is how async game servers (Node.js, etc.) work
4. Efficient: Event loop handles I/O and game ticks together

---

### Issue: Game Wouldn't Start (Deadlock)

**Symptom**: Clicking "Start Game" did nothing.

**Root Cause**: Added `std::mutex` protection but `start()` acquired the lock, then called `canStart()` which also tried to acquire the same lock = deadlock.

**Solution**: Use `std::recursive_mutex` instead of `std::mutex`:
```cpp
mutable std::recursive_mutex gameMutex_;  // Allows same thread to lock multiple times
```
