import { Polygon, colorf, vector3, vertex, color, vector2 } from '../src';
import { Simulation, Camera } from '../src';

const camera = new Camera(vector3(0, 0, 5));

const canvas = new Simulation('canvas', camera, true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const verticyOptions = [
  [
    {
      pos: { '0': 200, '1': 0, '2': 0 },
      color: { r: 177.08090209960938, g: 149.9838104248047, b: 39.14548873901367, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -98.69213104248047, '1': 173.342529296875, '2': 0 },
      color: { r: 38.85450744628906, g: 250.52316284179688, b: 199.41217041015625, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100.49955749511719, '1': -170.8548126220703, '2': 0 },
      color: { r: 152.678955078125, g: 24.673168182373047, b: 163.3718719482422, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100.49955749511719, '1': -172.7552490234375, '2': 0 },
      color: { r: 152.37991333007812, g: 23.549636840820312, b: 163.1212921142578, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -98.69213104248047, '1': -173.342529296875, '2': 0 },
      color: { r: 151.37757873535156, g: 23.881046295166016, b: 162.54733276367188, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    }
  ],
  [
    {
      pos: { '0': 200, '1': 0, '2': 0 },
      color: { r: 23.511472702026367, g: 35.80049514770508, b: 53.85917282104492, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -98.8264389038086, '1': 173.51953125, '2': 0 },
      color: { r: 147.7560272216797, g: 233.91104125976562, b: 233.6362762451172, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -101.17353820800781, '1': -171.1724853515625, '2': 0 },
      color: { r: 78.57261657714844, g: 189.22784423828125, b: 113.70903015136719, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -98.8264389038086, '1': -173.51953125, '2': 0 },
      color: { r: 77.03520965576172, g: 191.51637268066406, b: 113.66215515136719, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    }
  ],
  [
    {
      pos: { '0': 200, '1': 0, '2': 0 },
      color: { r: 240, g: 124, b: 85, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': 1.224646841997256e-14, '1': 200, '2': 0 },
      color: { r: 36, g: 139, b: 101, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -200, '1': 2.449293683994512e-14, '2': 0 },
      color: { r: 31, g: 143, b: 242, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -3.6739403565851786e-14, '1': -200, '2': 0 },
      color: { r: 101, g: 166, b: 12, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    }
  ],
  [
    {
      pos: { '0': 200, '1': 0, '2': 0 },
      color: { r: 245.0220184326172, g: 182.1768798828125, b: 45.13257598876953, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -98.66632080078125, '1': 173.02952575683594, '2': 0 },
      color: { r: 36.778900146484375, g: 64.04420471191406, b: 250.87838745117188, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -99.44762420654297, '1': -171.1433563232422, '2': 0 },
      color: { r: 178.447509765625, g: 155.19898986816406, b: 217.21002197265625, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100.22885131835938, '1': -171.46688842773438, '2': 0 },
      color: { r: 178.04983520507812, g: 155.46969604492188, b: 218.06629943847656, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100.5523910522461, '1': -172.24832153320312, '2': 0 },
      color: { r: 179.2265625, g: 155.92819213867188, b: 217.7844696044922, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100.22885131835938, '1': -173.02952575683594, '2': 0 },
      color: { r: 178.8231964111328, g: 156.06629943847656, b: 217.2541961669922, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -99.44762420654297, '1': -173.3530731201172, '2': 0 },
      color: { r: 178.12164306640625, g: 156.4972381591797, b: 217.18789672851562, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -98.66632080078125, '1': -173.02952575683594, '2': 0 },
      color: { r: 178.6021728515625, g: 155.34815979003906, b: 216.98355102539062, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    }
  ],
  [
    {
      pos: { '0': 200, '1': 0, '2': 0 },
      color: { r: 124.98661804199219, g: 177.94090270996094, b: 229.9736785888672, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -0.04612627625465393, '1': 199.98764038085938, '2': 0 },
      color: { r: 244.92288208007812, g: 74.01107788085938, b: 138.96852111816406, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -199.95384216308594, '1': -0.07988066971302032, '2': 0 },
      color: { r: 235.9700927734375, g: 40.04289245605469, b: 131.01425170898438, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -0.04613243788480759, '1': -199.98768615722656, '2': 0 },
      color: { r: 185.9931182861328, g: 219.9599151611328, b: 171.99534606933594, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    }
  ],
  [
    {
      pos: { '0': 200, '1': 0, '2': 0 },
      color: { r: 15.150702476501465, g: 30.056060791015625, b: 99.09810638427734, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -99.71794891357422, '1': 173.1678924560547, '2': 0 },
      color: { r: 86.19039916992188, g: 25.204402923583984, b: 247.91818237304688, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -99.88318634033203, '1': -172.7691650390625, '2': 0 },
      color: { r: 238.00587463378906, g: 232.7745361328125, b: 141.09461975097656, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100.04838562011719, '1': -172.83753967285156, '2': 0 },
      color: { r: 237.9742889404297, g: 233.0070037841797, b: 140.88897705078125, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100.11678314208984, '1': -173.0027618408203, '2': 0 },
      color: { r: 237.7885284423828, g: 232.99412536621094, b: 140.9053497314453, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100.04838562011719, '1': -173.1678924560547, '2': 0 },
      color: { r: 237.9298095703125, g: 232.9578857421875, b: 140.9053497314453, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -99.88318634033203, '1': -173.23635864257812, '2': 0 },
      color: { r: 237.95437622070312, g: 232.77572631835938, b: 141.09693908691406, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -99.71794891357422, '1': -173.1678924560547, '2': 0 },
      color: { r: 237.94741821289062, g: 232.7792205810547, b: 140.88784790039062, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    }
  ],
  [
    {
      pos: { '0': 200, '1': 0, '2': 0 },
      color: { r: 7.6161675453186035, g: 110.11773681640625, b: 54.4055061340332, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -98.69189453125, '1': 173.55555725097656, '2': 0 },
      color: { r: 2.203437328338623, g: 161.88084411621094, b: 169.77040100097656, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -101.30807495117188, '1': -170.93943786621094, '2': 0 },
      color: { r: 225.39830017089844, g: 61.26161193847656, b: 216.8415985107422, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -98.69189453125, '1': -173.55555725097656, '2': 0 },
      color: { r: 224.39100646972656, g: 62.54355239868164, b: 217.875, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    }
  ],
  [
    {
      pos: { '0': 200, '1': 0, '2': 0 },
      color: { r: 229.0069580078125, g: 243.02587890625, b: 8.987991333007812, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100.05332946777344, '1': 173.2144775390625, '2': 0 },
      color: { r: 227.02110290527344, g: 11.993474006652832, b: 80.00462341308594, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100.02839660644531, '1': -173.2830047607422, '2': 0 },
      color: { r: 62.99726867675781, g: 251.0077362060547, b: 42.98672866821289, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100, '1': -173.2779998779297, '2': 0 },
      color: { r: 63.00294876098633, g: 251.01724243164062, b: 42.97980499267578, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -99.98147583007812, '1': -173.2559814453125, '2': 0 },
      color: { r: 62.99348068237305, g: 251.02987670898438, b: 42.962284088134766, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -99.98147583007812, '1': -173.22720336914062, '2': 0 },
      color: { r: 63.00273132324219, g: 251.0027618408203, b: 42.9663200378418, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100, '1': -173.205078125, '2': 0 },
      color: { r: 62.98799514770508, g: 251.04933166503906, b: 42.970088958740234, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100.02839660644531, '1': -173.20004272460938, '2': 0 },
      color: { r: 62.96820068359375, g: 251.0455780029297, b: 42.9726448059082, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100.05332946777344, '1': -173.2144775390625, '2': 0 },
      color: { r: 63.00883483886719, g: 251.0294189453125, b: 42.99431610107422, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    }
  ],
  [
    {
      pos: { '0': 200, '1': 0, '2': 0 },
      color: { r: 135.2743682861328, g: 120.19149780273438, b: 240.34295654296875, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100.46244812011719, '1': 173.1564178466797, '2': 0 },
      color: { r: 155.871337890625, g: 221.05142211914062, b: 225.59442138671875, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -99.82337951660156, '1': -174.03607177734375, '2': 0 },
      color: { r: 246.57733154296875, g: 232.988525390625, b: 52.53132629394531, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -99.82337951660156, '1': -173.3641815185547, '2': 0 },
      color: { r: 246.2828826904297, g: 233.29141235351562, b: 53.04001235961914, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100.46244812011719, '1': -173.1564178466797, '2': 0 },
      color: { r: 246.1057891845703, g: 233.42294311523438, b: 52.568477630615234, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    }
  ],
  [
    {
      pos: { '0': 200, '1': 0, '2': 0 },
      color: { r: 133.0120849609375, g: 149.00364685058594, b: 157.0212860107422, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': 1.224646841997256e-14, '1': 200, '2': 0 },
      color: { r: 201.99537658691406, g: 202.99197387695312, b: 207.0260772705078, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -200, '1': 2.449293683994512e-14, '2': 0 },
      color: { r: 136.02076721191406, g: 77.99720001220703, b: 58.99869155883789, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -3.6739403565851786e-14, '1': -200, '2': 0 },
      color: { r: 119.00770568847656, g: 118.98185729980469, b: 130.00941467285156, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    }
  ],
  [
    {
      pos: { '0': 200, '1': 0, '2': 0 },
      color: { r: 244.74307250976562, g: 189.84178161621094, b: 131.08456420898438, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -99.74654388427734, '1': 173.2316436767578, '2': 0 },
      color: { r: 212.96401977539062, g: 18.245925903320312, b: 37.101810455322266, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100.09684753417969, '1': -172.74960327148438, '2': 0 },
      color: { r: 112.21460723876953, g: 145.9905548095703, b: 92.8997573852539, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -100.09684753417969, '1': -173.11785888671875, '2': 0 },
      color: { r: 112.13628387451172, g: 145.9954071044922, b: 93.03917694091797, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -99.74654388427734, '1': -173.2316436767578, '2': 0 },
      color: { r: 111.981201171875, g: 146.0391845703125, b: 92.86217498779297, a: 1 },
      is3d: false,
      uv: { '0': 0, '1': 0 }
    }
  ],
  [
    {
      pos: { '0': 200, '1': 0, '2': 0 },
      color: { r: 52.67475509643555, g: 242.0584259033203, b: 155.13697814941406, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': 1.224646841997256e-14, '1': 200, '2': 0 },
      color: { r: 49.206844329833984, g: 135.10989379882812, b: 171.44505310058594, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -200, '1': 2.449293683994512e-14, '2': 0 },
      color: { r: 165.1112060546875, g: 96.81314086914062, b: 229.45932006835938, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -3.6739403565851786e-14, '1': -200, '2': 0 },
      color: { r: 30.768896102905273, g: 245.47789001464844, b: 248.6662139892578, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    }
  ],
  [
    {
      pos: { '0': 200, '1': 0, '2': 0 },
      color: { r: 112, g: 224, b: 247, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': 1.224646841997256e-14, '1': 200, '2': 0 },
      color: { r: 115, g: 78, b: 236, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -200, '1': 2.449293683994512e-14, '2': 0 },
      color: { r: 193, g: 101, b: 97, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    },
    {
      pos: { '0': -3.6739403565851786e-14, '1': -200, '2': 0 },
      color: { r: 193, g: 190, b: 224, a: 1 },
      is3d: true,
      uv: { '0': 0, '1': 0 }
    }
  ]
];

const optionToVertexArray = (option: (typeof verticyOptions)[number]) => {
  return option.map((vert) =>
    vertex(
      vert.pos['0'],
      vert.pos['1'],
      vert.pos['2'],
      color(vert.color.r, vert.color.g, vert.color.b, vert.color.a)
    )
  );
};

let currentOption = 0;
// let currentOption = verticyOptions.length - 1;
const option = verticyOptions[currentOption];

const startPoints = optionToVertexArray(option);

const polygon = new Polygon(vector2(500, -400), startPoints);
canvas.add(polygon);

function easeInOutExpo(x: number): number {
  return x === 0
    ? 0
    : x === 1
      ? 1
      : x < 0.5
        ? Math.pow(2, 20 * x - 10) / 2
        : (2 - Math.pow(2, -20 * x + 10)) / 2;
}

async function main() {
  currentOption = currentOption < verticyOptions.length - 1 ? currentOption + 1 : 0;
  await polygon.setVertices(optionToVertexArray(verticyOptions[currentOption]), 1, easeInOutExpo);
  main();
}

main();
