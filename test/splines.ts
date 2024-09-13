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
  color,
  smoothStep,
  waitFor
} from '../src';

const canvas = new Simulation('canvas', new Camera(vector3(0, 0, 5)), true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const spline = new Spline2d(
  vertex(200, -200, 0, colorf(255)),
  [
    splinePoint2d(vertex(400, 0, 0, color(0, 123, 255)), vector2(0, 200), vector2(0, -200)),
    continuousSplinePoint2d(vertex(), vector2(0, -200))
  ],
  30
  // 8
);
// spline.setWireframe(true);
canvas.add(spline);

const animationTime = 1;
// const animationTime = 8;

async function main() {
  spline.setInterpolateStart(0);
  spline.setInterpolateLimit(1);

  await spline.setInterpolateStart(1, animationTime, smoothStep);
  spline.setInterpolateLimit(0);
  spline.setInterpolateStart(0);
  await spline.setInterpolateLimit(1, animationTime, smoothStep);

  await waitFor(0.5);

  main();
}

main();
