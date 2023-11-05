import { Color, Simulation, vec3From, Camera, Plane } from '../src/simulation';

const camera = new Camera(vec3From(0, 0, 4));

const canvas = new Simulation('canvas', camera, true);
canvas.fitElement();
canvas.start();

const plane1 = new Plane(
  vec3From(),
  [
    vec3From(-1, 0, -1),
    vec3From(1, 0, -1),
    vec3From(-1, 0, 1),
    vec3From(1, 0, -1),
    vec3From(1, 0, 1),
    vec3From(-1, 0, 1)

    // vec3From(1, -1, 1),
    // vec3From(-1, -1, 1),
    // vec3From(-1, -1, -1),
    // vec3From(1, -1, -1),
    // vec3From(1, -1, 1),
    // vec3From(-1, -1, -1)
  ],
  vec3From(-Math.PI / 4, Math.PI / 4),
  new Color(255, 0, 0)
);
canvas.add(plane1);

const plane2 = new Plane(
  vec3From(),
  [vec3From(-1, 1), vec3From(1, 1), vec3From(-1, -1), vec3From(-1, -1), vec3From(1, 1), vec3From(1, -1)],
  vec3From(0, Math.PI / 4),
  new Color(0, 0, 255)
);
canvas.add(plane2);

// async function main() {
//   square.moveTo(vec3From(0, 0, -600), 4);
// }
// main();
