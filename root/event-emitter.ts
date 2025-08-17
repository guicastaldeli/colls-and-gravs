export class EventEmitter {
    private static instance: EventEmitter;
    private listeners: Map<string, Function[]> = new Map();

    static getInstance() {
        if(!EventEmitter.instance) EventEmitter.instance = new EventEmitter();
        return EventEmitter.instance;
    }

    on(e: string, callback: Function) {
        if(!this.listeners.has(e)) this.listeners.set(e, []);
        this.listeners.get(e)!.push(callback);
    }

    emit(e: string, ...args: any[]) {
        this.listeners.get(e)?.forEach(cb => cb(...args));
    }
}