import { vec3, mat4, vec2, vec4 } from 'wgpu-matrix';
import { Vertex, VertexCache, cloneBuf, color, colorFromVector4, vector3ToPixelRatio, vector2, vector3, vertex, Color, transitionValues, logger, vector2FromVector3, matrix4, rotateMat4, vector3FromVector2, vector2ToPixelRatio } from './utils.js';
import { CircleGeometry, CubeGeometry, Line2dGeometry, Line3dGeometry, PlaneGeometry, PolygonGeometry, SplineGeometry, SquareGeometry } from './geometry.js';
export class SimulationElement {
    color;
    wireframe;
    vertexCache;
    rotation;
    is3d;
    /**
     * @param pos - Expected to be adjusted to devicePixelRatio before reaching constructor
     */
    constructor(color = new Color(), rotation, is3d = true) {
        this.color = color;
        this.vertexCache = new VertexCache();
        this.is3d = is3d;
        this.wireframe = false;
        this.rotation = rotation;
    }
    getGeometryType() {
        return this.geometry.getType();
    }
    setWireframe(wireframe) {
        this.wireframe = wireframe;
    }
    isWireframe() {
        return this.wireframe;
    }
    getColor() {
        return this.color;
    }
    getPos() {
        return this.pos;
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
    getVertexCount() {
        if (this.isWireframe()) {
            return this.geometry.getWireframeVertexCount();
        }
        return this.geometry.getTriangleVertexCount();
    }
    defaultUpdateMatrix(camera) {
        const matrix = matrix4();
        if (typeof this.rotation === 'number') {
            const pos = vector3FromVector2(this.pos);
            pos[1] = camera.getScreenSize()[1] - pos[1];
            mat4.translate(matrix, pos, matrix);
            mat4.rotateZ(matrix, this.rotation, matrix);
        }
        else {
            mat4.translate(matrix, this.pos, matrix);
            rotateMat4(matrix, this.rotation);
        }
        this.geometry.updateMatrix(matrix);
    }
    getBuffer(camera) {
        if (this.vertexCache.shouldUpdate() || camera.hasUpdated()) {
            this.updateMatrix(camera);
            this.geometry.recompute();
            let resBuffer = [];
            if (this.isWireframe()) {
                resBuffer = this.geometry.getWireframeBuffer(this.color);
            }
            else {
                resBuffer = this.geometry.getTriangleBuffer(this.color);
            }
            this.vertexCache.setCache(resBuffer);
            return resBuffer;
        }
        return this.vertexCache.getCache();
    }
}
export class SimulationElement3d extends SimulationElement {
    pos;
    rotation;
    constructor(pos, rotation = vector3(), color) {
        super(color, rotation);
        this.pos = pos;
        vector3ToPixelRatio(this.pos);
        this.rotation = rotation;
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
    rotateTo(rot, t = 0, f) {
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
    move(amount, t = 0, f) {
        const finalPos = cloneBuf(this.pos);
        vec3.add(finalPos, amount, finalPos);
        return transitionValues((p) => {
            this.pos[0] += amount[0] * p;
            this.pos[1] += amount[1] * p;
            this.pos[2] += amount[2] * p;
            this.vertexCache.updated();
        }, () => {
            this.pos = finalPos;
            this.vertexCache.updated();
        }, t, f);
    }
    moveTo(pos, t = 0, f) {
        const diff = vector3();
        vec3.sub(pos, this.pos, diff);
        return transitionValues((p) => {
            this.pos[0] += diff[0] * p;
            this.pos[1] += diff[1] * p;
            this.pos[2] += diff[2] * p;
            this.vertexCache.updated();
        }, () => {
            this.pos = pos;
            this.vertexCache.updated();
        }, t, f);
    }
}
export class SimulationElement2d extends SimulationElement {
    pos;
    rotation;
    constructor(pos, rotation = 0, color) {
        super(color, rotation, false);
        this.pos = pos;
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
    rotateTo(newRotation, t = 0, f) {
        const diff = newRotation - this.rotation;
        return transitionValues((p) => {
            this.rotation += diff * p;
            this.vertexCache.updated();
        }, () => {
            this.rotation = newRotation;
            this.vertexCache.updated();
        }, t, f);
    }
    move(amount, t = 0, f) {
        const finalPos = vector2();
        vec3.add(amount, this.pos, finalPos);
        return transitionValues((p) => {
            this.pos[0] += amount[0] * p;
            this.pos[1] += amount[1] * p;
            this.vertexCache.updated();
        }, () => {
            this.pos = finalPos;
            this.vertexCache.updated();
        }, t, f);
    }
    moveTo(pos, t = 0, f) {
        const diff = vector2();
        vec2.sub(pos, this.pos, diff);
        return transitionValues((p) => {
            this.pos[0] += diff[0] * p;
            this.pos[1] += diff[1] * p;
            this.vertexCache.updated();
        }, () => {
            this.pos = pos;
            this.vertexCache.updated();
        }, t, f);
    }
}
export class Plane extends SimulationElement3d {
    geometry;
    points;
    constructor(pos, points, color, rotation = vector3()) {
        super(pos, rotation, color);
        this.rotation = rotation;
        this.points = points;
        this.geometry = new PlaneGeometry(points);
    }
    setPoints(newPoints) {
        this.points = newPoints;
        this.vertexCache.updated();
    }
    updateMatrix(camera) {
        this.defaultUpdateMatrix(camera);
    }
}
export class Square extends SimulationElement2d {
    geometry;
    width;
    height;
    vertexColors;
    /**
     * @param vertexColors{Record<number, Color>} - 0 is top left vertex, numbers increase clockwise
     */
    constructor(pos, width, height, color, rotation, vertexColors) {
        super(pos, rotation, color);
        vector2ToPixelRatio(this.pos);
        this.width = width * devicePixelRatio;
        this.height = height * devicePixelRatio;
        this.vertexColors = this.cloneColorMap(vertexColors || {});
        this.geometry = new SquareGeometry(this.width, this.height);
        this.geometry.setVertexColorMap(this.vertexColors);
    }
    cloneColorMap(colorMap) {
        const newColorMap = {};
        Object.entries(colorMap).forEach(([key, value]) => {
            newColorMap[+key] = value.clone();
        });
        return newColorMap;
    }
    setVertexColors(newColorMap, t = 0, f) {
        const colorMap = this.cloneColorMap(newColorMap);
        const diffMap = {};
        Object.entries(colorMap).forEach(([key, value]) => {
            if (!this.vertexColors[+key]) {
                this.vertexColors[+key] = color();
            }
            diffMap[+key] = value.diff(this.vertexColors[+key] || color());
        });
        Object.entries(this.vertexColors).forEach(([key, value]) => {
            if (!diffMap[+key]) {
                const clone = value.clone();
                clone.r *= -1;
                clone.g *= -1;
                clone.b *= -1;
                diffMap[+key] = clone;
            }
        });
        return transitionValues((p) => {
            Object.entries(diffMap).forEach(([key, value]) => {
                const color = this.vertexColors[+key];
                color.r += value.r * p;
                color.g += value.g * p;
                color.b += value.b * p;
                color.a += value.a * p;
                this.vertexColors[+key] = color;
            });
            this.geometry.setVertexColorMap(this.vertexColors);
            this.vertexCache.updated();
        }, () => {
            this.vertexColors = colorMap;
            this.geometry.setVertexColorMap(this.vertexColors);
            this.vertexCache.updated();
        }, t, f);
    }
    scaleWidth(amount, t = 0, f) {
        const finalWidth = this.width * amount;
        const diffWidth = finalWidth - this.width;
        return transitionValues((p) => {
            this.width += diffWidth * p;
            this.geometry.setWidth(this.width);
            this.vertexCache.updated();
        }, () => {
            this.width = finalWidth;
            this.geometry.setWidth(this.width);
            this.vertexCache.updated();
        }, t, f);
    }
    scaleHeight(amount, t = 0, f) {
        const finalHeight = this.height * amount;
        const diffHeight = finalHeight - this.height;
        return transitionValues((p) => {
            this.height += diffHeight * p;
            this.geometry.setHeight(this.height);
            this.vertexCache.updated();
        }, () => {
            this.height = finalHeight;
            this.geometry.setHeight(this.height);
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
            this.geometry.setWidth(this.width);
            this.geometry.setHeight(this.height);
            this.vertexCache.updated();
        }, () => {
            this.width = finalWidth;
            this.height = finalHeight;
            this.geometry.setWidth(this.width);
            this.geometry.setHeight(this.height);
            this.vertexCache.updated();
        }, t, f);
    }
    setWidth(num, t = 0, f) {
        num *= devicePixelRatio;
        const diffWidth = num - this.width;
        return transitionValues((p) => {
            this.width += diffWidth * p;
            this.geometry.setWidth(this.width);
            this.vertexCache.updated();
        }, () => {
            this.width = num;
            this.geometry.setWidth(this.width);
            this.vertexCache.updated();
        }, t, f);
    }
    setHeight(num, t = 0, f) {
        num *= devicePixelRatio;
        const diffHeight = num - this.height;
        return transitionValues((p) => {
            this.height += diffHeight * p;
            this.geometry.setHeight(this.height);
            this.vertexCache.updated();
        }, () => {
            this.height = num;
            this.geometry.setHeight(this.height);
            this.vertexCache.updated();
        }, t, f);
    }
    updateMatrix(camera) {
        const pos = cloneBuf(this.pos);
        pos[1] = camera.getScreenSize()[1] - pos[1];
        pos[0] += this.width / 2;
        pos[1] -= this.height / 2;
        const matrix = matrix4();
        mat4.translate(matrix, vector3FromVector2(pos), matrix);
        mat4.rotateZ(matrix, this.rotation, matrix);
        this.geometry.updateMatrix(matrix);
    }
}
export class Circle extends SimulationElement2d {
    geometry;
    radius;
    detail;
    constructor(pos, radius, color, detail = 50) {
        super(pos, 0, color);
        this.radius = radius;
        this.detail = detail;
        this.geometry = new CircleGeometry(this.radius, this.detail);
    }
    setRadius(num, t = 0, f) {
        num *= devicePixelRatio;
        const diff = num - this.radius;
        return transitionValues((p) => {
            this.radius += diff * p;
            this.geometry.setRadius(this.radius);
            this.vertexCache.updated();
        }, () => {
            this.radius = num;
            this.geometry.setRadius(this.radius);
            this.vertexCache.updated();
        }, t, f);
    }
    scale(amount, t = 0, f) {
        const finalRadius = this.radius * amount;
        const diff = finalRadius - this.radius;
        return transitionValues((p) => {
            this.radius += diff * p;
            this.geometry.setRadius(this.radius);
            this.vertexCache.updated();
        }, () => {
            this.radius = finalRadius;
            this.geometry.setRadius(this.radius);
            this.vertexCache.updated();
        }, t, f);
    }
    updateMatrix(camera) {
        this.defaultUpdateMatrix(camera);
    }
}
// TODO: litterally this whole thing
export class Polygon extends SimulationElement2d {
    geometry;
    vertices;
    constructor(pos, points, color, rotation) {
        super(pos, rotation, color);
        this.vertices = points;
        this.geometry = new PolygonGeometry(this.vertices);
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
                this.vertices.push(new Vertex(lastPos[0], lastPos[1], 0, lastVert.getColor() || this.color, false));
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
        const initialColors = this.vertices.map((vert) => (vert.getColor() || this.color).toVec4());
        const colorChanges = [
            ...vertices.map((vert, i) => {
                const diff = (vert.getColor() || this.color).diff(this.vertices[i].getColor() || this.color);
                return diff.toVec4();
            }),
            ...(this.vertices.length > vertices.length
                ? this.vertices.slice(vertices.length, this.vertices.length).map((vert) => {
                    const toColor = vertices[vertices.length - 1].getColor();
                    return (toColor || this.color).diff(vert.getColor() || this.color).toVec4();
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
                vec4.add((vert.getColor() || this.color).toVec4(), colorChange, colorChange);
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
    updateMatrix(camera) {
        this.defaultUpdateMatrix(camera);
    }
}
export class Line3d extends SimulationElement3d {
    geometry;
    to;
    thickness;
    constructor(pos, to, thickness) {
        super(pos.getPos(), vector3(), to.getColor() || undefined);
        this.thickness = thickness;
        this.to = to.getPos();
        vec3.scale(this.to, devicePixelRatio, this.to);
        vec3.sub(this.to, this.pos, this.to);
        this.geometry = new Line3dGeometry(this.pos, this.to, this.thickness);
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
    updateMatrix(camera) {
        return this.defaultUpdateMatrix(camera);
    }
}
export class Line2d extends SimulationElement2d {
    geometry;
    to;
    thickness;
    constructor(from, to, thickness = 1) {
        super(vector2FromVector3(from.getPos()), 0, from.getColor() || undefined);
        this.thickness = thickness * devicePixelRatio;
        this.to = vector2FromVector3(to.getPos());
        vec2.scale(this.to, devicePixelRatio, this.to);
        vec2.sub(this.to, this.pos, this.to);
        this.geometry = new Line2dGeometry(this.pos, this.to, this.thickness);
    }
    setStart(pos, t = 0, f) {
        return this.moveTo(pos, t, f);
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
    updateMatrix(camera) {
        return this.defaultUpdateMatrix(camera);
    }
}
export class Cube extends SimulationElement3d {
    geometry;
    width;
    height;
    depth;
    constructor(pos, width, height, depth, color, rotation) {
        super(pos, rotation, color);
        this.width = width * devicePixelRatio;
        this.height = height * devicePixelRatio;
        this.depth = depth * devicePixelRatio;
        this.rotation = rotation || vector3();
        this.geometry = new CubeGeometry(this.width, this.height, this.depth);
    }
    setWidth(width, t = 0, f) {
        width *= devicePixelRatio;
        const diff = width - this.width;
        return transitionValues((p) => {
            this.width += diff * p;
            this.geometry.setWidth(this.width);
            this.vertexCache.updated();
        }, () => {
            this.width = width;
            this.geometry.setWidth(this.width);
            this.vertexCache.updated();
        }, t, f);
    }
    setHeight(height, t = 0, f) {
        height *= devicePixelRatio;
        const diff = height - this.width;
        return transitionValues((p) => {
            this.height += diff * p;
            this.geometry.setHeight(this.height);
            this.vertexCache.updated();
        }, () => {
            this.height = height;
            this.geometry.setHeight(this.height);
            this.vertexCache.updated();
        }, t, f);
    }
    setDepth(depth, t = 0, f) {
        depth *= devicePixelRatio;
        const diff = depth - this.width;
        return transitionValues((p) => {
            this.depth += diff * p;
            this.geometry.setDepth(this.depth);
            this.vertexCache.updated();
        }, () => {
            this.depth = depth;
            this.geometry.setDepth(this.depth);
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
            this.geometry.setWidth(this.width);
            this.geometry.setHeight(this.height);
            this.geometry.setDepth(this.depth);
            this.vertexCache.updated();
        }, () => {
            this.width = finalWidth;
            this.height = finalHeight;
            this.depth = finalDepth;
            this.geometry.setWidth(this.width);
            this.geometry.setHeight(this.height);
            this.geometry.setDepth(this.depth);
            this.vertexCache.updated();
        }, t, f);
    }
    updateMatrix(camera) {
        this.defaultUpdateMatrix(camera);
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
export class Spline2d extends SimulationElement2d {
    geometry;
    curves;
    thickness;
    detail;
    interpolateStart;
    interpolateLimit;
    constructor(pos, points, thickness = devicePixelRatio, detail = 40) {
        super(vector2FromVector3(pos.getPos()), 0, pos.getColor() || undefined);
        this.curves = [];
        this.thickness = thickness * devicePixelRatio;
        this.detail = detail;
        this.interpolateStart = 0;
        this.interpolateLimit = 1;
        this.geometry = new SplineGeometry(points, this.getColor(), this.thickness, this.detail);
    }
    setInterpolateStart(start, t = 0, f) {
        const diff = start - this.interpolateStart;
        return transitionValues((p) => {
            this.interpolateStart += diff * p;
            this.geometry.updateInterpolationStart(this.interpolateStart);
            this.vertexCache.updated();
        }, () => {
            this.interpolateStart = start;
            this.geometry.updateInterpolationStart(this.interpolateStart);
            this.vertexCache.updated();
        }, t, f);
    }
    setInterpolateLimit(limit, t = 0, f) {
        const diff = limit - this.interpolateLimit;
        return transitionValues((p) => {
            this.interpolateLimit += diff * p;
            this.geometry.updateInterpolationLimit(this.interpolateLimit);
            this.vertexCache.updated();
        }, () => {
            this.interpolateLimit = limit;
            this.geometry.updateInterpolationLimit(this.interpolateLimit);
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
    updateMatrix(camera) {
        this.defaultUpdateMatrix(camera);
    }
}
