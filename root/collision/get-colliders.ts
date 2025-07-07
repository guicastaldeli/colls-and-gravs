import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { Collider, ICollidable } from "./collider.js";
import { EnvRenderer } from "../env/env-renderer.js";
import { RandomBlocks } from "../env/random-blocks/random-blocks.js";
import { CollisionResponse } from "./collider.js";

export type ColliderCollection = {
    type: string,
    colliders: {
        collider: Collider,
        position: vec3
    }[];
}

export class GetColliders {
    private envRenderer?: EnvRenderer;
    private randomBlocks?: RandomBlocks;

    constructor(
        envRenderer?: EnvRenderer,
        randomBlocks?: RandomBlocks
    ) {
        this.envRenderer = envRenderer;
        this.randomBlocks = randomBlocks;
    }

    private getColliders(): ColliderCollection[] {
        const colliders: ColliderCollection[] = [];
        
        if(this.envRenderer?.ground) {
            colliders.push({
                type: 'ground',
                colliders: this.envRenderer.ground.getAllColliders().map(data => ({
                    collider: data.collider,
                    position: data.position
                }))
            });
        }

        if(this.randomBlocks) {
            colliders.push({
                type: 'block',
                colliders: this.randomBlocks.getAllColliders().map(data => ({
                    collider: data.collider,
                    position: data.position
                }))
            });
        }

        return colliders;
    }

    public getCollidables(): ICollidable[] {
        const collidables = this.getColliders();
        if(!collidables) return [];

        return collidables.flatMap(c =>
            c.colliders.map(data => {
                const position = data.position ? vec3.clone(data.position) : vec3.create();

                return {
                    getCollider: () => data.collider,
                    getPosition: () => position,
                    getCollisionInfo: () => ({ 
                        type: c.type, 
                        position: vec3.clone(position) 
                    }),
                    onCollision: (other: ICollidable) => {
                        other.getCollisionInfo?.();
                    },
                    getCollisionResponse: () => CollisionResponse.BLOCK
                } as ICollidable;
            })
        );
    }

    public getCollidersMap(): { 
        collider: Collider,
        position: vec3,
        type: string
    }[] {
        const collidables = this.getColliders();
        if(!collidables) return [];

        return collidables.flatMap(c => 
            c.colliders.map(data => ({
                collider: data.collider,
                position: data.position,
                type: c.type
            }))
        );
    }
}