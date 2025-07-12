struct DirectionalLight {
    direction: vec3f,
    color: vec3f,
    intensity: f32
}

@group(2) @binding(1) var<uniform> directionalLight: DirectionalLight;

fn applyDirectionalLight(baseColor: vec3f, normal: vec3f) -> vec3f {
    let lightDir = normalize(-directionalLight.direction);
    let diff = max(dot(normal, lightDir), 0.0);
    let diffuse = diff * directionalLight.color * directionalLight.intensity;
    return baseColor * (ambientLight.color * ambientLight.intensity + diffuse);
}