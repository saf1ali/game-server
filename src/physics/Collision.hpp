#pragma once

#include "Vector2.hpp"

struct Rectangle {
    float x, y, width, height;

    Rectangle() : x(0), y(0), width(0), height(0) {}
    Rectangle(float x, float y, float w, float h) : x(x), y(y), width(w), height(h) {}

    float left() const { return x; }
    float right() const { return x + width; }
    float top() const { return y; }
    float bottom() const { return y + height; }

    Vector2 center() const {
        return Vector2(x + width / 2, y + height / 2);
    }

    bool contains(const Vector2& point) const {
        return point.x >= x && point.x <= x + width &&
               point.y >= y && point.y <= y + height;
    }

    bool intersects(const Rectangle& other) const {
        return !(other.left() > right() ||
                 other.right() < left() ||
                 other.top() > bottom() ||
                 other.bottom() < top());
    }
};

struct Circle {
    Vector2 center;
    float radius;

    Circle() : radius(0) {}
    Circle(const Vector2& c, float r) : center(c), radius(r) {}
    Circle(float x, float y, float r) : center(x, y), radius(r) {}

    bool contains(const Vector2& point) const {
        return (point - center).lengthSquared() <= radius * radius;
    }

    bool intersects(const Circle& other) const {
        float totalRadius = radius + other.radius;
        return (center - other.center).lengthSquared() <= totalRadius * totalRadius;
    }

    bool intersects(const Rectangle& rect) const {
        // Find closest point on rectangle to circle center
        float closestX = std::max(rect.left(), std::min(center.x, rect.right()));
        float closestY = std::max(rect.top(), std::min(center.y, rect.bottom()));

        Vector2 closest(closestX, closestY);
        return (closest - center).lengthSquared() <= radius * radius;
    }
};

class Collision {
public:
    // Check if point is inside rectangle
    static bool pointInRect(const Vector2& point, const Rectangle& rect) {
        return rect.contains(point);
    }

    // Check if two rectangles overlap
    static bool rectRect(const Rectangle& a, const Rectangle& b) {
        return a.intersects(b);
    }

    // Check if circle and rectangle overlap
    static bool circleRect(const Circle& circle, const Rectangle& rect) {
        return circle.intersects(rect);
    }

    // Check if two circles overlap
    static bool circleCircle(const Circle& a, const Circle& b) {
        return a.intersects(b);
    }

    // Get collision normal between circle and rectangle
    static Vector2 getCollisionNormal(const Circle& circle, const Rectangle& rect) {
        Vector2 rectCenter = rect.center();
        Vector2 diff = circle.center - rectCenter;

        // Determine which side was hit
        float xOverlap = (rect.width / 2 + circle.radius) - std::abs(diff.x);
        float yOverlap = (rect.height / 2 + circle.radius) - std::abs(diff.y);

        if (xOverlap < yOverlap) {
            return diff.x > 0 ? Vector2::right() : Vector2::left();
        } else {
            return diff.y > 0 ? Vector2::down() : Vector2::up();
        }
    }
};
