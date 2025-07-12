struct Uniforms {
    mvpMatrix: mat4x4<f32>,
    modelMatrix: mat4x4<f32>
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
    @location(0) position: vec3f,
    @location(1) texCoord: vec2f,
    @location(2) normal: vec3f,
    @location(3) color: vec3f
}

struct VertexOutput {
    @builtin(position) Position: vec4f,
    @location(0) texCoord: vec2f,
    @location(1) color: vec3f,
    @location(2) normal: vec3f,
    @location(3) worldPos: vec3f
}

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.Position = uniforms.mvpMatrix * vec4f(input.position, 1.0);
    output.normal = (uniforms.modelMatrix * vec4f(input.normal, 0.0)).xyz;
    output.worldPos = (uniforms.modelMatrix * vec4f(input.position, 1.0)).xyz;

    output.color = input.color;
    output.texCoord = input.texCoord;
    return output;
}