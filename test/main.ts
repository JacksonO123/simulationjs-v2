import { Circle, Plane, SceneCollection, Square, color, colorf, vector2, vector3, vertex } from '../src';
import { Simulation, Camera } from '../src';

const camera = new Camera(vector3(0, 0, 5));

const canvas = new Simulation('canvas', camera, true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const planes = new SceneCollection('planes');
canvas.add(planes);

const circle = new Circle(vector2(500, 500), 5, color(255));
canvas.add(circle);

const square = new Square(vector2(400, 200), 5, 5, color(0, 0, 255));
canvas.add(square);
square.scale(20, 1);
square.rotate(Math.PI, 1);

const plane1 = new Plane(
  vector3(),
  [
    vertex(-1, 0, -1, color(0, 255, 255)),
    vertex(1, 0, -1, color(0, 255, 255)),
    vertex(1, 0, 1),
    vertex(-1, 0, 1)
  ],
  vector3(-Math.PI / 4, Math.PI / 4),
  color(255, 0, 0)
);
planes.add(plane1);

const plane2 = new Plane(
  vector3(),
  [vertex(-1, 1), vertex(1, 1), vertex(1, -1), vertex(-1, -1)],
  vector3(),
  color(0, 0, 255)
);
planes.add(plane2);

(async function main() {
  plane1.rotate(vector3(0, 0, Math.PI * 2), 2);
  await plane2.rotate(vector3(0, Math.PI * 2), 2);
  main();
})();
