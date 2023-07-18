/// <reference types="dist" />
export declare class Simulation {
    canvasRef: HTMLCanvasElement | null;
    bgColor: Color;
    private fittingElement;
    constructor(idOrCanvasRef: string | HTMLCanvasElement);
    setCanvasSize(width: number, height: number): void;
    start(): void;
    render(device: GPUDevice, ctx: GPUCanvasContext): void;
    fitElement(): void;
    private assertHasCanvas;
}
export declare class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    constructor(r: number, g: number, b: number, a?: number);
    clone(): Color;
    private compToHex;
    toHex(): string;
}
