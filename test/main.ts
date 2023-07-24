import { Color, Simulation, Square, vec3From } from '../src/simulation';

const canvas = new Simulation('canvas');
canvas.fitElement();
canvas.start();
canvas.setBackground(new Color(0, 0, 255));

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

const square = new Square(vec3From(), 100, 100, new Color(255, 0, 0));
canvas.add(square);

(async function main() {
  await square.setWidth(400, 1, easeInOutCubic);
  square.scale(2, 1, easeInOutCubic);
})();
