import { createHash } from "crypto";
import { Readable } from "stream";
import { generateRandomBuffer, randomPushDataToReadableStream, readAllStream } from "./TestHelpers";
import HashVerifierStream from "../src/HashVerifierStream";


test("Test valid Md5", async () => {
	const data = generateRandomBuffer();
	const hash = createHash("md5").update(data).digest("hex");
	
	const stream = new Readable({
		read() { }
	});
	const pipe = stream.pipe(new HashVerifierStream("md5", hash));
	randomPushDataToReadableStream(stream, data);
	expect(readAllStream(pipe)).resolves.toEqual(data);
});

test("Test invalid Md5", async () => {
	const data = generateRandomBuffer();
	const hash = createHash("md5").update("some-invalid-data").digest("hex");
	
	const stream = new Readable({
		read() { }
	});
	const pipe = stream.pipe(new HashVerifierStream("md5", hash));
	randomPushDataToReadableStream(stream, data);
	expect(readAllStream(pipe)).rejects.toThrowError();
});