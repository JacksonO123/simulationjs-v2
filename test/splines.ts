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

// const wireframe = false;
const wireframe = true;

// const detail = undefined;
const detail = 8;

const spline = new Spline2d(
  vertex(400, -400, 0, colorf(255)),
  [
    splinePoint2d(vertex(800, 0, 0, color(0, 123, 255)), vector2(0, 400), vector2(0, -400)),
    continuousSplinePoint2d(vertex(), vector2(0, -400))
  ],
  60,
  detail
);
canvas.add(spline);

const spline2 = new Spline2d(
  vertex(400, -400),
  [
    splinePoint2d(vertex(800), vector2(0, 400), vector2(0, -400)),
    continuousSplinePoint2d(vertex(), vector2(0, -400))
  ],
  60,
  detail
);
spline2.setWireframe(true);
if (wireframe) canvas.add(spline2);

const animationTime = 1;
// const animationTime = 8;

async function main() {
  spline.setInterpolateStart(0);
  spline.setInterpolateLimit(1);
  spline2.setInterpolateStart(0);
  spline2.setInterpolateLimit(1);

  spline.setInterpolateStart(1, animationTime, smoothStep);
  await spline2.setInterpolateStart(1, animationTime, smoothStep);

  spline.setInterpolateLimit(0);
  spline.setInterpolateStart(0);
  spline2.setInterpolateLimit(0);
  spline2.setInterpolateStart(0);

  spline.setInterpolateLimit(1, animationTime, smoothStep);
  await spline2.setInterpolateLimit(1, animationTime, smoothStep);

  await waitFor(0.5);

  main();
}

main();
