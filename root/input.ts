import { Camera } from "./camera.js";
import { PlayerController } from "./player-controller.js";

export class Input {
    private lastTime: number = 0;
    private firstMouse: boolean = true;
    private isPointerLocked: boolean = false;

    private camera: Camera;
    private playerController: PlayerController;

    constructor(camera: Camera, playerController: PlayerController) {
        this.camera = camera;
        this.playerController = playerController;
    }

    public setupInputControls(canvas: HTMLCanvasElement): void {
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

    private onPointerLock(canvas: HTMLCanvasElement): void {
        this.isPointerLocked = document.pointerLockElement === canvas;
        if(this.isPointerLocked) this.firstMouse = true;
    }

    private update(
        playerController: PlayerController,
        keys: Record<string, boolean>,
        time: number,
    ): void {
        if(!time) return;

        const deltaTime = (time - this.lastTime) / 1000;
        this.lastTime = time;
        this.playerController.updateInput(keys, deltaTime);
    }

    private initLoop(playerController: PlayerController, keys: Record<string, boolean>) {
        const loop = (time: number) => {
            this.update(this.playerController, keys, time);
            requestAnimationFrame(loop);
        }

        loop(performance.now());
    }
}