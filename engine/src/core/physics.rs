use crate::core::geometry::{Rect, Vector}; // I need to add Vector to geometry or use Points

// Let's add simple Vector/AABB support in geometry first if not there
// Currently geometry.rs has Rect.

use crate::core::geometry::{Scalar, Point};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AABB {
    pub min: Point,
    pub max: Point,
}

impl AABB {
    pub fn from_rect(rect: &Rect) -> Self {
        Self {
            min: rect.origin,
            max: Point {
                x: rect.origin.x + rect.width,
                y: rect.origin.y + rect.height,
            },
        }
    }

    pub fn intersects(&self, other: &AABB) -> bool {
        self.min.x < other.max.x &&
        self.max.x > other.min.x &&
        self.min.y < other.max.y &&
        self.max.y > other.min.y
    }
}

pub fn resolve_collision(moving: &mut Rect, obstacle: &Rect) -> bool {
    let moving_aabb = AABB::from_rect(moving);
    let obstacle_aabb = AABB::from_rect(obstacle);

    if moving_aabb.intersects(&obstacle_aabb) {
        // Simple deterministic resolution: push out along the shortest axis
        let overlap_x1 = moving_aabb.max.x - obstacle_aabb.min.x;
        let overlap_x2 = obstacle_aabb.max.x - moving_aabb.min.x;
        let overlap_y1 = moving_aabb.max.y - obstacle_aabb.min.y;
        let overlap_y2 = obstacle_aabb.max.y - moving_aabb.min.y;

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
        return true;
    }
    false
}
