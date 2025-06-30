import { Camera } from "./camera.js";

export class Input {
    private lastTime: number = 0;
    private firstMouse: boolean = true;
    private isPointerLocked: boolean = false;

    public setupInputControls(canvas: HTMLCanvasElement, camera: Camera): void {
        const keys: Record<string, boolean> = {};

        window.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;
        });

        window.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });

        canvas.addEventListener('mousemove', (e) => {
            if(this.isPointerLocked) {
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

    private onPointerLock(canvas: HTMLCanvasElement, camera: Camera): void {
        this.isPointerLocked = document.pointerLockElement === canvas;
        if(this.isPointerLocked) this.firstMouse = true;
    }

    private update(
        camera: Camera,
        keys: Record<string, boolean>,
        time: number,
    ): void {
        if(!time) return;

        const deltaTime = (time - this.lastTime) / 1000;
        this.lastTime = time;

        for(const key in keys) {
            if(keys[key]) {
                switch(key.toLowerCase()) {
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
        };

        requestAnimationFrame(() => this.update);
    }

    private initLoop(camera: Camera, keys: Record<string, boolean>) {
        const loop = (time: number) => {
            this.update(camera, keys, time);
            requestAnimationFrame(loop);
        }

        loop(performance.now());
    }
}