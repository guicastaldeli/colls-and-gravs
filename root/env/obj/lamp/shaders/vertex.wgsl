struct VertexInput {
    @location(0) position: vec3f,
    @location(1) texCoord: vec2f
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
    @location(2) worldPos: vec3f
}

struct Uniforms {
    mvpMatrix: mat4x4f,
    emissiveStrength: f32,
    padding: vec3f
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = uniforms.mvpMatrix * vec4f(input.position, 1.0);
    output.uv = input.texCoord;
    output.normal = vec3(0, 1, 0);
    output.worldPos = input.position;
    return output;
}