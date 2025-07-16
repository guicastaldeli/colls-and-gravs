@group(0) @binding(1) var texture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

struct FragmentInput {
    @location(0) texCoord: vec2f
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
    let texColor = textureSample(texture, uSampler, input.texCoord);
    let color = vec4f(1.0, 0.0, 0.0, 1.0);
    return texColor * color;
}