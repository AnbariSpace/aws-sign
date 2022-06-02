import { IncomingMessage } from "http";
import Sign, { Credential } from "./Sign";
import Parser from "./Parser";
import Signer from "./Signer";
import { Readable } from "stream";
import ChunkedToNormalTransform from "./ChunkedToNormalTransform";
import HashVerifierStream from "../HashVerifierStream";

export interface IUser {
	accessKey: string;
	secretKey: string;
}

export interface IUserRepository {
	findByCredential(credential: Credential): Promise<IUser | undefined>;
}

interface IValidateRequestOptions {
	timeDiffrenceTolorance?: number; // Seconds
}

interface IValidationRequestResult {
	sign: Sign | undefined;
	body: Readable;
}

export default class Validator {
	public constructor(
		private parser: Parser,
		private signer: Signer,
		private userRepository: IUserRepository,
	) { }

	public async validateIncomingRequest(request: IncomingMessage, options?: IValidateRequestOptions): Promise<IValidationRequestResult> {
		const theirSig = this.parser.parseIncomingRequest(request);
		if (theirSig === undefined) {
			return {sign: undefined, body: request};
		}

		if (options?.timeDiffrenceTolorance !== undefined) {
			if (Date.now() - theirSig.credential.requestDate.getTime() > options.timeDiffrenceTolorance * 1000) {
				const error = new Error("The difference between the request time and the server's time is too large.");
				error.name = "RequestTimeTooSkewed";

				throw error;
			}
		}

		const user = await this.userRepository.findByCredential(theirSig.credential);
		if (user === undefined) {
			throw new Error("Notfound user");
		}


		if (request.method === undefined) {
			throw new Error();
		}
		if (request.url === undefined) {
			throw new Error();
		}
		if (request.headers === undefined) {
			throw new Error();
		}

		const ourSig = this.signer.sign(request.method, request.url, request.headers, theirSig.credential, user.secretKey, theirSig.signedHeaders);
		console.log({
			theirSig,
			ourSig
		});
		if (ourSig.signature !== theirSig.signature) {
			const error = new Error("The request signature that the server calculated does not match the signature that you provided.");
			error.name = "SignatureDoesNotMatch";
			throw error;
		}
		const contentSha256 = request.headers["x-amz-content-sha256"];

		if (contentSha256 === undefined) {
			const error = new Error("Missing x-amz-content-sha256 header.");
			error.name = "InvalidRequest";
			throw error;
		}
		if (
			contentSha256 === "STREAMING-UNSIGNED-PAYLOAD-TRAILER" ||
			contentSha256 === "STREAMING-AWS4-HMAC-SHA256-PAYLOAD-TRAILER" ||
			contentSha256 === "STREAMING-AWS4-ECDSA-P256-SHA256-PAYLOAD" ||
			contentSha256 === "STREAMING-AWS4-ECDSA-P256-SHA256-PAYLOAD-TRAILER"
		) {
			const error = new Error("Unsupported x-amz-content-sha256");
			error.name = "NotImplemented";
			throw error;
		}

		let body: Readable = request;
		
		if (contentSha256 === "UNSIGNED-PAYLOAD") {
			body = request;
		} else if (contentSha256 === "STREAMING-AWS4-HMAC-SHA256-PAYLOAD") {
			const totalDecodedheader = request.headers["x-amz-decoded-content-length"];
			if (totalDecodedheader === undefined) {
				const error = new Error("Missing x-amz-decoded-content-length header");
				error.name = "InvalidRequest";
				throw error;
			}
			if (typeof totalDecodedheader !== "string") {
				const error = new Error("Invalid x-amz-decoded-content-length header");
				error.name = "InvalidRequest";
				throw error;
			}
			const expectedContentLength = parseInt(totalDecodedheader, 10);
			if ("pipe" in body) {
				body = body.pipe(new ChunkedToNormalTransform(expectedContentLength));
			}
		} else {
			if ("pipe" in body) {
				body = body.pipe(new HashVerifierStream("sha256", contentSha256));
			}
		}
		
		return {
			sign: theirSig,
			body: body
		};
	}
}