struct FragmentInput {
    @location(0) worldPos: vec3f,
    @location(1) originalY: f32
}

@group(0) @binding(1) var<uniform> groundLevel: f32;

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
    if(input.originalY < groundLevel) {
        discard;
    }

    let color = vec4f(0.0, 0.0, 0.0, 1.0);
    return color;
}