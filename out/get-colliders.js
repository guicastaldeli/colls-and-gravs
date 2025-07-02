export class GetColliders {
    envRenderer;
    randomBlocks;
    constructor(envRenderer, randomBlocks) {
        this.envRenderer = envRenderer;
        this.randomBlocks = randomBlocks;
    }
    getColliders() {
        const colliders = [
            {
                type: 'ground',
                colliders: this.envRenderer.ground.getAllColliders()
            },
            {
                type: 'blocks',
                colliders: this.randomBlocks.getAllColliders()
            }
        ];
        return colliders;
    }
    getCollidersMap() {
        return this.getColliders().flatMap(c => c.colliders);
    }
}
