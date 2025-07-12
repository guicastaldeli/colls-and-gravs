struct DirectionalLight {
    position: vec3f,
    width: f32,
    height: f32,
    near: f32,
    far: f32,
    direction: vec3f,
    color: vec3f,
    intensity: f32
}

@group(2) @binding(1) var<uniform> directionalLight: DirectionalLight;

fn applyDirectionalLight(
    baseColor: vec3f, 
    normal: vec3f,
    fragPos: vec3f
) -> vec3f {
    let lightDir = normalize(-directionalLight.direction);
    let diff = max(dot(normal, lightDir), 0.0);
    let diffuse = diff * directionalLight.color * directionalLight.intensity;

    let lightToFrag = fragPos - directionalLight.position;
    let distX = abs(dot(lightToFrag, vec3(1.0, 0.0, 0.0)));
    let distZ = abs(dot(lightToFrag, vec3(0.0, 0.0, 1.0)));

    let attenuationX = smoothstep(
        directionalLight.width / 2.0,
        directionalLight.width / 2.5,
        distX
    );
    let attenuationZ = smoothstep(
        directionalLight.height / 2.0,
        directionalLight.height / 2.0,
        distZ
    );
    let attenuation = 1.0 - max(attenuationX, attenuationZ);

    return baseColor * diffuse * attenuation;
}