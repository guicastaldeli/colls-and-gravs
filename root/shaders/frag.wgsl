@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var textureMap: texture_2d<f32>;

struct FragmentInput {
    @location(0) texCoord: vec2f,
    @location(1) color: vec3f,
    @location(2) normal: vec3f,
    @location(3) worldPos: vec3f
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
    var texColor = textureSample(textureMap, textureSampler, input.texCoord);
    let baseColor = mix(texColor.rgb, input.color, 0.1);

    let dFdxPos = dpdx(input.worldPos);
    let dFdyPos = dpdy(input.worldPos);
    let worldPos = input.worldPos;
    let calculatedNormal = normalize(cross(dFdxPos, dFdyPos));
    
    var finalColor = applyAmbientLight(baseColor);
    finalColor += applyDirectionalLight(baseColor, calculatedNormal);
    for(var i = 0u; i < pointLightCount; i++) {
        finalColor += applyPointLight(
            baseColor,
            calculatedNormal,
            worldPos,
            pointLights[i]
        );
    }
    
    finalColor = max(finalColor, vec3f(0.0));
    return vec4f(finalColor, texColor.a);
}