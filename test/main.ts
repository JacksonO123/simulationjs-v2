import { Color, Line, Simulation, Square, vec3From } from '../src/simulation';

const canvas = new Simulation('canvas', true);
canvas.fitElement();
canvas.start();

const square = new Square(vec3From(), 25, 25, new Color(255), Math.PI / 2);
canvas.add(square);

const line = new Line(vec3From(-100), vec3From(100), 2);
canvas.add(line);

line.setThickness(10, 1);
