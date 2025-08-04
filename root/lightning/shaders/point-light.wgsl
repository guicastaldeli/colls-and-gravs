struct PointLight {
    position: vec4f,
    color: vec4f,
    intensity: f32,
    range: f32,
    constant: f32,
    linear: f32,
    quadratic: f32,
    padding: f32
}

@group(3) @binding(0) var<uniform> pointLightCount: u32;
@group(3) @binding(1) var<storage, read> pointLights: array<PointLight>;

fn calculateAttenuation(
    distance: f32,
    constant: f32,
    linear: f32,
    quadratic: f32
) -> f32 {
    return 1.0 / (
        constant +
        linear * distance +
        quadratic * distance * 
        distance 
    );
}

fn applyPointLight(
    baseColor: vec3f,
    normal: vec3f,
    worldPos: vec3f,
    light: PointLight
) -> vec3f {
    let baseWorldPos = worldPos - normal;
    let worldPos4 = vec4f(baseWorldPos, 0.0);
    let lightVec = light.position - worldPos4;
    let distance = length(lightVec.xyz);
    if(distance > light.range) {
        return vec3f(0.0);
    }

    let lightDir = normalize(lightVec);
    let NdotL = abs(dot(normal, lightDir.xyz));
    let attenuation = calculateAttenuation(
        distance,
        light.constant,
        light.linear,
        light.quadratic
    );

    let toDiffuse = light.color.xyz * light.intensity * attenuation;
    let diffuse = toDiffuse * NdotL;
    let rangeFactor = 1.0 - smoothstep(
        light.range * 0.1,
        light.range,
        distance
    );

    let result = baseColor * diffuse * rangeFactor;
    return result;
}