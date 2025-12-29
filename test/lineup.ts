import { colorf, vector3, vector2, Square, Circle } from '../src';
import { Simulation, Camera } from '../src';
import { backend } from './SETTINGS';

const camera = new Camera(vector3(0, 0, 5));

const canvas = new Simulation('canvas', camera, true, backend);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const circle = new Circle(vector2(200, -200), 200);
circle.setWireframe(true);
canvas.add(circle);

const square = new Square(vector2(200, -200), 200, 200);
square.setCenterOffset(vector3(-100, 100));
canvas.add(square);
