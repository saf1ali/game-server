#pragma once

#include <cmath>
#include <nlohmann/json.hpp>

struct Vector2 {
    float x = 0.0f;
    float y = 0.0f;

    Vector2() = default;
    Vector2(float x, float y) : x(x), y(y) {}

    // Vector operations
    Vector2 operator+(const Vector2& other) const {
        return Vector2(x + other.x, y + other.y);
    }

    Vector2 operator-(const Vector2& other) const {
        return Vector2(x - other.x, y - other.y);
    }

    Vector2 operator*(float scalar) const {
        return Vector2(x * scalar, y * scalar);
    }

    Vector2 operator/(float scalar) const {
        return Vector2(x / scalar, y / scalar);
    }

    Vector2& operator+=(const Vector2& other) {
        x += other.x;
        y += other.y;
        return *this;
    }

    Vector2& operator-=(const Vector2& other) {
        x -= other.x;
        y -= other.y;
        return *this;
    }

    Vector2& operator*=(float scalar) {
        x *= scalar;
        y *= scalar;
        return *this;
    }

    // Utility functions
    float length() const {
        return std::sqrt(x * x + y * y);
    }

    float lengthSquared() const {
        return x * x + y * y;
    }

    Vector2 normalized() const {
        float len = length();
        if (len > 0) {
            return Vector2(x / len, y / len);
        }
        return Vector2(0, 0);
    }

    void normalize() {
        float len = length();
        if (len > 0) {
            x /= len;
            y /= len;
        }
    }

    float dot(const Vector2& other) const {
        return x * other.x + y * other.y;
    }

    // Reflection for bouncing
    Vector2 reflect(const Vector2& normal) const {
        return *this - normal * (2.0f * dot(normal));
    }

    // JSON serialization
    nlohmann::json toJson() const {
        return {{"x", x}, {"y", y}};
    }

    static Vector2 fromJson(const nlohmann::json& j) {
        return Vector2(j.value("x", 0.0f), j.value("y", 0.0f));
    }

    // Common vectors
    static Vector2 zero() { return Vector2(0, 0); }
    static Vector2 one() { return Vector2(1, 1); }
    static Vector2 up() { return Vector2(0, -1); }
    static Vector2 down() { return Vector2(0, 1); }
    static Vector2 left() { return Vector2(-1, 0); }
    static Vector2 right() { return Vector2(1, 0); }
};
