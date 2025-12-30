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

const canvas = new Simulation('canvas', { camera, showFrameRate: true });
canvas.setBackground(colorf(0));
canvas.setDefaultColor(colorf(255));
canvas.fitElement();
canvas.start();

const circle = new Circle(vector2(300, -300), 100);
canvas.add(circle);

const square = new Square(vector2(500, -500), 200, 200);

let fromCircle = true;
const animationTime = 1;

addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if (fromCircle) {
            transform(circle, square, animationTime, easeInOutQuad);
        } else {
            transform(square, circle, animationTime, easeInOutQuad);
        }

        fromCircle = !fromCircle;
    }
});
