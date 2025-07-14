import { vec3 } from "../node_modules/gl-matrix/esm/index.js";
import { AmbientLight } from "./lightning/ambient-light";
import { DirectionalLight } from "./lightning/directional-light";
import { PointLight } from "./lightning/point-light.js";

type LightType = 'ambient' | 'directional' | 'point';
type Light = AmbientLight | DirectionalLight | PointLight;

export class LightningManager {
    private device: GPUDevice;
    private lights: Map<string, { type: LightType, light: Light }> = new Map();
    private lightBuffers: Map<string, GPUBuffer> = new Map();
    public pointCountBuffer: GPUBuffer | null = null;
    public pointStorageBuffer: GPUBuffer | null = null;
    private uniformBuffer: GPUBuffer | null = null;

    constructor(device: GPUDevice) {
        this.device = device;
        this.initBuffer();
        this.initPointLightBuffers();
    }

    private initBuffer(): void {
        this.uniformBuffer = this.device.createBuffer({
            size: 256,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }

    public addLight(
        id: string,
        type: LightType,
        light: Light
    ): void {
        this.lights.set(id, { type, light });

        if(!this.lightBuffers.has(id)) {
            const bufferSize = {
                'ambient': 16,
                'directional': 32,
                'point': 48
            }

            this.lightBuffers.set(
                id,
                this.device.createBuffer({
                    size: bufferSize[type],
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                })
            );
        }

        this.updateLightBuffer(id);
    }

    public getLightBuffer(id: string): GPUBuffer | null {
        return this.lightBuffers.get(id) ?? null;
    }

    public getLight(id: string): Light | null {
        return this.lights.get(id)?.light || null;
    }

    public updateLightBuffer(id: string): void {
        const lightData = this.lights.get(id);
        const buffer = this.lightBuffers.get(id);
        if(!lightData || !buffer) return;

        const { type, light } = lightData;
        let data: Float32Array | null = null;

        switch(type) {
            case 'ambient':
                const ambientLight = light as AmbientLight;
                data = new Float32Array(4);
                data.set(ambientLight.getColorWithIntensity(), 0);
                data[3] = ambientLight.intensity;
                this.device.queue.writeBuffer(buffer, 0, data);
                break;
            case 'directional':
                const directionalLight = light as DirectionalLight;
                this.device.queue.writeBuffer(buffer, 0, directionalLight.getShaderData());
                break;
            case 'point':
                const pointLight = light as PointLight;
                data = pointLight.getBufferData();
                this.device.queue.writeBuffer(buffer, 0, data);
                break;
            default:
                return; 
        }
    }

    public updateAllLightBuffers(): void {
        this.lights.forEach((_, id) => this.updateLightBuffer(id));
    }

    //Ambient Light
    public addAmbientLight(id: string, light: AmbientLight): void {
        this.addLight(id, 'ambient', light);
    }

    //Directional Light
    public addDirectionalLight(id: string, light: DirectionalLight): void {
        this.addLight(id, 'directional', light);
    }

    //Point Light
        private resizePointLightBuffer(capacity: number): void {
            this.pointStorageBuffer?.destroy();
            this.pointStorageBuffer = this.device.createBuffer({
                size: 48 * capacity,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
        }

        private initPointLightBuffers(): void {
            this.resizePointLightBuffer(4);

            this.pointCountBuffer = this.device.createBuffer({
                size: 4,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                label: 'PointLightCount'
            });
        }

        public updatePointLightBuffer(): void {
            const pointLights = this.getPointLights();
            const count = pointLights.length;
            if(count === 0) {
                console.error('err');
                return;
            }

            if(!this.pointStorageBuffer || !this.pointCountBuffer) {
                console.error('Point light buffers err');
                return;
            }

            const reqSize = 48 * count;
            const currentCapacity = this.pointStorageBuffer.size;
            if(reqSize > currentCapacity) {
                const newCapacity = Math.max(4, Math.ceil(count * 1.5));
                this.resizePointLightBuffer(newCapacity);
            }

            const lightData = new Float32Array(12 * count);
            pointLights.forEach((light, i) => {
                lightData.set(light.getBufferData(), i * 12);
            });

            if(this.pointStorageBuffer) {
                this.device.queue.writeBuffer(
                    this.pointStorageBuffer,
                    0,
                    lightData
                );
            }

            if(this.pointCountBuffer) {
                this.device.queue.writeBuffer(
                    this.pointCountBuffer,
                    0,
                    new Uint32Array([count])
                );
            }
        }

        public getPointLightBindGroup(pipeline: GPURenderPipeline): GPUBindGroup | null {
            if(!this.pointStorageBuffer || !this.pointCountBuffer) return null;
            const layout = pipeline.getBindGroupLayout(3);

            return this.device.createBindGroup({
                layout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: this.pointCountBuffer }
                    },
                    {
                        binding: 1,
                        resource: { buffer: this.pointStorageBuffer }
                    }
                ]
            })
        }

        public getPointLights(): PointLight[] {
            const pointLights: PointLight[] = [];
            this.lights.forEach((value) => {
                if(value.type === 'point') {
                    pointLights.push(value.light as PointLight);
                }
            });

            return pointLights;
        }

        public addPointLight(id: string, light: PointLight): void {
            this.addLight(id, 'point', light);
        }
    //
}