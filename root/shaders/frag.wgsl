@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var textureMap: texture_2d<f32>;

struct FragmentInput {
    @location(0) texCoord: vec2f,
    @location(1) color: vec3f,
    @location(2) normal: vec3f,
    @location(3) worldPos: vec3f,
    @location(4) isLamp: f32,
    @location(5) cameraPos: vec3f
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
    var texColor = textureSample(textureMap, textureSampler, input.texCoord);
    let baseColor = mix(texColor.rgb, input.color, 0.1);

    let worldPos = input.worldPos;
    let cameraPos = input.cameraPos;
    let dFdxPos = dpdx(worldPos);
    let dFdyPos = dpdy(worldPos);
    let calculatedNormal = normalize(cross(dFdxPos, dFdyPos));
    
    var finalColor = applyAmbientLight(baseColor);
    finalColor += applyDirectionalLight(baseColor, calculatedNormal);
    for(var i = 0u; i < pointLightCount; i++) {
        let light = pointLights[i];
        let lightPos = light.position.xyz;
        
        finalColor += applyPointLight(
            baseColor,
            calculatedNormal,
            worldPos,
            pointLights[i]
        );

        if(input.isLamp > 0.5) {
            finalColor += applyGlow(
                baseColor,
                worldPos,
                calculatedNormal,
                input.isLamp,
                light,
                cameraPos
            );
        }

        let shadowFactor = sampleShadow(lightPos, worldPos, light.range);
        finalColor *= shadowFactor;
    }

    finalColor = max(finalColor, vec3f(0.0));
    return vec4f(finalColor, texColor.a);
}