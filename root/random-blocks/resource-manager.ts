export class ResourceManager {
    private device: GPUDevice;
    private resourcesToDestroy: Set<GPUBuffer> = new Set();
    private texturesToDestroy: Set<GPUTexture> = new Set();
    private destroyedResources: WeakSet<GPUBuffer | GPUTexture> = new WeakSet();

    private cleanupRequested: boolean = false;
    private cleanupPromise: Promise<void> | null = null;

    constructor(device: GPUDevice) {
        this.device = device;
    }

    public scheduleDestroy(resource: GPUBuffer | GPUTexture): void {
        if(this.destroyedResources.has(resource)) return;

        if(resource instanceof GPUTexture) {
            this.texturesToDestroy.add(resource);
        } else {
            this.resourcesToDestroy.add(resource);
        }

        if(!this.cleanupRequested) {
            this.cleanupRequested = true;
            this.cleanupPromise = this.delayedCleanup();
        }
    }

    private async delayedCleanup(): Promise<void> {
        await new Promise(res => requestAnimationFrame(res));
        await new Promise(res => requestAnimationFrame(res));
        await this.cleanup();
    }

    public async cleanup(): Promise<void> {
        this.cleanupRequested = false;

        try {
            await this.device.queue.onSubmittedWorkDone();
            
            const buffersToDestroy = Array.from(this.resourcesToDestroy);
            this.resourcesToDestroy.clear();
    
            for(const buffer of buffersToDestroy) {
                try {
                    if(!this.destroyedResources.has(buffer)) {
                        buffer.destroy();
                        this.destroyedResources.add(buffer);
                    }
                } catch(err) {
                    console.warn(err);
                }
            }

            const texturesToDestroy = Array.from(this.texturesToDestroy);
            this.texturesToDestroy.clear();

            for(const texture of texturesToDestroy) {
                try {
                    if(!this.destroyedResources.has(texture)) {
                        texture.destroy();
                        this.destroyedResources.add(texture);
                    }
                } catch(err) {
                    console.warn(err);
                }
            }
            this.resourcesToDestroy.clear();
            this.texturesToDestroy.clear();
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    public async waitCleanup(): Promise<void> {
        if(this.cleanupPromise) await this.cleanupPromise;
    }
}