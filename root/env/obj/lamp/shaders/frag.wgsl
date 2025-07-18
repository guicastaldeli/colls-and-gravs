struct Uniforms {
    mvpMatrix: mat4x4f,
    emissiveStrength: f32,
    padding: vec3f
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var lampTex: texture_2d<f32>;
@group(0) @binding(2) var lampSampler: sampler;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) worldPos: vec3<f32>
}

/*
@fragment
fn main(input: VertexOutput) -> @location(0) vec4<f32> {
    let texColor = textureSample(lampTex, lampSampler, input.uv).rgb;
    let emissiveColor = mix(vec3(1.0), texColor, 0.3);
    let glowColor = texColor + emissiveColor * uniforms.emissiveStrength;
    let finalColor = glowColor / (glowColor + vec3(2.0));
    return vec4(finalColor, 1.0);
}
*/

@fragment
fn main(input: VertexOutput) -> @location(0) vec4<f32> {
    return vec4(1.0, 0.0, 0.0, 1.0);
}