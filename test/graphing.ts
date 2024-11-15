import { Simulation, Camera, colorf, vector3 } from '../src';

const camera = new Camera(vector3(0, 0, 5));

const canvas = new Simulation('canvas', camera, true);
canvas.setBackground(colorf(0));
canvas.setDefaultColor(colorf(255));
canvas.fitElement();
canvas.start();
