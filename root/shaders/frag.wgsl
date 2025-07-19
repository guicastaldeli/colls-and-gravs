@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var textureMap: texture_2d<f32>;

struct FragmentInput {
    @location(0) texCoord: vec2f,
    @location(1) color: vec3f,
    @location(2) normal: vec3f,
    @location(3) worldPos: vec3f,
    @location(4) isLamp: f32
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
    if (input.isLamp > 0.5) {
        return vec4f(1.0, 0.0, 0.0, 1.0);
    } else {
        return vec4f(0.0, 0.0, 1.0, 1.0);
    }
}