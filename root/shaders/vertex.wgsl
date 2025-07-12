@group(0) @binding(0) var<uniform> mvpMatrix: mat4x4<f32>;

struct VertexInput {
    @location(0) position: vec3f,
    @location(1) texCoord: vec2f,
    @location(2) normal: vec3f,
    @location(3) color: vec3f,
}

struct VertexOutput {
    @builtin(position) Position: vec4f,
    @location(0) texCoord: vec2f,
    @location(1) color: vec3f,
    @location(2) normal: vec3f,
    @location(3) fragPos: vec3f
}

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.Position = mvpMatrix * vec4f(input.position, 1.0);
    output.color = input.color;

    let normalMatrix = mat3x3f(
        mvpMatrix[0].xyz,
        mvpMatrix[1].xyz,
        mvpMatrix[2].xyz
    );
    output.normal = normalize(normalMatrix * input.normal);

    output.texCoord = input.texCoord;
    return output;
}