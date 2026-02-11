use crate::core::state::Keyframe;

pub fn interpolate(keyframes: &[Keyframe], time: f32) -> f32 {
    if keyframes.is_empty() {
        return 0.0;
    }

    // Find the two keyframes that bracket the given time
    let mut before = &keyframes[0];
    let mut after = &keyframes[keyframes.len() - 1];

    if time <= before.time {
        return before.value;
    }
    if time >= after.time {
        return after.value;
    }

    for i in 0..keyframes.len() - 1 {
        if time >= keyframes[i].time && time <= keyframes[i+1].time {
            before = &keyframes[i];
            after = &keyframes[i+1];
            break;
        }
    }

    let duration = after.time - before.time;
    if duration == 0.0 {
        return before.value;
    }

    let progress = (time - before.time) / duration;
    
    // Apply easing (simplistic linear for now)
    // TODO: Add Cubic Bezier support
    before.value + (after.value - before.value) * progress
}
