@group(0) @binding(0) var<uniform> viewProjectionMatrix: mat4x4f;
@group(0) @binding(1) var<storage, read> modelMatrix: array<mat4x4f>;
@group(0) @binding(2) var<storage, read> normalMatrix: array<mat4x4f>;
@group(0) @binding(3) var<uniform> lightProjectionMatrix: mat4x4f;
@group(0) @binding(4) var<storage, read> colorVec: array<vec4f>;

struct Input {
    @builtin(instance_index) idx: u32,
    @location(0) position: vec4f,
    @location(1) normal: vec4f
}

struct Output {
    @builtin(position) position: vec4f,
    @location(0) vPosition: vec4f,
    @location(1) vNormal: vec4f,
    @location(2) vShadowPos: vec4f,
    @location(3) vColor: vec4f
}

@vertex
fn main(in: Input) -> Output {
    var output: Output;

    let modelMatrix = modelMatrix[in.idx];
    let normalMatrix = normalMatrix[in.idx];
    let mPosition = modelMatrix * in.position;

    output.vPosition = mPosition;
    output.vNormal = normalMatrix * in.normal;
    output.position = viewProjectionMatrix * mPosition;
    output.vColor = colorVec[in.idx];

    let lightPosition = lightProjectionMatrix * mPosition;
    output.vShadowPos = vec4(
        lightPosition.xy * vec2(0.5 -0.5) +
        vec2(0.5, 0.5), lightPosition.z, 1.0
    );

    return output;
}