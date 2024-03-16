import {
  Spline2d,
  colorf,
  vector2,
  vector3,
  splinePoint2d,
  vertex,
  Circle,
  color,
  continuousSplinePoint2d,
  smoothStep
} from '../src';
import { Simulation, Camera } from '../src';

const camera = new Camera(vector3(0, 0, 5));

const canvas = new Simulation('canvas', camera, true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const circle1 = new Circle(vector2(100, 200), 4, color(255));
canvas.add(circle1);

const circle2 = new Circle(vector2(500, 200), 4, color(255));
canvas.add(circle2);

const circle3 = new Circle(vector2(700, 400), 4, color(255));
canvas.add(circle3);

const spline = new Spline2d(
  vector2(100, 200),
  [
    splinePoint2d(vertex(400), vector2(0, 100), vector2(-100, -100)),
    continuousSplinePoint2d(vertex(600, -200), vector2(-100, -100))
  ],
  20
);
spline.setInterpolateLimit(0);
canvas.add(spline);

spline.setInterpolateLimit(1, 1, smoothStep);
