struct Uniforms {
    mvp: mat4x4<f32>,
    rotation: mat4x4<f32>,
    time: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec3<f32>,
    @location(1) size: f32,
    @location(2) phase: f32,
    @location(3) uv: vec2<f32>
}

@vertex
fn main(
    @location(0) position: vec3<f32>,
    @location(1) color: vec3<f32>,
    @location(2) scale: f32,
    @location(3) phase: f32,
    @location(4) uv: vec2<f32>
) -> VertexOutput {
    var output: VertexOutput;
    let rotation_position = uniforms.rotation * vec4<f32>(position, 1.0);
    let center = uniforms.mvp * rotation_position;

    let finalSize = 250.0 * scale;
    var offset = (uv - vec2<f32>(0.5)) * finalSize * 0.01;
    let aspect = 1920.0 / 1080.0;
    offset.x *= 1.0 / aspect;

    output.position = center + vec4<f32>(offset, 0.0, 0.0);
    output.position.z = output.position.w * 0.999;
    output.size = finalSize;
    output.color = color;
    output.phase = phase;
    output.uv = uv;
    return output;
}