import { Simulation, Camera, colorf, vector3, color, Cube, easeInOutQuad } from '../src';

const canvas = new Simulation('canvas', {
    camera: new Camera(vector3(0, 0, 5)),
    showFrameRate: true
});
// canvas.setBackground(colorf(175));
canvas.setBackground(colorf(0));
canvas.fitElement();
canvas.start();

const cube1 = new Cube(vector3(), 1, 1, 1, color(255, 0, 0));
canvas.add(cube1);

const cube2 = new Cube(vector3(0.5), 1, 1, 1, color(0, 0, 255, 0.3));
cube1.add(cube2);

const time = 10;

async function main() {
    await cube1.rotate(vector3(0, Math.PI * 2), time);
    main();
}

async function blink() {
    await cube1.fill(color(255, 0, 0, 0.2), 1, easeInOutQuad);
    await cube1.fill(color(255, 0, 0, 0.6), 0.1);
    blink();
}

main();
blink();
