// rigidbody - RigidBody component
// Part of Stardazed TX
// (c) 2015 by Arthur Langereis - @zenmumbler

namespace sd.world {

	export type RigidBodyInstance = Instance<RigidBodyManager>;

	export interface RigidBodyDescriptor {
		mass: number;
		inertia: number;
	}


	export class RigidBodyManager {
		private instanceData_: container.MultiArrayBuffer;

		private entityBase_: TypedArray;
		private transformBase_: TypedArray;

		private massBase_: TypedArray;
		private momentumBase_: TypedArray;
		private velocityBase_: TypedArray;
		private forceBase_: TypedArray;

		private inertiaBase_: TypedArray;
		private angMomentumBase_: TypedArray;
		private angVelocityBase_: TypedArray;
		private torqueBase_: TypedArray;

		private prevPositionBase_: TypedArray;
		private prevVelocityBase_: TypedArray;

		private TIME_STEP = 1 / 60;
		private timeLag = 0;


		constructor(private transformMgr_: TransformManager) {
			var fields: container.MABField[] = [
				{ type: SInt32, count: 1 }, // entity
				{ type: SInt32, count: 1 }, // transform

				{ type: Float, count: 2 },  // mass, invMass
				{ type: Float, count: 3 },  // momentum
				{ type: Float, count: 3 },  // velocity
				{ type: Float, count: 3 },  // force

				{ type: Float, count: 2 },  // inertia, invInertia
				{ type: Float, count: 3 },  // angMomentum
				{ type: Float, count: 3 },  // angVelocity
				{ type: Float, count: 3 },  // torque

				{ type: Float, count: 3 },  // prevPosition
				{ type: Float, count: 3 },  // prevVelocity
			];

			this.instanceData_ = new container.MultiArrayBuffer(128, fields);
			this.rebase();
		}


		private rebase() {
			this.entityBase_ = this.instanceData_.indexedFieldView(0);
			this.transformBase_ = this.instanceData_.indexedFieldView(1);

			this.massBase_ = this.instanceData_.indexedFieldView(2);
			this.momentumBase_ = this.instanceData_.indexedFieldView(3);
			this.velocityBase_ = this.instanceData_.indexedFieldView(4);
			this.forceBase_ = this.instanceData_.indexedFieldView(5);

			this.inertiaBase_ = this.instanceData_.indexedFieldView(6);
			this.angMomentumBase_ = this.instanceData_.indexedFieldView(7);
			this.angVelocityBase_ = this.instanceData_.indexedFieldView(8);
			this.torqueBase_ = this.instanceData_.indexedFieldView(9);

			this.prevPositionBase_ = this.instanceData_.indexedFieldView(10);
			this.prevVelocityBase_ = this.instanceData_.indexedFieldView(11);
		}


		create(ent: Entity, desc: RigidBodyDescriptor): RigidBodyInstance {
			if (this.instanceData_.extend() == container.InvalidatePointers.Yes) {
				this.rebase();
			}

			var instance = this.instanceData_.count;
			this.entityBase_[instance] = <number>ent;
			this.transformBase_[instance] = <number>this.transformMgr_.forEntity(ent);

			// -- set constant data
			container.setIndexedVec2(this.massBase_, instance, [desc.mass, 1 / desc.mass]);
			container.setIndexedVec2(this.inertiaBase_, instance, [desc.inertia, 1 / desc.inertia]);

			// -- clear the rest
			var zero3 = math.Vec3.zero;
			container.setIndexedVec3(this.momentumBase_, instance, zero3);
			container.setIndexedVec3(this.velocityBase_, instance, zero3);
			container.setIndexedVec3(this.forceBase_, instance, zero3);

			container.setIndexedVec3(this.angMomentumBase_, instance, zero3);
			container.setIndexedVec3(this.angVelocityBase_, instance, zero3);
			container.setIndexedVec3(this.torqueBase_, instance, zero3);

			// -- previous pos and vel set to current state, used for interpolation
			container.setIndexedVec3(this.prevPositionBase_, instance, this.transformMgr_.localPosition(this.transformBase_[instance]));
			container.setIndexedVec3(this.prevVelocityBase_, instance, zero3);

			return instance;
		}


		get count() { return this.instanceData_.count; }


		addTimeLag(dt: number) {
			this.timeLag += dt;

			if (this.timeLag > this.TIME_STEP * 4) {
				this.timeLag = this.TIME_STEP * 4;
			}
		}

