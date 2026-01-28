#include "Connection.hpp"
#include <uwebsockets/App.h>

Connection::Connection(WebSocket* ws, uint64_t id)
    : ws_(ws)
    , id_(id)
{
}

void Connection::send(const json& message) {
    send(message.dump());
}

void Connection::send(const std::string& message) {
    if (ws_) {
        ws_->send(message, uWS::OpCode::TEXT);
    }
}

void Connection::close() {
    if (ws_) {
        ws_->close();
    }
}
