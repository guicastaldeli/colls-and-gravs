export class ResourceManager {
    device;
    resourcesToDestroy = new Set();
    texturesToDestroy = new Set();
    destroyedResources = new WeakSet();
    cleanupRequested = false;
    cleanupPromise = null;
    constructor(device) {
        this.device = device;
    }
    scheduleDestroy(resource) {
        if (this.destroyedResources.has(resource))
            return;
        if (resource instanceof GPUTexture) {
            this.texturesToDestroy.add(resource);
        }
        else {
            this.resourcesToDestroy.add(resource);
        }
        if (!this.cleanupRequested) {
            this.cleanupRequested = true;
            this.cleanupPromise = this.delayedCleanup();
        }
    }
    async delayedCleanup() {
        await new Promise(res => requestAnimationFrame(res));
        await new Promise(res => requestAnimationFrame(res));
        await this.cleanup();
    }
    async cleanup() {
        this.cleanupRequested = false;
        try {
            await this.device.queue.onSubmittedWorkDone();
            const buffersToDestroy = Array.from(this.resourcesToDestroy);
            this.resourcesToDestroy.clear();
            for (const buffer of buffersToDestroy) {
                try {
                    if (!this.destroyedResources.has(buffer)) {
                        buffer.destroy();
                        this.destroyedResources.add(buffer);
                    }
                }
                catch (err) {
                    console.warn(err);
                }
            }
            const texturesToDestroy = Array.from(this.texturesToDestroy);
            this.texturesToDestroy.clear();
            for (const texture of texturesToDestroy) {
                try {
                    if (!this.destroyedResources.has(texture)) {
                        texture.destroy();
                        this.destroyedResources.add(texture);
                    }
                }
                catch (err) {
                    console.warn(err);
                }
            }
            this.resourcesToDestroy.clear();
            this.texturesToDestroy.clear();
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async waitCleanup() {
        if (this.cleanupPromise)
            await this.cleanupPromise;
    }
}
