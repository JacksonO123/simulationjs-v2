export const settings = {
  transformAdjustments: true
};

export class Settings {
  constructor() {}

  setTransformAdjustments(value: boolean) {
    settings.transformAdjustments = value;
  }
}
