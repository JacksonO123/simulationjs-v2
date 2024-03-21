import { vec3, quat, mat4, vec2, vec4 } from 'wgpu-matrix';
import { Vertex, VertexCache, cloneBuf, color, colorFromVector4, lossyTriangulate, vec3ToPixelRatio, vector3FromVector2, vector2, vector3, vertex, vertexBuffer, Color, transitionValues, logger, vector2FromVector3, interpolateColors } from './utils.js';
export class SimulationElement {
    pos;
    color;
    camera;
    vertexCache;
    is3d;
    constructor(pos, color = new Color(), is3d = true) {
        this.pos = pos;
        const temp = vector3(...this.pos);
        vec3ToPixelRatio(temp);
        for (let i = 0; i < this.pos.length; i++) {
            this.pos[i] = temp[i];
        }
        this.color = color;
        this.vertexCache = new VertexCache();
        this.camera = null;
        this.is3d = is3d;
    }
    setPos(pos) {
        this.pos = pos;
    }
    getPos() {
        return this.pos;
    }
    setCamera(camera) {
        this.camera = camera;
    }
    fill(newColor, t = 0, f) {
        const diff = newColor.diff(this.color);
        const finalColor = newColor.clone();
        return transitionValues((p) => {
            this.color.r += diff.r * p;
            this.color.g += diff.g * p;
            this.color.b += diff.b * p;
            this.color.a += diff.a * p;
            this.vertexCache.updated();
        }, () => {
            this.color = finalColor;
            this.vertexCache.updated();
        }, t, f);
    }
    getColor() {
        return this.color;
    }
    move(amount, t = 0, f) {
        const finalPos = amount.length === 3 ? vector3() : vector2();
        vec3.add(finalPos, this.pos, amount);
        return transitionValues((p) => {
            for (let i = 0; i < this.pos.length; i++) {
                this.pos[i] += amount[i] * p;
            }
            this.vertexCache.updated();
        }, () => {
            this.pos = finalPos;
            this.vertexCache.updated();
        }, t, f);
    }
    moveTo(pos, t = 0, f) {
        const diff = pos.length === 3 ? vector3() : vector2();
        vec3.sub(diff, pos, this.pos);
        return transitionValues((p) => {
            for (let i = 0; i < this.pos.length; i++) {
                this.pos[i] += diff[i] * p;
            }
            this.vertexCache.updated();
        }, () => {
            for (let i = 0; i < this.pos.length; i++) {
                this.pos[i] = pos[i];
            }
            this.vertexCache.updated();
        }, t, f);
    }
}
export class SimulationElement3d extends SimulationElement {
    rotation;
    wireframe = false;
    wireframeCache;
    constructor(pos, rotation = vector3(), color) {
        super(pos, color);
        this.rotation = rotation;
        this.wireframeCache = new VertexCache();
    }
    setWireframe(wireframe) {
        this.wireframe = wireframe;
    }
    isWireframe() {
        return this.wireframe;
    }
    rotate(amount, t = 0, f) {
        const finalRotation = cloneBuf(this.rotation);
        vec3.add(finalRotation, amount, finalRotation);
        return transitionValues((p) => {
            this.rotation[0] += amount[0] * p;
            this.rotation[1] += amount[1] * p;
            this.rotation[2] += amount[2] * p;
            this.vertexCache.updated();
        }, () => {
            this.rotation = finalRotation;
            this.vertexCache.updated();
        }, t, f);
    }
    setRotation(rot, t = 0, f) {
        const diff = vector3();
        vec3.sub(rot, this.rotation, diff);
        return transitionValues((p) => {
            this.rotation[0] += diff[0] * p;
            this.rotation[1] += diff[1] * p;
            this.rotation[2] += diff[2] * p;
            this.vertexCache.updated();
        }, () => {
            this.rotation = rot;
            this.vertexCache.updated();
        }, t, f);
    }
    wireframeFromVertexOrder(vertices, order) {
        let rotMatrix = mat4.identity();
        mat4.rotateZ(rotMatrix, this.rotation[2], rotMatrix);
        mat4.rotateY(rotMatrix, this.rotation[1], rotMatrix);
        mat4.rotateX(rotMatrix, this.rotation[0], rotMatrix);
        const pos = this.getPos();
        return order
            .map((vertexIndex) => {
            const vertex = cloneBuf(vertices[vertexIndex]);
            vec3.transformMat4(vertex, rotMatrix, vertex);
            return vertexBuffer(vertex[0] + pos[0], vertex[1] + pos[1], vertex[2] + pos[2], this.getColor());
        })
            .flat();
    }
    getBuffer(camera, force) {
        if (this.wireframe)
            return this.getWireframe(camera, force);
        return this.getTriangles(camera, force);
    }
}
export class SimulationElement2d extends SimulationElement {
    rotation;
    constructor(pos, rotation = 0, color) {
        super(pos, color, false);
        this.rotation = rotation;
    }
    rotate(rotation, t = 0, f) {
        const finalRotation = this.rotation + rotation;
        return transitionValues((p) => {
            this.rotation += rotation * p;
            this.vertexCache.updated();
        }, () => {
            this.rotation = finalRotation;
            this.vertexCache.updated();
        }, t, f);
    }
    setRotation(newRotation, t = 0, f) {
        const diff = newRotation - this.rotation;
        return transitionValues((p) => {
            this.rotation += diff * p;
            this.vertexCache.updated();
        }, () => {
            this.rotation = newRotation;
            this.vertexCache.updated();
        }, t, f);
    }
}
export class Plane extends SimulationElement3d {
    points;
    constructor(pos, points, color, rotation = vector3()) {
        super(pos, rotation, color);
        this.points = points;
        this.rotation = rotation;
    }
    setPoints(newPoints) {
        this.points = newPoints;
    }
    getWireframe(_, force) {
        if (this.wireframeCache.shouldUpdate() || force) {
            const order = Array(this.points.length)
                .fill(0)
                .map((_, index) => index);
            let front = 0;
            let back = this.points.length - 1;
            while (front < back) {
                order.push(front, back);
                front++;
                back--;
            }
            const vertices = this.points.map((p) => p.getPos());
            return this.wireframeFromVertexOrder(vertices, order);
        }
        return this.wireframeCache.getCache();
    }
    getTriangles(_, force) {
        if (this.vertexCache.shouldUpdate() || force) {
            let resBuffer = [];
            const triangles = lossyTriangulate(this.points).flat();
            triangles.forEach((verticy) => {
                const rot = quat.create();
                quat.fromEuler(...this.rotation, 'xyz', rot);
                const mat = mat4.create();
                mat4.fromQuat(rot, mat);
                const out = vector3();
                vec3.transformMat4(verticy.getPos(), mat, out);
                vec3.add(out, this.getPos(), out);
                let vertexColor = verticy.getColor();
                vertexColor = vertexColor ? vertexColor : this.getColor();
                resBuffer = resBuffer.concat(vertexBuffer(out[0], out[1], out[2], vertexColor));
            });
            this.vertexCache.setCache(resBuffer);
            return resBuffer;
        }
        return this.vertexCache.getCache();
    }
}
export class Square extends SimulationElement2d {
    width;
    height;
    vertexColors;
    points;
    /**
     * @param vertexColors{Record<number, Color>} - 0 is top left vertex, numbers increase clockwise
     */
    constructor(pos, width, height, color, rotation, vertexColors) {
        super(pos, rotation, color);
        this.width = width * devicePixelRatio;
        this.height = height * devicePixelRatio;
        this.vertexColors = vertexColors || {};
        this.points = [
            vector2(this.width / 2, this.height / 2),
            vector2(-this.width / 2, this.height / 2),
            vector2(-this.width / 2, -this.height / 2),
            vector2(this.width / 2, -this.height / 2)
        ];
    }
    scaleWidth(amount, t = 0, f) {
        const finalWidth = this.width * amount;
        const diffWidth = finalWidth - this.width;
        return transitionValues((p) => {
            this.width += diffWidth * p;
            this.vertexCache.updated();
        }, () => {
            this.width = finalWidth;
            this.vertexCache.updated();
        }, t, f);
    }
    scaleHeight(amount, t = 0, f) {
        const finalHeight = this.height * amount;
        const diffHeight = finalHeight - this.height;
        return transitionValues((p) => {
            this.height += diffHeight * p;
            this.vertexCache.updated();
        }, () => {
            this.height = finalHeight;
            this.vertexCache.updated();
        }, t, f);
    }
    scale(amount, t = 0, f) {
        const finalWidth = this.width * amount;
        const finalHeight = this.height * amount;
        const diffWidth = finalWidth - this.width;
        const diffHeight = finalHeight - this.height;
        return transitionValues((p) => {
            this.width += diffWidth * p;
            this.height += diffHeight * p;
            this.vertexCache.updated();
        }, () => {
            this.width = finalWidth;
            this.height = finalHeight;
            this.vertexCache.updated();
        }, t, f);
    }
    setWidth(num, t = 0, f) {
        num *= devicePixelRatio;
        const diffWidth = num - this.width;
        return transitionValues((p) => {
            this.width += diffWidth * p;
            this.vertexCache.updated();
        }, () => {
            this.width = num;
            this.vertexCache.updated();
        }, t, f);
    }
    setHeight(num, t = 0, f) {
        num *= devicePixelRatio;
        const diffHeight = num - this.height;
        return transitionValues((p) => {
            this.height += diffHeight * p;
            this.vertexCache.updated();
        }, () => {
            this.height = num;
            this.vertexCache.updated();
        }, t, f);
    }
    getBuffer(camera, force) {
        if (this.vertexCache.shouldUpdate() || force) {
            const vertexOrder = [0, 1, 2, 0, 2, 3];
            const rotationMat = mat4.identity();
            mat4.rotateZ(rotationMat, this.rotation, rotationMat);
            const points = this.points.map((vec) => {
                const pos = vector2();
                vec2.add(vec, pos, pos);
                vec2.transformMat4(vec, rotationMat, pos);
                vec2.add(vec, this.getPos(), pos);
                pos[1] = camera.getScreenSize()[1] - pos[1];
                pos[0] += this.width / 2;
                pos[1] -= this.height / 2;
                return pos;
            });
            let resBuffer = vertexOrder
                .map((vertex) => {
                let vertexColor = this.vertexColors[vertex];
                vertexColor = vertexColor ? vertexColor : this.getColor();
                return vertexBuffer(points[vertex][0], points[vertex][1], 0, vertexColor);
            })
                .flat();
            this.vertexCache.setCache(resBuffer);
            return resBuffer;
        }
        return this.vertexCache.getCache();
    }
}
export class Circle extends SimulationElement2d {
    radius;
    detail;
    constructor(pos, radius, color, detail = 50) {
        super(pos, 0, color);
        this.radius = radius * devicePixelRatio;
        this.detail = detail;
    }
    setRadius(num, t = 0, f) {
        num *= devicePixelRatio;
        const diff = num - this.radius;
        return transitionValues((p) => {
            this.radius += diff * p;
            this.vertexCache.updated();
        }, () => {
            this.radius = num;
            this.vertexCache.updated();
        }, t, f);
    }
    scale(amount, t = 0, f) {
        const finalRadius = this.radius * amount;
        const diff = finalRadius - this.radius;
        return transitionValues((p) => {
            this.radius += diff * p;
            this.vertexCache.updated();
        }, () => {
            this.radius = finalRadius;
            this.vertexCache.updated();
        }, t, f);
    }
    getBuffer(camera, force) {
        if (this.vertexCache.shouldUpdate() || force) {
            const points = [];
            const rotationInc = (Math.PI * 2) / this.detail;
            for (let i = 0; i < this.detail; i++) {
                const mat = mat4.identity();
                mat4.rotateZ(mat, rotationInc * i, mat);
                const vec = vector3(this.radius);
                vec3.transformMat4(vec, mat, vec);
                vec3.add(vec, this.getPos(), vec);
                const screenSize = camera.getScreenSize();
                points.push(new Vertex(vec[0], screenSize[1] - vec[1], vec[2], this.getColor(), false));
            }
            const vertices = lossyTriangulate(points).reduce((acc, curr) => {
                curr.forEach((vertex) => acc.push(...vertex.toBuffer(this.getColor())));
                return acc;
            }, []);
            this.vertexCache.setCache(vertices);
            return vertices;
        }
        return this.vertexCache.getCache();
    }
}
export class Polygon extends SimulationElement2d {
    vertices;
    constructor(pos, vertices, color, rotation) {
        super(pos, rotation, color);
        this.vertices = vertices.map((vertex) => {
            const newVertex = vertex.clone();
            newVertex.setZ(0);
            newVertex.setIs3d(false);
            return vertex;
        });
    }
    getVertices() {
        return this.vertices;
    }
    setVertices(newVertices, t = 0, f) {
        const vertices = newVertices.map((vert) => {
            const newVertex = vert.clone();
            newVertex.setZ(0);
            newVertex.setIs3d(false);
            return newVertex;
        });
        const lastVert = this.vertices.length > 0 ? this.vertices[this.vertices.length - 1] : vertex(0, 0, 0, color(), false);
        if (vertices.length > this.vertices.length) {
            while (vertices.length > this.vertices.length) {
                const lastPos = lastVert.getPos();
                this.vertices.push(new Vertex(lastPos[0], lastPos[1], 0, lastVert.getColor() || this.getColor(), false));
            }
        }
        const initialPositions = this.vertices.map((p) => cloneBuf(p.getPos()));
        const posChanges = [
            ...vertices.map((vert, i) => {
                const vec = vector3();
                vec3.sub(vert.getPos(), this.vertices[i].getPos(), vec);
                return cloneBuf(vec);
            }),
            ...(this.vertices.length > vertices.length
                ? this.vertices.slice(vertices.length, this.vertices.length).map((vert) => {
                    const vec = cloneBuf(vertices[vertices.length - 1].getPos());
                    vec3.sub(vec, vert.getPos(), vec);
                    return vec;
                })
                : [])
        ];
        const initialColors = this.vertices.map((vert) => (vert.getColor() || this.getColor()).toVec4());
        const colorChanges = [
            ...vertices.map((vert, i) => {
                const diff = (vert.getColor() || this.getColor()).diff(this.vertices[i].getColor() || this.getColor());
                return diff.toVec4();
            }),
            ...(this.vertices.length > vertices.length
                ? this.vertices.slice(vertices.length, this.vertices.length).map((vert) => {
                    const toColor = vertices[vertices.length - 1].getColor();
                    return (toColor || this.getColor()).diff(vert.getColor() || this.getColor()).toVec4();
                })
                : [])
        ];
        return transitionValues((p) => {
            this.vertices.forEach((vert, i) => {
                const posChange = cloneBuf(posChanges[i]);
                const colorChange = cloneBuf(colorChanges[i]);
                vec3.scale(posChange, p, posChange);
                vec3.add(vert.getPos(), posChange, posChange);
                vec4.scale(colorChange, p, colorChange);
                vec4.add((vert.getColor() || this.getColor()).toVec4(), colorChange, colorChange);
                vert.setPos(posChange);
                vert.setColor(colorFromVector4(colorChange));
            });
            this.vertexCache.updated();
        }, () => {
            this.vertices.forEach((vert, i) => {
                const initPos = initialPositions[i];
                const initColor = initialColors[i];
                vec3.add(initPos, posChanges[i], initPos);
                vec4.add(initColor, colorChanges[i], initColor);
                vert.setPos(initPos);
                vert.setColor(colorFromVector4(initColor));
            });
            this.vertices.splice(vertices.length, this.vertices.length);
            this.vertexCache.updated();
        }, t, f);
    }
    getBuffer(camera, force) {
        if (this.vertexCache.shouldUpdate() || force) {
            let resBuffer = [];
            const rotationMat = mat4.identity();
            mat4.rotateZ(rotationMat, this.rotation, rotationMat);
            lossyTriangulate(this.vertices)
                .flat()
                .forEach((vert) => {
                const pos = vector3();
                vec3.add(vert.getPos(), pos, pos);
                vec3.transformMat4(pos, rotationMat, pos);
                vec3.add(this.getPos(), pos, pos);
                pos[1] = camera.getScreenSize()[1] - pos[1];
                resBuffer = resBuffer.concat(vertexBuffer(pos[0], pos[1], 0, vert.getColor() || this.getColor()));
            });
            this.vertexCache.setCache(resBuffer);
            return resBuffer;
        }
        return this.vertexCache.getCache();
    }
}
export class Line3d extends SimulationElement3d {
    to;
    toColor;
    thickness;
    constructor(pos, to, thickness) {
        super(pos.getPos(), vector3(), to.getColor() || undefined);
        this.thickness = thickness;
        this.toColor = to.getColor() || this.getColor();
        this.to = to.getPos();
        vec3.scale(this.to, devicePixelRatio, this.to);
        vec3.sub(this.to, this.getPos(), this.to);
    }
    setStart(pos, t = 0, f) {
        return this.moveTo(pos, t, f);
    }
    setEnd(pos, t = 0, f) {
        const diff = vector3();
        vec3.sub(pos, this.to, diff);
        return transitionValues((p) => {
            this.to[0] += diff[0] * p;
            this.to[1] += diff[1] * p;
            this.to[2] += diff[2] * p;
            this.vertexCache.updated();
        }, () => {
            this.to[0] = pos[0];
            this.to[1] = pos[1];
            this.to[2] = pos[2];
            this.vertexCache.updated();
        }, t, f);
    }
    getWireframe(_, force) {
        if (this.wireframeCache.shouldUpdate() || force) {
            const normal = vector2(-this.to[1], this.to[0]);
            vec2.normalize(normal, normal);
            vec2.scale(normal, this.thickness / 2, normal);
            const vertices = [
                vector3(normal[0], normal[1]),
                vector3(-normal[0], -normal[1]),
                vector3(this.to[0] + normal[0], this.to[1] + normal[1], this.to[2]),
                vector3(this.to[0] - normal[0], this.to[1] - normal[1], this.to[2])
            ];
            const order = [0, 1, 3, 2, 0, 3];
            return this.wireframeFromVertexOrder(vertices, order);
        }
        return this.wireframeCache.getCache();
    }
    getTriangles(_, force) {
        if (this.vertexCache.shouldUpdate() || force) {
            const normal = vector2(-this.to[1], this.to[0]);
            vec2.normalize(normal, normal);
            vec2.scale(normal, this.thickness / 2, normal);
            const pos = this.getPos();
            const resBuffer = [
                ...vertexBuffer(pos[0] + normal[0], pos[1] + normal[1], pos[2], this.getColor()),
                ...vertexBuffer(pos[0] - normal[0], pos[1] - normal[1], pos[2], this.getColor()),
                ...vertexBuffer(pos[0] + this.to[0] + normal[0], pos[1] + this.to[1] + normal[1], pos[2] + this.to[2], this.toColor || this.getColor()),
                ...vertexBuffer(pos[0] - normal[0], pos[1] - normal[1], pos[2], this.getColor()),
                ...vertexBuffer(pos[0] + this.to[0] + normal[0], pos[1] + this.to[1] + normal[1], pos[2] + this.to[2], this.toColor || this.getColor()),
                ...vertexBuffer(pos[0] + this.to[0] - normal[0], pos[1] + this.to[1] - normal[1], pos[2] + this.to[2], this.toColor || this.getColor())
            ];
            this.vertexCache.setCache(resBuffer);
            return resBuffer;
        }
        return this.vertexCache.getCache();
    }
}
export class Line2d extends SimulationElement {
    to;
    toColor;
    thickness;
    constructor(from, to, thickness = 1) {
        super(from.getPos(), from.getColor() || undefined);
        this.thickness = thickness * devicePixelRatio;
        this.toColor = to.getColor();
        this.to = vector2FromVector3(to.getPos());
        vec2.scale(this.to, devicePixelRatio, this.to);
        vec2.sub(this.to, this.getPos(), this.to);
    }
    setEndColor(newColor, t = 0, f) {
        if (!this.toColor)
            this.toColor = this.getColor();
        const diff = newColor.diff(this.toColor);
        const finalColor = newColor.clone();
        return transitionValues((p) => {
            this.toColor.r += diff.r * p;
            this.toColor.g += diff.g * p;
            this.toColor.b += diff.b * p;
            this.toColor.a += diff.a * p;
            this.vertexCache.updated();
        }, () => {
            this.toColor = finalColor;
            this.vertexCache.updated();
        }, t, f);
    }
    setStart(pos, t = 0, f) {
        return this.moveTo(vector3FromVector2(pos), t, f);
    }
    setEnd(pos, t = 0, f) {
        const diff = vector3();
        vec2.sub(pos, this.to, diff);
        return transitionValues((p) => {
            this.to[0] += diff[0] * p;
            this.to[1] += diff[1] * p;
            this.vertexCache.updated();
        }, () => {
            this.to[0] = pos[0];
            this.to[1] = pos[1];
            this.vertexCache.updated();
        }, t, f);
    }
    getBuffer(camera, force) {
        if (this.vertexCache.shouldUpdate() || force) {
            const normal = vector2(-this.to[1], this.to[0]);
            vec2.normalize(normal, normal);
            vec2.scale(normal, this.thickness / 2, normal);
            const screenSize = camera.getScreenSize();
            const pos = this.getPos();
            const resBuffer = [
                ...vertexBuffer(pos[0] + normal[0], screenSize[1] - pos[1] + normal[1], 0, this.getColor()),
                ...vertexBuffer(pos[0] - normal[0], screenSize[1] - pos[1] - normal[1], 0, this.getColor()),
                ...vertexBuffer(pos[0] + this.to[0] + normal[0], screenSize[1] - pos[1] + this.to[1] + normal[1], 0, this.toColor || this.getColor()),
                ...vertexBuffer(pos[0] - normal[0], screenSize[1] - pos[1] - normal[1], 0, this.getColor()),
                ...vertexBuffer(pos[0] + this.to[0] + normal[0], screenSize[1] - pos[1] + this.to[1] + normal[1], 0, this.toColor || this.getColor()),
                ...vertexBuffer(pos[0] + this.to[0] - normal[0], screenSize[1] - pos[1] + this.to[1] - normal[1], 0, this.toColor || this.getColor())
            ];
            this.vertexCache.setCache(resBuffer);
            return resBuffer;
        }
        return this.vertexCache.getCache();
    }
}
export class Cube extends SimulationElement3d {
    vertices;
    width;
    height;
    depth;
    wireframeLines;
    static wireframeOrder = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 4],
        [0, 4],
        [3, 7],
        [1, 5],
        [2, 6]
    ];
    constructor(pos, width, height, depth, color, rotation) {
        super(pos, rotation, color);
        this.width = width * devicePixelRatio;
        this.height = height * devicePixelRatio;
        this.depth = depth * devicePixelRatio;
        this.rotation = rotation || vector3();
        this.wireframeLines = [];
        const numWireframeLines = 12;
        const lineThickness = 0.025;
        for (let i = 0; i < numWireframeLines; i++) {
            this.wireframeLines.push(new Line3d(vertex(), vertex(), lineThickness));
        }
        this.vertices = [];
        this.computeVertices();
        this.shiftWireframeLines();
    }
    computeVertices() {
        this.vertices = [
            // front face
            vector3(-this.width / 2, -this.height / 2, this.depth / 2),
            vector3(this.width / 2, -this.height / 2, this.depth / 2),
            vector3(this.width / 2, this.height / 2, this.depth / 2),
            vector3(-this.width / 2, this.height / 2, this.depth / 2),
            // back face
            vector3(-this.width / 2, -this.height / 2, -this.depth / 2),
            vector3(this.width / 2, -this.height / 2, -this.depth / 2),
            vector3(this.width / 2, this.height / 2, -this.depth / 2),
            vector3(-this.width / 2, this.height / 2, -this.depth / 2)
        ];
    }
    shiftWireframeLines() {
        let rotMatrix = mat4.identity();
        mat4.rotateZ(rotMatrix, this.rotation[2], rotMatrix);
        mat4.rotateY(rotMatrix, this.rotation[1], rotMatrix);
        mat4.rotateX(rotMatrix, this.rotation[0], rotMatrix);
        const pos = this.getPos();
        Cube.wireframeOrder.forEach((lineVertices, index) => {
            const line = this.wireframeLines[index];
            const start = cloneBuf(this.vertices[lineVertices[0]]);
            const endPoint = cloneBuf(this.vertices[lineVertices[1]]);
            vec3.sub(endPoint, start, endPoint);
            vec3.transformMat4(endPoint, rotMatrix, endPoint);
            vec3.transformMat4(start, rotMatrix, start);
            vec3.add(start, pos, start);
            line.setStart(start);
            line.setEnd(endPoint);
        });
    }
    setWidth(width, t = 0, f) {
        width *= devicePixelRatio;
        const diff = width - this.width;
        return transitionValues((p) => {
            this.width += diff * p;
            this.vertexCache.updated();
        }, () => {
            this.width = width;
            this.vertexCache.updated();
        }, t, f);
    }
    setHeight(height, t = 0, f) {
        height *= devicePixelRatio;
        const diff = height - this.width;
        return transitionValues((p) => {
            this.height += diff * p;
            this.vertexCache.updated();
        }, () => {
            this.height = height;
            this.vertexCache.updated();
        }, t, f);
    }
    setDepth(depth, t = 0, f) {
        depth *= devicePixelRatio;
        const diff = depth - this.width;
        return transitionValues((p) => {
            this.depth += diff * p;
            this.vertexCache.updated();
        }, () => {
            this.depth = depth;
            this.vertexCache.updated();
        }, t, f);
    }
    scale(amount, t = 0, f) {
        const finalWidth = this.width * amount;
        const finalHeight = this.height * amount;
        const finalDepth = this.depth * amount;
        const widthDiff = finalWidth - this.width;
        const heightDiff = finalHeight - this.height;
        const depthDiff = finalDepth - this.depth;
        return transitionValues((p) => {
            this.width += widthDiff * p;
            this.height += heightDiff * p;
            this.depth += depthDiff * p;
            this.vertexCache.updated();
        }, () => {
            this.width = finalWidth;
            this.height = finalHeight;
            this.depth = finalDepth;
            this.vertexCache.updated();
        }, t, f);
    }
    getWireframe(_, force) {
        if (this.wireframeCache.shouldUpdate() || force) {
            // prettier-ignore
            const lineOrder = [
                0, 1, 2, 3, 0, 2,
                6, 5, 1, 6,
                7, 4, 5, 7,
                3, 4, 0,
                5, 6, 3
            ];
            return this.wireframeFromVertexOrder(this.vertices, lineOrder);
        }
        return this.wireframeCache.getCache();
    }
    getTriangles(_, force) {
        if (this.vertexCache.shouldUpdate() || force) {
            this.computeVertices();
            this.shiftWireframeLines();
            const triangleOrder = [
                0, 1, 2, 0, 2, 3,
                4, 5, 6, 4, 6, 7,
                0, 3, 7, 0, 7, 4,
                0, 4, 5, 0, 5, 1,
                1, 2, 6, 1, 5, 6,
                2, 3, 7, 2, 6, 7
            ];
            let rotMatrix = mat4.identity();
            mat4.rotateZ(rotMatrix, this.rotation[2], rotMatrix);
            mat4.rotateY(rotMatrix, this.rotation[1], rotMatrix);
            mat4.rotateX(rotMatrix, this.rotation[0], rotMatrix);
            const pos = this.getPos();
            let resBuffer = [];
            triangleOrder.forEach((index) => {
                const vertex = cloneBuf(this.vertices[index]);
                vec3.transformMat4(vertex, rotMatrix, vertex);
                resBuffer = resBuffer.concat(vertexBuffer(vertex[0] + pos[0], vertex[1] + pos[1], vertex[2] + pos[2], this.getColor()));
            });
            this.vertexCache.setCache(resBuffer);
            return resBuffer;
        }
        return this.vertexCache.getCache();
    }
}
export class BezierCurve2d {
    points;
    constructor(points) {
        if (points.length === 0)
            throw logger.error('Expected 1 or more points for BezierCurve2d');
        this.points = points;
    }
    interpolateSlope(t) {
        t = Math.max(0, Math.min(1, t));
        let vectors = this.points;
        let slopeVector = vector2(1);
        while (vectors.length > 2) {
            let newVectors = [];
            for (let i = 1; i < vectors.length - 1; i++) {
                const from = vector2();
                const to = vector2();
                vec2.sub(vectors[i], vectors[i - 1], from);
                vec2.scale(from, t, from);
                vec2.add(from, vectors[i - 1], from);
                vec2.sub(vectors[i + 1], vectors[i], to);
                vec2.scale(to, t, to);
                vec2.add(to, vectors[i], to);
                if (i === 1) {
                    newVectors.push(from);
                }
                newVectors.push(to);
            }
            vectors = newVectors;
        }
        vec2.sub(vectors[1], vectors[0], slopeVector);
        let resVector = vector2();
        vec2.scale(slopeVector, t, resVector);
        vec2.add(resVector, vectors[0], resVector);
        return [resVector, slopeVector];
    }
    interpolate(t) {
        const [vec] = this.interpolateSlope(t);
        return vec;
    }
    getPoints() {
        return this.points;
    }
    getLength() {
        const start = this.points[0];
        const end = this.points[this.points.length - 1];
        return Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
    }
}
export class CubicBezierCurve2d extends BezierCurve2d {
    detail;
    colors;
    constructor(points, detail, colors) {
        super(points);
        this.detail = detail;
        this.colors = colors || [];
    }
    getDetail() {
        return this.detail;
    }
    getColors() {
        return this.colors;
    }
}
export class SplinePoint2d {
    start;
    end;
    control1;
    control2;
    rawControls;
    detail;
    constructor(start, end, control1, control2, rawControls, detail) {
        this.start = start;
        this.end = end;
        this.control1 = control1;
        this.control2 = control2;
        this.rawControls = rawControls;
        this.detail = detail;
    }
    getStart() {
        return this.start;
    }
    getEnd() {
        return this.end;
    }
    getControls() {
        return [this.control1, this.control2];
    }
    getRawControls() {
        return this.rawControls;
    }
    getDetail() {
        return this.detail;
    }
    getColors(prevColor) {
        const colors = [null, null];
        if (prevColor) {
            colors[0] = prevColor;
        }
        else if (this.start && this.start.getColor()) {
            colors[0] = this.start.getColor();
        }
        if (this.end.getColor()) {
            colors[1] = this.end.getColor();
        }
        if (colors.length > 2 && colors.at(-1) === null) {
            colors.pop();
        }
        return colors;
    }
    getVectorArray(prevEnd, prevControl) {
        const firstControl = cloneBuf(this.control1 || prevControl || vector2());
        if (prevEnd) {
            vec2.add(firstControl, prevEnd, firstControl);
        }
        else if (!this.start) {
            prevEnd = vector2();
        }
        return [
            this.start ? vector2FromVector3(this.start.getPos()) : prevEnd,
            firstControl,
            this.control2,
            vector2FromVector3(this.end.getPos())
        ];
    }
}
export class Spline2d extends SimulationElement {
    curves;
    thickness;
    detail;
    interpolateStart;
    interpolateLimit;
    distance;
    constructor(pos, points, thickness = devicePixelRatio, detail = 40) {
        super(pos.getPos(), pos.getColor() || undefined);
        this.curves = [];
        this.thickness = thickness * devicePixelRatio;
        this.detail = detail;
        this.interpolateStart = 0;
        this.interpolateLimit = 1;
        this.distance = 0;
        for (let i = 0; i < points.length; i++) {
            let prevControl = null;
            let prevColor = null;
            if (i > 0) {
                prevControl = cloneBuf(points[i - 1].getRawControls()[1]);
                vec2.negate(prevControl, prevControl);
                const prevColors = points[i - 1].getColors();
                if (prevColors.at(-1)) {
                    prevColor = prevColors.at(-1) || null;
                }
            }
            const bezierPoints = points[i].getVectorArray(i > 0 ? vector2FromVector3(points[i - 1].getEnd().getPos()) : null, prevControl);
            const curve = new CubicBezierCurve2d(bezierPoints, points[i].getDetail(), points[i].getColors(prevColor));
            this.distance += curve.getLength();
            this.curves.push(curve);
        }
    }
    setInterpolateStart(start, t = 0, f) {
        const diff = start - this.interpolateStart;
        return transitionValues((p) => {
            this.interpolateStart += diff * p;
            this.vertexCache.updated();
        }, () => {
            this.interpolateStart = start;
            this.vertexCache.updated();
        }, t, f);
    }
    setInterpolateLimit(limit, t = 0, f) {
        const diff = limit - this.interpolateLimit;
        return transitionValues((p) => {
            this.interpolateLimit += diff * p;
            this.vertexCache.updated();
        }, () => {
            this.interpolateLimit = limit;
            this.vertexCache.updated();
        }, t, f);
    }
    interpolateSlope(t) {
        const curveInterval = 1 / this.curves.length;
        let index = Math.floor(t / curveInterval);
        if (index === this.curves.length)
            index--;
        const diff = (t - curveInterval * index) * 2;
        return this.curves[index].interpolateSlope(diff);
    }
    interpolate(t) {
        const [vec] = this.interpolateSlope(t);
        return vec;
    }
    getBuffer(camera, force) {
        if (this.vertexCache.shouldUpdate() || force) {
            const screenSize = camera.getScreenSize();
            let verticesTop = [];
            const verticesBottom = [];
            let currentDistance = 0;
            let interpolationStarted = false;
            outer: for (let i = 0; i < this.curves.length; i++) {
                const detail = this.curves[i].getDetail() || this.detail;
                const step = 1 / detail;
                const distanceRatio = currentDistance / this.distance;
                if (distanceRatio > this.interpolateLimit)
                    break;
                const curveLength = this.curves[i].getLength();
                currentDistance += curveLength;
                const sectionRatio = curveLength / this.distance;
                for (let j = 0; j < detail + 1; j++) {
                    let currentInterpolation = step * j;
                    let atLimit = false;
                    if (step * j * sectionRatio + distanceRatio > this.interpolateLimit) {
                        atLimit = true;
                        currentInterpolation = (this.interpolateLimit - distanceRatio) / sectionRatio;
                    }
                    if (distanceRatio + currentInterpolation / this.curves.length < this.interpolateStart) {
                        continue;
                    }
                    if (!interpolationStarted) {
                        interpolationStarted = true;
                        currentInterpolation = (this.interpolateStart - distanceRatio) / sectionRatio;
                        j--;
                    }
                    const [point, slope] = this.curves[i].interpolateSlope(currentInterpolation);
                    const pos = this.getPos();
                    point[0] += pos[0];
                    point[1] += screenSize[1] - pos[1];
                    const normal = vector2(-slope[1], slope[0]);
                    vec2.normalize(normal, normal);
                    vec2.scale(normal, this.thickness / 2, normal);
                    const colors = this.curves[i].getColors().map((c) => (c ? c : this.getColor()));
                    const vertexColor = interpolateColors(colors, currentInterpolation);
                    const vertTop = vertex(point[0] + normal[0], point[1] + normal[1], 0, vertexColor);
                    verticesTop.push(vertTop);
                    const vertBottom = vertex(point[0] - normal[0], point[1] - normal[1], 0, vertexColor);
                    verticesBottom.unshift(vertBottom);
                    if (atLimit) {
                        break outer;
                    }
                }
            }
            verticesTop = verticesTop.concat(verticesBottom);
            let resBuffer = [];
            lossyTriangulate(verticesTop)
                .flat()
                .forEach((vert) => {
                const pos = vert.getPos();
                resBuffer = resBuffer.concat(vertexBuffer(pos[0], pos[1], 0, vert.getColor() || this.getColor()));
            });
            this.vertexCache.setCache(resBuffer);
            return resBuffer;
        }
        return this.vertexCache.getCache();
    }
}
