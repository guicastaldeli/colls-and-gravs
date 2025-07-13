struct PointLight {
    position: vec3f,
    color: vec3f,
    intensity: f32,
    range: f32,
    constant: f32,
    linear: f32,
    quadratic: f32,
    padding: f32
}

@group(3) @binding(0) var<storage, read> pointLights: array<PointLight>;
@group(3) @binding(1) var<uniform> pointLightCount: u32;

fn calculateAttenuation(
    distance: f32,
    constant: f32,
    linear: f32,
    quadratic: f32
) -> f32 {
    return 1.0 / (
        constant +
        linear * distance +
        quadratic * distance * distance 
    );
}

fn applyPointLight(
    baseColor: vec3f,
    normal: vec3f,
    worldPos: vec3f,
    light: PointLight
) -> vec3f {
    let lightVec = light.position - worldPos;
    let distance = length(lightVec);
    if(distance > light.range) {
        return vec3f(0.0);
    }

    let lightDir = lightVec / distance;
    let attenuation = calculateAttenuation(
        distance,
        light.constant,
        light.linear,
        light.quadratic
    );

    let diff = max(dot(normal, lightDir), 0.0);
    let diffuse = light.color * light.intensity * diff * attenuation;
    let rangeFactor = 1.0 - smoothstep(
        light.range * 0.75,
        light.range,
        distance
    );

    return baseColor * diffuse * rangeFactor;
}