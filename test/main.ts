import {
  Simulation,
  vector3,
  Camera,
  colorf,
  Square,
  vector2,
  Plane,
  vertex,
  color
} from '../src/simulation';

const camera = new Camera(vector3(0, 0, 4));

const canvas = new Simulation('canvas', camera, true);
canvas.setBackground(colorf(125));
canvas.fitElement();
canvas.start();

// const square = new Square(vector2(0, 0), 100, 50, color(0, 0, 255));
// const square = new Square(vector2(0, 0), 50, 100, color(0, 0, 255));
const square = new Square(vector2(100, 100), 50, 50, color(0, 0, 255));
canvas.add(square);

// setTimeout(() => {
square.rotate(Math.PI / 2, 2);
// square.scaleWidth(2, 1);
// }, 500);

// const plane1 = new Plane(
//   vector3(),
//   [vertex(-1, 0, -1), vertex(1, 0, -1), vertex(1, 0, 1), vertex(-1, 0, 1)],
//   vector3(-Math.PI / 4, Math.PI / 4),
//   color(255, 0, 0)
// );
// canvas.add(plane1);

// const plane2 = new Plane(
//   vector3(),
//   [vertex(-1, 1), vertex(1, 1), vertex(1, -1), vertex(-1, -1)],
//   vector3(),
//   color(0, 0, 255)
// );
// canvas.add(plane2);

// (async function main() {
//   plane1.rotate(vector3(0, 0, Math.PI * 2), 2);
//   await plane2.rotate(vector3(0, Math.PI * 2), 2);
//   main();
// })();

// const square = new Square(vector3(), 1, 1, color(255), vector3());
// canvas.add(square);
