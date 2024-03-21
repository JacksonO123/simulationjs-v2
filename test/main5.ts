import { Camera, Line3d, Simulation, colorf, vector3, vertex } from '../src';

const canvas = new Simulation('canvas', new Camera(vector3(0, 0, 5)), true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const line = new Line3d(vertex(), vertex(1, 1, -1), 0.1);
line.setWireframe(true);
canvas.add(line);
