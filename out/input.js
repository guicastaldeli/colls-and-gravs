export class Input {
    lastTime = 0;
    firstMouse = true;
    isPointerLocked = false;
    setupInputControls(canvas, camera) {
        const keys = {};
        window.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;
        });
        window.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });
        canvas.addEventListener('mousemove', (e) => {
            if (this.isPointerLocked) {
                const xOffset = e.movementX;
                const yOffset = -e.movementY;
                camera.setMouseMove(xOffset, yOffset);
            }
        });
        canvas.addEventListener('click', () => {
            canvas.requestPointerLock = canvas.requestPointerLock;
            canvas.requestPointerLock();
        });
        document.addEventListener('pointerlockchange', this.onPointerLock.bind(this, canvas, camera));
        this.lastTime = performance.now();
        this.initLoop(camera, keys);
    }
    onPointerLock(canvas, camera) {
        this.isPointerLocked = document.pointerLockElement === canvas;
        if (this.isPointerLocked)
            this.firstMouse = true;
    }
    update(camera, keys, time) {
        if (!time)
            return;
        const deltaTime = (time - this.lastTime) / 1000;
        this.lastTime = time;
        for (const key in keys) {
            if (keys[key]) {
                switch (key.toLowerCase()) {
                    case 'w':
                        camera.setKeyboard('FORWARD', deltaTime);
                        break;
                    case 's':
                        camera.setKeyboard('BACKWARD', deltaTime);
                        break;
                    case 'a':
                        camera.setKeyboard('LEFT', deltaTime);
                        break;
                    case 'd':
                        camera.setKeyboard('RIGHT', deltaTime);
                        break;
                }
            }
        }
        ;
        requestAnimationFrame(() => this.update);
    }
    initLoop(camera, keys) {
        const loop = (time) => {
            this.update(camera, keys, time);
            requestAnimationFrame(loop);
        };
        loop(performance.now());
    }
}
