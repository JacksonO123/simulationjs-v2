import { colorf, vector3, vector2, Square, Circle } from '../src';
import { Simulation, Camera } from '../src';

const camera = new Camera(vector3(0, 0, 5));

const canvas = new Simulation('canvas', camera, true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const square = new Square(vector2(200, -200), 200, 200);
square.setCenterOffset(vector3(-100, 100));
canvas.add(square);

const circle = new Circle(vector2(200, -200), 200);
circle.setWireframe(true);
canvas.add(circle);
