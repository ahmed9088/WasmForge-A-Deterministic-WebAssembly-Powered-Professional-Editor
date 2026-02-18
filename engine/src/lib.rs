use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::to_value;

pub mod core;
use crate::core::state::{EngineState, Action, reducer};

#[wasm_bindgen]
pub struct KineticEngine {
    state: EngineState,
    quadtree: crate::core::spatial::Quadtree,
}

#[wasm_bindgen]
impl KineticEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let mut bounds = crate::core::geometry::Rect::new(-5000.0, -5000.0, 10000.0, 10000.0);
        Self {
            state: EngineState::new(),
            quadtree: crate::core::spatial::Quadtree::new(bounds, 4),
        }
    }

    fn rebuild_quadtree(&mut self) {
        self.quadtree.clear();
        for (id, el) in &self.state.elements {
            let bounds = el.shape.get_bounding_box();
            self.quadtree.insert(id, &bounds);
        }
    }

    pub fn dispatch(&mut self, action_val: JsValue) -> Result<JsValue, JsValue> {
        let action: Action = serde_wasm_bindgen::from_value(action_val)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        reducer(&mut self.state, action);
        
        // Simple rebuild strategy for now
        self.rebuild_quadtree();
        
        let computed = self.state.get_computed_state();
        to_value(&computed).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn get_state(&self) -> Result<JsValue, JsValue> {
        let computed = self.state.get_computed_state();
        to_value(&computed).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn serialize_state(&self) -> Result<String, JsValue> {
        serde_json::to_string(&self.state).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn deserialize_state(&mut self, data: String) -> Result<(), JsValue> {
        self.state = serde_json::from_str(&data).map_err(|e| JsValue::from_str(&e.to_string()))?;
        self.rebuild_quadtree();
        Ok(())
    }

    pub fn query_spatial(&self, x: f32, y: f32, w: f32, h: f32) -> Result<JsValue, JsValue> {
        let range = crate::core::geometry::Rect::new(x, y, w, h);
        let mut ids = Vec::new();
        self.quadtree.query(&range, &mut ids);
        to_value(&ids).map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::geometry::{Shape, Rect};

    #[test]
    fn test_determinism() {
        let mut engine = KineticEngine::new();
        let id = "box1".to_string();
        
        // Add element
        engine.dispatch(serde_wasm_bindgen::to_value(&Action::AddElement { 
            id: id.clone(), 
            shape: Shape::Rect(Rect::new(0.0, 0.0, 100.0, 100.0)),
            fill: "#ff0000".to_string()
        }).unwrap()).unwrap();
        
        // Move element
        engine.dispatch(serde_wasm_bindgen::to_value(&Action::MoveElement { 
            id: id.clone(), 
            dx: 10.5, 
            dy: 20.7 
        }).unwrap()).unwrap();
        
        // Same input should yield same output (using fixed point)
        let state = engine.get_state().unwrap();
        let state_json = serde_json::to_string(&state).unwrap();
        
        let mut engine2 = KineticEngine::new();
        engine2.dispatch(serde_wasm_bindgen::to_value(&Action::AddElement { 
            id: id.clone(), 
            shape: Shape::Rect(Rect::new(0.0, 0.0, 100.0, 100.0)),
            fill: "#ff0000".to_string()
        }).unwrap()).unwrap();
        
        engine2.dispatch(serde_wasm_bindgen::to_value(&Action::MoveElement { 
            id, 
            dx: 10.5, 
            dy: 20.7 
        }).unwrap()).unwrap();
        
        let state2 = engine2.get_state().unwrap();
        let state_json2 = serde_json::to_string(&state2).unwrap();
        
        assert_eq!(state_json, state_json2);
    }
}
