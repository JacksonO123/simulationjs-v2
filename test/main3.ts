import { Camera, Cube, Simulation, color, colorf, smoothStep, vector3, vertex } from '../src';

const canvas = new Simulation('canvas', new Camera(vector3(0, 0, 5)), true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const cube = new Cube(vector3(1), 1, 1, 1, color(255));
cube.setWireframe(true);
canvas.add(cube);

cube.scale(2, 1, smoothStep);

let scale = 1;

async function main() {
  await cube.rotate(vector3(Math.PI * scale, Math.PI * scale), 2, smoothStep);

  scale *= -1;

  main();
}

main();
