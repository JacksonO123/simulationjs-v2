import { colorf, vector3, vector2, Square } from '../src';
import { Simulation, Camera } from '../src';

const camera = new Camera(vector3(0, 0, 5));

const canvas = new Simulation('canvas', camera, true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const square = new Square(vector2(300, -300), 50, 50);
canvas.add(square);
square.setCenterOffset(vector3(-100, 100));

const square1 = new Square(vector2(100, -100), 30, 30);
square.add(square1);

(async () => {
  // await square.rotateTo2d(Math.PI, 1);
  // await square.rotateTo2d(Math.PI * 2, 1);

  await square.rotate2d(Math.PI, 1);
  await square.rotate2d(Math.PI, 1);
})();

// square.rotateTo2d(Math.PI);
// square.rotateTo2d(Math.PI);
