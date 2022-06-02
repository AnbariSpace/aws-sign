import { IncomingMessage } from "http";
import { createRequest, MockRequest } from "node-mocks-http";
import Parser from "../../src/v4/Parser";
import { Credential } from "../../src/v4/Sign";
import Signer from "../../src/v4/Signer";
import Validator, { IUser, IUserRepository } from "../../src/v4/Validator";

class UserRepository implements IUserRepository {
	public async findByCredential(credential: Credential): Promise<IUser | undefined> {
		if (credential.accessKey === "AKIDEXAMPLE") {
			return {
				accessKey: credential.accessKey,
				secretKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY"
			};
		}
		if (credential.accessKey === "AKIAIOSFODNN7EXAMPLE") {
			return {
				accessKey: credential.accessKey,
				secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
			};
		}
		return undefined;
	}
}

test("STREAMING-AWS4-HMAC-SHA256-PAYLOAD", async () => {

	const request: IncomingMessage = createRequest({
		method: "PUT",
		headers: {
			host: "s3.amazonaws.com",
			"content-type": "application/x-www-form-urlencoded; charset=utf-8",
			authorization: "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request,SignedHeaders=content-encoding;content-length;host;x-amz-content-sha256;x-amz-date;x-amz-decoded-content-length;x-amz-storage-class,Signature=4f232c4386841ef735655705268965c44a0e4690baa4adea153f7db9fa80a0a9",
			"x-amz-date": "20130524T000000Z",
			"x-amz-storage-class": "REDUCED_REDUNDANCY",
			"x-amz-content-sha256": "STREAMING-AWS4-HMAC-SHA256-PAYLOAD",
			"Content-Encoding": "aws-chunked",
			"x-amz-decoded-content-length": "66560",
			"Content-Length": "66824"
		},
		url: "/examplebucket/chunkObject.txt",
	});
	const data = Buffer.alloc(66560);
	for (let x = 0, l = data.byteLength; x < l; x++) {
		data.writeUInt8(Math.round(Math.random() * 26) + 95, x);
	}
	const parser = new Parser();
	const signer = new Signer();
	const userRepository = new UserRepository();
	const validator = new Validator(parser, signer, userRepository);
	const result = await validator.validateIncomingRequest(request);
	request.emit("data", Buffer.from("10000;chunk-signature=ad80c730a21e5b8d04586a2213dd63b9a0e99e0e2307b0ade35a65485a288648\r\n"));
	request.emit("data", data.slice(0, 65536));
	request.emit("data", Buffer.from("\r\n"));
	request.emit("data", Buffer.from("400;chunk-signature=0055627c9e194cb4542bae2aa5492e3c1575bbb81b612b7d234b86a503ef5497\r\n"));
	request.emit("data", data.slice(65536, 66560));
	request.emit("data", Buffer.from("\r\n"));
	request.emit("data", Buffer.from("0;chunk-signature=b6c6ea8a5354eaf15b3cb7646744f4275b71ea724fed81ceb9323e279d449df9\r\n\r\n"));
	request.emit("end");

	
});
