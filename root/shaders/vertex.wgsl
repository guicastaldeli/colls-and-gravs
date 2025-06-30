struct Uniforms {
    viewProjectionMatrix: mat4x4<f32>
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
    @location(0) position: vec2f,
    @location(1) color: vec3f
}

struct VertexOutput {
    @builtin(position) Position: vec4f,
    @location(0) color: vec3f
}

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.Position = uniforms.viewProjectionMatrix * vec4<f32>(input.position, 0.0, 1.0);
    output.color = input.color;
    return output;
}