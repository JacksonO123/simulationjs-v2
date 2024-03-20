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
  easeInOutQuad,
  smoothStep
} from '../src';

const canvas = new Simulation('canvas', new Camera(vector3(0, 0, 5)), true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

// const spline = new Spline2d(
//   vertex(100, 200, 0, color(255)),
//   [
//     splinePoint2d(vertex(400, 0, 0, color(0, 123, 255)), vector2(0, 100), vector2(-100, -100)),
//     continuousSplinePoint2d(vertex(600, -200, 0, color(0, 255)), vector2(-100, -100))
//   ],
//   20
// );

const spline = new Spline2d(
  vertex(200, 200, 0, color(0, 0, 0, 0)),
  [
    splinePoint2d(vertex(400, 0, 0, color(0, 123, 255)), vector2(0, 200), vector2(0, -200)),
    continuousSplinePoint2d(vertex(), vector2(0, -200))
  ],
  30
);
canvas.add(spline);

const animationTime = 1;

async function main() {
  spline.setInterpolateStart(0);
  spline.setInterpolateLimit(0);

  // await spline.setInterpolateLimit(1, animationTime, smoothStep);
  // await spline.setInterpolateStart(1, animationTime, smoothStep);

  await spline.setInterpolateLimit(1, animationTime);
  await spline.setInterpolateStart(1, animationTime);

  main();
}

main();

// async function drawSpline(speed: number) {
//   await spline.setInterpolateLimit(0, 1, smoothStep);
//   spline.setInterpolateLimit(1, speed, smoothStep);
// }

// const input = document.createElement('input');

// input.setAttribute('type', 'range');
// input.setAttribute('min', '0');
// input.setAttribute('max', '1');
// input.setAttribute('step', '0.0001');

// input.oninput = (e) => {
//   // @ts-ignore
//   const value = +e.target.value;
//   spline.setInterpolateLimit(value);
// };

// document.body.appendChild(input);

// document.addEventListener('keydown', (e) => {
//   if (e.key === 'Enter') {
//     drawSpline(1);
//   } else if (e.key === 's') {
//     drawSpline(10);
//   }
// });
