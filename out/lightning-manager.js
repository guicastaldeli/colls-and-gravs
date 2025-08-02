export class LightningManager {
    device;
    lights = new Map();
    lightBuffers = new Map();
    pointCountBuffer = null;
    pointStorageBuffer = null;
    uniformBuffer = null;
    constructor(device) {
        this.device = device;
        this.initBuffer();
        this.initPointLightBuffers();
    }
    initBuffer() {
        this.uniformBuffer = this.device.createBuffer({
            size: 256,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }
    addLight(id, type, light) {
        this.lights.set(id, { type, light });
        if (!this.lightBuffers.has(id)) {
            const bufferSize = {
                'ambient': 64,
                'directional': 32,
                'point': 64
            };
            this.lightBuffers.set(id, this.device.createBuffer({
                size: bufferSize[type],
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            }));
        }
        this.updateLightBuffer(id);
    }
    getLightBuffer(id) {
        return this.lightBuffers.get(id) ?? null;
    }
    getLight(id) {
        return this.lights.get(id)?.light || null;
    }
    updateLightBuffer(id) {
        const lightData = this.lights.get(id);
        const buffer = this.lightBuffers.get(id);
        if (!lightData || !buffer)
            return;
        const { type, light } = lightData;
        let data = null;
        switch (type) {
            case 'ambient':
                const ambientLight = light;
                data = new Float32Array(4);
                data.set(ambientLight.getColorWithIntensity(), 0);
                data[3] = ambientLight.intensity;
                this.device.queue.writeBuffer(buffer, 0, data);
                break;
            case 'directional':
                const directionalLight = light;
                this.device.queue.writeBuffer(buffer, 0, directionalLight.getShaderData());
                break;
            case 'point':
                const pointLight = light;
                data = pointLight.getBufferData();
                this.device.queue.writeBuffer(buffer, 0, data);
                break;
            default:
                return;
        }
    }
    updateAllLightBuffers() {
        this.lights.forEach((_, id) => this.updateLightBuffer(id));
    }
    //Lightning Group
    getLightningBindGroup(depthTexture, bindGroupLayout) {
        const ambientLightBuffer = this.getLightBuffer('ambient');
        const directionalLightBuffer = this.getLightBuffer('directional');
        if (!ambientLightBuffer || !directionalLightBuffer)
            throw new Error('ambient or directional err');
        return this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: ambientLightBuffer }
                },
                {
                    binding: 1,
                    resource: { buffer: directionalLightBuffer }
                }
            ]
        });
    }
    //Ambient Light
    addAmbientLight(id, light) {
        this.addLight(id, 'ambient', light);
    }
    //Directional Light
    addDirectionalLight(id, light) {
        this.addLight(id, 'directional', light);
    }
    //Point Light
    resizePointLightBuffer(capacity) {
        this.pointStorageBuffer?.destroy();
        this.pointStorageBuffer = this.device.createBuffer({
            size: 64 * capacity,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
    }
    initPointLightBuffers() {
        this.resizePointLightBuffer(4);
        this.pointCountBuffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: 'PointLightCount'
        });
    }
    updatePointLightBuffer() {
        const pointLights = this.getPointLights();
        const count = pointLights.length;
        if (count === 0) {
            console.error('err');
            return;
        }
        if (!this.pointStorageBuffer || !this.pointCountBuffer) {
            console.error('Point light buffers err');
            return;
        }
        const reqSize = 64 * count;
        const currentCapacity = this.pointStorageBuffer.size;
        if (reqSize > currentCapacity) {
            const newCapacity = Math.max(4, Math.ceil(count * 1.5));
            this.resizePointLightBuffer(newCapacity);
        }
        const lightData = new Float32Array(14 * count);
        pointLights.forEach((light, i) => {
            lightData.set(light.getBufferData(), i * 14);
        });
        if (this.pointStorageBuffer) {
            this.device.queue.writeBuffer(this.pointStorageBuffer, 0, lightData);
        }
        if (this.pointCountBuffer) {
            this.device.queue.writeBuffer(this.pointCountBuffer, 0, new Uint32Array([count]));
        }
    }
    getPointLightBindGroup(bindGroupLayout, depthTexture) {
        if (!this.pointStorageBuffer || !this.pointCountBuffer)
            return null;
        return this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.pointCountBuffer }
                },
                {
                    binding: 1,
                    resource: { buffer: this.pointStorageBuffer }
                },
                {
                    binding: 2,
                    resource: depthTexture.createView()
                },
                {
                    binding: 3,
                    resource: this.device.createSampler({ compare: 'less' })
                },
                {
                    binding: 4,
                    resource: { buffer: this.pointStorageBuffer }
                },
                {
                    binding: 5,
                    resource: { buffer: this.pointStorageBuffer }
                },
                {
                    binding: 6,
                    resource: { buffer: this.pointCountBuffer }
                },
                {
                    binding: 7,
                    resource: depthTexture.createView()
                },
                {
                    binding: 8,
                    resource: this.device.createSampler({ compare: 'less' })
                }
            ]
        });
    }
    getPointLights() {
        const pointLights = [];
        this.lights.forEach((value) => {
            if (value.type === 'point') {
                pointLights.push(value.light);
            }
        });
        return pointLights;
    }
    addPointLight(id, light) {
        this.addLight(id, 'point', light);
    }
}
