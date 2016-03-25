// pbr-prefilter - generate prefiltered environmental cube maps
// Part of Stardazed TX
// (c) 2016 by Arthur Langereis - @zenmumbler

namespace sd.render {

	var vertexSource = [
		"attribute vec2 vertexPos_model;",
		"varying vec2 vertexUV_intp;",
		"void main() {",
		"	gl_Position = vec4(vertexPos_model, 0.5, 1.0);",
		"	vertexUV_intp = vertexPos_model * 0.5 + 0.5;",
		"}"
	].join("\n");

	// This code is a combination of the sample code given in Epic Shading Course Notes by Brian Karis
	// http://blog.selfshadow.com/publications/s2013-shading-course/karis/s2013_pbs_epic_notes_v2.pdf
	// and code from PlayCanvas by Arthur Rakhteenko
	// https://github.com/playcanvas/engine/blob/28100541996a74112b8d8cda4e0b653076e255a2/src/graphics/programlib/chunks/prefilterCubemap.ps
	function fragmentSource(rc: RenderContext) {
		return [
			rc.extFragmentLOD ? "#extension GL_EXT_shader_texture_lod : require" : "",
			"precision highp float;",
			"varying vec2 vertexUV_intp;",
			"uniform vec4 params; // face (0..5), roughness (0..1), 0, 0",
			"uniform samplerCube envMapSampler;",
			"const int numSamples = 1024;",
			"const float PI = 3.141592654;",
			"float rnd(vec2 uv) {",
			"	return fract(sin(dot(uv, vec2(12.9898, 78.233) * 2.0)) * 43758.5453);",
			"}",
			"vec3 importanceSampleGGX(vec2 Xi, float roughness, vec3 N) {",
			"	float a = roughness * roughness;",
			"	float phi = 2.0 * PI * Xi.x;",
			"	float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a*a - 1.0) * Xi.y));",
			"	float sinTheta = sqrt(1.0 - cosTheta * cosTheta);",
			"	vec3 H = vec3(",
			"		sinTheta * cos(phi),",
			"		sinTheta * sin(phi),",
			"		cosTheta",
			"	);",
			"	vec3 upVector = abs(N.z) < 0.999 ? vec3(0.0,0.0,1.0) : vec3(1.0,0.0,0.0);",
			"	vec3 tangentX = normalize(cross(upVector, N));",
			"	vec3 tangentY = cross(N, tangentX);",
			"	// Tangent to world space",
			"	return tangentX * H.x + tangentY * H.y + N * H.z;",
			"}",
			"vec3 prefilterEnvMap(float roughness, vec3 R) {",
			"	vec3 N = R;",
			"	vec3 V = R;",
			"	vec3 prefilteredColor = vec3(0.0);",
			"	float totalWeight = 0.0;",
			"	for (int i = 0; i < numSamples; i++) {",
			"		//vec2 Xi = hammersley(i, numSamples);",
			"		float sini = sin(float(i));",
			"		float cosi = cos(float(i));",
			"		float rand = rnd(vec2(sini, cosi));",
			"		vec2 Xi = vec2(float(i) / float(numSamples), rand);",
			"		vec3 H = importanceSampleGGX(Xi, roughness, N);",
			"		vec3 L = 2.0 * dot(V, H) * H - V;",
			"		float NoL = clamp(dot(N, L), 0.0, 1.0);",
			"		if (NoL > 0.0) {",
			rc.extFragmentLOD
				? "			prefilteredColor += textureCubeLodEXT(envMapSampler, L, 0.0).rgb * NoL;"
				: "			prefilteredColor += textureCube(envMapSampler, L).rgb * NoL;",
			"			totalWeight += NoL;",
			"		}",
			"	}",
			"	return prefilteredColor / totalWeight;",
			"}",
			"void main() {",
			"	vec2 st = vertexUV_intp * 2.0 - 1.0;",
			"	float face = params.x;",
			"	float roughness = params.y;",
			"	vec3 R;",
			"	if (face == 0.0) {",
			"		R = vec3(1, -st.y, -st.x);",
			"	} else if (face == 1.0) {",
			"		R = vec3(-1, -st.y, st.x);",
			"	} else if (face == 2.0) {",
			"		R = vec3(st.x, 1, st.y);",
			"	} else if (face == 3.0) {",
			"		R = vec3(st.x, -1, -st.y);",
			"	} else if (face == 4.0) {",
			"		R = vec3(st.x, -st.y, 1);",
			"	} else {",
			"		R = vec3(-st.x, -st.y, -1);",
			"	}",
			"	gl_FragColor = vec4(prefilterEnvMap(roughness, R), 1.0);",
			"}",
		].join("\n");
	}


	interface PreFilterPipeline {
		pipeline: Pipeline;
		paramsUniform: WebGLUniformLocation;
		envMapSamplerUniform: WebGLUniformLocation;
	}

	var preFilterPipeline: PreFilterPipeline = null;

	function getPipeline(rc: RenderContext) {
		if (preFilterPipeline == null) {
			preFilterPipeline = <PreFilterPipeline>{};

			// -- pipeline
			var pld = makePipelineDescriptor();
			pld.colourPixelFormats[0] = PixelFormat.RGBA8;
			pld.vertexShader = makeShader(rc, rc.gl.VERTEX_SHADER, vertexSource);
			pld.fragmentShader = makeShader(rc, rc.gl.FRAGMENT_SHADER, fragmentSource(rc));
			pld.attributeNames.set(mesh.VertexAttributeRole.Position, "vertexPos_model");

			preFilterPipeline.pipeline = new Pipeline(rc, pld);

			preFilterPipeline.paramsUniform = rc.gl.getUniformLocation(preFilterPipeline.pipeline.program, "params");
			preFilterPipeline.envMapSamplerUniform = rc.gl.getUniformLocation(preFilterPipeline.pipeline.program, "envMapSampler");

			// -- invariant uniform
			preFilterPipeline.pipeline.bind();
			rc.gl.uniform1i(preFilterPipeline.envMapSamplerUniform, 0);
			preFilterPipeline.pipeline.unbind();
		}

		return preFilterPipeline;
	}


	export function prefilteredEnvMap(rc: RenderContext, sourceEnvMap: Texture) {
		var pipeline = getPipeline(rc);

		var rpd = makeRenderPassDescriptor();
		rpd.clearMask = ClearMask.None;

		var destMapDesc = makeTexDescCube(PixelFormat.RGBA8, 128, UseMipMaps.Yes);
		var destEnvMap = new render.Texture(rc, destMapDesc);

		for (var face = 0; face < 6; ++face) {
			var fbd = makeFrameBufferDescriptor();
			fbd.colourAttachments[0].texture = destEnvMap;
			fbd.colourAttachments[0].layer = face;

			var fb = new FrameBuffer(rc, fbd);

			runRenderPass(rc, rpd, fb, (rp) => {
				rp.setPipeline(pipeline.pipeline);
				rp.setTexture(sourceEnvMap, 0);
				// rp.setMesh(mesh_);
				rp.setDepthTest(render.DepthTest.LessOrEqual);

				// rp.drawIndexedPrimitives(0, quadPrimCount);
			});
		}

		return destEnvMap;
	}

} // ns sd.render
