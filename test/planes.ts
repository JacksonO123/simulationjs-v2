import { Camera, Plane, Simulation, color, colorf, vector3, vertex } from '../src';
import { backend } from './SETTINGS';

const canvas = new Simulation('canvas', new Camera(vector3(0, 0, 5)), true, backend);
// const canvas = new Simulation('canvas', new Camera(vector3(0, 0, 5)), true, 'webgl');
canvas.setBackground(colorf(175));
// setTimeout(() => canvas.setBackground(color(255)), 1000);
canvas.fitElement();
canvas.start();

const planeSize = 0.5;

const plane1 = new Plane(
    vector3(),
    [
        vertex(-planeSize, 0, -planeSize),
        vertex(planeSize, 0, -planeSize),
        vertex(planeSize, 0, planeSize),
        vertex(-planeSize, 0, planeSize)
    ],
    color(255, 0, 0),
    vector3(Math.PI / 5)
);
canvas.add(plane1);

const plane2 = new Plane(
    vector3(),
    [
        vertex(-planeSize, planeSize),
        vertex(planeSize, planeSize),
        vertex(planeSize, -planeSize),
        vertex(-planeSize, -planeSize)
    ],
    color(0, 0, 255, 0.5)
);
canvas.add(plane2);

async function main() {
    plane1.rotate(vector3(0, 0, Math.PI * 2), 2);
    await plane2.rotate(vector3(0, Math.PI * 2), 2);
    main();
}

main();
