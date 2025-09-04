import { Color } from './utils.js';
export declare class Material {
    protected color: Color;
    protected vertexColors: Color[];
    protected isVertexColors: boolean;
    constructor();
    hasVertexColors(): boolean;
    setHasVertexColors(hasColors: boolean): void;
    getVertexColors(): Color[];
    getColor(): Color;
    addVertexColor(color: Color): void;
    setVertexColors(colors: Color[]): void;
    isTransparent(): boolean;
    setColor(color: Color): void;
    clone(): Material;
}
export declare class BasicMaterial extends Material {
    constructor(color: Color);
}
export declare class VertexColorMaterial extends Material {
    constructor(colors: Color[]);
}
