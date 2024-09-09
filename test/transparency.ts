import { Simulation, Camera, colorf, vector3, color, Cube } from '../src';

const canvas = new Simulation('canvas', new Camera(vector3(0, 0, 5)), true);
// canvas.setBackground(colorf(175));
canvas.setBackground(colorf(0));
canvas.fitElement();
canvas.start();

const cube1 = new Cube(vector3(), 1, 1, 1, color(255, 0, 0, 0.5));
canvas.add(cube1);

const cube2 = new Cube(vector3(0.5), 1, 1, 1, color(0, 0, 255, 0.5));
cube1.add(cube2);

const time = 10;

async function main() {
  await cube1.rotate(vector3(0, Math.PI * 2), time);
  main();
}

main();
