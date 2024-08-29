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
canvas.add(cube1);
cube1.setWireframe(true);

const cube2 = new Cube(vector3(1), 0.2, 0.2, 0.2, color(0, 0, 255));
cube1.add(cube2);
cube2.setWireframe(true);

const time = 5;

// in this case, when rotating on two axis the children do not follow the
// correct path. and they rotate too far
cube1.rotate(vector3(Math.PI * 2, Math.PI * 2), time, easeInOutQuad);

frameLoop(() => {
  cubeTrace.addPoint(cube2.getPos());
})();
