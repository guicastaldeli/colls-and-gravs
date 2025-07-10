struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) pos: vec3<f32>
}

@fragment
fn main(input: VertexOutput) -> @location(0) vec4<f32> {
    let topColor = vec3<f32>(0.0706, 0.0745, 0.0902);
    let bottomColor = vec3<f32>(0.1686, 0.1725, 0.1882);

    let gradient = smoothstep(-1.0, 1.0, normalize(input.pos).y);
    let finalColor = mix(bottomColor, topColor, gradient);
    return vec4<f32>(finalColor, 1.0);
}