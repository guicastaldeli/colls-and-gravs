import { mat4 } from "../node_modules/gl-matrix/esm/index.js";
import { EnvBufferData } from "./env/env-buffers";

export class Loader {
    private device: GPUDevice;

    private vertices: number[] = [];
    private colors: number[] = [];
    private indices: number[] = [];
    private positions: number[] = [];
    private normals: number[] = [];
    private coords: number[]= [];
    private objIndices: number[] = [];

    constructor(device: GPUDevice) {
        this.device = device;
        this.parser(device)
    }

    public async parser(device: GPUDevice, url?: string): Promise<void> {
        const res = await fetch(url!);
        const text = await res.text();
        const lines = text.split('\n');

        for(const line of lines) {
            const parts = line.trim().split(/\s+/);
            if(parts[0] === 'v') {
                this.positions.push(parseFloat(parts[1])), 
                this.positions.push(parseFloat(parts[2])),
                this.positions.push(parseFloat(parts[3]))
            } else if(parts[0] === 'vn') {
                this.normals.push(parseFloat(parts[1])),
                this.normals.push(parseFloat(parts[2])),
                this.normals.push(parseFloat(parts[3]));
            } else if(parts[0] === 'vt') {
                this.coords.push(parseFloat(parts[1])),
                this.coords.push(parseFloat(parts[2]));
            } else if(parts[0] === 'f') {
                for(let i = 1; i < parts.length; i++) {
                    const faceParts = parts[i].split('/');
                    const vertexIndex = parseInt(faceParts[0]) - 1;
                    this.objIndices.push(vertexIndex);
                }
            }
        }

        this.createBuffers(this.device);
    }

    private async createBuffers(device: GPUDevice): Promise<EnvBufferData> {
        //Vertex
        const vertexBuffer = device.createBuffer({
            size: this.positions.length * 4,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        new Float32Array(vertexBuffer.getMappedRange()).set(this.positions);
        vertexBuffer.unmap();

        //Color
        const colorData = new Float32Array(this.positions.length);

        for(let i = 0; i < colorData.length; i += 3) {
            colorData[i] = 0.5;
            colorData[i + 1] = 0.5;
            colorData[i + 2] = 0.5;
        }

        const colorBuffer = device.createBuffer({
            size: colorData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        new Float32Array(colorBuffer.getMappedRange()).set(colorData);
        colorBuffer.unmap();

        //Index
        const indexBuffer = device.createBuffer({
            size: this.objIndices.length * 2,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        new Uint16Array(indexBuffer.getMappedRange()).set(this.objIndices);

        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, [0, 0, 0]);
        mat4.scale(modelMatrix, modelMatrix, [0, 0, 0]);

        return {
            vertex: vertexBuffer,
            color: colorBuffer,
            index: indexBuffer,
            indexCount: this.objIndices.length,
            modelMatrix: modelMatrix
        }
    }
}