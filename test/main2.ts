import {
  Simulation,
  Camera,
  Spline2d,
  colorf,
  vector2,
  vector3,
  splinePoint2d,
  vertex,
  continuousSplinePoint2d,
  smoothStep,
  color
} from '../src';

const canvas = new Simulation('canvas', new Camera(vector3(0, 0, 5)), true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const spline = new Spline2d(
  vertex(100, 200, 0, color(255)),
  [
    splinePoint2d(vertex(400, 0, 0, color(0, 255)), vector2(0, 100), vector2(-100, -100)),
    continuousSplinePoint2d(vertex(600, -200, 0, color(0, 0, 255)), vector2(-100, -100))
  ],
  20
);
canvas.add(spline);

async function drawSpline() {
  await spline.setInterpolateLimit(0, 1, smoothStep);
  spline.setInterpolateLimit(1, 2, smoothStep);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    drawSpline();
  }
});

// const circle1 = new Circle(vector2(100, 200), 4, color(255));
// canvas.add(circle1);

// const circle2 = new Circle(vector2(500, 200), 4, color(255));
// canvas.add(circle2);

// const circle3 = new Circle(vector2(700, 400), 4, color(255));
// canvas.add(circle3);
