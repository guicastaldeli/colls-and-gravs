import { mat4 } from "../node_modules/gl-matrix/esm/index.js";
export class Loader {
    device;
    vertices = [];
    colors = [];
    indices = [];
    positions = [];
    normals = [];
    coords = [];
    objIndices = [];
    indexMap = {};
    textureUrl = '';
    constructor(device) {
        this.device = device;
        this.createSampler();
    }
    async parser(url) {
        const res = await fetch(url);
        const text = await res.text();
        const lines = text.split('\n');
        let indexCounter = 0;
        this.vertices = [];
        this.positions = [];
        this.normals = [];
        this.coords = [];
        this.objIndices = [];
        this.indexMap = {};
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length === 0)
                continue;
            if (parts[0] === 'v') {
                this.positions.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
            }
            else if (parts[0] === 'vn') {
                this.normals.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
            }
            else if (parts[0] === 'vt') {
                this.coords.push(parseFloat(parts[1]), 1.0 - parseFloat(parts[2]));
            }
            else if (parts[0] === 'f') {
                if (parts.length === 4) {
                    const triIndices = [];
                    for (let i = 1; i <= 3; i++) {
                        const faceParts = parts[i].split('/');
                        const vIdx = parseInt(faceParts[0]) - 1;
                        const tIdx = faceParts[1] ? parseInt(faceParts[1]) - 1 : -1;
                        const nIdx = faceParts[2] ? parseInt(faceParts[2]) - 1 : -1;
                        const key = `${vIdx}|${tIdx}|${nIdx}`;
                        if (!(key in this.indexMap)) {
                            this.indexMap[key] = indexCounter++;
                            const posIndex = vIdx * 3;
                            this.vertices.push(this.positions[posIndex], this.positions[posIndex + 1], this.positions[posIndex + 2]);
                            const texIndex = Math.min(tIdx, this.coords.length / 2 - 1) * 2;
                            this.vertices.push(this.coords[texIndex] || 0, this.coords[texIndex + 1] || 0);
                            const normIndex = Math.min(nIdx, this.normals.length / 3 - 1) * 3;
                            this.vertices.push(this.normals[normIndex] || 0, this.normals[normIndex + 1] || 1, this.normals[normIndex + 2] || 0);
                        }
                        triIndices.push(this.indexMap[key]);
                    }
                    this.objIndices.push(triIndices[0], triIndices[1], triIndices[2]);
                }
                else if (parts.length === 5) {
                    const quadIndices = [];
                    for (let i = 1; i <= 4; i++) {
                        const faceParts = parts[i].split('/');
                        const vIdx = parseInt(faceParts[0]) - 1;
                        const tIdx = faceParts[1] ? parseInt(faceParts[1]) - 1 : 0;
                        const nIdx = faceParts[2] ? parseInt(faceParts[2]) - 1 : 0;
                        const key = `${vIdx}|${tIdx}|${nIdx}`;
                        if (!(key in this.indexMap)) {
                            this.indexMap[key] = indexCounter++;
                            const posIndex = vIdx * 3;
                            this.vertices.push(this.positions[posIndex], this.positions[posIndex + 1], this.positions[posIndex + 2]);
                            const texIndex = Math.min(tIdx, this.coords.length / 2 - 1) * 2;
                            this.vertices.push(this.coords[texIndex] || 0, this.coords[texIndex + 1] || 0);
                            const normIndex = Math.min(nIdx, this.normals.length / 3 - 1) * 3;
                            this.vertices.push(this.normals[normIndex] || 0, this.normals[normIndex + 1] || 1, this.normals[normIndex + 2] || 0);
                        }
                        quadIndices.push(this.indexMap[key]);
                    }
                    this.objIndices.push(quadIndices[0], quadIndices[1], quadIndices[2]);
                    this.objIndices.push(quadIndices[0], quadIndices[2], quadIndices[3]);
                }
            }
        }
        return this.createBuffers(this.device);
    }
    createDefaultTex() {
        const texture = this.device.createTexture({
            size: [1, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        });
        const data = new Uint8Array([0, 0, 0, 0]);
        this.device.queue.writeTexture({ texture }, data, { bytesPerRow: 4 }, [1, 1]);
        return texture;
    }
    async textureLoader(url) {
        try {
            if (!url || url.trim() === '')
                throw new Error('Texture URL is empty');
            const res = await fetch(url);
            if (!res.ok)
                throw new Error(`Failed to fetch texture: ${res.status} ${res.statusText}`);
            const blob = await res.blob();
            if (blob.size === 0)
                throw new Error('Empty texture file received');
            let imgBitmap;
            try {
                imgBitmap = await createImageBitmap(blob, {
                    imageOrientation: 'flipY',
                    premultiplyAlpha: 'none',
                    colorSpaceConversion: 'default'
                });
            }
            catch (err) {
                throw new Error(`Failed to decode image: ${err}`);
            }
            const texture = this.device.createTexture({
                size: [imgBitmap.width, imgBitmap.height],
                format: 'rgba8unorm',
                usage: GPUTextureUsage.TEXTURE_BINDING |
                    GPUTextureUsage.COPY_DST |
                    GPUTextureUsage.RENDER_ATTACHMENT
            });
            this.device.queue.copyExternalImageToTexture({ source: imgBitmap }, { texture }, [imgBitmap.width, imgBitmap.height]);
            return texture;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    createSampler() {
        return this.device.createSampler({
            magFilter: 'nearest',
            minFilter: 'nearest',
            addressModeU: 'repeat',
            addressModeV: 'repeat'
        });
    }
    setTextureUrl(url) {
        this.textureUrl = url;
    }
    async createBuffers(device) {
        //Vertex
        const vertexArray = new Float32Array(this.vertices);
        const vertexBuffer = device.createBuffer({
            size: vertexArray.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(vertexBuffer.getMappedRange()).set(vertexArray);
        vertexBuffer.unmap();
        //Color
        const colorData = new Float32Array(this.positions.length);
        for (let i = 0; i < colorData.length; i += 3) {
            colorData[i] = 0.8;
            colorData[i + 1] = 0.6;
            colorData[i + 2] = 0.4;
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
            size: this.objIndices.length * 4,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint16Array(indexBuffer.getMappedRange()).set(this.objIndices);
        indexBuffer.unmap();
        //Texture
        let texture = this.createDefaultTex();
        let sampler = this.createSampler();
        if (this.textureUrl && this.textureUrl.trim() !== '') {
            try {
                texture = this.textureUrl ? await this.textureLoader(this.textureUrl) : this.createDefaultTex();
                sampler = this.createSampler();
            }
            catch (err) {
                console.warn(err);
            }
        }
        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, [0, 0, 0]);
        mat4.scale(modelMatrix, modelMatrix, [0, 0, 0]);
        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        return {
            vertex: vertexBuffer,
            color: colorBuffer,
            index: indexBuffer,
            indexCount: this.objIndices.length,
            modelMatrix: modelMatrix,
            normalMatrix: normalMatrix,
            texture: texture,
            sampler: sampler,
            indexData: new Uint16Array(this.objIndices),
            isLamp: [0.0, 0.0, 0.0],
            isEmissive: [0.0, 0.0, 0.0]
        };
    }
}
