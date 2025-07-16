struct Uniforms {
    mvpMatrix: mat4x4f
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
    @location(0) position: vec3f,
    @location(1) texCoord: vec2f
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) texCoord: vec2f
}

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = uniforms.mvpMatrix * vec4f(input.position, 1.0);
    output.texCoord = input.texCoord;
    return output;
}