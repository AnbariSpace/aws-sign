import moment from "moment";

export const signV4Algorithm = 'AWS4-HMAC-SHA256';

export class Scope {
	public constructor(
		public region: string,
		public requestDate: Date,
		public serviceName: string,
	) { }

	public toString(): string {
		return `${moment.utc(this.requestDate).format("YYYYMMDD")}/${this.region}/${this.serviceName}/aws4_request`;
	}
}

export class Credential extends Scope {
	public constructor(
		region: string,
		requestDate: Date,
		serviceName: string,
		public accessKey: string,
	) {
		super(region, requestDate, serviceName);
	}
	public toString(): string {
		return `${this.accessKey}/${super.toString()}`;
	}
}

export default class Sign {

	public constructor(
		public algorithm: string,
		public credential: Credential,
		public signedHeaders: string[],
		public signature: string,
	) { }

	public toString(): string {
		return `${this.algorithm} Credential=${this.credential.toString()}, SignedHeaders=${this.signedHeaders.join(';').toLowerCase()}, Signature=${this.signature}`;
	}
}
