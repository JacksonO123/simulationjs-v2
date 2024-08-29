import {
  Camera,
  Cube,
  Simulation,
  TraceLines3d,
  color,
  colorf,
  easeInOutQuad,
  frameLoop,
  vector3
} from '../src';

const canvas = new Simulation('canvas', new Camera(vector3(0, 0, 8)), true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

// canvas.setTransformAdjustments(false);

// const moonTrace = new TraceLines2d(color(0, 0, 255), 150);
// canvas.add(moonTrace);

// const moonTrace2 = new TraceLines2d(color(255), 150);
// canvas.add(moonTrace2);

// const circle = new Circle(vector2(500, -400), 20);
// canvas.add(circle);

// const moon = new Circle(vector2(400, -300), 10, color(0, 0, 255));
// circle.add(moon);

// const moon2 = new Circle(vector2(400, -250), 6, color(255));
// moon.add(moon2);

// frameLoop(() => {
//   moonTrace.addPoint(moon.getPos());
//   moonTrace2.addPoint(moon2.getPos());
// })();

// const orbitTime = 2;

// async function rotateCircle() {
//   await circle.rotate2d(Math.PI * 2, orbitTime);
//   rotateCircle();
// }

// async function rotateMoon() {
//   await moon.rotate2d(-Math.PI * 2, orbitTime / 4);
//   rotateMoon();
// }

// rotateCircle();
// rotateMoon();

const cubeTrace1 = new TraceLines3d(color(255));
canvas.add(cubeTrace1);

const cubeTrace2 = new TraceLines3d(color(0, 0, 255));
canvas.add(cubeTrace2);

const cube = new Cube(vector3(), 0.5, 0.5, 0.5);
canvas.add(cube);
cube.setWireframe(true);

const cube1 = new Cube(vector3(1, 1), 0.3, 0.3, 0.3, color(255));
// const cube1 = new Cube(vector3(0, 0, 1), 0.3, 0.3, 0.3, color(255));
cube.add(cube1);
cube1.setWireframe(true);

const cube2 = new Cube(vector3(1), 0.2, 0.2, 0.2, color(0, 0, 255));
cube1.add(cube2);
cube2.setWireframe(true);

// const time = 15;
const time = 5;

// cube.rotate(vector3(Math.PI * 2), time, easeInOutQuad);
// cube.rotate(vector3(0, Math.PI * 2), time, easeInOutQuad);
// cube.rotate(vector3(0, 0, Math.PI * 2), time, easeInOutQuad);

// cube.rotate(vector3(Math.PI * 2), time, easeInOutQuad);

(async () => {
  // cube.rotate(vector3(Math.PI * 2, Math.PI * 2), time, easeInOutQuad);
  cube.rotate(vector3(Math.PI * 2), time, easeInOutQuad);
  // cube1.rotate(vector3(Math.PI * 2), time, easeInOutQuad);
  // await cube1.rotate(vector3(0, Math.PI * 2), time, easeInOutQuad);
  // cube1.rotate(vector3(Math.PI * 2), time, easeInOutQuad);
  // await cube1.rotate(vector3(0, Math.PI * 2), time, easeInOutQuad);
})();

frameLoop(() => {
  cubeTrace1.addPoint(cube1.getPos());
  cubeTrace2.addPoint(cube2.getPos());
})();
