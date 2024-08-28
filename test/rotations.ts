import { colorf, vector3, Cube, easeInOutQuad, color } from '../src';
import { Simulation, Camera } from '../src';

const camera = new Camera(vector3(0, 0, 5));

const canvas = new Simulation('canvas', camera, true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const cube = new Cube(vector3(), 0.5, 0.5, 0.5);
canvas.add(cube);

const cube1 = new Cube(vector3(1), 0.3, 0.3, 0.3, color(255));
cube.add(cube1);

const cube2 = new Cube(vector3(1.5), 0.2, 0.2, 0.2, color(0, 0, 255));
cube1.add(cube2);

const time = 5;

cube.rotate(vector3(0, 0, Math.PI * 2), time, easeInOutQuad);
cube1.rotate(vector3(Math.PI * 4), time, easeInOutQuad);
cube2.rotate(vector3(0, Math.PI * 4), time, easeInOutQuad);
