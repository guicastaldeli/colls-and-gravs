struct VertexInput {
    @location(0) position: vec3f
}

struct VertexOutput {
    @builtin(position) position: vec4f
}

@group(0) @binding(0) var<uniform> lightViewProjection: mat4x4f;
@group(0) @binding(1) var<uniform> modelMatrix: mat4x4f;

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    let worldPos = modelMatrix * vec4f(input.position, 1.0);
    output.position = lightViewProjection * worldPos;
    return output;
}