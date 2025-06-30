@group(0) @binding(0) var<uniform> mvpMatrix: mat4x4<f32>;

struct VertexInput {
    @location(0) position: vec3f,
    @location(1) color: vec3f
}

struct VertexOutput {
    @builtin(position) Position: vec4f,
    @location(0) color: vec3f
}

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.Position = mvpMatrix * vec4<f32>(input.position, 1.0);
    output.color = input.color;
    return output;
}