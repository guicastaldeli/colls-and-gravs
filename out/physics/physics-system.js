import { vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { CollisionResponse } from "../collider.js";
export class PhysicsSystem {
    gravity = 8.0;
    angularDamping = 0.98;
    stabilityThreshold = 0.05;
    torqueMultiplier = 10.0;
    collidables = [];
    physicsObjects = [];
    fixedTimestep = 1 / 60;
    ground;
    constructor(ground) {
        this.ground = ground;
    }
    addPhysicsObject(obj) {
        if (!obj || !obj.position || obj.position.some(isNaN)) {
            console.error('Attempt to add invalid');
        }
        if (!obj.velocity || obj.velocity.some(isNaN)) {
            console.warn('Physics object jas invalid velocity');
            obj.velocity = vec3.create();
        }
        this.physicsObjects.push(obj);
    }
    removePhysicsObject(obj) {
        const i = this.physicsObjects.indexOf(obj);
        if (i !== -1)
            this.physicsObjects.splice(i, 1);
    }
    setCollidables(collidables) {
        this.collidables = collidables;
    }
    calculateCollisionNormal(obj, other, otherPosition) {
        const objBBox = obj.getCollider().getBoundingBox(obj.position);
        const otherBBox = other.getCollider().getBoundingBox(otherPosition);
        const normal = vec3.create();
        const penX = Math.min(objBBox.max[0] - otherBBox.min[0], otherBBox.max[0] - objBBox.min[0]);
        const penY = Math.min(objBBox.max[1] - otherBBox.min[1], otherBBox.max[1] - objBBox.min[1]);
        const penZ = Math.min(objBBox.max[2] - otherBBox.min[2], otherBBox.max[2] - objBBox.min[2]);
        if (penX < penY && penX < penZ) {
            if (obj.velocity[1] < 0)
                normal[0] = obj.position[0] < otherPosition[0] ? -1 : 1;
        }
        else if (penY < penX && penY < penZ) {
            normal[1] = obj.position[1] < otherPosition[1] ? -1 : 1;
            obj.velocity[1] = 0;
        }
        else {
            normal[2] = obj.position[2] < otherPosition[2] ? -1 : 1;
            obj.velocity[2] = 0;
        }
        const minPen = Math.min(penX, penY, penZ);
        if (minPen === penX) {
            normal[0] = obj.position[0] < otherPosition[0] ? -1 : 1;
        }
        else if (minPen === penY) {
            normal[1] = obj.position[1] < otherPosition[1] ? -1 : 1;
        }
        else {
            normal[2] = obj.position[2] < otherPosition[2] ? -1 : 1;
        }
        if (vec3.length(normal) < 0.001 || normal.some(isNaN))
            vec3.set(normal, 0, 1, 0);
        vec3.normalize(normal, normal);
        return normal;
    }
    resolveCollisions(obj, collidable) {
        if (!obj || !obj.getCollider)
            return;
        for (const other of this.collidables) {
            if (other === obj)
                continue;
            const collider = obj.getCollider();
            const otherCollider = other.getCollider();
            const otherPosition = other.getPosition();
            if (collider.checkCollision(otherCollider)) {
                const response = this.calculateCollisionResponse(obj, other, otherPosition);
                obj.position = response.newPosition;
                obj.velocity = response.newVelocity;
                const normal = this.calculateCollisionNormal(obj, other, otherPosition);
                this.applyFriction(obj, normal, this.fixedTimestep);
            }
        }
    }
    calculateCollisionResponse(obj, other, otherPosition) {
        const result = {
            newPosition: vec3.clone(obj.position),
            newVelocity: vec3.clone(obj.velocity)
        };
        vec3.copy(result.newPosition, obj.position);
        vec3.copy(result.newVelocity, obj.velocity);
        if (!obj || !other || !otherPosition) {
            console.error('Invalid collision params');
            return result;
        }
        const otherObj = other;
        const normal = this.calculateCollisionNormal(obj, otherObj, otherPosition);
        if (normal.some(isNaN))
            return result;
        const otherVel = other?.velocity
            ? vec3.clone(other.velocity)
            : vec3.create();
        const relativeVel = vec3.sub(vec3.create(), obj.velocity, otherVel);
        const velAlongNormal = vec3.dot(relativeVel, normal);
        if (velAlongNormal > 0)
            return result;
        const e = Math.max(0.3, obj.restitution);
        const j = -(1 + e) * velAlongNormal;
        const minMass = 200 * 200;
        const invMass1 = 10 / Math.max(obj.mass, minMass);
        const invMass2 = other?.mass !== undefined ?
            1 / Math.max(other.mass, minMass) : 0;
        const totalInvMass = invMass1 + invMass2;
        if (totalInvMass <= 0.001)
            return result;
        const impulse = j / totalInvMass;
        const impulseScaled = impulse * invMass1;
        vec3.scaleAndAdd(result.newVelocity, obj.velocity, normal, impulseScaled);
        const percent = 0.1;
        const slop = 0.01;
        const correction = Math.min(0.1, Math.max(slop, 0.0) / (invMass1 * invMass2) * percent);
        const correctionVec = vec3.scale(vec3.create(), normal, correction);
        vec3.scaleAndAdd(result.newPosition, obj.position, correctionVec, invMass1);
        const objBBox = obj.getCollider().getBoundingBox(obj.position);
        const otherBBox = obj.getCollider().getBoundingBox(otherPosition);
        const penX = Math.min(objBBox.max[0] - otherBBox.min[0], otherBBox.max[0] - objBBox.min[0]);
        const penY = Math.min(objBBox.max[1] - otherBBox.min[1], otherBBox.max[1] - objBBox.min[1]);
        const penZ = Math.min(objBBox.max[2] - otherBBox.min[2], otherBBox.max[2] - objBBox.min[2]);
        const minPen = Math.min(penX, penY, penZ);
        if (minPen > 0) {
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
        vec3.scale(torque, torque, impulse * 2.0);
        obj.applyTorque(torque);
        const tangentVel = vec3.sub(vec3.create(), velocityAtContact, vec3.scale(vec3.create(), normal, vec3.dot(velocityAtContact, normal)));
        if (vec3.length(tangentVel) > 0.1) {
            const tangentDir = vec3.normalize(vec3.create(), tangentVel);
            const frictionImpulse = vec3.scale(vec3.create(), tangentDir, -impulse * obj.friction);
            vec3.scaleAndAdd(result.newVelocity, result.newVelocity, frictionImpulse, 1 / obj.mass);
            const frictionTorque = vec3.cross(vec3.create(), r, frictionImpulse);
            obj.applyTorque(frictionTorque);
        }
        return result;
    }
    applyFriction(obj, normal, deltaTime) {
        const tangent = vec3.create();
        const velAlongNormal = vec3.dot(obj.velocity, normal);
        vec3.scaleAndAdd(tangent, obj.velocity, normal, -velAlongNormal);
        if (vec3.length(tangent)) {
            vec3.normalize(tangent, tangent);
            const friction = 0.1;
            const jt = -vec3.dot(obj.velocity, tangent);
            const invMass = 1 / obj.mass;
            const frictionImpulse = jt / invMass * friction;
            vec3.scaleAndAdd(obj.velocity, obj.velocity, tangent, frictionImpulse * invMass);
        }
    }
    checkStability(obj) {
        if (obj.isStatic)
            return;
        const objBBox = obj.getCollider().getBoundingBox(obj.position);
        const objBottom = objBBox.min[1];
        const objSizeX = objBBox.max[0] - objBBox.min[0];
        const objSizeZ = objBBox.max[2] - objBBox.min[2];
        let totalSupportArea = 0;
        const supportingObjects = [];
        for (const other of this.collidables) {
            if (other === obj)
                continue;
            const otherBBox = other.getCollider().getBoundingBox(other.getPosition());
            if (otherBBox.max[1] <= objBottom + 0.6 &&
                otherBBox.max[1] >= objBottom - 0.6) {
                const overlapX = Math.min(objBBox.max[0], otherBBox.max[0]) -
                    Math.max(objBBox.min[0], otherBBox.min[0]);
                const overlapZ = Math.min(objBBox.max[2], otherBBox.max[2]) -
                    Math.max(objBBox.min[2], otherBBox.min[2]);
                if (overlapX > 0 && overlapZ > 0) {
                    const area = overlapX * overlapZ;
                    supportingObjects.push({ obj: other, area });
                    totalSupportArea += area;
                }
            }
        }
        if (supportingObjects.length === 0) {
            obj.isStatic = false;
            return;
        }
        const objBaseArea = objSizeX * objSizeZ;
        const supportCenter = vec3.create();
        for (const support of supportingObjects) {
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
        const supportedArea = totalSupportArea / objBaseArea;
        const threshold = this.stabilityThreshold * 3.0;
        const isStable = (supportedArea > 0.5 &&
            distanceToEdge <= maxDimension * threshold);
        if (isStable) {
            obj.velocity = vec3.create();
            obj.angularVelocity = vec3.create();
        }
        obj.isStatic = isStable;
    }
    checkEdgeStability(obj, groundLevel) {
        if (obj.isStatic && vec3.length(obj.velocity) < 0.1) {
            this.checkStability(obj);
            return;
        }
        const supportPoints = obj.calculateSupportPolygon(groundLevel);
        if (supportPoints.length < 3) {
            obj.isStatic == false;
            return;
        }
        const hullPoints = this.calculateConvexHull(supportPoints);
        if (hullPoints.length < 3) {
            obj.isStatic = false;
            return;
        }
        const com = vec3.create();
        const bbox = obj.getCollider().getBoundingBox(obj.position);
        vec3.add(com, bbox.min, bbox.max);
        vec3.scale(com, com, 0.5);
        const comGround = vec3.fromValues(com[0], groundLevel, com[2]);
        if (!this.isPointInConvexHull(comGround, hullPoints)) {
            obj.isStatic = false;
            const supportCenter = vec3.create();
            for (const p of hullPoints)
                vec3.add(supportCenter, supportCenter, p);
            vec3.scale(supportCenter, supportCenter, 1 / hullPoints.length);
            const toCOM = vec3.sub(vec3.create(), comGround, supportCenter);
            const distance = vec3.length(toCOM);
            if (distance > 0.01) {
                const torqueAxis = vec3.cross(vec3.create(), [0, 1, 0], toCOM);
                vec3.normalize(torqueAxis, torqueAxis);
                const dynamicMultiplier = this.torqueMultiplier * (1 + distance * 5);
                const torqueMagnitude = obj.mass * this.gravity * distance * dynamicMultiplier;
                const torque = vec3.scale(vec3.create(), torqueAxis, torqueMagnitude);
                const randomTorque = vec3.fromValues((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5);
                vec3.add(torque, torque, randomTorque);
                obj.applyTorque(torque);
            }
        }
    }
    calculateConvexHull(points) {
        if (points.length < 3)
            return points;
        let hull = [];
        let leftmost = 0;
        for (let i = 1; i < points.length; i++) {
            if (points[i][0] < points[leftmost][0]) {
                leftmost = i;
            }
        }
        let p = leftmost;
        do {
            hull.push(points[p]);
            let q = (p + 1) % points.length;
            for (let i = 0; i < points.length; i++) {
                if (i === p || i === q)
                    continue;
                const cross = (points[q][0] - points[p][0]) * (points[i][2] - points[q][2]) -
                    (points[q][2] - points[p][2]) * (points[i][0] - points[q][0]);
                if (cross < 0)
                    q = i;
            }
            p = q;
        } while (p !== leftmost);
        return hull;
    }
    isPointInConvexHull(point, hull) {
        if (hull.length < 3)
            return false;
        const minX = Math.min(...hull.map(p => p[0]));
        const maxX = Math.max(...hull.map(p => p[0]));
        const minZ = Math.min(...hull.map(p => p[2]));
        const maxZ = Math.max(...hull.map(p => p[2]));
        return point[0] >= minX && point[0] <= maxX &&
            point[2] >= minZ && point[2] <= maxZ;
    }
    fixedUpdate(deltaTime) {
        if (deltaTime < 0)
            return;
        for (const obj of this.physicsObjects) {
            if (obj.position.some(isNaN) || obj.velocity.some(isNaN)) {
                console.error('err', obj.position);
                const index = this.physicsObjects.lastIndexOf(obj);
                if (index > -1)
                    this.physicsObjects.splice(this.physicsObjects.indexOf(obj), 1);
                continue;
            }
            const groundLevel = this.ground.getGroundLevelY(obj.position[0], obj.position[1]);
            if (!obj.isStatic) {
                this.checkStability(obj);
                this.checkEdgeStability(obj, groundLevel);
            }
            if (!obj.isOnGround)
                vec3.scale(obj.angularVelocity, obj.angularVelocity, this.angularDamping);
            const sizeY = obj.getCollider().getSize()[1];
            obj.updateRotation(deltaTime, groundLevel, sizeY);
            if (!obj.isStatic && !obj.isSleeping) {
                const time = deltaTime * 10;
                obj.velocity[1] -= this.gravity * time;
                vec3.scaleAndAdd(obj.position, obj.position, obj.velocity, deltaTime);
                if (obj.position.some(isNaN) || obj.velocity.some(isNaN)) {
                    console.error('NaN detected after update');
                    vec3.set(obj.position, 0, 0, 0);
                    vec3.set(obj.velocity, 0, 0, 0);
                    continue;
                }
                for (const collidable of this.collidables) {
                    if (obj.getCollider().checkCollision(collidable.getCollider())) {
                        const response = collidable.getCollisionResponse?.(obj);
                        if (response === CollisionResponse.BLOCK) {
                            this.resolveCollisions(obj, collidable);
                        }
                    }
                }
            }
            obj.checkSleep(deltaTime);
        }
    }
    update(deltaTime) {
        let accumulator = 0.0;
        accumulator += deltaTime;
        while (accumulator >= this.fixedTimestep) {
            this.fixedUpdate(this.fixedTimestep);
            accumulator -= this.fixedTimestep;
        }
    }
}
