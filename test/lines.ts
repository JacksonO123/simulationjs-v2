import { Camera, Line2d, Line3d, Simulation, colorf, vector3, vertex } from '../src';

const canvas = new Simulation('canvas', new Camera(vector3(0, 0, 5)), true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const line1 = new Line2d(vertex(100, -100), vertex(100, -100), 5);
line1.setWireframe(true);
canvas.add(line1);

line1.setStart(vector3(200, -200), 1);
line1.setEnd(vector3(10, -10), 1);

const line2 = new Line3d(vertex(), vertex(1, 1, -10), 0.1);
// line2.setWireframe(true);
canvas.add(line2);
