import { Color, color } from './utils.js';

class Logger {
    constructor() {}

    private fmt(msg: string) {
        return `(SimJS) ${msg}`;
    }

    log(msg: string) {
        console.log(this.fmt(msg));
    }
    error(msg: string) {
        return new Error(this.fmt(msg));
    }
    warn(msg: string) {
        console.warn(this.fmt(msg));
    }
    log_error(msg: string) {
        console.error(this.fmt(msg));
    }
}

export const logger = new Logger();

export class GlobalInfo {
    private defaultColor: Color | null;

    constructor() {
        this.defaultColor = null;
    }

    setDefaultColor(color: Color) {
        this.defaultColor = color;
    }

    getDefaultColor() {
        return this.defaultColor?.clone() ?? color();
    }
}

export const globalInfo = new GlobalInfo();
