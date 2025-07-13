struct DirectionalLight {
    direction: vec3f,
    color: vec3f,
    intensity: f32,
    padding: f32
}

@group(2) @binding(1) var<uniform> directionalLight: DirectionalLight;
@group(2) @binding(2) var<uniform> directionalLightMatrix: mat4x4<f32>;

fn applyDirectionalLight(baseColor: vec3f, normal: vec3f) -> vec3f {
    let lightDir = normalize(-directionalLight.direction);
    let diff = max(dot(normal, lightDir), 0.0);
    let diffuse = diff * directionalLight.color * directionalLight.intensity;
    return baseColor + diffuse;
}