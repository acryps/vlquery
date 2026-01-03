export class BlobExtent {
	public extent: string;

	constructor(
		public column: string,
		peers: BlobExtent[]
	) {
		this.extent = `blob${peers.length}`;
	}
}
