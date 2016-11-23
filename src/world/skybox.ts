// skybox - Skybox component
// Part of Stardazed TX
// (c) 2015-2016 by Arthur Langereis - @zenmumbler
// https://github.com/stardazed/stardazed-tx

import { assert } from "core/util";
import { Float3 } from "math/primarray";
import { ProjectionSetup } from "math/projection";
import { mat4 } from "math/mat4";
import { VertexAttributeRole, attrPosition3 } from "mesh/meshdata";
import * as gen from "mesh/generate";
import { PixelFormat } from "render/pixelformat";
import { RenderContext, makeShader } from "render/rendercontext";
import { Pipeline, makePipelineDescriptor } from "render/pipeline";
import { Texture, TextureClass } from "render/texture";
import { DepthTest, RenderPass } from "render/renderpass";
import { Mesh } from "asset/types";
import { TransformManager, TransformInstance } from "world/transform";
import { MeshManager, MeshInstance } from "world/mesh";
import { Entity } from "world/entity";

export class Skybox {
	private mesh_: MeshInstance;
	private meshAsset_: Mesh;

	private pipeline_: Pipeline;
	private mvpMatrixUniform_: WebGLUniformLocation;
	private textureCubeUniform_: WebGLUniformLocation;
	private modelViewProjectionMatrix_ = mat4.create();

	private entity_: Entity;
	private txInstance_: TransformInstance;


	private vertexSource = [
		"attribute vec3 vertexPos_model;",
		"uniform mat4 modelViewProjectionMatrix;",
		"varying vec3 vertexUV_intp;",
		"void main() {",
		"	vec4 vertexPos_cam = modelViewProjectionMatrix * vec4(vertexPos_model, 1.0);",
		"	gl_Position = vertexPos_cam.xyww;",
		"	vertexUV_intp = vertexPos_model;",
		"}"
	].join("\n");

	private fragmentSource = [
		"precision mediump float;",
		"varying vec3 vertexUV_intp;",
		"uniform samplerCube skyboxMap;",
		"void main() {",
		"	gl_FragColor = textureCube(skyboxMap, vertexUV_intp);",
		"}"
	].join("\n");


	constructor(private rc: RenderContext, private transformMgr_: TransformManager, meshMgr: MeshManager, private texture_: Texture) {
		// -- pipeline
		const pld = makePipelineDescriptor();
		pld.colourPixelFormats[0] = PixelFormat.RGBA8;
		// pld.depthPixelFormat = PixelFormat.Depth24_Stencil8; // uhh..
		pld.vertexShader = makeShader(rc, rc.gl.VERTEX_SHADER, this.vertexSource);
		pld.fragmentShader = makeShader(rc, rc.gl.FRAGMENT_SHADER, this.fragmentSource);
		pld.attributeNames.set(VertexAttributeRole.Position, "vertexPos_model");

		this.pipeline_ = new Pipeline(rc, pld);

		this.mvpMatrixUniform_ = rc.gl.getUniformLocation(this.pipeline_.program, "modelViewProjectionMatrix")!;
		this.textureCubeUniform_ = rc.gl.getUniformLocation(this.pipeline_.program, "skyboxMap")!;
		assert(this.mvpMatrixUniform_ && this.textureCubeUniform_, "invalid skybox program");

		// -- invariant uniform
		this.pipeline_.bind();
		this.rc.gl.uniform1i(this.textureCubeUniform_, 0);
		this.pipeline_.unbind();

		// -- mesh
		const sphereGen = new gen.Sphere({ radius: 400, rows: 10, segs: 15 });
		this.meshAsset_ = { name: "skyboxMesh", meshData: gen.generate(sphereGen, [attrPosition3()]) }; // FIXME: asset 
		this.mesh_ = meshMgr.create(this.meshAsset_);
	}


	setEntity(entity: Entity) {
		this.entity_ = entity;
		this.txInstance_ = this.transformMgr_.create(entity);
	}


	setCenter(xyz: Float3) {
		this.transformMgr_.setPosition(this.txInstance_, xyz);
	}


	setTexture(newTexture: Texture) {
		assert(newTexture && newTexture.textureClass == TextureClass.TexCube);
		this.texture_ = newTexture;
	}


	draw(rp: RenderPass, proj: ProjectionSetup) {
		rp.setPipeline(this.pipeline_);
		rp.setTexture(this.texture_, 0);
		rp.setMesh(this.mesh_);
		rp.setDepthTest(DepthTest.LessOrEqual);

		// -- mvp
		mat4.multiply(this.modelViewProjectionMatrix_, proj.viewMatrix, this.transformMgr_.worldMatrix(this.txInstance_));
		mat4.multiply(this.modelViewProjectionMatrix_, proj.projectionMatrix, this.modelViewProjectionMatrix_);
		this.rc.gl.uniformMatrix4fv(this.mvpMatrixUniform_, false, this.modelViewProjectionMatrix_);

		const primGroup0 = this.meshAsset_.meshData.primitiveGroups[0];
		rp.drawIndexedPrimitives(primGroup0.type, this.meshAsset_.meshData.indexBuffer!.indexElementType, 0, primGroup0.elementCount);

		// -- draw call count
		return 1;
	}
}
