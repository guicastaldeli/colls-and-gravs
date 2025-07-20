fn applyGlow(
    baseColor: vec3f,
    worldPos: vec3f,
    normal: vec3f,
    isLamp: f32,
    light: PointLight,
    cameraPos: vec3f
) -> vec3f {
    if(isLamp < 0.5) {
        return vec3f(0.0);
    }

    let dist = distance(worldPos, light.position.xyz);
    let attenuation = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);
    let intensity = light.intensity * attenuation * 10.0;

    let glowRadius = light.range * 0.5;
    let glowEffect = light.color.xyz * intensity * smoothstep(glowRadius, 0.0, dist);
    return glowEffect;
}