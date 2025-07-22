@group(3) @binding(0) var pointShadowMap: texture_depth_cube;
@group(3) @binding(1) var pointShadowSampler: sampler_comparison;

struct FragmentInput {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) lightPos: vec3f,
    @location(2) farPlane: f32
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
    let fragToLight = input.worldPos - input.lightPos;
    let currentDepth = length(fragToLight) / input.farPlane;
    let bias = 0.005;

    let shadow = textureSampleCompare(
        pointShadowMap,
        pointShadowSampler,
        normalize(fragToLight),
        currentDepth - bias
    );

    return vec4f(shadow, shadow, shadow, 1.0);
}