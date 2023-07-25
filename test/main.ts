import { Circle, Color, Simulation, vec3From } from '../src/simulation';

const canvas = new Simulation('canvas', true);
canvas.fitElement();
canvas.start();
// canvas.setBackground(new Color(0, 0, 255));

// function easeInOutCubic(x: number): number {
//   return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
// }

const circle = new Circle(vec3From(), 100, new Color(255));
canvas.add(circle);

circle.move(vec3From(0, 0, 0));
