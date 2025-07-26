struct VertexInput {
    @location(0) position: vec3f,
    @location(2) normal: vec3f
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) originalY: f32
}

@group(0) @binding(0) var<uniform> lightViewProjection: mat4x4f;
@group(0) @binding(1) var<uniform> groundLevel: f32;

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    let shadowPos = vec3f(
        input.position.x,
        groundLevel + 0.01,
        input.position.z
    );

    output.position = lightViewProjection * vec4f(shadowPos, 1.0);
    output.worldPos = shadowPos;
    output.originalY = input.position.y;
    return output;
}