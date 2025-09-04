export const settings = {
    transformAdjustments: true
};
export class Settings {
    constructor() { }
    setTransformAdjustments(value) {
        settings.transformAdjustments = value;
    }
}
