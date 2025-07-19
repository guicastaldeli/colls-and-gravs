struct Uniforms {
    mvpMatrix: mat4x4<f32>,
    modelMatrix: mat4x4<f32>,
    normalMatrix: mat3x3f,
    padding: f32,
    isLamp: f32
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
    @location(0) position: vec3f,
    @location(1) texCoord: vec2f,
    @location(2) normal: vec3f,
    @location(3) color: vec3f,
    @location(4) isLamp: f32
}

struct VertexOutput {
    @builtin(position) Position: vec4f,
    @location(0) texCoord: vec2f,
    @location(1) color: vec3f,
    @location(2) normal: vec3f,
    @location(3) worldPos: vec3f,
    @location(4) isLamp: f32
}

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    output.Position = uniforms.mvpMatrix * vec4f(input.position, 1.0);
    output.worldPos = (uniforms.modelMatrix * vec4f(input.position, 1.0)).xyz;
    output.normal = normalize(uniforms.normalMatrix * input.normal);

    output.color = input.color;
    output.texCoord = input.texCoord;
    output.isLamp = uniforms.isLamp;
    return output;
}