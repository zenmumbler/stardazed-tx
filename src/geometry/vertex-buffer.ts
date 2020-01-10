/*
geometry/vertex-buffer - geometry vertex buffer data
Part of Stardazed
(c) 2015-Present by Arthur Langereis - @zenmumbler
https://github.com/stardazed/stardazed
*/

import { PositionedStructField, StructField, ArrayOfStructs } from "stardazed/container";

/**
 * The role of a vertex attribute indicates usage purpose
 * and is used for shader attribute mapping.
 */
export const enum VertexAttributeRole {
	None,

	// standard attributes
	Position,
	Normal,
	Tangent,
	Colour,
	Material,

	// UV sets
	UV,
	UV0 = UV,
	UV1,
	UV2,
	UV3,

	// skinned geometry
	WeightedPos0, WeightedPos1, WeightedPos2, WeightedPos3,
	JointIndexes
}

interface VertexFieldProps {
	/** Only for integer fields, is the value treated as a normalised fraction? */
	normalized: boolean;
	/** The role of this attribute inside the buffer */
	role: VertexAttributeRole;
};

/**
 * A VertexAttribute is a field inside a VertexBuffer
 */
export type VertexAttribute = StructField<VertexFieldProps>;

/**
 * A PositionedAttribute is a field inside a VertexBuffer with byte-level layout information
 */
export type PositionedAttribute = PositionedStructField<VertexFieldProps>;

/**
 * Properties used to create a VertexBuffer
 */
export interface VertexBufferDesc {
	/** The vertex fields to be included in the buffer */
	attrs: VertexAttribute[];
	/** The number of values of each attribute required (usually the vertex count) */
	valueCount: number;
	/** (optional) The instancing divisor that will apply to ALL attributes in this buffer */
	divisor?: number;
	/** (optional) Manually provide a place to store the vertex data, usually for compound buffers */
	storage?: Uint8Array;
}

/**
 * A VertexBuffer is the client-side representation of vertex data and meta-data.
 */
export class VertexBuffer extends ArrayOfStructs<VertexFieldProps> {
	readonly divisor: number;

	constructor(desc: VertexBufferDesc) {
		super(desc.attrs, desc.valueCount, desc.storage);
		this.divisor = desc.divisor ?? 0;
	}
}
