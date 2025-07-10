struct Uniforms {
    mvp: mat4x4<f32>
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) pos: vec3<f32>
}

@vertex
fn main(@location(0) position: vec3<f32>) -> VertexOutput {
    var output: VertexOutput;
    output.position = uniforms.mvp * vec4<f32>(position, 1.0);
    output.position.z = output.position.w;
    output.pos = position;
    return output;
}