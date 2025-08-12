import { mat3, mat4, vec3, quat } from "../../../../../node_modules/gl-matrix/esm/index.js";
import { EnvBufferData } from "../../../env-buffers.js";
import { Loader } from "../../../../loader.js";
import { ShaderLoader } from "../../../../shader-loader.js";

export class LaserProjectile {
    private device: GPUDevice;
    private loader: Loader;
    private shaderLoader: ShaderLoader;

    private modelMatrix: mat4 = mat4.create();
    private normalMatrix: mat3 = mat3.create();
    private model: any;
    private texture!: GPUTexture;
    private isLoaded: boolean = false;

    private position: vec3;
    private direction: vec3;
    private speed: number = 20.0;
    private maxDistance: number = 50.0;
    private distanceTraveled: number = 0.0;

    private size = {
        w: 1.0,
        h: 1.0,
        d: 1.0
    }

    constructor(
        device: GPUDevice,
        loader: Loader,
        shaderLoader: ShaderLoader,
        position: vec3,
        direction: vec3
    ) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.position = vec3.clone(position);
        this.direction = vec3.normalize(vec3.create(), direction);
        this.modelMatrix = mat4.create();
        this.normalMatrix = mat3.create();
        this.loadAssets();
    }

    private async loadAssets(): Promise<void> {
        try {
            const [model, texture] = await Promise.all([
                this.loader.parser('./assets/env/obj/laser.obj'),
                this.loader.textureLoader('./assets/env/textures/laser.png')
            ]);

            this.model = model;
            this.texture = texture;
            this.isLoaded = true;
        } catch(err) {
            console.error(err);
        }
    }

    public async getBuffers(): Promise<EnvBufferData | undefined> {
        if(!this.isLoaded || !this.model || !this.texture) return undefined;

        return {
            vertex: this.model.vertex,
            color: this.model.color,
            index: this.model.index,
            indexCount: this.model.indexCount,
            modelMatrix: this.modelMatrix,
            normalMatrix: this.normalMatrix,
            texture: this.texture,
            sampler: this.loader.createSampler(),
            isLamp: [0.0, 0.0, 0.0]
        }
    }

    public isExpired(): boolean {
        return this.distanceTraveled >= this.maxDistance;
    }

    public async update(deltaTime: number): Promise<void> {
        if(!this.isLoaded) return;

        const movement = vec3.scale(vec3.create(), this.direction, this.speed * deltaTime);
        vec3.add(this.position, this.position, movement);
        this.distanceTraveled += vec3.length(movement);

        mat4.identity(this.modelMatrix);
        mat4.translate(this.modelMatrix, this.modelMatrix, this.position);

        const up = vec3.fromValues(0, 1, 0);
        const rotationMatrix = mat4.create();

        mat4.targetTo(
            rotationMatrix,
            vec3.fromValues(0, 0, 0),
            this.direction,
            up
        );
        mat4.multiply(
            this.modelMatrix,
            this.modelMatrix,
            rotationMatrix
        );
        mat4.rotateY(
            this.modelMatrix,
            this.modelMatrix,
            Math.PI / 2
        );
        mat4.scale(
            this.modelMatrix,
            this.modelMatrix,
            [this.size.w, this.size.h, this.size.d]
        );
        mat3.normalFromMat4(this.normalMatrix, this.modelMatrix);
    }
}