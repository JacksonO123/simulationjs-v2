import { Camera, Cube, Simulation, Square, color, colorf, smoothStep, vector2, vector3 } from '../src';

const canvas = new Simulation('canvas', new Camera(vector3(0, 0, 5)), true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const square = new Square(vector2(20, 20), 50, 50);
canvas.add(square);

const cube = new Cube(vector3(1), 1, 1, 1, color(255));
// cube.setWireframe(true);
canvas.add(cube);

// cube.scale(2, 1, smoothStep);

let scale = 1;

async function main() {
  // await cube.rotate(vector3(Math.PI * scale, Math.PI * scale), 2, smoothStep);
  await cube.rotate(vector3(0, Math.PI * scale), 2);

  // scale *= -1;

  main();
}

main();
