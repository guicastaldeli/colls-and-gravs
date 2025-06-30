export class Tick {
    private lastTime: number = 0;
    private accumulatedTime: number = 0;

    private timeScale: number = 1.0;
    private tickLength: number = 1000 / 60;
    private readonly tickRate: number = 60;

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

    public update(currentTime: number, cb?: (deltaTime: number) => void): void {
        if(this.lastTime === 0) {
            this.lastTime = currentTime;
            return;
        }

        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.accumulatedTime += deltaTime;

        while(this.accumulatedTime >= this.tickLength) {
            if(cb) cb(this.getDeltaTime());
            this.accumulatedTime -= this.tickLength;
        }
    }
}