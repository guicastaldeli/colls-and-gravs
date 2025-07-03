export class Tick {
    lastTime = 0.0;
    lastUpdateTime = 0.0;
    accumulatedTime = 0.0;
    pauseStartTime = 0.0;
    totalPausedTime = 0.0;
    timeScale = 1.0;
    tickLength = 1000 / 60;
    tickRate = 60;
    isPaused = false;
    wasPaused = false;
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
    pause() {
        if (!this.isPaused) {
            this.isPaused = true;
            this.pauseStartTime = performance.now();
            this.wasPaused = true;
        }
    }
    resume() {
        if (this.isPaused) {
            const duration = performance.now() - this.pauseStartTime;
            this.totalPausedTime += duration;
            this.isPaused = false;
            this.pauseStartTime = 0.0;
        }
    }
    update(currentTime, cb) {
        if (this.lastTime === 0) {
            this.lastTime = currentTime;
            this.lastUpdateTime = currentTime;
            return 0;
        }
        if (this.isPaused) {
            this.wasPaused = true;
            return 0;
        }
        if (this.wasPaused) {
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
        while (this.accumulatedTime >= this.tickLength) {
            if (cb)
                cb(this.getDeltaTime());
            this.accumulatedTime -= this.tickLength;
        }
        return Math.min(deltaTime, 0.1);
    }
}
