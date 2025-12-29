import { colorf, vector3, vector2, Square, TraceLines2d, frameLoop } from '../src';
import { Simulation, Camera } from '../src';
import { backend } from './SETTINGS';

const camera = new Camera(vector3(0, 0, 5));

const canvas = new Simulation('canvas', camera, true, backend);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const trace1 = new TraceLines2d();
canvas.add(trace1);

const trace2 = new TraceLines2d();
canvas.add(trace2);

const square = new Square(vector2(300, -300), 50, 50);
canvas.add(square);
square.setCenterOffset(vector3(300));

const square1 = new Square(vector2(-100, 100), 30, 30);
square.add(square1);

(async () => {
    // await square.rotateTo2d(Math.PI, 1);
    // await square.rotateTo2d(Math.PI * 2, 1);

    await square.rotate2d(Math.PI, 1);
    await square.rotate2d(Math.PI, 1);
})();

frameLoop(() => {
    trace1.addPoint(square.getPos());
    trace2.addPoint(square1.getPos());
})();
