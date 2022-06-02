import Parser from "../../src/v4/Parser";
import httpMocks from "node-mocks-http";

test("Parse from http request", () => {
	const parser = new Parser();
	const request = httpMocks.createRequest({
		headers: {
			host: "iam.amazonaws.com",
			"content-type": "application/x-www-form-urlencoded; charset=utf-8",
			authorization: "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7",
			"x-amz-date": "20150830T123600Z"
		},
		url: "/?Action=ListUsers&Version=2010-05-08"
	});
	const sign = parser.parseIncomingRequest(request);
	expect(sign).toBeDefined();
	if (sign === undefined) {
		return;
	}
	expect(sign.algorithm).toBe("AWS4-HMAC-SHA256");
	expect(sign.signature).toBe("5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7");
	expect(sign.signedHeaders).toEqual(["content-type", "host", "x-amz-date"]);
	expect(sign.credential.accessKey).toBe("AKIDEXAMPLE");
	expect(sign.credential.region).toBe("us-east-1");
	expect(sign.credential.serviceName).toBe("iam");

	expect(sign.toString()).toBe("AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7");
	// expect(sign.credential.requestDate.toISOString()).toBe("");
});

test("Parse http request with no authorization", () => {
	const parser = new Parser();
	const request = httpMocks.createRequest({
		headers: {
			host: "iam.amazonaws.com",
			"content-type": "application/x-www-form-urlencoded; charset=utf-8",
			"x-amz-date": "20150830T123600Z"
		},
		url: "https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08"
	});
	const sign = parser.parseIncomingRequest(request);
	expect(sign).toBeUndefined();
});

test("Parse invalid credentials", () => {
	const parser = new Parser();
	expect(() => parser.parseCredential("AKIDEXAMPLE/20150830/us-east-1/iam")).toThrowError();
	expect(() => parser.parseCredential("AKIDEXAMPLE/20150830/us-east-1/iam/some-other-text")).toThrowError();
});

test("Parse invalid authorization", () => {
	const parser = new Parser();
	expect(() => parser.parseAuthorization("AWS4-HMAC-SHA256")).toThrowError();
	expect(() => parser.parseAuthorization("AWS4-HMAC-SHA256 Key-value")).toThrowError();
	expect(() => parser.parseAuthorization("AWS4-HMAC-SHA256 SignedHeaders=content-type;host;x-amz-date, Signature=signature")).toThrowError();
	expect(() => parser.parseAuthorization("AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, Signature=signature")).toThrowError();
	expect(() => parser.parseAuthorization("AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, SignedHeaders=content-type;host;x-amz-date")).toThrowError();
	expect(() => parser.parseAuthorization("AWS4-HMAC-SHA512 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=signature")).toThrowError();
});