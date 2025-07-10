@group(1) @binding(0) var<uniform> uTransform: mat4x4<f32>;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>
}

@vertex
fn main(
    @location(0) position: vec3<f32>,
    @location(1) uv: vec2<f32>
) -> VertexOutput {
    var output: VertexOutput;
    output.position = uTransform * vec4<f32>(position, 1.0);
    output.uv = uv;
    return output;
}