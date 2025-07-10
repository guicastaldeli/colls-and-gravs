struct Uniforms {
    mvp: mat4x4<f32>,
    time: f32
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec3<f32>,
    @location(1) pointSize: f32,
    @location(2) phase: f32,
    @builtin(point_coord) pointCoord: vec2<f32>
}

@fragment
fn main(input: VertexOutput) -> @location(0) vec4<f32> {
    let coord = input.pointCoord - vec2<f32>(0.5);
    if(length(coord) > 0.5) {
        discard;
    }

    let twinkle = sin(uniforms.time * 2.0 + input.phase * 30.0) * 0.2 + 0.8;
    let starColor = input.color * twinkle;
    return vec4<f32>(starColor, 1.0);
}