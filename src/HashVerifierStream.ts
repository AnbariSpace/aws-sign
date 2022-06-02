import { createHash, Hash } from "crypto";
import { Transform, TransformCallback } from "stream";

export default class HashVerifierStream extends Transform {
	private hash: Hash;

	public constructor(algorithm: string, public readonly expectedHash: string) {
		super();
		this.hash = createHash(algorithm);
	}

	public _transform(data: any, encoding: BufferEncoding, callback: TransformCallback): void {
		this.hash.update(data, encoding);
		callback(undefined, data);
	}

	public _final(callback: TransformCallback): void {
		const digest = this.hash.digest("hex");
		if (digest !== this.expectedHash) {
			const error = new Error("The Content-MD5 or checksum value that you specified did not match what the server received.");
			error.name = "BadDigest";
			callback(error);
			return;
		}

		return callback();
	}
}
