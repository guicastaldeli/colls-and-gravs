import { vec3 } from "../node_modules/gl-matrix/esm/index.js";
import { AmbientLight } from "./lightning/ambient-light";
import { DirectionalLight } from "./lightning/directional-light";

type LightType = 'ambient' | 'directional';
type Light = AmbientLight | DirectionalLight;

export class LightningManager {
    private device: GPUDevice;
    private lights: Map<string, { type: LightType, light: Light }> = new Map();
    private lightBuffers: Map<string, GPUBuffer> = new Map();
    public matrixBuffers: Map<string, GPUBuffer> = new Map();
    private uniformBuffer: GPUBuffer | null = null;

    constructor(device: GPUDevice) {
        this.device = device;
        this.initBuffer();
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
                'directional': 32
            }

            this.lightBuffers.set(
                id,
                this.device.createBuffer({
                    size: bufferSize[type],
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                })
            );

            this.matrixBuffers.set(
                id,
                this.device.createBuffer({
                    size: 64,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                })
            );
        }

        this.updateLightBuffer(id);
    }

    public getMatrixBuffer(id: string): GPUBuffer | null {
        return this.lightBuffers.get(id) ?? null;
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

        if(type === 'ambient') {
            const ambientLight = light as AmbientLight;
            data = new Float32Array(4);
            data.set(ambientLight.getColorWithIntensity(), 0);
            data[3] = ambientLight.intensity;
            if(data) this.device.queue.writeBuffer(buffer, 0, data);
        } 
        if(type === 'directional') {
            const directionalLight = light as DirectionalLight;
            const propBuffer = this.lightBuffers.get(id);
            const matrixBuffer = this.matrixBuffers.get(id);
            if(!propBuffer || !matrixBuffer) return;

            const direction = vec3.create();
            vec3.subtract(direction, directionalLight._target, directionalLight._position);
            vec3.normalize(direction, direction);

            const propData = new Float32Array(8);
            propData.set(direction, 0);
            propData.set(directionalLight._color, 3);
            propData[6] = directionalLight._intensity;
            propBuffer[7] = 0;
            this.device.queue.writeBuffer(propBuffer, 0, propData);

            const matrixData = new Float32Array(16);
            for(let i = 0; i < 16; i++) matrixData[i] = directionalLight.viewProjectionMatrix[i];
            if(data) this.device.queue.writeBuffer(matrixBuffer, 0, matrixData);
        }
    }

    public updateAllLightBuffers(): void {
        this.lights.forEach((_, id) => this.updateLightBuffer(id));
    }

    //Ambient Light
        public addAmbientLight(id: string, light: AmbientLight): void {
            this.addLight(id, 'ambient', light);
        }

        public getAmbientLight(id: string): AmbientLight | null {
            const light = this.lights.get(id);
            return light?.type === 'ambient' ? light.light as AmbientLight : null;
        }
    //

    //Directional Light
        public addDirectionalLight(id: string, light: DirectionalLight): void {
            if(this.lightBuffers.has(id) && this.matrixBuffers.has(id)) {
                this.addLight(id, 'directional', light);
            } else {
                this.lightBuffers.set(
                    id,
                    this.device.createBuffer({
                        size: 32,
                        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                    })
                );

                this.matrixBuffers.set(
                    id,
                    this.device.createBuffer({
                        size: 64,
                        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                    })
                );

                this.lights.set(id, { type: 'directional', light });
                this.updateLightBuffer(id);
            }
        }

        public getDirectionalLight(id: string): DirectionalLight | null {
            const light = this.lights.get(id);
            return light?.type === 'directional' ? light.light as DirectionalLight : null;
        }
    //
}