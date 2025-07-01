export class GetColliders {
    envRenderer;
    constructor(envRenderer) {
        this.envRenderer = envRenderer;
    }
    getColliders() {
        const colliders = [{
                type: 'ground',
                colliders: this.envRenderer.ground.getAllColliders()
            }];
        return colliders;
    }
    getCollidersMap() {
        return this.getColliders().flatMap(c => c.colliders);
    }
}
