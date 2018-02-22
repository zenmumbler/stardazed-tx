// asset/parser/model - model composite asset parser
// Part of Stardazed
// (c) 2015-2018 by Arthur Langereis - @zenmumbler
// https://github.com/stardazed/stardazed

/// <reference path="../parser.ts" />

namespace sd.asset {

	export interface Model {
		geom: geometry.Geometry;
		materials: Material[];
	}

	export interface CacheAccess {
		(kind: "model", name: string): Model;
	}

	export namespace parse {

		export interface ModelAssetMetadata {
			materialIndexMap: { [id: string]: number; };
		}

		function getMeshDependency(deps: AssetDependencies) {
			const meshAsset: Asset<geometry.Geometry, MeshAssetMetadata> | undefined = deps["mesh"];
			if (meshAsset) {
				if (meshAsset.kind === "mesh" && geometry.isGeometry(meshAsset.item)) {
					return meshAsset;
				}
				else {
					console.warn(`Model parser: "mesh" dependency is not a Geometry or was not loaded`, meshAsset);
				}
			}
			return undefined;
		}

		export function parseModel(asset: Asset<Model, ModelAssetMetadata>) {
			return new Promise<void>((resolve, reject) => {
				if (asset.dependencies) {
					const meshAsset = getMeshDependency(asset.dependencies);
					if (! meshAsset) {
						return reject(`Model parser: a mesh dependency named "mesh" must be provided.`);
					}

					const model: Model = {
						geom: meshAsset.item!,
						materials: []
					};
					asset.item = model;

					let noMaterialIndexes = false;
					for (const depName of Object.getOwnPropertyNames(asset.dependencies)) {
						const dep = asset.dependencies[depName];
						if (dep !== void 0) {
							if (dep.kind === "mesh") {
								if (depName !== "mesh") {
									console.warn(`Model parser: only one mesh dependency named "mesh" is considered, ignoring ${depName}`, dep);
								}
							}
							else if (dep.kind === "material") {
								if (typeof dep.item === "object" && dep.item !== null) { // FIXME: add isMaterial tester fn
									if (asset.metadata && asset.metadata.materialIndexMap) {
										const meshMatIndex = asset.metadata.materialIndexMap[depName];
										if (typeof meshMatIndex === "number" && meshMatIndex >= 0) {
											model.materials[meshMatIndex] = dep.item;
										}
										else {
											console.warn(`Model parser: material named ${depName} not found in material index map, ignoring`, asset);
										}
									}
									else {
										noMaterialIndexes = true;
										model.materials.push(dep.item);
									}
								}
								else {
									console.warn(`Model parser: material dependency was not loaded`, dep);
								}
							}
							else {
								console.warn(`Model parser: ignoring non-mesh, non-material dependency`, dep);
							}
						}
					}

					if (noMaterialIndexes && model.materials.length > 1) {
						console.warn(`Model parser: no material index map was specified, materials will be in arbitrary order`, asset);
					}
				}
				else {
					return reject(`Model parser: a model must have dependencies specified.`);
				}

				resolve();
			});
		}

		registerParser("model", parseModel);

	} // ns parser

} // ns sd.asset
