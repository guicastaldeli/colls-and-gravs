import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { initBuffers } from "./random-blocks-buffer.js";
import { BoxCollider } from "../collider.js";
export class RandomBlocks {
    device;
    loader;
    blocks = [];
    _Colliders = [];
    lastMouseClickTime = 0;
    clickCooldown = 0;
    keyPressed = false;
    constructor(device, loader) {
        this.device = device;
        this.loader = loader;
    }
    getBlocks() {
        return this.blocks;
    }
    getColliders() {
        return this.blocks.map(block => ({
            getCollider: () => block.collider,
            getPosition: () => block.position
        }));
    }
    async addBlock(position) {
        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, position);
        const model = await this.loader.parser('./assets/env/obj/smile.obj');
        const texture = await this.loader.textureLoader('./assets/env/textures/smile.png');
        const sampler = this.loader.createSampler();
        const collider = new BoxCollider([1, 1, 1], [position[0], position[1], position[2]]);
        const { vertex, color, index, indexCount } = await initBuffers(this.device);
        this.blocks.push({
            modelMatrix,
            position: vec3.clone(position),
            collider,
            vertex: model.vertex,
            color: model.color,
            index: model.index,
            indexCount: model.indexCount,
            texture,
            sampler
        });
        this._Colliders.push(collider);
    }
    removeBlock(i) {
        if (i >= 0 && i < this.blocks.length) {
            this.blocks.splice(i, 1);
            this._Colliders.splice(i, 1);
        }
    }
    removeBlockRaycaster(playerController) {
        const maxDistance = 5;
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();
        let closestBlock = null;
        for (let i = 0; i < this.blocks.length; i++) {
            const block = this.blocks[i];
            const toBlock = vec3.create();
            vec3.sub(toBlock, block.position, rayOrigin);
            const distance = vec3.length(toBlock);
            if (distance <= maxDistance) {
                const direction = vec3.clone(toBlock);
                vec3.normalize(direction, direction);
                const dot = vec3.dot(rayDirection, direction);
                if (dot < 0.98) {
                    if (!closestBlock || distance < closestBlock.distance) {
                        closestBlock = {
                            i,
                            distance
                        };
                    }
                }
            }
        }
        if (closestBlock) {
            const blockCollidable = {
                getCollider: () => this.blocks[this.blocks.length - 1].collider,
                getPosition: () => this.blocks[this.blocks.length - 1].position,
            };
            this.removeBlock(closestBlock.i);
            playerController.removeCollidable(blockCollidable);
        }
    }
    async addBlocksRaycaster(playerController, hud) {
        const distance = 5;
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();
        const targetPos = hud.getCrosshairWorldPos(rayOrigin, rayDirection, distance);
        const maxDistance = 10;
        const step = 0.1;
        let lastEmptyPos = null;
        let currentDitance = 0;
        while (currentDitance <= maxDistance) {
            const checkPos = vec3.create();
            vec3.scaleAndAdd(checkPos, rayOrigin, rayDirection, currentDitance);
            const blockPos = vec3.create();
            blockPos[0] = Math.round(targetPos[0] + 2);
            blockPos[1] = Math.round(targetPos[1] - 1);
            blockPos[2] = Math.round(targetPos[2]);
            let positionOccupied = false;
            for (const block of this.blocks) {
                if (vec3.distance(blockPos, block.position) < 0.1) {
                    positionOccupied = true;
                    break;
                }
            }
            if (!positionOccupied) {
                await this.addBlock(blockPos);
                const newBlockCollidable = {
                    getCollider: () => this.blocks[this.blocks.length - 1].collider,
                    getPosition: () => this.blocks[this.blocks.length - 1].position,
                };
                playerController.addCollidable(newBlockCollidable);
                return;
            }
            currentDitance += step;
        }
        if (lastEmptyPos) {
            await this.addBlock(lastEmptyPos);
            const newBlockCollidable = {
                getCollider: () => this.blocks[this.blocks.length - 1].collider,
                getPosition: () => this.blocks[this.blocks.length - 1].position,
            };
            playerController.addCollidable(newBlockCollidable);
        }
    }
    initListeners(canvas, playerController, hud) {
        const cameraPos = playerController.getCameraPosition();
        const cameraForward = playerController.getForward();
        document.addEventListener('click', async (e) => {
            const eKey = e.button;
            if (eKey === 0)
                await this.addBlocksRaycaster(playerController, hud);
            if (eKey === 2)
                this.removeBlockRaycaster(playerController);
        });
        canvas.addEventListener('click', (e) => {
            if (e.button === 2) {
                const now = performance.now();
                if (now - this.lastMouseClickTime < this.clickCooldown)
                    return;
                this.lastMouseClickTime = now;
                let closestBlock = null;
                for (let i = 0; i < this.blocks.length; i++) {
                    const block = this.blocks[i];
                    const distance = vec3.distance(cameraPos, block.position);
                    const direction = vec3.create();
                    vec3.subtract(direction, block.position, cameraPos);
                    vec3.normalize(direction, direction);
                    const dot = vec3.dot(cameraForward, direction);
                    if (dot > 0.98 && distance < 5) {
                        if (!closestBlock || distance < closestBlock.distance) {
                            const blockCollidable = {
                                getCollider: () => block.collider,
                                getPosition: () => block.position,
                            };
                            closestBlock = {
                                i,
                                distance,
                                collidable: blockCollidable
                            };
                        }
                    }
                }
                if (closestBlock) {
                    this.removeBlock(closestBlock.i);
                    playerController.removeCollidable(closestBlock.collidable);
                }
            }
        });
    }
    init(canvas, playerController, hud) {
        this.initListeners(canvas, playerController, hud);
    }
}
