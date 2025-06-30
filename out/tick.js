export class Tick {
    lastTime = 0;
    accumulatedTime = 0;
    timeScale = 1.0;
    tickLength = 1000 / 60;
    tickRate = 60;
    constructor() {
        this.setTickRate(this.tickRate);
    }
    setTickRate(rate) {
        this.tickLength = 1000 / rate;
    }
    setTimeScale(scale) {
        this.timeScale = scale;
    }
    getDeltaTime() {
        return this.tickLength * this.timeScale;
    }
    getTimeScale() {
        return this.timeScale;
    }
    update(currentTime, cb) {
        if (this.lastTime === 0) {
            this.lastTime = currentTime;
            return;
        }
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.accumulatedTime += deltaTime;
        while (this.accumulatedTime >= this.tickLength) {
            if (cb)
                cb(this.getDeltaTime());
            this.accumulatedTime -= this.tickLength;
        }
    }
}
