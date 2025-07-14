struct VertexOutput {
    @builtin(position) position: vec4f
}

@vertex
fn main(@location(0) pos: vec3f) -> VertexOutput {
    return VertexOutput(vec4f(pos, 1.0));
}