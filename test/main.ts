import {
  Camera,
  Circle,
  Cube,
  SceneCollection,
  Simulation,
  Square,
  color,
  colorf,
  smoothStep,
  vector2,
  vector3
} from '../src';

const canvas = new Simulation('canvas', new Camera(vector3(0, 0, 5)), true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

// const collection = new SceneCollection('squares');
// canvas.add(collection);

const square = new Square(vector2(50, 50), 50, 50, color(), 0);
// square.setWireframe(true);
// collection.add(square);
canvas.add(square);

const square2 = new Square(vector2(150, 50), 50, 50, color(0, 0, 255), 0);
canvas.add(square2);

// const circle = new Circle(vector2(300, 200), 100);
// circle.setWireframe(true);
// canvas.add(circle);

// const cube = new Cube(vector3(), 0.5, 0.5, 0.5, color(255));
// cube.setWireframe(true);
// canvas.add(cube);

// let scale = 1;

// async function main() {
//   await cube.rotate(vector3(Math.PI * scale, Math.PI * scale), 2, smoothStep);
//   await cube.rotate(vector3(0, Math.PI * scale), 2);

//   scale *= -1;

//   main();
// }

// setTimeout(() => {
//   cube.scale(2, 1, smoothStep);
//   main();
// }, 800);
