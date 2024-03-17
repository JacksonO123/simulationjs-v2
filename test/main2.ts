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

// const spline = new Spline2d(
//   vertex(100, 200, 0, color(255)),
//   [
//     splinePoint2d(vertex(400, 0, 0, color(0, 123, 255)), vector2(0, 100), vector2(-100, -100)),
//     continuousSplinePoint2d(vertex(600, -200, 0, color(0, 255)), vector2(-100, -100))
//   ],
//   20,
// );
const spline = new Spline2d(
  vertex(200, 200),
  [
    splinePoint2d(vertex(200, 0, 0, color(0, 123, 255)), vector2(0, 100), vector2(0, -100)),
    continuousSplinePoint2d(vertex(), vector2(0, -100))
  ],
  15
);
canvas.add(spline);

spline.fill(colorf(255), 1);

// setTimeout(() => {
//   spline.fill(color(0, 255), 1);
// }, 2000);

spline.setInterpolateLimit(0);
spline.setInterpolateLimit(1, 1, smoothStep);

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
