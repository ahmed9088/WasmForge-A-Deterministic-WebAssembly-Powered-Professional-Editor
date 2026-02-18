use fixed::types::I48F16;
use serde::{Serialize, Deserialize};

/// Fixed-point scalar type for deterministic space.
/// Using I48F16: 48 bits for integer, 16 bits for fraction (approx 4 decimal places).
pub type Scalar = I48F16;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Point {
    pub x: Scalar,
    pub y: Scalar,
}

impl Point {
    pub fn new(x: f32, y: f32) -> Self {
        Self {
            x: Scalar::from_num(x),
            y: Scalar::from_num(y),
        }
    }

    pub fn add(&self, other: &Point) -> Point {
        Point {
            x: self.x + other.x,
            y: self.y + other.y,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Vector {
    pub x: Scalar,
    pub y: Scalar,
}

impl Vector {
    pub fn new(x: f32, y: f32) -> Self {
        Self {
            x: Scalar::from_num(x),
            y: Scalar::from_num(y),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Rect {
    pub origin: Point,
    pub width: Scalar,
    pub height: Scalar,
}

impl Rect {
    pub fn new(x: f32, y: f32, width: f32, height: f32) -> Self {
        Self {
            origin: Point::new(x, y),
            width: Scalar::from_num(width),
            height: Scalar::from_num(height),
        }
    }

    pub fn translate(&mut self, dx: f32, dy: f32) {
        self.origin.x += Scalar::from_num(dx);
        self.origin.y += Scalar::from_num(dy);
    }

    pub fn resize(&mut self, factor: f32) {
        self.width *= Scalar::from_num(factor);
        self.height *= Scalar::from_num(factor);
    }

    pub fn contains(&self, p: &Point) -> bool {
        p.x >= self.origin.x && p.x <= self.origin.x + self.width &&
        p.y >= self.origin.y && p.y <= self.origin.y + self.height
    }

    pub fn intersects(&self, other: &Rect) -> bool {
        !(other.origin.x > self.origin.x + self.width ||
          other.origin.x + other.width < self.origin.x ||
          other.origin.y > self.origin.y + self.height ||
          other.origin.y + other.height < self.origin.y)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Circle {
    pub center: Point,
    pub radius: Scalar,
}

impl Circle {
    pub fn new(x: f32, y: f32, radius: f32) -> Self {
        Self {
            center: Point::new(x, y),
            radius: Scalar::from_num(radius),
        }
    }

    pub fn translate(&mut self, dx: f32, dy: f32) {
        self.center.x += Scalar::from_num(dx);
        self.center.y += Scalar::from_num(dy);
    }

    pub fn contains(&self, p: &Point) -> bool {
        let dx = p.x - self.center.x;
        let dy = p.y - self.center.y;
        (dx * dx + dy * dy) <= (self.radius * self.radius)
    }

    pub fn get_bounding_box(&self) -> Rect {
        Rect {
            origin: Point {
                x: self.center.x - self.radius,
                y: self.center.y - self.radius,
            },
            width: self.radius * Scalar::from_num(2),
            height: self.radius * Scalar::from_num(2),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Group {
    pub children: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Image {
    pub src: String,
    pub width: Scalar,
    pub height: Scalar,
    pub origin: Point,
}

impl Image {
    pub fn get_bounding_box(&self) -> Rect {
        Rect {
            origin: self.origin,
            width: self.width,
            height: self.height,
        }
    }

    pub fn contains(&self, p: &Point) -> bool {
        self.get_bounding_box().contains(p)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum Shape {
    Rect(Rect),
    Circle(Circle),
    Group(Group),
    Image(Image),
    Path(crate::core::path::PathShape),
}

impl Shape {
    pub fn translate(&mut self, dx: f32, dy: f32) {
        match self {
            Shape::Rect(r) => r.translate(dx, dy),
            Shape::Circle(c) => c.translate(dx, dy),
            Shape::Image(i) => {
                i.origin.x += Scalar::from_num(dx);
                i.origin.y += Scalar::from_num(dy);
            }
            Shape::Group(_) => {}
            Shape::Path(p) => {
                for cmd in &mut p.commands {
                    match cmd {
                        crate::core::path::PathCommand::MoveTo(pt) => {
                            pt.x += Scalar::from_num(dx);
                            pt.y += Scalar::from_num(dy);
                        },
                        crate::core::path::PathCommand::LineTo(pt) => {
                            pt.x += Scalar::from_num(dx);
                            pt.y += Scalar::from_num(dy);
                        },
                        crate::core::path::PathCommand::CurveTo(pt1, pt2, pt3) => {
                            pt1.x += Scalar::from_num(dx);
                            pt1.y += Scalar::from_num(dy);
                            pt2.x += Scalar::from_num(dx);
                            pt2.y += Scalar::from_num(dy);
                            pt3.x += Scalar::from_num(dx);
                            pt3.y += Scalar::from_num(dy);
                        },
                        crate::core::path::PathCommand::Close => {}
                    }
                }
            }
        }
    }

    pub fn get_bounding_box(&self) -> Rect {
        match self {
            Shape::Rect(r) => *r,
            Shape::Circle(c) => c.get_bounding_box(),
            Shape::Image(i) => i.get_bounding_box(),
            Shape::Group(_) => Rect::new(0.0, 0.0, 0.0, 0.0), // Simplified, usually union of children
            Shape::Path(p) => p.get_bounds(),
        }
    }

    pub fn contains_point(&self, p: &Point) -> bool {
        match self {
            Shape::Rect(r) => r.contains(p),
            Shape::Circle(c) => c.contains(p),
            Shape::Image(i) => i.contains(p),
            Shape::Group(_) => false, // Group hit testing handled by recursion
            Shape::Path(p) => p.get_bounds().contains(p), // Fallback to bounds for now
        }
    }
}
