struct VertexInput {
    @location(0) position: vec3f
}

struct VertexOutput {
    @builtin(position) position: vec4f
}

@group(4) @binding(0) var<uniform> lightViewPosition: mat4x4f;
@group(4) @binding(1) var<uniform> model: mat4x4f;

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = lightViewPosition * model * vec4f(input.position, 1.0);
    return output;
}