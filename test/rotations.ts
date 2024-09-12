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

const canvas = new Simulation(
  'canvas',
  new Camera(vector3(-3, 3, 6), vector3(Math.PI / 8, Math.PI / 6)),
  true
);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const cubeTrace = new TraceLines3d(color(255));
canvas.add(cubeTrace);

const cubeTrace2 = new TraceLines3d(color(0, 0, 255));
canvas.add(cubeTrace2);

const cube1 = new Cube(vector3(), 1, 1, 1, color(0, 255));
// cube1.setWireframe(true);
canvas.add(cube1);

const cube2 = new Cube(vector3(1), 1, 1, 1, color(255));
// cube2.setWireframe(true);
cube1.add(cube2);

const cube3 = new Cube(vector3(2), 1, 1, 1, color(0, 0, 255));
// cube3.setWireframe(true);
cube2.add(cube3);

// const time = 15;
const time = 5;
// const time = 2;

function run() {
  cube1.rotate(vector3(Math.PI * 2, Math.PI * 2), time, easeInOutQuad);
  cube2.rotate(vector3(Math.PI * 2, Math.PI * 2), time, easeInOutQuad);
  cube3.rotate(vector3(Math.PI * 2, Math.PI * 2), time, easeInOutQuad);
}

document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') run();
});

(async () => {
  // await cube1.rotate(vector3(Math.PI * 2), time, easeInOutQuad);
  // await cube1.rotate(vector3(0, Math.PI * 2), time, easeInOutQuad);
  // await cube1.rotate(vector3(0, 0, Math.PI * 2), time, easeInOutQuad);
})();

frameLoop(() => {
  // const offset = cloneBuf(cube1.getCenterOffset());
  // const pos = cube1.getPos();
  // const rotation = cube1.getRotation();
  // vec3.rotateX(offset, origin0, rotation[0], offset);
  // vec3.rotateY(offset, origin0, rotation[1], offset);
  // vec3.rotateZ(offset, origin0, rotation[2], offset);
  // vec3.add(offset, pos, offset);
  // cubeTrace.addPoint(offset);

  // cubeTrace.addPoint(cube2.getPos());
  // cubeTrace2.addPoint(cube3.getPos());

  cubeTrace.addPoint(cube2.getPos());
  cubeTrace2.addPoint(cube3.getPos());
})();
