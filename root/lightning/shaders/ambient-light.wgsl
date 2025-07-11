@group(1) @binding(0) var texSampler: sampler;
@group(1) @binding(1) var texMap: texture_2d<f32>;

struct FragmentInput {
    @location(0) texCoord: vec2f,
    @location(1) color: vec3f,
    @location(2) normal: vec3f
}

struct AmbientLight {
    color: vec3f,
    intensity: f32
}

@group(0) @binding(1) var<uniform> ambientLight: AmbientLight;

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
    var texColor = textureSample(texMap, texSampler, input.texCoord);
    let finalColor = mix(texColor.rgb, input.color, 0.1);

    let lightDir = normalize(vec3f(1.0, 1.0, 1.0));
    let lightIntensity = max(dot(input.normal, lightDir), 0.3);
    let ambient = ambientLight.color * ambientLight.intensity;
    let litColor = finalColor * (lightIntensity + ambient);

    return vec4f(litColor, texColor.a);
}