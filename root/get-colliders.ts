import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";
import { Collider } from "./collider.js";
import { EnvRenderer } from "./env/env-renderer.js";

export type ColliderCollection = {
    type: string,
    colliders: {
        collider: Collider,
        position: vec3
    }[];
}

export class GetColliders {
    private envRenderer: EnvRenderer;

    constructor(
        envRenderer: EnvRenderer,
    ) {
        this.envRenderer = envRenderer;
    }

    private getColliders(): ColliderCollection[] {
        const colliders: ColliderCollection[] = [
            {
                type: 'ground',
                colliders: this.envRenderer.ground.getAllColliders()
            },
        ];

        return colliders;
    }

    public getCollidersMap(): { 
        collider: Collider,
        position: vec3
    }[] {
        return this.getColliders().flatMap(c => c.colliders);
    }
}