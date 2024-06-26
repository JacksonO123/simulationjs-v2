import { Camera, Plane, Simulation, color, colorf, vector3, vertex } from '../src';

const canvas = new Simulation('canvas', new Camera(vector3(0, 0, 5)), true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const plane1 = new Plane(
  vector3(),
  [vertex(-1, 0, -1), vertex(1, 0, -1), vertex(1, 0, 1), vertex(-1, 0, 1)],
  color(255, 0, 0),
  vector3(-Math.PI / 4, Math.PI / 4)
);
canvas.add(plane1);

const plane2 = new Plane(
  vector3(),
  [vertex(-1, 1), vertex(1, 1), vertex(1, -1), vertex(-1, -1)],
  color(0, 0, 255),
  vector3()
);
canvas.add(plane2);

async function main() {
  plane1.rotate(vector3(0, 0, Math.PI * 2), 2);
  await plane2.rotate(vector3(0, Math.PI * 2), 2);
  main();
}

main();
