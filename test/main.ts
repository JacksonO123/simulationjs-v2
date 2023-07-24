import { Color, Simulation, Square, vec3From } from '../src/simulation';

const canvas = new Simulation('canvas', true);
canvas.fitElement();
canvas.start();
// canvas.setBackground(new Color(0, 0, 255));

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

const square1 = new Square(vec3From(200, 200), 100, 100, new Color(255, 0, 0));
canvas.add(square1);

const square2 = new Square(vec3From(-200, -200), 100, 100, new Color(255, 0, 0));
canvas.add(square2);

(async function main() {
  square1.setWidth(400, 1, easeInOutCubic);
  await square2.setWidth(400, 1, easeInOutCubic);

  square1.scale(2, 1, easeInOutCubic);
  await square2.scale(2, 1, easeInOutCubic);

  square1.rotate(Math.PI, 1, easeInOutCubic);
  square2.rotate(Math.PI, 1, easeInOutCubic);
})();
