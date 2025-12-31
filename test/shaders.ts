import {
    Camera,
    SimJSWebGPUShader,
    Simulation,
    Square,
    color,
    colorf,
    defaultWebGPUShader,
    easeInOutQuad,
    vector2,
    vector3
} from '../src';
import { backend } from './SETTINGS';

const canvas = new Simulation('canvas', {
    camera: new Camera(vector3(0, 0, 5)),
    showFrameRate: true,
    backend
});
canvas.setBackground(colorf(175));
canvas.fitElement();
canvas.start();

const newShader = `
struct Uniforms {
  worldProjectionMatrix: mat4x4<f32>,
  modelProjectionMatrix: mat4x4<f32>,
}
 
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@group(0) @binding(1) var<storage> dotLocation: vec2f;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) fragColor : vec4<f32>,
  @location(1) fragPosition: vec4<f32>,
}

@vertex
fn vertex_main(
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

const shader = new SimJSWebGPUShader(
    newShader,
    [
        {
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
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
    ],
    [
        {
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            defaultSize: 8
        }
    ],
    defaultWebGPUShader.getUniformBufferWriter(),
    defaultWebGPUShader.getBindGroupGenerator(),
    defaultWebGPUShader.getVertexBufferWriter()
);

const square = new Square(
    vector2(canvas.getWidth() / 2, -canvas.getHeight() / 2),
    canvas.getWidth(),
    canvas.getHeight(),
    color(),
    0
);
canvas.add(square);
square.setShader(shader);

canvas.onResize((width, height) => {
    square.moveTo(vector3(width / 2, -height / 2));
    square.setWidth(width);
    square.setHeight(height);
});

// (async () => {
//     square.rotate(vector3(Math.PI * 2), 4, easeInOutQuad);
//     await square.move(vector3(600, -300), 2, easeInOutQuad);
//     await square.move(vector3(0, 300), 2, easeInOutQuad);
//     await square.moveTo(vector3(250, -250), 2, easeInOutQuad);
// })();
