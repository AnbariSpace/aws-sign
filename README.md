This package can help to whomever wants to implement a AWS server or client.
It's goals is to provide some class to sign outgoing requests (client-side), parse and verify signatures for incoming requests (server-side).

It also contain some utility class to help you read and write [chunked streams](https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-streaming.html).

## Installation

You can install using npm.
```
npm install @anbari/aws-sign
```

## Usage

### Sign V4
```ts
import { SignerV4 } from "@anbari/aws-sign";

const accessKey = "AKIDEXAMPLE";
const secretKey = "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY";

const signer = new SignerV4();
const headers = {
	Host: "iam.amazonaws.com",
	"Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
	"X-Amz-Date": "20150830T123600Z",
};
const signedHeaders = Object.keys(headers);
const credential = new Credential("us-east-1", new Date(Date.UTC(2015, 7, 30, 12, 36, 0, 0)), "iam", accessKey);

const sign = signer.sign("GET", "/?Action=ListUsers&Version=2010-05-08", headers, credential, secretKey, signedHeaders);

console.log(sign.toString()); // 
```

### Parse Authorization Header

```ts
import { ParserV4 } from "@anbari/aws-sign";

const parser = new ParserV4();
const sign = parser.parseAuthorization("AWS4-HMAC-SHA512 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=signature");
console.log(sign);
```

### Validate Incoming Request

```ts
import {Server} from "http";
import { ParserV4, ParserV4, SignerV4, IUserRepository, Credential } from "@anbari/aws-sign";

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

const server = new Server((req, res) => {
	const parser = new ParserV4();
	const signer = new SignerV4();
	const users = new UserRepository();
	const validator = new ValidatorV4(parser, signer, users);
	const result = await validator.validateIncomingRequest(req);
	result.body.pipe(res);
});

```
