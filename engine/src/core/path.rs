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
        // Simplified Boolean Logic: 
        // For now, we contribute to the path commands.
        // True Boolean operations (clipping) require complex algorithms like Weiler-Atherton.
        // We will implement a command-based concatenation for 'Union' as a placeholder.
        match op {
            BooleanOp::Union => {
                self.commands.extend(other.commands.clone());
            }
            _ => {
                // Placeholder for Subtract/Intersect
            }
        }
    }
}
