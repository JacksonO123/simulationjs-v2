import { mat4, vec3 } from 'wgpu-matrix';
import { Polygon, Vertex, colorf, vector3, vertex, randomColor, randomInt, vector2, Color } from '../src';
import { Simulation, Camera } from '../src';

const camera = new Camera(vector3(0, 0, 5));

const canvas = new Simulation('canvas', camera, true);
canvas.setBackground(colorf(0));
canvas.fitElement();
canvas.start();

const radius = 200;
const startPoints = generatePoints(4, radius);

const polygon = new Polygon(vector2(200, -200), startPoints);
// polygon.setWireframe(true);
canvas.add(polygon);

const otherPoints = generatePoints(4, radius, colorf(255));
const overlap = new Polygon(vector2(200, -200), otherPoints);
overlap.setWireframe(true);
canvas.add(overlap);

function easeOutElastic(x: number): number {
  const c4 = (2 * Math.PI) / 3;

  return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
}

async function main() {
  const maxPoints = 10;
  const minPoints = 3;
  const numPoints = randomInt(maxPoints, minPoints);

  const newPoints = generatePoints(numPoints, radius);
  const otherPoints = generatePoints(numPoints, radius, colorf(255));
  overlap.setVertices(otherPoints, 1.5, easeOutElastic);
  await polygon.setVertices(newPoints, 1.5, easeOutElastic);
  main();
}

main();

function generatePoints(numPoints: number, radius: number, color?: Color) {
  const points: Vertex[] = [];
  const rotInc = (Math.PI * 2) / numPoints;

  for (let i = 0; i < numPoints; i++) {
    const rotMat = mat4.identity();
    mat4.rotateZ(rotMat, rotInc * i, rotMat);

    const pos = vector3(1);
    vec3.scale(pos, radius, pos);
    vec3.transformMat4(pos, rotMat, pos);

    points.push(vertex(pos[0], pos[1], pos[2], color ?? randomColor()));
  }

  return points;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    console.log(JSON.stringify(polygon.getVertices()));
  }
});
