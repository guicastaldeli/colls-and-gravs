struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) pos: vec3<f32>
}

@fragment
fn main(input: VertexOutput) -> @location(0) vec4<f32> {
    let color = vec3<f32>(0.0, 0.0, 0.0);
    return vec4<f32>(color, 1.0);
}