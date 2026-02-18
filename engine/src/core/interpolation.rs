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
    
    let eased_progress = match before.easing.as_str() {
        "linear" => progress,
        "ease-in" => progress * progress,
        "ease-out" => progress * (2.0 - progress),
        "ease-in-out" => if progress < 0.5 { 2.0 * progress * progress } else { -1.0 + (4.0 - 2.0 * progress) * progress },
        "bounce" => bounce_ease_out(progress),
        "elastic" => elastic_ease_out(progress),
        easing if easing.starts_with("cubic-bezier") => {
            solve_cubic_bezier(easing, progress)
        },
        _ => progress,
    };

    before.value + (after.value - before.value) * eased_progress
}

fn solve_cubic_bezier(config: &str, x: f32) -> f32 {
    // Basic parser for cubic-bezier(x1, y1, x2, y2)
    let params: Vec<f32> = config
        .replace("cubic-bezier(", "")
        .replace(")", "")
        .split(',')
        .map(|s| s.trim().parse::<f32>().unwrap_or(0.0))
        .collect();

    if params.len() != 4 {
        return x;
    }

    let (x1, y1, x2, y2) = (params[0], params[1], params[2], params[3]);

    // Newton-Raphson to find t for given x
    let mut t = x;
    for _ in 0..8 {
        let current_x = sample_curve_at_t(x1, x2, t) - x;
        if current_x.abs() < 1e-5 { break; }
        let derivative = sample_curve_derivative_at_t(x1, x2, t);
        if derivative.abs() < 1e-5 { break; }
        t -= current_x / derivative;
    }

    sample_curve_at_t(y1, y2, t)
}

fn sample_curve_at_t(p1: f32, p2: f32, t: f32) -> f32 {
    3.0 * p1 * t * (1.0 - t).powi(2) + 3.0 * p2 * t.powi(2) * (1.0 - t) + t.powi(3)
}

fn sample_curve_derivative_at_t(p1: f32, p2: f32, t: f32) -> f32 {
    3.0 * (1.0 - 3.0 * p2 + 3.0 * p1) * t.powi(2) + 2.0 * (3.0 * p2 - 6.0 * p1) * t + 3.0 * p1
}

fn bounce_ease_out(mut p: f32) -> f32 {
    if p < (1.0 / 2.75) {
        7.5625 * p * p
    } else if p < (2.0 / 2.75) {
        p -= 1.5 / 2.75;
        7.5625 * p * p + 0.75
    } else if p < (2.5 / 2.75) {
        p -= 2.25 / 2.75;
        7.5625 * p * p + 0.9375
    } else {
        p -= 2.625 / 2.75;
        7.5625 * p * p + 0.984375
    }
}

fn elastic_ease_out(p: f32) -> f32 {
    if p == 0.0 || p == 1.0 { return p; }
    (2.0f32.powf(-10.0 * p) * ((p * 10.0 - 0.75) * (2.0 * std::f32::consts::PI) / 3.0).sin()) * 0.5 + 1.0
}
