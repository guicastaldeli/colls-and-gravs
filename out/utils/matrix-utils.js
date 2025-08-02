import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
//Point Light View Projection
export function getPointLightViewProjectionMatrices(lightPosition, near = 0.1, far = 100.0) {
    const projMatrix = mat4.perspective(mat4.create(), Math.PI / 2, 1.0, near, far);
    const directions = [
        vec3.fromValues(1, 0, 0),
        vec3.fromValues(-1, 0, 0),
        vec3.fromValues(0, 1, 0),
        vec3.fromValues(0, -1, 0),
        vec3.fromValues(0, 0, 1),
        vec3.fromValues(0, 0, -1)
    ];
    const ups = [
        vec3.fromValues(0, -1, 0),
        vec3.fromValues(0, -1, 0),
        vec3.fromValues(0, 0, 1),
        vec3.fromValues(0, 0, -1),
        vec3.fromValues(0, -1, 0),
        vec3.fromValues(0, -1, 0)
    ];
    return directions.map((direction, i) => {
        const viewMatrix = mat4.lookAt(mat4.create(), lightPosition, vec3.add(vec3.create(), lightPosition, direction), ups[i]);
        const viewProjMatrix = mat4.create();
        mat4.multiply(viewProjMatrix, projMatrix, viewMatrix);
        return viewProjMatrix;
    });
}
