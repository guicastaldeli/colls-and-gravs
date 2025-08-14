import { mat3, mat4, vec3 } from "../../../../../node_modules/gl-matrix/esm/index.js";
export class LaserProjectile {
    device;
    loader;
    shaderLoader;
    modelMatrix = mat4.create();
    normalMatrix = mat3.create();
    model;
    texture;
    isLoaded = false;
    position;
    direction;
    speed = 20.0;
    maxDistance = 50.0;
    distanceTraveled = 0.0;
    size = {
        w: 1.0,
        h: 1.0,
        d: 1.0
    };
    constructor(device, loader, shaderLoader, position, direction) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.position = vec3.clone(position);
        this.direction = vec3.normalize(vec3.create(), direction);
        this.modelMatrix = mat4.create();
        this.normalMatrix = mat3.create();
        this.loadAssets();
    }
    async loadAssets() {
        try {
            const [model, texture] = await Promise.all([
                this.loader.parser('./.assets/env/obj/laser.obj'),
                this.loader.textureLoader('./.assets/env/textures/laser.png')
            ]);
            this.model = model;
            this.texture = texture;
            this.isLoaded = true;
        }
        catch (err) {
            console.error(err);
        }
    }
    async getBuffers() {
        if (!this.isLoaded || !this.model || !this.texture)
            return undefined;
        return {
            vertex: this.model.vertex,
            color: this.model.color,
            index: this.model.index,
            indexCount: this.model.indexCount,
            modelMatrix: this.modelMatrix,
            normalMatrix: this.normalMatrix,
            texture: this.texture,
            sampler: this.loader.createSampler(),
            isLamp: [0.0, 0.0, 0.0],
            isEmissive: [1.0, 1.0, 1.0]
        };
    }
    isExpired() {
        return this.distanceTraveled >= this.maxDistance;
    }
    async update(deltaTime) {
        if (!this.isLoaded)
            return;
        const movement = vec3.scale(vec3.create(), this.direction, this.speed * deltaTime);
        vec3.add(this.position, this.position, movement);
        this.distanceTraveled += vec3.length(movement);
        mat4.identity(this.modelMatrix);
        mat4.translate(this.modelMatrix, this.modelMatrix, this.position);
        const up = vec3.fromValues(0, 1, 0);
        const rotationMatrix = mat4.create();
        mat4.targetTo(rotationMatrix, vec3.fromValues(0, 0, 0), this.direction, up);
        mat4.multiply(this.modelMatrix, this.modelMatrix, rotationMatrix);
        mat4.rotateY(this.modelMatrix, this.modelMatrix, Math.PI / 2);
        mat4.scale(this.modelMatrix, this.modelMatrix, [this.size.w, this.size.h, this.size.d]);
        mat3.normalFromMat4(this.normalMatrix, this.modelMatrix);
    }
}
