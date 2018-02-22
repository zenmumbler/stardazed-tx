// asset/importers/binary - generic binary files importer
// Part of Stardazed
// (c) 2015-2018 by Arthur Langereis - @zenmumbler
// https://github.com/stardazed/stardazed

/// <reference path="../importer.ts" />

namespace sd.asset {

	export interface CacheAccess {
		(kind: "binary", name: string): ArrayBuffer;
	}
	
	export namespace importer {

		export function importBinary(data: Blob, _uri: string) {
			return getArrayBuffer(data).then(buffer => {
				return Promise.resolve({
					binary: {
						kind: "binary",
						item: buffer
					}
				});
			});
		}

		registerImporter(importBinary, "application/octet-stream", ["bin"]);

	} // ns importer

} // ns sd.asset
