#include <iostream>
#include <string>
#include <memory>
#include "server/Server.hpp"
#include "utils/Logger.hpp"

int main(int argc, char* argv[]) {
    int port = 9001;

    // Parse command line arguments
    if (argc > 1) {
        try {
            port = std::stoi(argv[1]);
        } catch (...) {
            Logger::error("Invalid port number, using default: {}", port);
        }
    }

    Logger::info("=================================");
    Logger::info("    Game Server v1.0.0");
    Logger::info("=================================");
    Logger::info("Supported games: Pong, Snake, Chat");
    Logger::info("");

    try {
        auto server = std::make_unique<Server>(port);
        server->run();
    } catch (const std::exception& e) {
        Logger::error("Fatal error: {}", e.what());
        return 1;
    }

    return 0;
}
