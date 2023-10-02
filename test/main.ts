import { Color, Simulation, Square, vec3From, Camera } from '../src/simulation';

const camera = new Camera(vec3From(0, 0, -400), 0.004);

const canvas = new Simulation('canvas', camera, true);
canvas.fitElement();
canvas.start();

// const square = new Square(vec3From(), 100, 100, new Color(255, 0, 0), vec3From(Math.PI / 4, 0, 0));
const square = new Square(vec3From(), 100, 100, new Color(255, 0, 0));
canvas.add(square);

async function main() {
  square.move(vec3From(-200, 0, -200), 2);
  await square.rotate(vec3From(Math.PI, Math.PI), 2);
  await square.rotate(vec3From(Math.PI), 2);
}
main();
