import { colorf, vector3, vector2, Square, SceneCollection, Circle } from '../src';
import { Simulation, Camera } from '../src';

const camera = new Camera(vector3(0, 0, 5));

const canvas = new Simulation('canvas', camera, true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const square = new Square(vector2(100, -100), 50, 50);
canvas.add(square);

const collection = new SceneCollection('test');
canvas.add(collection);

const circle1 = new Circle(vector2(200, -100), 20);
collection.add(circle1);

const circle2 = new Circle(vector2(300, -100), 20);
collection.add(circle2);
