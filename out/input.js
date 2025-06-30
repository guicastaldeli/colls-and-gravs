export class Input {
    lastTime = 0;
    firstMouse = true;
    isPointerLocked = false;
    camera;
    playerController;
    constructor(camera, playerController) {
        this.camera = camera;
        this.playerController = playerController;
    }
    setupInputControls(canvas) {
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
                this.playerController.updateRotation(xOffset, yOffset);
            }
        });
        canvas.addEventListener('click', () => {
            canvas.requestPointerLock = canvas.requestPointerLock;
            canvas.requestPointerLock();
        });
        document.addEventListener('pointerlockchange', this.onPointerLock.bind(this, canvas));
        this.lastTime = performance.now();
        this.initLoop(this.playerController, keys);
    }
    onPointerLock(canvas) {
        this.isPointerLocked = document.pointerLockElement === canvas;
        if (this.isPointerLocked)
            this.firstMouse = true;
    }
    update(playerController, keys, time) {
        if (!time)
            return;
        const deltaTime = (time - this.lastTime) / 1000;
        this.lastTime = time;
        this.playerController.updateInput(keys, deltaTime);
    }
    initLoop(playerController, keys) {
        const loop = (time) => {
            this.update(this.playerController, keys, time);
            requestAnimationFrame(loop);
        };
        loop(performance.now());
    }
}
