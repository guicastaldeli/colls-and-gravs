export class PhysicsGrid {
    cellSize;
    grid = new Map();
    constructor(cellSize) {
        this.cellSize = cellSize;
    }
    getCellKey(position) {
        const x = Math.floor(position[0] / this.cellSize);
        const y = Math.floor(position[1] / this.cellSize);
        const z = Math.floor(position[2] / this.cellSize);
        return `${x},${y},${z}`;
    }
    addObject(obj) {
        const key = this.getCellKey(obj.position);
        if (!this.grid.has(key))
            this.grid.set(key, []);
        this.grid.get(key).push(obj);
    }
    getNearbyObjects(position) {
        const results = [];
        const centerKey = this.getCellKey(position);
        const [cx, cy, cz] = centerKey.split(',').map(Number);
        for (let x = cx - 1; x <= cx + 1; x++) {
            for (let y = cy - 1; y <= cy + 1; y++) {
                for (let z = cz - 1; z <= cz + 1; z++) {
                    const key = `${x},${y},${z}`;
                    if (this.grid.has(key)) {
                        results.push(...this.grid.get(key));
                    }
                }
            }
        }
        return results;
    }
}
