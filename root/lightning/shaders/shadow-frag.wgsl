@group(1) @binding(2) var pointShadowMap: texture_depth_cube;
@group(1) @binding(3) var pointShadowSampler: sampler_comparison;

struct FragmentInput {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
    let fragToLight = input.worldPos;
    let currentDepth = length(fragToLight);
    let bias = 0.005;

    let shadow = textureSampleCompare(
        pointShadowMap,
        pointShadowSampler,
        normalize(fragToLight),
        currentDepth - bias
    );

    return vec4f(shadow, shadow, shadow, 1.0);
}