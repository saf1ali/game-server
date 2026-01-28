#pragma once

#include <fmt/core.h>
#include <fmt/color.h>
#include <chrono>
#include <iomanip>
#include <sstream>

class Logger {
public:
    template<typename... Args>
    static void info(fmt::format_string<Args...> format, Args&&... args) {
        log(fmt::color::cyan, "INFO", format, std::forward<Args>(args)...);
    }

    template<typename... Args>
    static void warn(fmt::format_string<Args...> format, Args&&... args) {
        log(fmt::color::yellow, "WARN", format, std::forward<Args>(args)...);
    }

    template<typename... Args>
    static void error(fmt::format_string<Args...> format, Args&&... args) {
        log(fmt::color::red, "ERROR", format, std::forward<Args>(args)...);
    }

    template<typename... Args>
    static void debug(fmt::format_string<Args...> format, Args&&... args) {
        #ifdef DEBUG
        log(fmt::color::gray, "DEBUG", format, std::forward<Args>(args)...);
        #endif
    }

    template<typename... Args>
    static void game(fmt::format_string<Args...> format, Args&&... args) {
        log(fmt::color::green, "GAME", format, std::forward<Args>(args)...);
    }

private:
    static std::string getTimestamp() {
        auto now = std::chrono::system_clock::now();
        auto time = std::chrono::system_clock::to_time_t(now);
        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()) % 1000;

        std::stringstream ss;
        ss << std::put_time(std::localtime(&time), "%H:%M:%S");
        ss << '.' << std::setfill('0') << std::setw(3) << ms.count();
        return ss.str();
    }

    template<typename... Args>
    static void log(fmt::color color, const char* level,
                    fmt::format_string<Args...> format, Args&&... args) {
        auto timestamp = getTimestamp();
        auto message = fmt::format(format, std::forward<Args>(args)...);

        fmt::print(fg(fmt::color::dim_gray), "[{}] ", timestamp);
        fmt::print(fg(color), "{:5} ", level);
        fmt::print("{}\n", message);
    }
};
