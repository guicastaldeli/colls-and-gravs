struct Unifoms {
    mvp: mat4x4<f32>
}

@group(0) @binding(0) var<uniform> uniforms: Unifoms;

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>
}

@vertex
fn main(@location(0) position: vec3<f32>) -> VertexOutput {
    var output: VertexOutput;
    let scaledPos = position * 1.05;
    output.clip_position = uniforms.mvp * vec4<f32>(scaledPos, 1.0);
    return output;
}