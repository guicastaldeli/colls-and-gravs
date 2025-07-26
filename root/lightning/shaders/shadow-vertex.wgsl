struct VertexInput {
    @location(0) position: vec3f,
    @location(2) normal: vec3f
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) shadowPos: vec4f,
    @location(2) normal: vec3f,
    @location(3) distanceToGround: f32
}

@group(0) @binding(0) var<uniform> lightViewProjection: mat4x4f;
@group(0) @binding(1) var<uniform> groundLevel: f32;
@group(0) @binding(2) var<uniform> lightPos: vec3f;
@group(0) @binding(3) var<uniform> shadowParams: vec4f;

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    let lightToVertex = input.position - lightPos;
    let t = (groundLevel - lightPos.y) / lightToVertex.y;
    let shadowGroundPos = lightPos + t * lightToVertex;

    let maxShadowDistance = 20.0;
    let shadowDistance = length(shadowGroundPos.xz - input.position.xz);
    let fadeFactor = 1.0 - min(shadowDistance / maxShadowDistance, 1.0);

    let finalShadowPos = vec3f(
        shadowGroundPos.x,
        groundLevel + 0.001,
        shadowGroundPos.z
    );

    output.position = lightViewProjection * vec4f(finalShadowPos, 1.0);
    output.worldPos = finalShadowPos;
    output.shadowPos = vec4f(finalShadowPos, 1.0);
    output.normal = input.normal;
    output.distanceToGround = input.position.y - groundLevel;
    return output;
}