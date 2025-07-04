import { mat3, mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";

import { CollisionResponse, ICollidable } from "../collider.js";
import { PhysicsObject } from "./physics-object.js";


export class PhysicsSystem {
    private gravity: number = 8.0;
    private angularDumping: number = 0.98;
    private stabilityThreshold: number = 0.3;
    private torqueMultiplier: number = 2.0;

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

        const e = Math.max(0.3, obj.restitution);
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
        if(minPen > 0) {
            const correction = vec3.scale(vec3.create(), normal, minPen * 0.5);
            vec3.add(result.newPosition, result.newPosition, correction);
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
        const objBBox = obj.getCollider().getBoundingBox(obj.position);
        const objBottom = objBBox.min[1];
        const objSizeX = objBBox.max[0] - objBBox.min[0];
        const objSizeZ = objBBox.max[2] - objBBox.min[2];

        let totalSupportArea = 0;
        const supportingObjects: { obj: ICollidable, area: number }[] = [];

        for(const other of this.collidables) {
            if(other === obj) continue;

            const otherBBox = other.getCollider().getBoundingBox(other.getPosition());

            if(otherBBox.max[1] <= objBottom + 0.05 &&
                otherBBox.max[1] >= objBottom - 0.05
            ) {
                const overlapX = 
                Math.min(objBBox.max[0], otherBBox.max[0]) -
                Math.max(objBBox.min[0], otherBBox.min[0]);

                const overlapZ = 
                Math.min(objBBox.max[2], otherBBox.max[2]) -
                Math.max(objBBox.min[2], otherBBox.min[2]);

                if(overlapX > 0 && overlapZ > 0) {
                    const area = overlapX * overlapZ;
                    supportingObjects.push({ obj: other, area });
                    totalSupportArea += area;
                }
            }
        }

        if(supportingObjects.length === 0) {
            obj.isStatic = false;
            return;
        }

        const objBaseArea = objSizeX * objSizeZ;
        const supportedPercentage = totalSupportArea / objBaseArea;

        if(supportedPercentage > 0.7) {
            obj.isStatic = true;
            obj.velocity = vec3.create();
            obj.angularVelocity = vec3.create();
        } else {
            obj.isStatic = false;
        }

        const supportCenter = vec3.create();
        for(const support of supportingObjects) {
            const supportPos = support.obj.getPosition();
            vec3.scaleAndAdd(supportCenter, supportCenter, supportPos, support.area);
        }
        vec3.scale(supportCenter, supportCenter, 1 / totalSupportArea);

        const com = vec3.create();
        vec3.add(com, objBBox.min, objBBox.max);
        vec3.scale(com, com, 0.5);

        const toCOM = vec3.sub(vec3.create(), com, supportCenter);
        toCOM[1] = 0;
        const distanceToEdge = vec3.length(toCOM);
        const maxDimension = Math.max(objSizeX, objSizeZ);
        if(distanceToEdge > maxDimension * this.stabilityThreshold * 1.2) obj.isStatic = false;
    }

    private checkEdgeStability(obj: PhysicsObject): void {
        if(obj.isStatic) {
            this.checkStability(obj);
            return;
        }

        const objBBox = obj.getCollider().getBoundingBox(obj.position);
        const objBottom = objBBox.min[1];
        const objSizeX = objBBox.max[0] - objBBox.min[0];
        const objSizeZ = objBBox.max[2] - objBBox.min[2];

        const supportingObjects: { obj: ICollidable, area: number }[] = [];
        let totalSupportArea = 0;

        for(const other of this.collidables) {
            if(other === obj) continue;

            const otherBBox = other.getCollider().getBoundingBox(other.getPosition());

            if(otherBBox.max[1] <= objBottom + 0.05 &&
                otherBBox.max[1] >= objBottom - 0.05
            ) {
                const overlapX = 
                Math.min(objBBox.max[0], otherBBox.max[0]) -
                Math.max(objBBox.min[0], otherBBox.min[0]);

                const overlapZ = 
                Math.min(objBBox.max[2], otherBBox.max[2]) -
                Math.max(objBBox.min[2], otherBBox.min[2]);

                if(overlapX > 0 && overlapZ > 0) {
                    const area = overlapX * overlapZ;
                    supportingObjects.push({ obj: other, area });
                    totalSupportArea += area;
                }
            }
        }

        if(supportingObjects.length === 0) {
            obj.isStatic = false;
            return;
        }

        const supportCenter = vec3.create();
        for(const support of supportingObjects) {
            const supportPos = support.obj.getPosition();
            vec3.scaleAndAdd(supportCenter, supportCenter, supportPos, support.area);
        }
        vec3.scale(supportCenter, supportCenter, 1 / totalSupportArea);

        const com = vec3.create();
        vec3.add(com, objBBox.min, objBBox.max);
        vec3.scale(com, com, 0.5);

        const toCOM = vec3.sub(vec3.create(), com, supportCenter);
        toCOM[1] = 0;

        const distanceToEdge = vec3.length(toCOM);
        const maxDimension = Math.max(objSizeX, objSizeZ);

        if(distanceToEdge > maxDimension * this.stabilityThreshold) {
            const torqueMagnitude = obj.mass * this.gravity * distanceToEdge * this.torqueMultiplier;
            const torqueAxis = vec3.cross(vec3.create(), toCOM, [0, 1, 0]);

            if(vec3.length(torqueAxis) > 0.001) {
                vec3.normalize(torqueAxis, torqueAxis);

                const angularImpulse = vec3.scale(vec3.create(), torqueAxis, torqueMagnitude * this.fixedTimestep);
                const invInertia = mat3.create();
                mat3.invert(invInertia, obj.inertiaTensor);
                vec3.transformMat3(angularImpulse, angularImpulse, invInertia);
                vec3.add(obj.angularVelocity, obj.angularVelocity, angularImpulse);

                obj.isStatic = false;
            }
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

            if(!obj.isStatic) {
                this.checkStability(obj);
                this.checkEdgeStability(obj);
            }

            vec3.scale(obj.angularVelocity, obj.angularVelocity, this.angularDumping);
            obj.updateRotation(deltaTime);

            if(!obj.isStatic && !obj.isSleeping) {
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
                        if(response === CollisionResponse.BLOCK) {
                            this.resolveCollisions(obj, collidable);
                        }
                    }
                }
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