@group(2) @binding(1) var<uniform> directionalLight: DirectionalLight;

struct DirectionalLight {
    color: vec3f,
    intensity: f32,
    direction: vec3f,
    padding: f32
}

fn applyDirectionalLight(baseColor: vec3f, normal: vec3f) -> vec3f {
    let lightDir = normalize(-directionalLight.direction);
    let diff = max(dot(normal, lightDir), 0.0);
    return baseColor * directionalLight.color * directionalLight.intensity * diff;
}