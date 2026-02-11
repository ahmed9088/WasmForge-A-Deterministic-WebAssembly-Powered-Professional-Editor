use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use crate::core::geometry::{Shape, Rect, Circle, Point};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keyframe {
    pub time: f32,
    pub value: f32, // Simplified for now, will expand to generic values
    pub easing: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transform {
    pub x: f32,
    pub y: f32,
    pub scale: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Presence {
    pub user_id: String,
    pub cursor: Point,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Element {
    pub id: String,
    pub name: String,
    pub shape: Shape,
    pub fill: String,
    pub opacity: f32,
    pub visible: bool,
    pub parent_id: Option<String>,
    pub animations: HashMap<String, Vec<Keyframe>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineState {
    pub elements: HashMap<String, Element>,
    pub selection: Vec<String>,
    pub transform: Transform,
    pub presence: HashMap<String, Presence>,
    pub current_time: f32,
    pub duration: f32,
    pub is_playing: bool,
}

impl EngineState {
    pub fn new() -> Self {
        Self {
            elements: HashMap::new(),
            selection: Vec::new(),
            transform: Transform { x: 0.0, y: 0.0, scale: 1.0 },
            presence: HashMap::new(),
            current_time: 0.0,
            duration: 5000.0,
            is_playing: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum Action {
    #[serde(rename = "ADD_ELEMENT")]
    AddElement { id: String, name: String, shape: Shape, fill: String },
    
    #[serde(rename = "REMOVE_ELEMENT")]
    RemoveElement { id: String },

    #[serde(rename = "MOVE_ELEMENT")]
    MoveElement { id: String, dx: f32, dy: f32 },
    
    #[serde(rename = "SET_FILL")]
    SetFill { id: String, fill: String },

    #[serde(rename = "SET_TIME")]
    SetTime { time: f32 },

    #[serde(rename = "TOGGLE_PLAYBACK")]
    TogglePlayback {},

    #[serde(rename = "ADD_KEYFRAME")]
    AddKeyframe { element_id: String, property: String, keyframe: Keyframe },

    #[serde(rename = "SET_VIEW")]
    SetView { transform: Transform },

    #[serde(rename = "UPDATE_PRESENCE")]
    UpdatePresence { presence: Presence },
}

pub fn reducer(state: &mut EngineState, action: Action) {
    match action {
        Action::AddElement { id, name, shape, fill } => {
            state.elements.insert(id.clone(), Element { 
                id, 
                name, 
                shape, 
                fill, 
                opacity: 1.0, 
                visible: true, 
                parent_id: None, 
                animations: HashMap::new() 
            });
        }
        Action::RemoveElement { id } => {
            state.elements.remove(&id);
            state.selection.retain(|s| s != &id);
        }
        Action::MoveElement { id, dx, dy } => {
            if let Some(el) = state.elements.get_mut(&id) {
                el.shape.translate(dx, dy);
            }
        }
        Action::SetFill { id, fill } => {
            if let Some(el) = state.elements.get_mut(&id) {
                el.fill = fill;
            }
        }
        Action::SetTime { time } => {
            state.current_time = time;
        }
        Action::TogglePlayback {} => {
            state.is_playing = !state.is_playing;
        }
        Action::AddKeyframe { element_id, property, keyframe } => {
            if let Some(el) = state.elements.get_mut(&element_id) {
                let animation = el.animations.entry(property).or_insert_with(Vec::new());
                animation.push(keyframe);
                animation.sort_by(|a, b| a.time.partial_cmp(&b.time).unwrap());
            }
        }
        Action::SetView { transform } => {
            state.transform = transform;
        }
        Action::UpdatePresence { presence } => {
            state.presence.insert(presence.user_id.clone(), presence);
        }
    }
}

impl EngineState {
    pub fn get_computed_state(&self) -> EngineState {
        let mut computed = self.clone();
        for el in computed.elements.values_mut() {
            for (prop, keyframes) in &el.animations {
                let interpolated_value = crate::core::interpolation::interpolate(keyframes, self.current_time);
                match prop.as_str() {
                    "x" => {
                        match el.shape {
                            Shape::Rect(ref mut r) => r.origin.x = crate::core::geometry::Scalar::from_num(interpolated_value),
                            Shape::Circle(ref mut c) => c.center.x = crate::core::geometry::Scalar::from_num(interpolated_value),
                            Shape::Image(ref mut i) => i.origin.x = crate::core::geometry::Scalar::from_num(interpolated_value),
                            _ => {}
                        }
                    },
                    "y" => {
                        match el.shape {
                            Shape::Rect(ref mut r) => r.origin.y = crate::core::geometry::Scalar::from_num(interpolated_value),
                            Shape::Circle(ref mut c) => c.center.y = crate::core::geometry::Scalar::from_num(interpolated_value),
                            Shape::Image(ref mut i) => i.origin.y = crate::core::geometry::Scalar::from_num(interpolated_value),
                            _ => {}
                        }
                    },
                    "opacity" => {
                        el.opacity = interpolated_value;
                    },
                    _ => {}
                }
            }
        }
        computed
    }

    pub fn snap_to_grid(&self, val: f32, grid_size: f32) -> f32 {
        (val / grid_size).round() * grid_size
    }
}
