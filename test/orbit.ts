import {
    Camera,
    Circle,
    Simulation,
    TraceLines2d,
    color,
    colorf,
    frameLoop,
    vector2,
    vector3
} from '../src';
import { backend } from './SETTINGS';

const canvas = new Simulation('canvas', {
    camera: new Camera(vector3(0, 0, 5)),
    showFrameRate: true,
    backend
});
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

canvas.setTransformAdjustments(false);

const moonTrace = new TraceLines2d(color(0, 0, 255), 100);
canvas.add(moonTrace);

const moonTrace2 = new TraceLines2d(color(255), 100);
canvas.add(moonTrace2);

const circle = new Circle(vector2(800, -800), 40);
canvas.add(circle);

const moon = new Circle(vector2(300), 20, color(0, 0, 255));
circle.add(moon);

const moon2 = new Circle(vector2(80), 12, color(255));
moon.add(moon2);

const orbitTime = 2;

frameLoop(() => {
    moonTrace.addPoint(moon.getPos());
    moonTrace2.addPoint(moon2.getPos());
})();

async function rotateCircle() {
    await circle.rotate2d(Math.PI * 2, orbitTime * 2);
    rotateCircle();
}

async function rotateMoon() {
    await moon.rotate2d(Math.PI * 2, orbitTime / 2);
    rotateMoon();
}

rotateCircle();
rotateMoon();
