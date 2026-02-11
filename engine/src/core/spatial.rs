use crate::core::geometry::{Rect, Scalar, Point};

#[derive(Debug, Clone)]
pub struct Quadtree {
    pub bounds: Rect,
    pub capacity: usize,
    pub elements: Vec<String>, // Element IDs
    pub divided: bool,
    pub north_west: Option<Box<Quadtree>>,
    pub north_east: Option<Box<Quadtree>>,
    pub south_west: Option<Box<Quadtree>>,
    pub south_east: Option<Box<Quadtree>>,
}

impl Quadtree {
    pub fn new(bounds: Rect, capacity: usize) -> Self {
        Self {
            bounds,
            capacity,
            elements: Vec::new(),
            divided: false,
            north_west: None,
            north_east: None,
            south_west: None,
            south_east: None,
        }
    }

    pub fn subdivide(&mut self) {
        let x = self.bounds.origin.x;
        let y = self.bounds.origin.y;
        let w = self.bounds.width / Scalar::from_num(2);
        let h = self.bounds.height / Scalar::from_num(2);

        self.north_west = Some(Box::new(Quadtree::new(Rect::new_scalar(x, y, w, h), self.capacity)));
        self.north_east = Some(Box::new(Quadtree::new(Rect::new_scalar(x + w, y, w, h), self.capacity)));
        self.south_west = Some(Box::new(Quadtree::new(Rect::new_scalar(x, y + h, w, h), self.capacity)));
        self.south_east = Some(Box::new(Quadtree::new(Rect::new_scalar(x + w, y + h, w, h), self.capacity)));
        
        self.divided = true;
    }

    pub fn insert(&mut self, element_id: &str, element_bounds: &Rect) -> bool {
        if !self.bounds.intersects(element_bounds) {
            return false;
        }

        if self.elements.len() < self.capacity {
            self.elements.push(element_id.to_string());
            return true;
        }

        if !self.divided {
            self.subdivide();
        }

        (self.north_west.as_mut().unwrap().insert(element_id, element_bounds)) ||
        (self.north_east.as_mut().unwrap().insert(element_id, element_bounds)) ||
        (self.south_west.as_mut().unwrap().insert(element_id, element_bounds)) ||
        (self.south_east.as_mut().unwrap().insert(element_id, element_bounds))
    }

    pub fn query(&self, range: &Rect, found: &mut Vec<String>) {
        if !self.bounds.intersects(range) {
            return;
        }

        for id in &self.elements {
            found.push(id.clone());
        }

        if self.divided {
            self.north_west.as_ref().unwrap().query(range, found);
            self.north_east.as_ref().unwrap().query(range, found);
            self.south_west.as_ref().unwrap().query(range, found);
            self.south_east.as_ref().unwrap().query(range, found);
        }
    }
}

// Helper addition to Rect needed
impl Rect {
    pub fn new_scalar(x: Scalar, y: Scalar, width: Scalar, height: Scalar) -> Self {
        Self { origin: Point { x, y }, width, height }
    }

    pub fn intersects(&self, other: &Rect) -> bool {
        !(other.origin.x > self.origin.x + self.width ||
          other.origin.x + other.width < self.origin.x ||
          other.origin.y > self.origin.y + self.height ||
          other.origin.y + other.height < self.origin.y)
    }
}
