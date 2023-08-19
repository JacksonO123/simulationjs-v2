import { Color, Line, Simulation, Square, vec3From } from '../src/simulation';

const canvas = new Simulation('canvas', true);
canvas.fitElement();
canvas.start();

const line = new Line(vec3From(-100, -100), vec3From(100, 100), 10);
canvas.add(line);

const square1 = new Square(vec3From(-100, -100), 10, 10, new Color(255, 0, 0));
canvas.add(square1);

const square2 = new Square(vec3From(), 10, 10, new Color(255, 0, 0));
canvas.add(square2);
