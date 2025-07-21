struct Uniforms {
    mvpMatrix: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
    @location(0) position: vec3f
}

struct VertexOutput {
    @builtin(position) Position: vec4f
}

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.Position = uniforms.mvpMatrix * vec4f(input.position, 1.0);
    return output;
}