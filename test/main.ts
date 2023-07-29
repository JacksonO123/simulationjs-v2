import { Polygon, Simulation, vec3From, vec3, randomColor } from '../src/simulation';

const canvas = new Simulation('canvas', true);
canvas.fitElement();
canvas.start();

// function easeInOutCubic(x: number): number {
//   return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
// }
