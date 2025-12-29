import { logger } from '../globals.js';
import {
    ArrayTypes,
    BackendType,
    BufferFromBackendType,
    SpecificMemoBufferType
} from '../types.js';

export abstract class MemoBuffer {
    protected abstract buffer: BufferFromBackendType<unknown> | null;
    protected bufferCapacity: number;
    private backendType: BackendType;

    constructor(backendType: BackendType, initCapacity: number) {
        this.backendType = backendType;
        this.bufferCapacity = initCapacity;
    }

    abstract allocBuffer(): void;
    abstract destroy(): void;
    // cant be abstract because offset should be default param to 0
    // which it wont allow (even though it could)
    write(_buf: ArrayTypes, _offset = 0) {}

    getBuffer() {
        if (!this.buffer) this.allocBuffer();
        return this.buffer!;
    }

    private growCapacity(current: number, target: number) {
        let res = Math.max(1, current);
        while (res < target) {
            res += Math.ceil(res / 2);
        }
        return res;
    }

    ensureCapacity(capacity: number) {
        this.setCapacityPrecise(this.growCapacity(this.bufferCapacity, capacity));
    }

    setCapacityPrecise(capacity: number) {
        if (!this.buffer) {
            this.bufferCapacity = capacity;
            this.allocBuffer();
        }
        if (capacity <= this.bufferCapacity) return;

        this.bufferCapacity = capacity;
        this.allocBuffer();
    }

    as<T extends BackendType>(type: T): SpecificMemoBufferType<T> {
        if (type !== this.backendType) throw logger.error('Incompatible memo buffer cast');
        return this as unknown as SpecificMemoBufferType<T>;
    }
}