		simulateAll() {
			var zero3 = math.Vec3.zero;

			// FIXME: run simulation in discrete fixed TIME_STEP blocks
			// Requires additional extropolation of pos/rot after the fact for rendering

			for (var index = 1, max = this.count; index <= max; ++index) {
				var dxdt = vec3.scale([], container.copyIndexedVec3(this.velocityBase_, index), this.timeLag);
				var dpdt = vec3.scale([], container.copyIndexedVec3(this.forceBase_, index), this.timeLag);
				var inverseMass = this.massBase_[(index * 2) + 1];
				var transform = this.transformBase_[index];

				// store current as previous state
				container.setIndexedVec3(this.prevPositionBase_, index, this.transformMgr_.localPosition(transform));
				var curVelocity = container.copyIndexedVec3(this.velocityBase_, index);
				container.setIndexedVec3(this.prevVelocityBase_, index, curVelocity);

				// primaries
				this.transformMgr_.translate(transform, dxdt);
				var momentum = container.copyIndexedVec3(this.momentumBase_, index);
				momentum[0] += dpdt[0];
				momentum[1] += dpdt[1];
				momentum[2] += dpdt[2];
				container.setIndexedVec3(this.momentumBase_, index, momentum);

				// secondaries
				var velocity = [
					momentum[0] * inverseMass,
					momentum[1] * inverseMass,
					momentum[2] * inverseMass
				];
				container.setIndexedVec3(this.velocityBase_, index, velocity);

				// clear sum force
				container.setIndexedVec3(this.forceBase_, index, zero3);
			}

			this.timeLag = 0;
		}


		// -- linked instances

		entity(inst: RigidBodyInstance): Entity {
			return this.entityBase_[<number>inst];
		}

		transform(inst: RigidBodyInstance): TransformInstance {
			return this.transformBase_[<number>inst];
		}


		// -- single-instance accessors

		mass(inst: RigidBodyInstance): number {
			return container.copyIndexedVec2(this.massBase_, <number>inst)[0];
		}

		momentum(inst: RigidBodyInstance): ArrayOfNumber {
			return container.copyIndexedVec3(this.momentumBase_, <number>inst);
		}

		velocity(inst: RigidBodyInstance): ArrayOfNumber {
			return container.copyIndexedVec3(this.velocityBase_, <number>inst);
		}


		inertia(inst: RigidBodyInstance): number {
			return container.copyIndexedVec2(this.inertiaBase_, <number>inst)[0];
		}

		angMomentum(inst: RigidBodyInstance): ArrayOfNumber {
			return container.copyIndexedVec3(this.angMomentumBase_, <number>inst);
		}

		angVelocity(inst: RigidBodyInstance): ArrayOfNumber {
			return container.copyIndexedVec3(this.angVelocityBase_, <number>inst);
		}


		prevPosition(inst: RigidBodyInstance): ArrayOfNumber {
			return container.copyIndexedVec3(this.prevPositionBase_, <number>inst);
		}

		prevVelocity(inst: RigidBodyInstance): ArrayOfNumber {
			return container.copyIndexedVec3(this.prevVelocityBase_, <number>inst);
		}


		// -- derived data

		acceleration(inst: RigidBodyInstance): ArrayOfNumber {
			var vCur = container.copyIndexedVec3(this.velocityBase_, <number>inst);
			var vLast = container.copyIndexedVec3(this.prevVelocityBase_, <number>inst);

			vCur[0] = (vCur[0] - vLast[0]) * this.TIME_STEP;
			vCur[1] = (vCur[1] - vLast[1]) * this.TIME_STEP;
			vCur[2] = (vCur[2] - vLast[2]) * this.TIME_STEP;

			return vCur;
		}


		// -- per timestep accumulated forces and torques

		addForce(inst: RigidBodyInstance, force: ArrayOfNumber) {
			// as of Nov 2015 this is (a lot) faster than subarray()/set()
			var totalForce = container.copyIndexedVec3(this.forceBase_, <number>inst);
			totalForce[0] += force[0];
			totalForce[1] += force[1];
			totalForce[2] += force[2];
			container.setIndexedVec3(this.forceBase_, <number>inst, totalForce);
		}
		
		addTorque(inst: RigidBodyInstance, torque: ArrayOfNumber) {
			// as of Nov 2015 this is (a lot) faster than subarray()/set()
			var totalTorque = container.copyIndexedVec3(this.torqueBase_, <number>inst);
			totalTorque[0] += torque[0];
			totalTorque[1] += torque[1];
			totalTorque[2] += torque[2];
			container.setIndexedVec3(this.torqueBase_, <number>inst, totalTorque);
		}
	}

} // ns sd.world
