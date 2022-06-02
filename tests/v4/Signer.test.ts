import { Credential } from "../../src/v4/Sign";
import Signer from "../../src/v4/Signer";

test("Test Signer", () => {
	const signer = new Signer();
	const headers = {
		Host: "iam.amazonaws.com",
		"Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
		"X-Amz-Date": "20150830T123600Z",
	};
	const signedHeaders = Object.keys(headers);
	const credential = new Credential("us-east-1", new Date(Date.UTC(2015, 7, 30, 12, 36, 0, 0)), "iam", "AKIDEXAMPLE");

	const sign = signer.sign("GET", "/?Action=ListUsers&Version=2010-05-08", headers, credential, "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", signedHeaders);
	expect(sign.algorithm).toBe("AWS4-HMAC-SHA256");
	expect(sign.signature).toBe("5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7");
	expect(sign.signedHeaders).toEqual(["content-type", "host", "x-amz-date"]);
	expect(sign.credential.accessKey).toBe("AKIDEXAMPLE");
	expect(sign.credential.region).toBe("us-east-1");
	expect(sign.credential.serviceName).toBe("iam");

});