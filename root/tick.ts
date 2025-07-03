export class Tick {
    private lastTime: number = 0.0;
    private lastUpdateTime: number = 0.0;
    private accumulatedTime: number = 0.0;
    private pauseStartTime: number = 0.0
    private totalPausedTime: number = 0.0;

    private timeScale: number = 1.0;
    private tickLength: number = 1000 / 60;
    private readonly tickRate: number = 60;

    public isPaused: boolean = false;
    private wasPaused: boolean = false;

    constructor() {
        this.setTickRate(this.tickRate);
    }

    public setTickRate(rate: number): void {
        this.tickLength = 1000 / rate;
    }

    public setTimeScale(scale: number): void {
        this.timeScale = scale;
    }

    public getDeltaTime(): number {
        return this.tickLength * this.timeScale;
    }

    public getTimeScale(): number {
        return this.timeScale;
    }

    public pause(): void {
        if(!this.isPaused) {
            this.isPaused = true;
            this.pauseStartTime = performance.now();
            this.wasPaused = true;
        }
    }

    public resume(): void {
        if(this.isPaused) {
            const duration = performance.now() - this.pauseStartTime;
            this.totalPausedTime += duration;

            this.isPaused = false;
            this.pauseStartTime = 0.0;
        }
    }

    public update(currentTime: number, cb?: (deltaTime: number) => void): number {
        if(this.lastTime === 0) {
            this.lastTime = currentTime;
            this.lastUpdateTime = currentTime;
            return 0;
        }

        if(this.isPaused) {
            this.wasPaused = true;
            return 0;
        }

        if(this.wasPaused) {
            this.lastTime = currentTime - this.totalPausedTime;
            this.lastUpdateTime = currentTime - this.totalPausedTime;
            this.accumulatedTime = 0;
            this.wasPaused = false;
            return 0;
        }

        const adjustedCurrentTime = currentTime - this.totalPausedTime;
        const deltaTime = adjustedCurrentTime - this.lastUpdateTime;
        this.lastUpdateTime = adjustedCurrentTime;
        this.accumulatedTime += deltaTime * this.timeScale;

        while(this.accumulatedTime >= this.tickLength) {
            if(cb) cb(this.getDeltaTime());
            this.accumulatedTime -= this.tickLength;
        }

        return Math.min(deltaTime, 0.1);
    }
}