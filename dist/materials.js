import { color } from './utils.js';
export class Material {
    color;
    vertexColors;
    isVertexColors;
    constructor() {
        this.color = color();
        this.vertexColors = [];
        this.isVertexColors = false;
    }
    hasVertexColors() {
        return this.isVertexColors;
    }
    setHasVertexColors(hasColors) {
        this.isVertexColors = hasColors;
    }
    getVertexColors() {
        return this.vertexColors;
    }
    getColor() {
        return this.color;
    }
    addVertexColor(color) {
        this.vertexColors.push(color);
    }
    setVertexColors(colors) {
        this.vertexColors = colors;
    }
    isTransparent() {
        if (this.isVertexColors) {
            for (let i = 0; i < this.vertexColors.length; i++) {
                if (this.vertexColors[i].isTransparent())
                    return true;
            }
            return false;
        }
        return this.color.isTransparent();
    }
    setColor(color) {
        this.color = color;
    }
    clone() {
        const res = new Material();
        res.setColor(this.color.clone());
        res.setVertexColors(this.vertexColors.map((color) => color.clone()));
        res.setHasVertexColors(this.isVertexColors);
        return res;
    }
}
export class BasicMaterial extends Material {
    constructor(color) {
        super();
        this.color = color;
    }
}
export class VertexColorMaterial extends Material {
    constructor(colors) {
        super();
        this.vertexColors = colors;
        this.isVertexColors = true;
    }
}
