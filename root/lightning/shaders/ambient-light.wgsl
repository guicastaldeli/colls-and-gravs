@group(2) @binding(0) var<uniform> ambientLight: AmbientLight;

struct AmbientLight {
    color: vec3f,
    intensity: f32
}

fn applyAmbientLight(baseColor: vec3f) -> vec3f {
    return baseColor * ambientLight.color * ambientLight.intensity;
}