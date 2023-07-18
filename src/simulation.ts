const starterShader = `
struct VertexOut {
  @builtin(position) position : vec4<f32>,
  @location(0) color : vec4<f32>
};

@vertex
fn vertex_main(@location(0) position: vec4<f32>,
               @location(1) color: vec4<f32>) -> VertexOut
{
  var output : VertexOut;
  output.position = position;
  output.color = color;
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>
{
  return fragData.color;
}
`;

function logStr(msg: string) {
  return `SimJS: ${msg}`;
}

class Logger {
  log(msg: string) {
    console.log(logStr(msg));
  }
  error(msg: string) {
    return new Error(logStr(msg));
  }
  warn(msg: string) {
    console.warn(logStr(msg));
  }
}

const logger = new Logger();

export class Simulation {
  canvasRef: HTMLCanvasElement | null = null;
  bgColor: Color = new Color(255, 0, 0);
  private fittingElement = false;
  constructor(idOrCanvasRef: string | HTMLCanvasElement) {
    if (typeof idOrCanvasRef === 'string') {
      const ref = document.getElementById(idOrCanvasRef) as HTMLCanvasElement | null;
      if (ref !== null) this.canvasRef = ref;
      else throw logger.error(`Cannot find canvas with id ${idOrCanvasRef}`);
    } else {
      this.canvasRef = idOrCanvasRef;
    }

    if (!(this.canvasRef instanceof HTMLCanvasElement)) {
      throw logger.error('Invalid canvas');
    } else {
      const parent = this.canvasRef.parentElement;

      if (parent === null) {
        throw logger.error('Canvas parent is null');
      }

      parent.addEventListener('resize', () => {
        if (this.fittingElement) {
          const width = parent.clientWidth;
          const height = parent.clientHeight;

          this.setCanvasSize(width, height);
        }
      });
    }
  }
  setCanvasSize(width: number, height: number) {
    this.assertHasCanvas();

    this.canvasRef.width = width * devicePixelRatio;
    this.canvasRef.height = height * devicePixelRatio;
    this.canvasRef.style.width = width + 'px';
    this.canvasRef.style.height = height + 'px';
  }
  start() {
    (async () => {
      this.assertHasCanvas();

      const adapter = await navigator.gpu.requestAdapter();

      if (!adapter) throw logger.error('Adapter is null');

      const device = await adapter.requestDevice();

      const ctx = this.canvasRef.getContext('webgpu');

      if (!ctx) throw logger.error('Context is null');

      ctx.configure({
        device,
        format: 'bgra8unorm'
      });

      this.render(device, ctx);
    })();
  }
  render(device: GPUDevice, ctx: GPUCanvasContext) {
    this.assertHasCanvas();

    const vertices = new Float32Array([
      ...[1.0, 1.0, 0, 1, 1, 1, 1],
      ...[1.0, -1.0, 0, 0, 1, 0, 1],
      ...[-1.0, -1.0, 0, 1, 0, 0, 1],

      ...[-1.0, 1.0, 0, 0, 0, 1, 1],
      ...[-1.0, -1.0, 0, 1, 0, 0, 1],
      ...[1.0, 1.0, 0, 1, 1, 1, 1]
    ]);

    const vertexBuffer = device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
    vertexBuffer.unmap();

    const shaderModule = device.createShaderModule({
      code: starterShader
    });

    const vertexBuffers: GPUVertexBufferLayout = {
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: 'float32x3'
        },
        {
          shaderLocation: 1,
          offset: 12,
          format: 'float32x4'
        }
      ],
      arrayStride: 28,
      stepMode: 'vertex'
    };

    const pipelineDescriptor: GPURenderPipelineDescriptor = {
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vertex_main',
        buffers: [vertexBuffers]
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragment_main',
        targets: [
          {
            format: 'bgra8unorm'
          }
        ]
      },
      primitive: {
        topology: 'triangle-list'
      }
    };
    const renderPipeline = device.createRenderPipeline(pipelineDescriptor);

    const commandEncoder = device.createCommandEncoder();

    const clearColor: GPUColor = { r: 0.0, g: 0.0, b: 0.0, a: 1.0 };

    const colorAttachment: GPURenderPassColorAttachment = {
      clearValue: clearColor,
      storeOp: 'store',
      loadOp: 'clear',
      view: ctx.getCurrentTexture().createView()
    };

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [colorAttachment]
    };
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    passEncoder.setPipeline(renderPipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.draw(6);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);

    // (function renderLoop() {
    //   requestAnimationFrame(renderLoop);
    // })();
  }
  fitElement() {
    this.assertHasCanvas();

    this.fittingElement = true;

    const parent = this.canvasRef.parentElement;

    if (parent !== null) {
      const width = parent.clientWidth;
      const height = parent.clientHeight;

      this.setCanvasSize(width, height);
    }
  }
  private assertHasCanvas(): asserts this is this & {
    canvasRef: HTMLCanvasElement;
  } {
    if (this.canvasRef === null) {
      throw logger.error(`cannot complete action, canvas is null`);
    }
  }
}

export class Color {
  r: number;
  g: number;
  b: number;
  a: number;
  constructor(r: number, g: number, b: number, a = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
  clone() {
    return new Color(this.r, this.g, this.b, this.a);
  }
  private compToHex(c: number) {
    const hex = Math.round(c).toString(16);
    return hex.length == 1 ? '0' + hex : hex;
  }
  toHex() {
    return (
      '#' +
      this.compToHex(this.r) +
      this.compToHex(this.g) +
      this.compToHex(this.b) +
      this.compToHex(this.a * 255)
    );
  }
}
