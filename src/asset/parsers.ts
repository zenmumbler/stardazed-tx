// asset/parsers - library-wide registry of asset parsers
// Part of Stardazed
// (c) 2015-2017 by Arthur Langereis - @zenmumbler
// https://github.com/stardazed/stardazed

/// <reference path="../core/util.ts" />

namespace sd.asset.parser {

	// --------------------------------------------------------------------
	// library-wide file extension to mime-type registry

	const extensionMimeTypeMap = new Map<string, string>();

	export function registerFileExtension(extension: string, mimeType: string) {
		const ext = extension.toLowerCase().trim();
		const mime = mimeType.toLowerCase().trim();
		assert(ext.length > 0, "empty file extension provided");
		assert(mime.length > 0, "empty mime-type provided");
		extensionMimeTypeMap.set(ext, mime);
	}

	export function mimeTypeForFileExtension(extension: string): string | undefined {
		const ext = extension.toLowerCase().trim();
		return extensionMimeTypeMap.get(ext);
	}

	export function mimeTypeForURL(url: URL | string): string | undefined {
		const extension = io.fileExtensionOfURL(url);
		return mimeTypeForFileExtension(extension);
	}


	/**
	 * A function that takes a resource and returns the parsed contents.
	 * Any data type that has to be read through the asset system needs
	 * a corresponding AssetParser. The metadata varies per asset type.
	 */
	export type AssetParser<Resource, Metadata extends object> = (blob: Blob, path: string, metadata: Partial<Metadata>) => Promise<Resource>;


	// --------------------------------------------------------------------
	// generic parsers

	/**
	 * A parser that just returns the contents of an asset as an ArrayBuffer.
	 */
	export const parseGenericBinary = (blob: Blob, _path: string, _options: any) =>
		io.BlobReader.readAsArrayBuffer(blob);

	/**
	 * A parser that just returns the contents of an asset as a a string.
	 */
	export const parseGenericText = (blob: Blob, _path: string, _options: any) =>
		io.BlobReader.readAsText(blob);

	/**
	 * A parser that returns the contents of an asset as a JSON object.
	 */
	export const parseJSON = (blob: Blob, _path: string, _options: any) =>
		parseGenericText(blob, _path, _options).then(
			text => JSON.parse(text)
		);

} // ns sd.asset.parser
