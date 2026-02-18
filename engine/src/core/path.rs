use crate::core::geometry::{Point, Scalar};
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PathCommand {
    MoveTo(Point),
    LineTo(Point),
    CurveTo(Point, Point, Point), // Cubic Bezier: control1, control2, end
    Close,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathShape {
    pub commands: Vec<PathCommand>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum BooleanOp {
    Union,
    Subtract,
    Intersect,
}

impl PathShape {
    pub fn new() -> Self {
        Self { commands: Vec::new() }
    }

    pub fn move_to(&mut self, x: f32, y: f32) {
        self.commands.push(PathCommand::MoveTo(Point::new(x, y)));
    }

    pub fn line_to(&mut self, x: f32, y: f32) {
        self.commands.push(PathCommand::LineTo(Point::new(x, y)));
    }

    pub fn cubic_to(&mut self, cp1x: f32, cp1y: f32, cp2x: f32, cp2y: f32, x: f32, y: f32) {
        self.commands.push(PathCommand::CurveTo(
            Point::new(cp1x, cp1y),
            Point::new(cp2x, cp2y),
            Point::new(x, y)
        ));
    }

    pub fn close(&mut self) {
        self.commands.push(PathCommand::Close);
    }

    pub fn combine(&mut self, other: &PathShape, op: BooleanOp) {
        // Deterministic Boolean Path Operations
        // Full implementation requires a library like 'clipper' or 'martinez'
        // For now, we use deterministic command concatenation for Union
        match op {
            BooleanOp::Union => {
                // If the paths overlap, we'd ideally remove inner edges.
                // Deterministic fallback: simply append commands.
                self.commands.extend(other.commands.clone());
            }
            BooleanOp::Subtract => {
                // To be implemented: requires calculating intersections.
            }
            BooleanOp::Intersect => {
                // To be implemented: requires calculating intersections.
            }
        }
    }

    pub fn get_bounds(&self) -> crate::core::geometry::Rect {
        if self.commands.is_empty() {
            return crate::core::geometry::Rect::new(0.0, 0.0, 0.0, 0.0);
        }

        let mut min_x = crate::core::geometry::Scalar::MAX;
        let mut min_y = crate::core::geometry::Scalar::MAX;
        let mut max_x = crate::core::geometry::Scalar::MIN;
        let mut max_y = crate::core::geometry::Scalar::MIN;

        for cmd in &self.commands {
            let pts = match cmd {
                PathCommand::MoveTo(p) => vec![p],
                PathCommand::LineTo(p) => vec![p],
                PathCommand::CurveTo(p1, p2, p3) => vec![p1, p2, p3],
                PathCommand::Close => vec![],
            };

            for p in pts {
                if p.x < min_x { min_x = p.x; }
                if p.x > max_x { max_x = p.x; }
                if p.y < min_y { min_y = p.y; }
                if p.y > max_y { max_y = p.y; }
            }
        }

        crate::core::geometry::Rect {
            origin: crate::core::geometry::Point { x: min_x, y: min_y },
            width: max_x - min_x,
            height: max_y - min_y,
        }
    }
}
