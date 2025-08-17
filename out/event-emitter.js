export class EventEmitter {
    static instance;
    listeners = new Map();
    static getInstance() {
        if (!EventEmitter.instance)
            EventEmitter.instance = new EventEmitter();
        return EventEmitter.instance;
    }
    on(e, callback) {
        if (!this.listeners.has(e))
            this.listeners.set(e, []);
        this.listeners.get(e).push(callback);
    }
    emit(e, ...args) {
        this.listeners.get(e)?.forEach(cb => cb(...args));
    }
}
