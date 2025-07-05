import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";

import { CollisionResponse, ICollidable } from "../collider.js";
import { PhysicsObject } from "./physics-object.js";


export class PhysicsSystem {
    private gravity: number = 8.0;
    private collidables: ICollidable[] = [];
    private physicsObjects: PhysicsObject[] = [];
    private fixedTimestep: number = 1 / 60;

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
        if(i !== -1) this.physicsObjects.splice(i, 1);
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
            if(obj.velocity[1] < 0) normal[0] = obj.position[0] < otherPosition[0] ? -1 : 1;
        } else if(penY < penX && penY < penZ) {
            normal[1] = obj.position[1] < otherPosition[1] ? -1 : 1;
            obj.velocity[1] = 0;
        } else {
            normal[2] = obj.position[2] < otherPosition[2] ? -1 : 1;
            obj.velocity[2] = 0;
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

    private resolveCollisions(obj: PhysicsObject, collidable: ICollidable): void {
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
        const result = {
            newPosition: vec3.clone(obj.position),
            newVelocity: vec3.clone(obj.velocity)
        }

        vec3.copy(result.newPosition, obj.position);
        vec3.copy(result.newVelocity, obj.velocity);

        if(!obj || !other || !otherPosition) {
            console.error('Invalid collision params');
            return result;
        }

        const otherObj = other as PhysicsObject;
        const normal = this.calculateCollisionNormal(obj, otherObj, otherPosition);
        if(normal.some(isNaN)) return result;

        const otherVel = (other as PhysicsObject)?.velocity
        ? vec3.clone((other as PhysicsObject).velocity) 
        : vec3.create();

        const relativeVel = vec3.sub(vec3.create(), obj.velocity, otherVel);
        const velAlongNormal = vec3.dot(relativeVel, normal);
        if(velAlongNormal > 0) return result;

        const e = Math.max(0.9, Math.max(0, obj.restitution));
        const j = -(1 + e) * velAlongNormal;

        const minMass = 200 * 200;
        const invMass1 = 10 / Math.max(obj.mass, minMass);
        const invMass2 = (other as PhysicsObject)?.mass !== undefined ?
        1 / Math.max((other as PhysicsObject).mass, minMass) : 0;

        const totalInvMass = invMass1 + invMass2;
        if(totalInvMass <= 0.001) return result;

        const impulse = j / totalInvMass;
        const impulseScaled = impulse * invMass1
        vec3.scaleAndAdd(result.newVelocity, obj.velocity, normal, impulseScaled);

        const percent = 0.1;
        const slop = 0.01;
        const correction = Math.min(0.1, Math.max(slop, 0.0) / (invMass1 * invMass2) * percent);
        const correctionVec = vec3.scale(vec3.create(), normal, correction);
        vec3.scaleAndAdd(result.newPosition, obj.position, correctionVec, invMass1);

        const objBBox = obj.getCollider().getBoundingBox(obj.position);
        const otherBBox = obj.getCollider().getBoundingBox(otherPosition);

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

        const minPen = Math.min(penX, penY, penZ);

        if(minPen === penY) {
            const correction = normal[1] * minPen * 1.01;
            result.newPosition[1] += correction;
            if(normal[1] > 0 && obj.velocity[1] < 0) result.newVelocity[1] = 0;
        } else {
            const correction = vec3.scale(vec3.create(), normal, minPen * 1.01);
            vec3.add(result.newPosition, result.newPosition, correction);
            result.newVelocity[0] *= 0.8;
            result.newVelocity[2] *= 0.8;
        }

        const contactPoint = vec3.create();
        vec3.add(contactPoint, obj.position, otherPosition);
        vec3.scale(contactPoint, contactPoint, 0.5);

        const r = vec3.sub(vec3.create(), contactPoint, obj.position);
        const velocityAtContact = vec3.cross(vec3.create(), obj.angularVelocity, r);
        vec3.add(velocityAtContact, velAlongNormal, obj.velocity);

        const torque = vec3.cross(vec3.create(), r, normal);
        vec3.scale(torque, torque, impulse * 0.5);
        obj.applyTorque(torque);

        const tangentVel = vec3.sub(vec3.create(), velocityAtContact,
        vec3.scale(vec3.create(), normal, vec3.dot(velocityAtContact, normal)));

        if(vec3.length(tangentVel) > 0.1) {
            const tangentDir = vec3.normalize(vec3.create(), tangentVel);
            const frictionImpulse = vec3.scale(vec3.create(), tangentDir, -impulse * obj.friction);

            vec3.scaleAndAdd(
                result.newVelocity,
                result.newVelocity,
                frictionImpulse,
                1 / obj.mass
            );

            const frictionTorque = vec3.cross(vec3.create(), r, frictionImpulse);
            obj.applyTorque(frictionTorque);
        }
        
        return result;
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

            const friction = 0.1;
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

    private checkStability(obj: PhysicsObject): void {
        if(obj.isStatic) return;

        const objBBox = obj.getCollider().getBoundingBox(obj.position);
        let isSupported = false;

        for(const other of this.collidables) {
            if(other === obj) continue;
            const otherBBox = other.getCollider().getBoundingBox(other.getPosition());

            if(otherBBox.max[1] <= objBBox.min[1] + 0.6 &&
                otherBBox.max[1] >= objBBox.min[1] - 0.6
            ) {
                const overlapX = Math.min(objBBox.max[0], otherBBox.max[0]) - Math.max(objBBox.min[0], otherBBox.min[0]);
                const overlapZ = Math.min(objBBox.max[2], otherBBox.max[2]) - Math.max(objBBox.min[2], otherBBox.min[2]);

                if(overlapX > 0 && overlapZ > 0) {
                    isSupported = true;
                    break;
                }
            }
        }

        if(isSupported && vec3.length(obj.velocity) < 0.1) obj.isStatic = true;
    }

    private checkEdgeStability(obj: PhysicsObject): void {
        if(obj.isStatic) return;

        const supportPoints = this.getSupportedPoints(obj);
        if(supportPoints.length === 0) return;

        const center = vec3.create();
        for(const point of supportPoints) vec3.add(center, center, center);
        vec3.scale(center, center, 1 / supportPoints.length);

        const com = vec3.clone(obj.position);
        com[1] -= obj.collider.getSize()[1] / 2;

        const toCOM = vec3.sub(vec3.create(), com, center);
        const supportRadius = supportPoints.reduce((max, point) => {
            const dist = vec3.distance(point, center);
            return Math.max(max, dist);
        }, 0);

        if(vec3.length(toCOM) > supportRadius * 0.8) {
            const torque = vec3.cross(vec3.create(), toCOM, [0, -1, 0]);
            vec3.normalize(torque, torque);
            vec3.scale(torque, torque, obj.mass * this.gravity * 0.1);
            obj.applyTorque(torque);
            obj.isStatic = false;
        }
    }

    private fixedUpdate(deltaTime: number): void {
        if(deltaTime < 0) return;

        for(const obj of this.physicsObjects) {
            if(obj.position.some(isNaN) || obj.velocity.some(isNaN)) {
                console.error('err', obj.position);

                const index = this.physicsObjects.lastIndexOf(obj);
                if(index > -1) this.physicsObjects.splice(this.physicsObjects.indexOf(obj), 1);
                continue;
            }

            obj.updateRotation(deltaTime);
            if(obj.isSleeping || obj.isStatic) continue;

            if(!obj.isStatic) {
                const time = deltaTime * 10;
                obj.velocity[1] -= this.gravity * time;

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

                for(const collidable of this.collidables) {                    
                    if(obj.getCollider().checkCollision(collidable.getCollider())) {
                        const response = collidable.getCollisionResponse?.(obj);
                        if(response === CollisionResponse.BLOCK) this.resolveCollisions(obj, collidable);
                    }
                }

                this.checkStability(obj);
                this.checkEdgeStability(obj);
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