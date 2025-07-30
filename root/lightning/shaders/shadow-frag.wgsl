@group(3) @binding(2) var shadowMap: texture_depth_cube;
@group(3) @binding(3) var shadowSampler: sampler_comparison;

fn sampleShadow(lightPos: vec3f, fragPos: vec3f, lightRange: f32) -> f32 {
    let fragToLight = fragPos - lightPos;
    let depth = length(fragToLight) / lightRange;

    let shadowDepth = textureSampleCompare(
        shadowMap,
        shadowSampler,
        fragToLight,
        depth - 0.005
    );

    return shadowDepth;
}