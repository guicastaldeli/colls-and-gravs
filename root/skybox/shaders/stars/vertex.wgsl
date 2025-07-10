struct Uniforms {
    mvp: mat4x4<f32>,
    time: f32
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

    output.position = uniforms.mvp * vec4<f32>(position, 1.0);

    let twinkle = sin(uniforms.time * 2.0 + phase * 30.0) * 0.5 + 1.5;
    let finalSize = 0.3 * scale * twinkle;

    output.size = finalSize * (300.0 / -output.position.z);
    output.color = color;
    output.phase = phase;
    output.uv = uv;
    return output;
}