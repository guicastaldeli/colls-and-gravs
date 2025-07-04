import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";

import { ICollidable } from "../collider.js";
import { PhysicsObject } from "./physics-object.js";

export class PhysicsSystem {
    private gravity: number = 9.8;
    private collidables: ICollidable[] = [];
    private physicsObjects: PhysicsObject[] = [];
    private fixedTimestep: number = 1/60;

    public addPhysicsObject(obj: PhysicsObject): void {
        if(!obj || !obj.position || obj.position.some(isNaN)) {
            console.error('Attempt to add invalid');
        }
        
        if(!obj.velocity || obj.velocity.some(isNaN)) {
            console.warn('Physics object jas invalid velocity');
            obj.velocity = vec3.create();
        }

        this.physicsObjects.push(obj);
    }

    public removePhysicsObject(obj: PhysicsObject): void {
        const i = this.physicsObjects.indexOf(obj);
        if(i !== -1) this.physicsObjects.slice(i, 1);
    }

    public setCollidables(collidables: ICollidable[]): void {
        this.collidables = collidables;
    }

    public calculateCollisionNormal(
        obj: PhysicsObject,
        other: ICollidable,
        otherPosition: vec3
    ): vec3 {
        const objBBox = obj.getCollider().getBoundingBox(obj.position);
        const otherBBox = other.getCollider().getBoundingBox(otherPosition);
        const normal = vec3.create();

        const penX = Math.min(
            objBBox.max[0] - otherBBox.min[0],
            otherBBox.max[0] - objBBox.min[0]
        );
        const penY = Math.min(
            objBBox.max[1] - otherBBox.min[1],
            otherBBox.max[1] - objBBox.min[1]
        );
        const penZ = Math.min(
            objBBox.max[2] - otherBBox.min[2],
            otherBBox.max[2] - objBBox.min[2]
        );

        if(penX < penY && penX < penZ) {
            normal[0] = obj.position[0] < otherPosition[0] ? -1 : 1;
        } else if(penY < penX && penY < penZ) {
            normal[1] = obj.position[1] < otherPosition[1] ? -1 : 1;
        } else {
            normal[2] = obj.position[2] < otherPosition[2] ? -1 : 1;
        }

        const minPen = Math.min(penX, penY, penZ);

        if(minPen === penX) {
            normal[0] = obj.position[0] < otherPosition[0] ? -1 : 1;
        } else if(minPen === penY) {
            normal[1] = obj.position[1] < otherPosition[1] ? -1 : 1;
        } else {
            normal[2] = obj.position[2] < otherPosition[2] ? -1 : 1;
        }

        if(vec3.length(normal) < 0.001 || normal.some(isNaN)) vec3.set(normal, 0, 1, 0);
        vec3.normalize(normal, normal);
        return normal;
    }

    private resolveCollisions(obj: PhysicsObject): void {
        if(!obj || !obj.getCollider) return;
        
        for(const other of this.collidables) {
            if(other === obj) continue;

            const collider = obj.getCollider();
            const otherCollider = other.getCollider();
            const otherPosition = other.getPosition();

            if(collider.checkCollision(otherCollider)) {
                const response = this.calculateCollisionResponse(obj, other, otherPosition);
                obj.position = response.newPosition;
                obj.velocity = response.newVelocity;

                const normal = this.calculateCollisionNormal(obj, other, otherPosition);
                this.applyFriction(obj, normal, this.fixedTimestep);
            }
        }
    }

    private calculateCollisionResponse(
        obj: PhysicsObject,
        other: ICollidable,
        otherPosition: vec3
    ): {
        newPosition: vec3,
        newVelocity: vec3
    } {
        if(obj.position.some(isNaN) || otherPosition.some(isNaN)) {
            console.error('NaN detected in collision!');
            return {
                newPosition: obj.position,
                newVelocity: obj.velocity
            }
        }

        if(!obj || !other || !otherPosition || !obj.position || !obj.velocity) {
            return {
                newPosition: vec3.clone(obj?.position || [0, 0, 0]),
                newVelocity: vec3.clone(obj?.velocity || [0, 0, 0])
            }
        }

        const otherObj = other as PhysicsObject;
        const normal = this.calculateCollisionNormal(obj, other, otherPosition);

        const otherVel = otherObj?.velocity ? vec3.clone(otherObj.velocity) : vec3.create();
        const relativeVel = vec3.sub(vec3.create(), obj.velocity, otherVel);
        const velAlongNormal = vec3.dot(relativeVel, normal);

        if(velAlongNormal > 0) {
            return {
                newPosition: vec3.clone(obj.position),
                newVelocity: vec3.clone(obj.velocity)
            }
        }

        const e = Math.max(0, Math.min(1, Math.min(obj.restitution, otherObj ? otherObj.restitution : 0)));
        const j = -(1 + e) * velAlongNormal;

        const minMass = 0.01
        const invMass1 = 1 / Math.max(obj.mass, minMass);
        const invMass2 = otherObj ? 1 / Math.max(otherObj.mass, minMass) : 0;
        const totalInvMass = invMass1 + invMass2;
        
        if(totalInvMass === 0) {
            return {
                newPosition: vec3.clone(obj.position),
                newVelocity: vec3.clone(obj.velocity)
            }
        }

        const impulse = j / totalInvMass;
        const impulseVec = vec3.scale(vec3.create(), normal, impulse);
        const newVelocity = vec3.create();
        vec3.scaleAndAdd(newVelocity, obj.velocity, normal, impulseVec * invMass1);

        const percent = 0.2;
        const slop = 0.01;
        const correction = Math.max(slop, 0.0) / (invMass1 + invMass2) * percent;
        const correctionVec = vec3.scale(vec3.create(), normal, correction);

        const newPosition = vec3.create();
        vec3.scaleAndAdd(newPosition, obj.position, correctionVec, invMass1);

        return {
            newPosition,
            newVelocity
        }
    }

