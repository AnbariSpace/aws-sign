import { createHash, createHmac } from "crypto";
import { OutgoingHttpHeaders } from "http";
import moment from "moment";
import Sign, { Credential, Scope, signV4Algorithm } from "./Sign";


export default class Signer {

	public sign(
		method: string,
		url: string,
		headers: OutgoingHttpHeaders,
		credential: Credential,
		secretKey: string,
		signedHeaders?: string[],
	): Sign {
		let contentHash: string | undefined = headers["x-amz-content-sha256"]?.toString();
		if (contentHash === undefined && method.toUpperCase() === "GET") {
			contentHash = createHash("sha256").update("").digest("hex").toLowerCase();
		}
		if (typeof contentHash !== "string") {
			throw new Error("Wrong type of x-amz-content-sha256 header: " + (typeof contentHash));
		}
		if (signedHeaders === undefined) {
			signedHeaders = this.getSignedHeaders(headers);
		} else {
			signedHeaders = signedHeaders.map((key) => key.toLowerCase());
		}
		signedHeaders.sort();

		const canonicalRequest = this.getCanonicalRequest(method, url, headers, signedHeaders, contentHash);
		console.log({
			canonicalRequest
		});
		const stringToSign = this.getStringToSign(canonicalRequest, credential);
		const signingKey = this.getSigningKey(credential, secretKey);
		const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex').toLowerCase();

		return new Sign(
			signV4Algorithm,
			credential,
			signedHeaders,
			signature,
		);
	}

	private getCanonicalRequest(method: string, url: string, headers: OutgoingHttpHeaders, signedHeaders: string[], hashedPayload: string): string {
		const lowerCasedHeaders = Object.keys(headers).map((key) => key.toLowerCase());
		const headersValues =  Object.values(headers);
		const headersArray = signedHeaders.reduce<string[]>((acc, key) => {
			// Key is always lowercase
			const index = lowerCasedHeaders.indexOf(key);
			if (index === -1) {
				throw new Error("Undefined header: " + key);
			}

			// Trim spaces from the value (required by V4 spec)
			const headerValue = headersValues[index]?.toString().replace(/ +/g, " ");
			acc.push(`${key}:${headerValue}`);
			return acc;
		}, []);
		const urlParser = new URL(url, "http://0.0.0.0");
		urlParser.searchParams.sort();

		return [
			method.toUpperCase(),
			urlParser.pathname,
			urlParser.searchParams.toString(),
			headersArray.join('\n') + '\n',
			signedHeaders.join(';').toLowerCase(),
			hashedPayload
		].join('\n');
	}

	private getSigningKey(scope: Scope, secretKey: string): Buffer {
		const dateLine = moment.utc(scope.requestDate).format("YYYYMMDD");
		const hmac1 = createHmac('sha256', 'AWS4' + secretKey).update(dateLine).digest();
		const hmac2 = createHmac('sha256', hmac1).update(scope.region).digest();
		const hmac3 = createHmac('sha256', hmac2).update(scope.serviceName).digest();
		return createHmac('sha256', hmac3).update('aws4_request').digest();
	}

	private getStringToSign(canonicalStr: string, scope: Scope): string {
		const hash = createHash('sha256').update(canonicalStr).digest('hex');
		return [
			signV4Algorithm,
			moment.utc(scope.requestDate).format("YYYYMMDDTHHmmss") + "Z",
			Scope.prototype.toString.call(scope),
			hash,
		].join('\n');
	}

	private getSignedHeaders(headers: OutgoingHttpHeaders): string[] {
		const ignoredHeaders = ['authorization', 'content-length', 'content-type', 'user-agent'];
		return Object.keys(headers)
			.map((key) => key.toLowerCase())
			.filter((key) => !ignoredHeaders.includes(key));
	}
}