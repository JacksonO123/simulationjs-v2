import { Simulation, Square, colorf, vector2 } from '../src';

const canvas = new Simulation('canvas');
canvas.setBackground(colorf(0));
canvas.setDefaultColor(colorf(255));
canvas.fitElement();
canvas.start();

const square = new Square(vector2(500, -500), 200, 200);
square.setWireframe(true);
canvas.add(square);

const limit = 100;
let divisions = 0;

addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        divisions++;
        square.setSubdivisions(divisions, limit);
    } else if (e.key === 'h') {
        square.clearSubdivisionVertexLimit();
    }
});
