import { Readable } from "stream";

export function generateRandomBuffer(length?: number): Buffer {
	if (length === undefined) {
		length = Math.floor(Math.random() * 10 * 1024);
	}
	const data = Buffer.alloc(length);
	for (let x = 0; x < length; x++) {
		data.writeUInt8(Math.round(Math.random() * 26) + 95, x);
	}

	return data;
}

export function randomPushDataToReadableStream(stream: Readable, data: Buffer): void {
	const max = data.length;
	for (let x = 0; x < max;) {
		const end = Math.floor(Math.random() * (max  - x - 1)) + x + 1;
		const slice = data.slice(x, end);
		stream.push(slice);
		x = end;
	}
	stream.push(null);
}

export function createRandomReadableStream(length?: number): Readable {
	const stream = new Readable({
		read() { }
	});

	const data = generateRandomBuffer(length);
	randomPushDataToReadableStream(stream, data);

	return stream;
}

export function readAllStream(stream: Readable): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		let read: Buffer | undefined;
		stream.on("data", (chunk: Buffer) => {
			if (read === undefined) {
				read = chunk;
			} else {
				const newBuffer = Buffer.alloc(read.length + chunk.length);
				read.copy(newBuffer);
				chunk.copy(newBuffer, read.length);
				read = newBuffer;
			}
		});
		stream.on("error", reject);
		stream.on("end", () => {
			if (read === undefined) {
				reject("No data");
				return;
			}
			resolve(read);
		});
	});

}