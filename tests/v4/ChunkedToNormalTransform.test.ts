import { createHash } from "crypto";
import { Readable } from "stream"
import ChunkedToNormalTransform from "../../src/v4/ChunkedToNormalTransform";

test("Test 1", (done) => {
	const myData = "test-random-text";
	const signature = createHash("sha256").update(myData).digest("hex");
	const stream = new Readable({
		read() {}
	});
	const transformer = new ChunkedToNormalTransform(myData.length);
	stream.pipe(transformer, {end: true}).on("data", (data: Buffer) => {
		expect(data.toString()).toBe(myData);
	}).on("end", () =>{
		done();
	}).on("error", (e) => {
		done(e);
	});
	stream.push(Buffer.from(`${myData.length.toString(16)};chunk-signature=${signature}\r\n`));
	stream.push(Buffer.from(myData));
	stream.push(Buffer.from("\r\n"));
	stream.push(null);
})
