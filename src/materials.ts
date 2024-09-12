import { Color, color } from './utils.js';

export class Material {
  protected color: Color;
  protected vertexColors: Color[];
  protected isVertexColors: boolean;

  constructor() {
    this.color = color();
    this.vertexColors = [];
    this.isVertexColors = false;
  }

  hasVertexColors() {
    return this.isVertexColors;
  }

  getVertexColors() {
    return this.vertexColors;
  }

  getColor() {
    return this.color;
  }

  addVertexColor(color: Color) {
    this.vertexColors.push(color);
  }

  setVertexColors(colors: Color[]) {
    this.vertexColors = colors;
  }

  isTransparent() {
    if (this.isVertexColors) {
      for (let i = 0; i < this.vertexColors.length; i++) {
        if (this.vertexColors[i].isTransparent()) return true;
      }

      return false;
    }

    return this.color.isTransparent();
  }

  setColor(color: Color) {
    this.color = color;
  }
}

export class BasicMaterial extends Material {
  constructor(color: Color) {
    super();

    this.color = color;
  }
}

export class VertexColorMaterial extends Material {
  constructor() {
    super();

    this.isVertexColors = true;
  }
}
