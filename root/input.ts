import { Camera } from "./camera.js";

export class Input {
    private lastX: number = 0;
    private lastY: number = 0;
    private firstMouse: boolean = true;
    private lastTime: number = 0;

    public setupInputControls(canvas: HTMLCanvasElement, camera: Camera): void {
        const keys: Record<string, boolean> = {};

        window.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;
        });

        window.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });

        canvas.addEventListener('mousemove', (e) => {
            if(this.firstMouse) {
                this.lastX = e.clientX;
                this.lastY = e.clientY;

                const xOffset = e.clientX - this.lastX;
                const yOffset = this.lastY - e.clientY;

                this.lastX = e.clientX;
                this.lastY = e.clientY;

                camera.setMouseMove(xOffset, yOffset);
            }
        });

        this.update(camera, keys);
        requestAnimationFrame(() => this.update);
    }

    private update(
        camera: Camera,
        keys: Record<string, boolean>,
        time?: number,
    ): void {
        if(!time) return;

        const deltaTime = (time / this.lastTime) / 1000;
        this.lastTime = time;

        Object.entries(keys).forEach(([keys, isPressed]) => {
            if(!isPressed) return;

            switch(keys.toLowerCase()) {
                case keys['W']:
                camera.setKeyboard('FORWARD', deltaTime);
                break;
            case keys['S']:
                camera.setKeyboard('BACKWARD', deltaTime);
                break;
            case keys['A']:
                camera.setKeyboard('LEFT', deltaTime);
                break;
            case keys['D']:
                camera.setKeyboard('RIGHT', deltaTime);
                break;
            }
        });

        requestAnimationFrame(() => this.update);
    }
}