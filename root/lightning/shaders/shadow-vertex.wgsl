struct VertexInput {
    @location(0) position: vec3f
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f
}

@group(0) @binding(0) var<uniform> lightViewProjections: mat4x4f;

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    let worldPos = vec4f(input.position, 1.0).xyz;
    output.position = lightViewProjections * vec4f(input.position, 1.0);
    output.worldPos = worldPos;
    return output;
}