    private applyFriction(
        obj: PhysicsObject,
        normal: vec3,
        deltaTime: number
    ): void {
        const tangent = vec3.create();
        const velAlongNormal = vec3.dot(obj.velocity, normal);
        vec3.scaleAndAdd(tangent, obj.velocity, normal, -velAlongNormal);

        if(vec3.length(tangent)) {
            vec3.normalize(tangent, tangent);

            const friction = 0.5;
            const jt = -vec3.dot(obj.velocity, tangent);
            const invMass = 1 / obj.mass;
            const frictionImpulse = jt / invMass * friction;

            vec3.scaleAndAdd(
                obj.velocity,
                obj.velocity,
                tangent,
                frictionImpulse * invMass
            );
        }
    }

    private getSupportedPoints(obj: PhysicsObject): vec3[] {
        const supportPoints: vec3[] = [];
        const bbox = obj.getCollider().getBoundingBox(obj.position);

        const checkPosition = vec3.clone(obj.position);
        checkPosition[1] -= 0.1;

        for(const other of this.collidables) {
            if(other === obj) continue;
            
            const otherCollider = other.getCollider();
            if(otherCollider.getBoundingBox(other.getPosition()).max[1] >= bbox.min[1] - 0.01) {
                supportPoints.push(vec3.clone(other.getPosition()));
            }
        }

        return supportPoints;
    }

    private isPointSupportedPolygon(obj: PhysicsObject, point: vec3): boolean {
        const bbox = obj.getCollider().getBoundingBox(obj.position);

        return (
            point[0] >= bbox.min[0] &&
            point[0] <= bbox.max[0] &&
            point[2] >= bbox.min[2] &&
            point[2] <= bbox.max[2]
        );
    }

    private checkStability(obj: PhysicsObject): void {
        const supportPoints = this.getSupportedPoints(obj);

        if(supportPoints.length > 0) {
            const avgSupport = vec3.create();
            for(const point of supportPoints) vec3.add(avgSupport, avgSupport, point);
            vec3.scale(avgSupport, avgSupport, 1 / supportPoints.length);

            if(this.isPointSupportedPolygon(obj, avgSupport)) {
                obj.isStatic = true;
            } else {
                obj.isStatic = false;
            }
        }
    }

    private fixedUpdate(deltaTime: number): void {
        if(deltaTime < 0) return;

        for(const obj of this.physicsObjects) {
            if(obj.position.some(isNaN) || obj.velocity.some(isNaN)) {
                console.error('Invalid position', obj.position);

                const index = this.physicsObjects.lastIndexOf(obj);
                if(index > -1) this.physicsObjects.splice(this.physicsObjects.indexOf(obj), 1);
                continue;
            }

            if(obj.isSleeping || obj.isStatic) continue;

            if(!obj.isStatic) {
                obj.velocity[1] -= this.gravity * deltaTime;

                vec3.scaleAndAdd(
                    obj.position,
                    obj.position,
                    obj.velocity,
                    deltaTime
                );

                if(obj.position.some(isNaN) || obj.velocity.some(isNaN)) {
                    console.error('NaN detected after update');

                    vec3.set(obj.position, 0, 0, 0);
                    vec3.set(obj.velocity, 0, 0, 0);
                    continue;
                }

                this.resolveCollisions(obj);
                this.checkStability(obj);
            }

            obj.checkSleep(deltaTime);
        }
    }

    public update(deltaTime: number): void {
        let accumulator = 0.0;
        accumulator += deltaTime;

        while(accumulator >= this.fixedTimestep) {
            this.fixedUpdate(this.fixedTimestep);
            accumulator -= this.fixedTimestep;
        }
    }
}