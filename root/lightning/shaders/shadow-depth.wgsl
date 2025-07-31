@group(0) @binding(0) var<uniform> lightProjectionMatrix: mat4x4f;
@group(0) @binding(1) var<storage, read> modelMatrix: array<mat4x4f>;

struct Input {
    @builtin(instance_index) idx: u32,
    @location(0) position: vec4f,
    @location(1) normal: vec4f
}

@vertex
fn main(in: Input) -> @builtin(position) vec4f {
    let mPosition = modelMatrix[in.idx] * in.position;
    return lightProjectionMatrix * mPosition;
}