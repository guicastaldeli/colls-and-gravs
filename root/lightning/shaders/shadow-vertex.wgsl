struct VertexInput {
    @location(0) position: vec3f
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) lightPos: vec3f,
    @location(2) farPlane: f32
}

@group(0) @binding(0) var<uniform> lightViewProjections: mat4x4f;
@group(0) @binding(1) var<uniform> faceIndex: u32;
@group(0) @binding(2) var<uniform> model: mat4x4f;
@group(0) @binding(3) var<uniform> lightPosition: vec3f;
@group(0) @binding(4) var<uniform> farPlane: f32;

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    let worldPos = (model * vec4f(input.position, 1.0)).xyz;
    output.position = lightViewProjections[faceIndex] * model * vec4f(input.position, 1.0);
    output.worldPos = worldPos;
    output.lightPos = lightPosition;
    output.farPlane = farPlane;
    return output;
}