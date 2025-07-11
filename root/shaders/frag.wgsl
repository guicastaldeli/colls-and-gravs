@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var textureMap: texture_2d<f32>;
@group(2) @binding(0) var <uniform> ambientLight: AmbientLight;

struct FragmentInput {
    @location(0) texCoord: vec2f,
    @location(1) color: vec3f,
    @location(2) normal: vec3f
}

struct AmbientLight {
    color: vec3f,
    intensity: f32
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
    var texColor = textureSample(textureMap, textureSampler, input.texCoord);
    let finalColor = mix(texColor.rgb, input.color, 0.1);
    
    return vec4f(finalColor, texColor.a);
}