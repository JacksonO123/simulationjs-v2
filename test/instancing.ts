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

const mat = matrix4();
const vec = vector3(400);
mat4.translate(mat, vec, mat);

instances[1] = mat;
