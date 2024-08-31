import { Camera, Circle, Simulation, color, colorf, vector2, vector3 } from '../src';

const canvas = new Simulation('canvas', new Camera(vector3(0, 0, 5)), true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const circle = new Circle(vector2(400, -400), 20);
canvas.add(circle);

const moon = new Circle(vector2(150), 10, color(0, 0, 255));
circle.add(moon);

const moon2 = new Circle(vector2(40), 6, color(255));
moon.add(moon2);

const orbitTime = 2;

async function main() {
  circle.rotate2d(Math.PI * 2, orbitTime);
  await moon.rotate2d(Math.PI * 2, orbitTime);
  main();
}

main();
