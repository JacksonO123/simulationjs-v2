import {
    Camera,
    Circle,
    Cube,
    Simulation,
    Square,
    color,
    colorf,
    smoothStep,
    vector2,
    vector3
} from '../src';
import { backend } from './SETTINGS';

const canvas = new Simulation('canvas', {
    camera: new Camera(vector3(0, 0, 5)),
    showFrameRate: true,
    backend: backend
});
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const square = new Square(vector2(100, -100), 100, 100, color(255));
// square.setWireframe(true);
canvas.add(square);

square.move(vector3(100), 1);
square.rotate2d(Math.PI * 2, 1);

const circle = new Circle(vector2(100, -100), 100);
circle.setWireframe(true);
canvas.add(circle);

const cube = new Cube(vector3(), 0.5, 0.5, 0.5, color(255));
cube.setWireframe(true);
canvas.add(cube);

let scale = 1;

async function main() {
    await cube.rotate(vector3(Math.PI * scale, Math.PI * scale), 2, smoothStep);
    await cube.rotate(vector3(0, Math.PI * scale), 2);

    scale *= -1;

    main();
}

setTimeout(() => {
    cube.scale(2, 1, smoothStep);
    main();
}, 800);
