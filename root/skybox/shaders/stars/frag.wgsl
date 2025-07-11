struct Uniforms {
    mvp: mat4x4<f32>,
    rotation: mat4x4<f32>,
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

@fragment
fn main(input: VertexOutput) -> @location(0) vec4<f32> {
    let coord = input.uv * 2.0 - 1.0;
    let dist = length(coord);

    let threshold = 0.8;
    if(dist > threshold) {
        discard;
    }

    let twinkle = sin(uniforms.time + input.phase * 30.0) * 0.95 + 1.0;
    let starColor = input.color * twinkle;

    let alpha = 1.0 - smoothstep(threshold * 0.8, threshold, dist);
    return vec4<f32>(starColor, alpha);
}