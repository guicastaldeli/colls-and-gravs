@group(4) @binding(0) var pointShadowMap: texture_depth_cube;
@group(4) @binding(1) var pointShadowSampler: sampler_comparison;

fn samplePointShadowMap(
    worldPos: vec3f,
    lightPos: vec3f,
    farPlane: f32
) -> f32 {
    let fragToLight = worldPos - lightPos;
    let currentDepth = length(fragToLight);

    return textureSampleCompare(
        pointShadowMap,
        pointShadowSampler,
        fragToLight,
        currentDepth - 0.05
    );
}