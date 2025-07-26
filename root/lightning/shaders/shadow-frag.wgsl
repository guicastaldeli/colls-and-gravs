struct FragmentInput {
    @location(0) worldPos: vec3f,
    @location(1) shadowPos: vec4f,
    @location(2) normal: vec3f,
    @location(3) distanceToGround: f32
}

@group(0) @binding(2) var<uniform> lightPos: vec3f;
@group(0) @binding(3) var<uniform> shadowParams: vec4f;
@group(1) @binding(0) var shadowSampler: sampler_comparison;
@group(1) @binding(1) var shadowMap: texture_depth_2d;

fn pcfShadow(shadowCoord: vec3f, bias: f32) -> f32 {
    let texelSize = 1.0 / 1024.0;
    var shadow = 0.0;
    let samples = 9.0;

    for(var x = -1; x < 1; x++) {
        for(var y = -1; y < 1; y++) {
            let sampleCoord = shadowCoord.xy + vec2f(f32(x), f32(y)) * texelSize;
            shadow += textureSampleCompare(
                shadowMap,
                shadowSampler,
                sampleCoord,
                shadowCoord.z - bias
            );
        }
    }

    return shadow / samples;
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
    if(input.distanceToGround < 0.1) {
        discard;
    }

    let shadowParams = shadowParams;
    let bias = shadowParams.x;
    let radius = shadowParams.y;
    let intensity = shadowParams.z;
    let fadeDistance = shadowParams.w;

    let distanceToLight = length(input.worldPos - lightPos);
    let distanceFade = 1.0 - min(distanceToLight / fadeDistance, 1.0);
    let heightFade = 1.0 - min(input.distanceToGround / 10.0, 0.8);
    let centerDistance = length(input.worldPos.xz);
    let edgeFade = 1.0 - smoothstep(radius * 0.7, radius, centerDistance);
    
    let finalAlpha = intensity * distanceFade * heightFade * edgeFade * 0.6;
    let shadowColor = vec3f(0.1, 0.1, 0.15);
    return vec4f(shadowColor, finalAlpha);
}