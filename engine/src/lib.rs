use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::to_value;

pub mod core;
use crate::core::state::{EngineState, Action, reducer};

#[wasm_bindgen]
pub struct KineticEngine {
    state: EngineState,
}

#[wasm_bindgen]
impl KineticEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            state: EngineState::new(),
        }
    }

    pub fn dispatch(&mut self, action_val: JsValue) -> Result<JsValue, JsValue> {
        let action: Action = serde_wasm_bindgen::from_value(action_val)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        reducer(&mut self.state, action);
        
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
        Ok(())
    }

    pub fn query_spatial(&self, x: f32, y: f32, w: f32, h: f32) -> Result<JsValue, JsValue> {
        // Simple placeholder for spatial query integration
        let mut ids = Vec::new();
        // In a real scenario, we'd maintain a Quadtree instance and query it here
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
