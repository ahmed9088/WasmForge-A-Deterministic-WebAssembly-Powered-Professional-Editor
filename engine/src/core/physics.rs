use crate::core::geometry::{Scalar, Point, Rect, Circle};

pub fn resolve_collision(moving: &mut Rect, obstacle: &Rect) -> bool {
    if !moving.intersects(obstacle) {
        return false;
    }

    // Simple deterministic resolution: push out along the shortest axis
    let overlap_x1 = (moving.origin.x + moving.width) - obstacle.origin.x;
    let overlap_x2 = (obstacle.origin.x + obstacle.width) - moving.origin.x;
    let overlap_y1 = (moving.origin.y + moving.height) - obstacle.origin.y;
    let overlap_y2 = (obstacle.origin.y + obstacle.height) - moving.origin.y;

    let min_x = if overlap_x1 < overlap_x2 { overlap_x1 } else { overlap_x2 };
    let min_y = if overlap_y1 < overlap_y2 { overlap_y1 } else { overlap_y2 };

    if min_x < min_y {
        if overlap_x1 < overlap_x2 {
            moving.origin.x -= overlap_x1;
        } else {
            moving.origin.x += overlap_x2;
        }
    } else {
        if overlap_y1 < overlap_y2 {
            moving.origin.y -= overlap_y1;
        } else {
            moving.origin.y += overlap_y2;
        }
    }
    true
}

pub fn circle_intersects_circle(c1: &Circle, c2: &Circle) -> bool {
    let dx = c1.center.x - c2.center.x;
    let dy = c1.center.y - c2.center.y;
    let distance_sq = dx * dx + dy * dy;
    let radius_sum = c1.radius + c2.radius;
    distance_sq <= radius_sum * radius_sum
}

pub fn circle_intersects_rect(circle: &Circle, rect: &Rect) -> bool {
    let mut closest_x = circle.center.x;
    let mut closest_y = circle.center.y;

    if circle.center.x < rect.origin.x {
        closest_x = rect.origin.x;
    } else if circle.center.x > rect.origin.x + rect.width {
        closest_x = rect.origin.x + rect.width;
    }

    if circle.center.y < rect.origin.y {
        closest_y = rect.origin.y;
    } else if circle.center.y > rect.origin.y + rect.height {
        closest_y = rect.origin.y + rect.height;
    }

    let dx = circle.center.x - closest_x;
    let dy = circle.center.y - closest_y;
    (dx * dx + dy * dy) <= (circle.radius * circle.radius)
}
