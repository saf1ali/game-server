cmake_minimum_required(VERSION 3.16)
project(game-server VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Find packages
find_package(nlohmann_json CONFIG REQUIRED)
find_package(fmt CONFIG REQUIRED)
find_package(unofficial-uwebsockets CONFIG REQUIRED)
find_package(ZLIB REQUIRED)

# Source files
set(SOURCES
    src/main.cpp
    src/server/Server.cpp
    src/server/Connection.cpp
    src/lobby/Lobby.cpp
    src/lobby/Room.cpp
    src/games/Game.cpp
    src/games/PongGame.cpp
    src/games/SnakeGame.cpp
    src/games/ChatRoom.cpp
    src/games/TetrisGame.cpp
    src/games/CheckersGame.cpp
    src/games/ConnectFourGame.cpp
    src/games/SlitherGame.cpp
)

# Header files
set(HEADERS
    src/server/Server.hpp
    src/server/Connection.hpp
    src/lobby/Lobby.hpp
    src/lobby/Room.hpp
    src/games/Game.hpp
    src/games/PongGame.hpp
    src/games/SnakeGame.hpp
    src/games/ChatRoom.hpp
    src/games/ConnectFourGame.hpp
    src/games/SlitherGame.hpp
    src/physics/Vector2.hpp
    src/physics/Collision.hpp
    src/utils/Logger.hpp
)

# Executable
add_executable(${PROJECT_NAME} ${SOURCES} ${HEADERS})

# Include directories
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# Link libraries
target_link_libraries(${PROJECT_NAME} PRIVATE
    nlohmann_json::nlohmann_json
    fmt::fmt
    unofficial::uwebsockets::uwebsockets
    ZLIB::ZLIB
)

# Platform-specific settings
if(WIN32)
    target_link_libraries(${PROJECT_NAME} PRIVATE ws2_32)
endif()

# Copy client files to build directory
add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
    ${CMAKE_SOURCE_DIR}/client
    $<TARGET_FILE_DIR:${PROJECT_NAME}>/client
)
