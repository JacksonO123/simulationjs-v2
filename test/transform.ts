import {
  Simulation,
  Camera,
  Circle,
  Square,
  colorf,
  vector2,
  vector3,
  transform,
  easeInOutQuad
} from '../src';

const camera = new Camera(vector3(0, 0, 5));

const canvas = new Simulation('canvas', camera, true);
canvas.setBackground(colorf(0));
canvas.setDefaultColor(colorf(255));
canvas.fitElement();
canvas.start();

const circle = new Circle(vector2(300, -300), 100);
canvas.add(circle);

const square = new Square(vector2(500, -500), 200, 200);

setTimeout(async () => {
  transform(circle, square, 2, easeInOutQuad);
}, 1000);

// const square = new Square(vector2(500, -500), 200, 200);
// square.setWireframe(true);
// canvas.add(square);
// square.setSubdivisions(5);
// const squareVertices = square.getVertices();

// const circle = new Circle(vector2(300, -300), 100, canvas.getDefaultColor(), squareVertices.length);
// const circleVertices = cloneVectors(circle.getVertices());
// canvas.add(circle);

// const polygon = new Polygon(vector2(700, -700), vectorsToVertex(circleVertices));
// canvas.add(polygon);

// setTimeout(() => {
//   polygon.setVertices(vectorsToVertex(squareVertices), 1, easeInOutQuart);
// }, 500);
