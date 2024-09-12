import { Camera, Simulation, Square, color, colorf, vector2, vector3 } from '../src';
import { Shader, defaultShader } from '../src/shaders';

const canvas = new Simulation('canvas', new Camera(vector3(0, 0, 5)), true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const newShader = `
@group(1) @binding(0) var<uniform> uniformThing: vec3f;

@group(1) @binding(1) var<storage> dotLocation: vec2f;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) fragColor : vec4<f32>,
  @location(1) fragPosition: vec4<f32>,
}

@vertex
fn vertex_main(
  @builtin(instance_index) instanceIdx : u32,
  @location(0) position : vec3<f32>,
  @location(1) color : vec4<f32>,
) -> VertexOutput {
  var output : VertexOutput;

  output.Position = uniforms.worldProjectionMatrix * uniforms.modelProjectionMatrix * vec4(position, 1.0);
  output.fragPosition = vec4(position, 1.0);
  output.fragColor = color;
  return output;
}

@fragment
fn fragment_main(
  @location(0) fragColor: vec4<f32>,
  @location(1) fragPosition: vec4<f32>
) -> @location(0) vec4<f32> {
  let worldDotLocation = uniforms.worldProjectionMatrix * vec4(dotLocation, 0.0, 1.0);
  let diffX = fragPosition.x - dotLocation.x;
  let diffY = fragPosition.y - dotLocation.y;
  var distance = sqrt(diffX * diffX + diffY * diffY);

  if (distance < 57) {
    return vec4(1.0, 1.0, 1.0, 1.0);
  } else {
    return fragColor;
  }
}
`;

const shader = new Shader(
  newShader,
  [
    defaultShader.getBindGroupLayoutDescriptors()[0],
    {
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: 'uniform'
          }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {
            type: 'read-only-storage'
          }
        }
      ]
    }
  ],
  [
    {
      format: 'float32x3',
      size: 12
    },
    {
      format: 'float32x4',
      size: 16
    }
  ]
);

/* TODO
 * find a way to set vertex param buffer + other buffers to shader
 * stored in each element
 *
 * idk what else
 */

// const currentColor = vector3();
// let current = 0;
// const amount = 0.005;

// const group = new ShaderGroup(
//   newShader,
//   'triangle-strip',
//   [
//     {
//       format: 'float32x3',
//       size: 12
//     },
//     {
//       format: 'float32x4',
//       size: 16
//     }
//   ],
//   {
//     bufferSize: 7,
//     createBuffer: (x: number, y: number, z: number, color: Color) => {
//       return [x, y, z, ...color.toBuffer()];
//     }
//   },
//   {
//     bindings: [
//       {
//         visibility: GPUShaderStage.VERTEX,
//         buffer: {
//           type: 'uniform'
//         }
//       },
//       {
//         visibility: GPUShaderStage.FRAGMENT,
//         buffer: {
//           type: 'read-only-storage'
//         }
//       }
//     ],
//     values: () => {
//       if (currentColor[current] < 1) {
//         currentColor[current] += amount;

//         for (let i = 0; i < currentColor.length; i++) {
//           if (i === current) continue;
//           currentColor[i] = Math.max(0, currentColor[i] - amount);
//         }
//       } else {
//         current++;
//         if (current === currentColor.length) current = 0;
//       }

//       return [
//         {
//           value: currentColor,
//           array: Float32Array,
//           usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
//         },
//         {
//           value: [0, 0],
//           array: Float32Array,
//           usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
//         }
//       ];
//     }
//   }
// );
const square = new Square(
  vector2(canvas.getWidth() / 2, -canvas.getHeight() / 2),
  canvas.getWidth(),
  canvas.getHeight(),
  color(),
  0,
  vector2(0.5, 0.5)
);
square.setShader(shader);
canvas.add(square);

canvas.onResize((width, height) => {
  square.moveTo(vector3(width / 2, -height / 2));
  square.setWidth(width);
  square.setHeight(height);
});

// (async () => {
//   square.rotate(Math.PI * 2, 4, easeInOutQuad);
//   await square.move(vector2(600, -300), 2, easeInOutQuad);
//   await square.move(vector2(0, 300), 2, easeInOutQuad);
//   await square.moveTo(vector2(250, -250), 2, easeInOutQuad);
// })();
