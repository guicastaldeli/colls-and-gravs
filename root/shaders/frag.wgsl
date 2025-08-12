@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var textureMap: texture_2d<f32>;

struct FragmentInput {
    @location(0) texCoord: vec2f,
    @location(1) color: vec3f,
    @location(2) normal: vec3f,
    @location(3) worldPos: vec3f,
    @location(4) isLamp: f32,
    @location(5) cameraPos: vec3f,
    @location(6) isEmissive: f32,
    @builtin(position) Position: vec4f
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
    var texColor = textureSample(textureMap, textureSampler, input.texCoord);
    var baseColor = mix(texColor.rgb, input.color, 0.1);

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
    }

    if(input.isEmissive > 0.5) {
        var thickness = 1.0;
        var alpha = texColor.a;
        
        let texSize = vec2f(textureDimensions(textureMap));
        let aspectRatio = 2.0;

        let uvCenter = vec2f(0.5, 0.5);
        let uvOffset = (input.texCoord - uvCenter) * vec2f(aspectRatio, 4.0);
        let distToCenter = length(uvOffset);
        
        alpha = alpha * distToCenter;
        texColor.a = alpha;
        finalColor += applyEmissiveGlow(
            baseColor,
            worldPos,
            calculatedNormal,
            input.isEmissive,
            ambientLight,
            cameraPos
        );
    }

    if(input.isLamp > 0.5) {
        var thickness = 1.0;
        var alpha = texColor.a;
        
        let texSize = vec2f(textureDimensions(textureMap));
        let aspectRatio = 2.0;

        let uvCenter = vec2f(0.25, 0.5);
        let uvOffset = (input.texCoord - uvCenter) * vec2f(aspectRatio, 1.0);
        let distToCenter = length(uvOffset);
        
        alpha = alpha * pow(1.0 - smoothstep(0.1, 0.5, distToCenter), 60.0);
        texColor.a = alpha;
    }

    finalColor = max(finalColor, vec3f(0.0));
    return vec4f(finalColor, texColor.a);
}