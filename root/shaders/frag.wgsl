@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var textureMap: texture_2d<f32>;

struct FragmentInput {
    @location(0) texCoord: vec2f,
    @location(1) color: vec3f,
    @location(2) normal: vec3f
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
    var texColor = textureSample(textureMap, textureSampler, input.texCoord);
    let baseColor = mix(texColor.rgb, input.color, 0.1);

    let normal = normalize(input.normal);
    let ambientColor = applyAmbientLight(baseColor);
    let directionalColor = applyDirectionalLight(ambientColor, normal);
    
    let finalColor = ambientColor + directionalColor;
    return vec4f(finalColor, texColor.a);
}