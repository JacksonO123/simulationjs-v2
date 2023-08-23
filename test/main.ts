import { Color, Simulation, Square, vec3From } from '../src/simulation';

const canvas = new Simulation('canvas', true);
canvas.fitElement();
canvas.start();

const square1 = new Square(vec3From(-10, -10), 50, 50, new Color(255, 0, 0, 0.5));
canvas.add(square1);

const square3 = new Square(vec3From(), 50, 50, new Color(0, 255, 0, 0.5));
canvas.add(square3);

const square2 = new Square(vec3From(10, 10), 50, 50, new Color(0, 0, 255, 0.5));
canvas.add(square2);
