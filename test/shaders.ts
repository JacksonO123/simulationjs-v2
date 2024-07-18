import {
  Camera,
  Color,
  ShaderGroup,
  Simulation,
  Square,
  color,
  colorf,
  easeInOutQuad,
  vector2,
  vector3
} from '../src';

const canvas = new Simulation('canvas', new Camera(vector3(0, 0, 5)), true);
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const newShader = `
@group(1) @binding(0) var<uniform> uniformThing: vec3f;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) fragColor : vec4<f32>,
  @location(1) fragPosition: vec4<f32>,
}

@vertex
fn vertex_main_3d(
  @builtin(instance_index) instanceIdx : u32,
  @location(0) position : vec4<f32>,
  @location(1) color : vec4<f32>,
) -> VertexOutput {
  var output : VertexOutput;

  output.Position = uniforms.modelViewProjectionMatrix * position;
  output.fragPosition = output.Position;
  output.fragColor = color;
  return output;
}

@vertex
fn vertex_main_2d(
  @builtin(instance_index) instanceIdx : u32,
  @location(0) position : vec4<f32>,
  @location(1) color : vec4<f32>,
) -> VertexOutput {
  var output: VertexOutput;

  output.Position = uniforms.orthoProjectionMatrix * position;
  output.fragPosition = output.Position;
  // output.fragColor = color;
  output.fragColor = vec4(uniformThing, 1.0);
  return output;
}

@fragment
fn fragment_main(
  @location(0) fragColor: vec4<f32>,
  @location(1) fragPosition: vec4<f32>
) -> @location(0) vec4<f32> {
  // return fragPosition;
  return fragColor;
}
`;

const currentColor = vector3();
let current = 0;
const amount = 0.005;

const group = new ShaderGroup(
  newShader,
  'triangle-strip',
  [
    {
      format: 'float32x4',
      size: 16
    },
    {
      format: 'float32x4',
      size: 16
    }
  ],
  {
    bufferSize: 8,
    createBuffer: (x: number, y: number, z: number, color: Color) => {
      return [x, y, z, 1, ...color.toBuffer()];
    },
    shouldEvaluate: () => false
  },
  {
    bindings: [
      {
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: 'uniform'
        }
      }
    ],
    values: () => {
      if (currentColor[current] < 1) {
        currentColor[current] += amount;

        for (let i = 0; i < currentColor.length; i++) {
          if (i === current) continue;
          currentColor[i] = Math.max(0, currentColor[i] - amount);
        }
      } else {
        current++;
        if (current === currentColor.length) current = 0;
      }

      return [
        {
          value: currentColor,
          array: Float32Array,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        }
      ];
    }
  }
);
const square = new Square(vector2(250, -250), 500, 500, color(), 0, vector2(0.5, 0.5));
group.add(square);
canvas.add(group);

(async () => {
  square.rotate(Math.PI * 2, 4, easeInOutQuad);
  await square.move(vector2(600, -300), 2, easeInOutQuad);
  await square.move(vector2(0, 300), 2, easeInOutQuad);
  await square.moveTo(vector2(250, -250), 2, easeInOutQuad);
})();
