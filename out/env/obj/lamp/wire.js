import { mat4, vec3 } from "../../../../node_modules/gl-matrix/esm/index.js";
export class Wire {
    buffers;
    windManager;
    loader;
    segments = [];
    segmentLength = 1.0;
    segmentCount = 1;
    segmentPositions = [];
    segmentVelocities = [];
    segmentForces = [];
    totalLength = this.segmentLength * this.segmentCount;
    gravity = vec3.fromValues(0, -0.1, 0);
    stiffness = 0.5;
    damping = 0.98;
    mass = 0.1;
    airResistance = 0.02;
    pos = {
        x: 7.0,
        y: 4.0,
        z: 7.5
    };
    size = {
        w: 0.45,
        h: 0.45 + this.totalLength,
        d: 0.45
    };
    constructor(windManager, loader) {
        this.windManager = windManager;
        this.loader = loader;
    }
    async loadAssets() {
        try {
            const [model, tex] = await Promise.all([
                this.loader.parser('./assets/env/obj/wire.obj'),
                this.loader.textureLoader('./assets/env/textures/wire.png')
            ]);
            const wire = {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                modelMatrix: mat4.create(),
                texture: tex,
                sampler: this.loader.createSampler()
            };
            return wire;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async createWire(baseBuffer, i) {
        try {
            const segmentBuffer = { ...baseBuffer, modelMatrix: mat4.create() };
            const x = this.pos.x;
            const y = this.pos.y + 1.0;
            const z = this.pos.z;
            const position = vec3.fromValues(x, y + (i * this.segmentLength), z);
            this.segmentPositions[i] = position;
            this.segmentVelocities[i] = vec3.create();
            this.segmentForces[i] = vec3.create();
            mat4.translate(segmentBuffer.modelMatrix, segmentBuffer.modelMatrix, position);
            mat4.scale(segmentBuffer.modelMatrix, segmentBuffer.modelMatrix, [
                this.size.w,
                this.size.h,
                this.size.d
            ]);
            return segmentBuffer;
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    async getBuffers() {
        return this.segments;
    }
    async update(device, deltaTime) {
        const force = this.windManager.getWindForce(deltaTime);
        for (let i = 1; i < this.segmentCount; i++) {
            this.segmentForces[i] = vec3.create();
            vec3.add(this.segmentForces[i], this.segmentForces[i], this.gravity);
            vec3.add(this.segmentForces[i], this.segmentForces[i], force);
            const windVariation = 0.5 + 0.5 * Math.sin(deltaTime * 0.001 + i * 0.3);
            const segmentWindForce = vec3.create();
            vec3.scale(segmentWindForce, force, windVariation * (i / this.segmentCount));
            vec3.add(this.segmentForces[i], this.segmentForces[i], segmentWindForce);
            const prevPos = this.segmentPositions[i - 1];
            const currentPos = this.segmentPositions[i];
            const restDistance = this.segmentLength;
            const direction = vec3.create();
            vec3.sub(direction, currentPos, prevPos);
            const distance = vec3.length(direction);
            vec3.normalize(direction, direction);
            const springForce = (distance - restDistance) * this.stiffness;
            vec3.scaleAndAdd(this.segmentForces[i], this.segmentForces[i], direction, -springForce);
            const velSquared = vec3.squaredLength(this.segmentLength[i]);
            const airDamping = vec3.create();
            vec3.scale(airDamping, this.segmentVelocities[i], -this.airResistance * velSquared);
            vec3.add(this.segmentForces[i], this.segmentForces[i], airDamping);
            const acceleration = vec3.create();
            vec3.scale(acceleration, this.segmentForces[i], 1 / this.mass);
            vec3.scaleAndAdd(this.segmentVelocities[i], this.segmentVelocities[i], acceleration, deltaTime);
            vec3.scale(this.segmentVelocities[i], this.segmentVelocities[i], this.damping);
            vec3.scaleAndAdd(this.segmentPositions[i], this.segmentPositions[i], this.segmentVelocities[i], deltaTime);
            mat4.identity(this.segments[i].modelMatrix);
            if (i > 0) {
                const segmentDir = vec3.create();
                vec3.sub(segmentDir, this.segmentPositions[i], this.segmentPositions[i - 1]);
                vec3.normalize(segmentDir, segmentDir);
                const up = vec3.fromValues(0, 1, 0);
                const axis = vec3.create();
                vec3.cross(axis, up, segmentDir);
                const angle = Math.acos(vec3.dot(up, segmentDir));
                mat4.translate(this.segments[i].modelMatrix, this.segments[i].modelMatrix, this.segmentPositions[i]);
                mat4.rotate(this.segments[i].modelMatrix, this.segments[i].modelMatrix, angle, axis);
                mat4.scale(this.segments[i].modelMatrix, this.segments[i].modelMatrix, [this.size.w, this.size.h, this.size.d]);
            }
            else {
                mat4.translate(this.segments[i].modelMatrix, this.segments[i].modelMatrix, this.segmentPositions[i]);
                mat4.scale(this.segments[i].modelMatrix, this.segments[i].modelMatrix, [this.size.w, this.size.h, this.size.d]);
            }
        }
    }
    async init() {
        const buffers = await this.loadAssets();
        for (let i = 0; i < this.segmentCount; i++) {
            const segment = await this.createWire(buffers, i);
            this.segments.push(segment);
        }
    }
}
