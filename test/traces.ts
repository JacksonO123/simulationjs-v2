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

const cubeTrace = new TraceLines3d(color(0, 0, 255));
canvas.add(cubeTrace);

const cube1 = new Cube(vector3(), 0.3, 0.3, 0.3);
cube1.setWireframe(true);
canvas.add(cube1);

// const cube2 = new Cube(vector3(1, 1, 1), 0.2, 0.2, 0.2, color(0, 0, 255));
const cube2 = new Cube(vector3(1, 0, 1), 0.2, 0.2, 0.2, color(0, 0, 255));
cube2.setWireframe(true);
cube1.add(cube2);

// const time = 15;
// const time = 5;
const time = 2;

cube1.rotate(vector3(Math.PI * 2, Math.PI * 2), time, easeInOutQuad);

(async () => {
  // await cube1.rotate(vector3(Math.PI * 2), time, easeInOutQuad);
  // await cube1.rotate(vector3(0, Math.PI * 2), time, easeInOutQuad);
  // await cube1.rotate(vector3(0, 0, Math.PI * 2), time, easeInOutQuad);
})();

// frameLoop((_, thing) => {
//   console.log(thing);
//   cube2.rotateAroundTo(cube1.getPos(), vector3(0, thing));
//   return [thing + 0.01];
// })(0);

frameLoop(() => {
  // const offset = cloneBuf(cube1.getCenterOffset());
  // const pos = cube1.getPos();
  // const rotation = cube1.getRotation();

  // vec3.rotateX(offset, origin0, rotation[0], offset);
  // vec3.rotateY(offset, origin0, rotation[1], offset);
  // vec3.rotateZ(offset, origin0, rotation[2], offset);
  // vec3.add(offset, pos, offset);

  // cubeTrace.addPoint(offset);

  cubeTrace.addPoint(cube2.getPos());
})();
