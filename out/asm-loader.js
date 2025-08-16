export class AsmLoader {
    async loader(path) {
        try {
            const res = await fetch(path);
            if (!res.ok)
                throw new Error(`Failed to load asm file: ${res.statusText}`);
            return res.text();
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
}
