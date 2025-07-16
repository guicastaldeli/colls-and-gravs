struct FragmentInput {
    @location(0) color: vec3f
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
    return vec4f(1.0, 0.0, 0.0, 1.0);
}