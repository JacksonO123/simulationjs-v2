import { mat4 } from 'wgpu-matrix';
import { Camera, Instance, Simulation, Square, colorf, vector2, vector3, color, matrix4 } from '../src';

const canvas = new Simulation('canvas', new Camera(vector3(0, 0, 5)), true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const square = new Square(vector2(100, -100), 100, 100, color(255));
const instance = new Instance(square, 2);
canvas.add(instance);

const instances = instance.getInstances();

for (let i = 1; i < 2; i++) {
  const mat = matrix4();
  const vec = vector3(300 * i);
  mat4.translate(mat, vec, mat);
  instances[i] = mat;
}

setTimeout(() => {
  instance.setNumInstances(4);

  for (let i = 2; i < 4; i++) {
    const mat = matrix4();
    const vec = vector3(300 * i);
    mat4.translate(mat, vec, mat);
    instance.setInstance(i, mat);
  }

  console.log(instance.getInstances());
}, 1000);

setTimeout(() => {
  instance.setNumInstances(2);
}, 2000);
