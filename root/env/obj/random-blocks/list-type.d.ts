export declare interface ListType {
    id: string;
    id_attr: string;
    modelPath: string;
    texPath: string;
    needsUpdate?: boolean;
    size: {
        w: number;
        h: number;
        d: number;
    }
    colliderScale: {
        w: number;
        h: number;
        d: number;
    }
    updScale: {
        w: number;
        h: number;
        d: number;
    }
}