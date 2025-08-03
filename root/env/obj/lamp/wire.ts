import { mat3, mat4, vec3, quat } from "../../../../node_modules/gl-matrix/esm/index.js";
import { ShaderLoader } from "../../../shader-loader.js";
import { WindManager } from "../../../wind-manager.js";
import { Loader } from "../../../loader.js";
import { EnvBufferData } from "../../env-buffers.js";

export class Wire {
    private buffers?: EnvBufferData;
    private windManager: WindManager;
    private loader: Loader;

    private segments: EnvBufferData[] = [];
    private segmentLength: number = 1.0;
    private segmentCount: number = 1;
    private segmentRotations: quat[] = [];
    private totalLength: number = this.segmentLength * this.segmentCount;
    
    private damping: number = 0.98;
    private stiffness: number = 0.2;
    private mass: number = 1.0;
    private angularVelocities: vec3[] = [];
    private rotationAngle: number = Math.PI / 4;
    private rotationAxis: vec3 = vec3.fromValues(0, 0, 1);

    public pos = {
        x: 7.0,
        y: 4.0,
        z: 7.5
    }

    size = {
        w: 0.6,
        h: 0.6 + this.totalLength,
        d: 0.6
    }

    constructor(windManager: WindManager, loader: Loader) {
        this.windManager = windManager;
        this.loader = loader;
    }

    private async loadAssets(): Promise<EnvBufferData> {
        try {
            const [model, tex] = await Promise.all([
                this.loader.parser('./assets/env/obj/wire.obj'),
                this.loader.textureLoader('./assets/env/textures/wire.png')
            ]);

            const wire: EnvBufferData = {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                modelMatrix: mat4.create(),
                texture: tex,
                sampler: this.loader.createSampler()
            }

            return wire;
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    private async createWire(baseBuffer: EnvBufferData, i: number): Promise<EnvBufferData> {
        try {
            const segmentBuffer = { ...baseBuffer, modelMatrix: mat4.create() };

            const x = this.pos.x;
            const y = this.pos.y + 1.0;
            const z = this.pos.z;
            const position = vec3.fromValues(
                x + (i * this.segmentLength * Math.cos(this.rotationAngle)),
                y + (i * this.segmentLength * Math.cos(this.rotationAngle)),
                z
            );
            mat4.translate(
                segmentBuffer.modelMatrix, 
                segmentBuffer.modelMatrix, 
                position
            );
            mat4.rotate(
                segmentBuffer.modelMatrix,
                segmentBuffer.modelMatrix,
                this.rotationAngle,
                this.rotationAxis
            );
            mat4.scale(
                segmentBuffer.modelMatrix,
                segmentBuffer.modelMatrix,
                [this.size.w, this.size.h, this.size.d]
            );

            return segmentBuffer;
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    private updateSegmentPhysics(i: number, force: vec3, deltaTime: number): void {
        const torque = vec3.create();
        const segmentUp = vec3.fromValues(0, 1, 0);
        vec3.transformQuat(segmentUp, segmentUp, this.segmentRotations[i]);
        vec3.cross(torque, force, segmentUp);

        const torqueScale = (i / this.segments.length) * 0.5;
        vec3.scale(torque, torque, torqueScale);

        const angularAcceleration = vec3.create();
        vec3.scale(angularAcceleration, torque, 1 / this.mass);
        vec3.scaleAndAdd(
            this.angularVelocities[i],
            this.angularVelocities[i],
            angularAcceleration,
            deltaTime
        );
        vec3.scale(this.angularVelocities[i], this.angularVelocities[i], this.damping);

        const stiffnessTorque = vec3.create();
        vec3.scale(stiffnessTorque, this.segmentRotations[i], -this.stiffness);
        vec3.scaleAndAdd(
            this.angularVelocities[i],
            this.angularVelocities[i],
            stiffnessTorque,
            deltaTime
        );

        const rotationDelta = quat.create();
        quat.setAxisAngle(
            rotationDelta,
            this.angularVelocities[i],
            vec3.length(this.angularVelocities[i]) * deltaTime
        );
        quat.multiply(this.segmentRotations[i], rotationDelta, this.segmentRotations[i]);
        quat.normalize(this.segmentRotations[i], this.segmentRotations[i]);
    }

    private updateSegmentTransform(i: number): void {
        mat4.identity(this.segments[i].modelMatrix);

        const x = this.pos.x;
        const y = this.pos.y + 1.0;
        const z = this.pos.z;
        const position = vec3.fromValues(
            x + (i * this.segmentLength * Math.cos(this.rotationAngle)),
            y + (i * this.segmentLength * Math.cos(this.rotationAngle)),
            z
        );
        mat4.translate(
            this.segments[i].modelMatrix,
            this.segments[i].modelMatrix,
            position
        );

        const rotationMatrix = mat4.create();
        mat4.fromQuat(rotationMatrix, this.segmentRotations[i]);
        mat4.multiply(
            this.segments[i].modelMatrix,
            this.segments[i].modelMatrix,
            rotationMatrix
        );
        mat4.rotate(
            this.segments[i].modelMatrix,
            this.segments[i].modelMatrix,
            this.rotationAngle,
            this.rotationAxis
        );
        mat4.scale(
            this.segments[i].modelMatrix,
            this.segments[i].modelMatrix,
            [this.size.w, this.size.h, this.size.d]
        );
    }

    public async getBuffers(): Promise<EnvBufferData[] | undefined> {
        return this.segments;
    }

    public async update(deltaTime: number): Promise<void> {
        const force = this.windManager.getWindForce(deltaTime);

        for(let i = 0; i < this.segments.length; i++) {
            this.updateSegmentPhysics(i, force, deltaTime);
            this.updateSegmentTransform(i);
        }
    }

    public async init(): Promise<void> {
        const buffers = await this.loadAssets();

        for(let i = 0; i < this.segmentCount; i++) {
            const segment = await this.createWire(buffers, i)
            this.segments.push(segment);
            this.segmentRotations.push(quat.create());
            this.angularVelocities.push(vec3.create());
        }
    }
}