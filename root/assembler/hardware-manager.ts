import { HardwareDevice } from "./hardware-device.js";

export class HardwareManager {
    private devices: Map<number, HardwareDevice> = new Map();

    public registerDevice(device: HardwareDevice): void {
        this.devices.set(device.hardwareId, device);
    }

    public getDevice<T extends HardwareDevice>(hardwareId: number): T | undefined {
        return this.devices.get(hardwareId) as T;
    }

    public update(): void {
        for(const device of this.devices.values()) {
            device.update();
        }
    }
}