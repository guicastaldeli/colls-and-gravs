@group(0) @binding(0) var uSampler: sampler;
@group(0) @binding(1) var uTexture: texture_2d<f32>;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    let color = textureSample(uTexture, uSampler, uv);
    if(color.a < 0.01) { discard; }
    return color;
}
