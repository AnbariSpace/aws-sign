import { Transform, TransformCallback } from "stream";

export default class ChunkedToNormalTransform extends Transform {
	private data: Buffer | undefined;
	private size: number | undefined;
	private signature: string | undefined;
	private offset: number;
	private chunkOffset = 0;
	private restart = true;
	private totalDecoded = 0;

	public constructor(public readonly expectedContentLength: number) {
		super();
	}

	public _transform(data: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
		try {
			if (this.data) {
				const newBuffer = Buffer.alloc(this.data.byteLength + data.byteLength - this.offset);
				this.data.copy(newBuffer, 0, this.offset);
				data.copy(newBuffer, this.data.byteLength - this.offset);
				this.data = newBuffer;
			} else {
				this.data = data;
			}
			this.offset = 0;

			do {
				this.restart = false;
				if (this.size === undefined) {
					this.readSize();
				}

				if (this.size !== undefined && this.signature === undefined) {
					this.readSignature();
				}

				if (this.size !== undefined && this.signature !== undefined) {
					this.readChunk();
				}
			} while(this.restart);
			callback();
		} catch (e) {
			callback(e);
		}
	}

	public _final(callback: TransformCallback): void {
		if (this.totalDecoded < this.expectedContentLength) {
			const error = new Error("The request body terminated unexpectedly");
			error.name = "IncompleteBodyError";
			callback(error);
			return;
		}

		callback(null, null);
	}

	private reset(): void {
		this.data = undefined;
		this.size = undefined;
		this.signature = undefined;
		this.offset = 0;
		this.chunkOffset = 0;
		this.restart = false;
	}

	private readSize(): void {
		if (this.data === undefined) {
			throw new Error("Buffer not present");
		}
		if (this.size !== undefined) {
			throw new Error("Size already read");
		}
		const index = this.data.indexOf(";");
		if (index === -1) {
			return;
		}
		this.offset = index + 1;
		this.size = parseInt(this.data.slice(0, index).toString("utf-8"), 16);
	}

	private readSignature(): void {
		if (this.data === undefined) {
			throw new Error("Buffer not present");
		}
		if (this.size === undefined) {
			throw new Error("Size must read first");
		}
		if (this.signature !== undefined) {
			throw new Error("Signature already read");
		}
		const key = "chunk-signature=";
		const keyOffset = this.data.indexOf(key);
		if (keyOffset === -1) {
			return;
		}
		const crlfOffset = this.data.indexOf("\r\n", keyOffset);
		if (crlfOffset === -1) {
			return;
		}
		this.offset = crlfOffset + 2;
		this.signature = this.data.slice(keyOffset + key.length, crlfOffset).toString("utf-8");
	}

	private readChunk(): void {
		if (this.data === undefined) {
			throw new Error("Buffer not present");
		}
		if (this.size === undefined) {
			throw new Error("Size must read first");
		}
		if (this.signature === undefined) {
			throw new Error("Signature must read first");
		}
		if (this.chunkOffset === this.size) {
			this.offset += 2;
			let leftOver: Buffer | undefined;
			if (this.offset < this.data.byteLength - 1) {
				leftOver = this.data.slice(this.offset);
			}
			this.reset();
			this.data = leftOver;
			if (leftOver) {
				this.restart = true;
			}
			return;
		}
		const data = this.data.slice(this.offset, this.offset + (this.size - this.chunkOffset));
		this.offset += data.byteLength;
		this.chunkOffset += data.byteLength;
		this.totalDecoded += data.byteLength;
		this.push(data);
	}
}
