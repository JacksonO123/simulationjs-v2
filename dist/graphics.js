import { vec3, quat, mat4, vec2, vec4 } from 'wgpu-matrix';
import { Vertex, VertexCache, cloneBuf, color, colorFromVector4, lossyTriangulate, vec3ToPixelRatio, vector3FromVector2, vector2, vector3, vertex, vertexBuffer2d, vertexBuffer3d, Color, transitionValues, logger, vector2FromVector3 } from './utils.js';
export class SimulationElement {
    pos;
    color;
    camera;
    vertexCache;
    constructor(pos, color = new Color()) {
        this.pos = pos;
        vec3ToPixelRatio(this.pos);
        this.color = color;
        this.vertexCache = new VertexCache();
        this.camera = null;
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
        const diffR = newColor.r - this.color.r;
        const diffG = newColor.g - this.color.g;
        const diffB = newColor.b - this.color.b;
        const diffA = newColor.a - this.color.a;
        const finalColor = newColor.clone();
        return transitionValues((p) => {
            this.color.r += diffR * p;
            this.color.g += diffG * p;
            this.color.b += diffB * p;
            this.color.a += diffA * p;
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
        const finalPos = vec3.create();
        vec3.add(finalPos, this.pos, amount);
        return transitionValues((p) => {
            const x = amount[0] * p;
            const y = amount[1] * p;
            const z = amount[2] * p;
            vec3.add(this.pos, this.pos, vector3(x, y, z));
            this.vertexCache.updated();
        }, () => {
            this.pos = finalPos;
            this.vertexCache.updated();
        }, t, f);
    }
    moveTo(pos, t = 0, f) {
        const diff = vec3.create();
        vec3.sub(diff, pos, this.pos);
        return transitionValues((p) => {
            const x = diff[0] * p;
            const y = diff[1] * p;
            const z = diff[2] * p;
            vec3.add(this.pos, this.pos, vector3(x, y, z));
            this.vertexCache.updated();
        }, () => {
            this.pos = pos;
            this.vertexCache.updated();
        }, t, f);
    }
}
export class Plane extends SimulationElement {
    points;
    rotation;
    constructor(pos, points, color, rotation = vector3()) {
        super(pos, color);
        this.points = points;
        this.rotation = rotation;
    }
    setPoints(newPoints) {
        this.points = newPoints;
    }
    rotate(amount, t = 0, f) {
        const initial = vec3.clone(this.rotation);
        return transitionValues((p) => {
            const step = vector3();
            vec3.scale(amount, p, step);
            vec3.add(this.rotation, step, this.rotation);
            this.vertexCache.updated();
        }, () => {
            vec3.add(initial, amount, initial);
            this.rotation = initial;
            this.vertexCache.updated();
        }, t, f);
    }
    rotateTo(angle, t = 0, f) {
        const diff = vector3();
        vec3.sub(angle, this.rotation, diff);
        return transitionValues((p) => {
            const toRotate = vector3();
            vec3.scale(diff, p, toRotate);
            vec3.add(this.rotation, toRotate, this.rotation);
            this.vertexCache.updated();
        }, () => {
            this.rotation = angle;
            this.vertexCache.updated();
        }, t, f);
    }
    getBuffer(_, force) {
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
                resBuffer = resBuffer.concat(vertexBuffer3d(out[0], out[1], out[2], vertexColor));
            });
            this.vertexCache.setCache(resBuffer);
            return resBuffer;
        }
        return this.vertexCache.getCache();
    }
}
export class Square extends SimulationElement {
    width;
    height;
    rotation;
    vertexColors;
    points;
    /**
     * @param vertexColors{Record<number, Color>} - 0 is top left vertex, numbers increase clockwise
     */
    constructor(pos, width, height, color, rotation, vertexColors) {
        super(vector3FromVector2(pos), color);
        this.width = width * devicePixelRatio;
        this.height = height * devicePixelRatio;
        this.rotation = rotation || 0;
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
    getBuffer(camera, force) {
        if (this.vertexCache.shouldUpdate() || force) {
            let resBuffer = [];
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
            vertexOrder.forEach((vertex) => {
                let vertexColor = this.vertexColors[vertex];
                vertexColor = vertexColor ? vertexColor : this.getColor();
                resBuffer = resBuffer.concat(vertexBuffer2d(points[vertex][0], points[vertex][1], vertexColor));
            });
            this.vertexCache.setCache(resBuffer);
            return resBuffer;
        }
        return this.vertexCache.getCache();
    }
}
export class Circle extends SimulationElement {
    radius;
    detail = 100;
    constructor(pos, radius, color, detail = 50) {
        super(vector3FromVector2(pos), color);
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
export class Polygon extends SimulationElement {
    vertices;
    rotation = 0;
    constructor(pos, vertices, color) {
        super(pos, color);
        this.vertices = vertices.map((vertex) => {
            const newVertex = vertex.clone();
            newVertex.setZ(0);
            newVertex.setIs3d(false);
            return vertex;
        });
    }
    rotate(amount, t = 0, f) {
        const finalRotation = this.rotation + amount;
        return transitionValues((p) => {
            this.rotation += amount * p;
            this.vertexCache.updated();
        }, () => {
            this.rotation = finalRotation;
        }, t, f);
    }
    rotateTo(num, t = 0, f) {
        const diff = num - this.rotation;
        return transitionValues((p) => {
            this.rotation += diff * p;
            this.vertexCache.updated();
        }, () => {
            this.rotation = num;
        }, t, f);
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
                resBuffer = resBuffer.concat(vertexBuffer2d(pos[0], pos[1], vert.getColor() || this.getColor()));
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
    constructor(points, detail) {
        super(points);
        this.detail = detail;
    }
    getDetail() {
        return this.detail;
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
    width;
    detail;
    interpolateLimit;
    distance;
    constructor(pos, points, width = 2, color, detail = 40) {
        super(vector3FromVector2(pos), color);
        this.curves = [];
        this.width = width * devicePixelRatio;
        this.detail = detail;
        this.interpolateLimit = 1;
        this.distance = 0;
        for (let i = 0; i < points.length; i++) {
            let prevControl = null;
            if (i > 0) {
                prevControl = cloneBuf(points[i - 1].getRawControls()[1]);
                vec2.negate(prevControl, prevControl);
                console.log(prevControl);
            }
            const bezierPoints = points[i].getVectorArray(i > 0 ? vector2FromVector3(points[i - 1].getEnd().getPos()) : null, prevControl);
            const curve = new CubicBezierCurve2d(bezierPoints, points[i].getDetail());
            this.distance += curve.getLength();
            this.curves.push(curve);
        }
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
    getBuffer(camera, force) {
        if (this.vertexCache.shouldUpdate() || force) {
            const screenSize = camera.getScreenSize();
            let verticesTop = [];
            const verticesBottom = [];
            let currentDistance = 0;
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
                    const [point, slope] = this.curves[i].interpolateSlope(currentInterpolation);
                    const pos = this.getPos();
                    point[0] += pos[0];
                    point[1] += screenSize[1] - pos[1];
                    const normal = vector2(-slope[1], slope[0]);
                    vec2.normalize(normal, normal);
                    vec2.scale(normal, this.width / 2, normal);
                    const vertTop = vertex(point[0] + normal[0], point[1] + normal[1]);
                    verticesTop.push(vertTop);
                    const vertBottom = vertex(point[0] - normal[0], point[1] - normal[1]);
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
                resBuffer = resBuffer.concat(vertexBuffer2d(pos[0], pos[1], vert.getColor() || this.getColor()));
            });
            this.vertexCache.setCache(resBuffer);
            return resBuffer;
        }
        return this.vertexCache.getCache();
    }
}
