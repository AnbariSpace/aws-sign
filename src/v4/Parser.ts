import { IncomingMessage } from "http";
import moment from "moment";
import Sign, { Credential, signV4Algorithm } from "./Sign";


export default class Parser {

	public parseIncomingRequest(request: IncomingMessage): Sign | undefined {
		if (request.headers.authorization === undefined) {
			return undefined;
		}
		const sign = this.parseAuthorization(request.headers.authorization);
		if (!sign) {
			return undefined;
		}
		if (request.headers["x-amz-date"] !== undefined) {
			const date = moment.utc(request.headers["x-amz-date"], "YYYYMMDDTHHmmssZ", true);
			if (!date.isValid()) {
				const error = new Error("invalid x-amz-date");
				error.name = "BadRequest";

				throw error;
			}
			sign.credential.requestDate = date.toDate();
		} else if (request.headers.date !== undefined) {
			const date = new Date(request.headers.date);
			if (isNaN(date.getTime())) {
				const error = new Error("invalid date");
				error.name = "BadRequest";

				throw error;
			}

			sign.credential.requestDate = date;
		} else {
			const error = new Error("missing date");
			error.name = "BadRequest";

			throw error;
		}
		
		return sign;
	}

	public parseAuthorization(authorization: string): Sign {
		const space = authorization.indexOf(" ");
		if (space === -1) {
			throw new Error("cannot find two peices in authorization");
		}
		const algorithm = authorization.substring(0, space);
		if (algorithm !== signV4Algorithm) {
			throw new Error("unknown sign algorithm: " + algorithm);
		}
		const peers = authorization.substring(space + 1).split(",").map((peer) => {
			peer = peer.trim();
			const equalSign = peer.indexOf("=");
			if (equalSign === -1) {
				throw new Error("Cannot decode key-value: " + peer);
			}
			const key = peer.substring(0, equalSign);
			const value = peer.substring(equalSign + 1);
			return {
				[key]: value
			};
		});

		const all: Record<string, string> = Object.assign({}, ...peers);
		if (all.Credential === undefined) {
			throw new Error("Cannot find credetial in authorization");
		}
		if (all.SignedHeaders === undefined) {
			throw new Error("Cannot find signed headers in authorization");
		}
		if (all.Signature === undefined) {
			throw new Error("Cannot find signature headers in authorization");
		}

		return new Sign(
			algorithm,
			this.parseCredential(all.Credential),
			this.parseSignedHeaders(all.SignedHeaders),
			all.Signature
		);
	}

	public parseCredential(credential: string): Credential {
		const parts = credential.split("/");
		if (parts.length !== 5) {
			throw new Error("Wrong number of parts in credential");
		}
		if (parts[4] !== "aws4_request") {
			throw new Error("Wrong type of credential, last part must equals to aws4_request");
		}
		return new Credential(
			parts[2],
			moment.utc(parts[1], "YYYYMMDD", true).toDate(),
			parts[3],
			parts[0],
		);
	}

	public parseSignedHeaders(signedHeaders: string): string[] {
		return signedHeaders.split(";");
	}
}
