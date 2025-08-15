export class HardwareManager {
    devices = new Map();
    registerDevice(device) {
        this.devices.set(device.hardwareId, device);
    }
    getDevice(hardwareId) {
        return this.devices.get(hardwareId);
    }
    update() {
        for (const device of this.devices.values()) {
            device.update();
        }
    }
}
