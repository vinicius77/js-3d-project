import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

// For dynamic models
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';

class CharacterControllerInput {
	constructor() {
		this._Init();
	}

	_Init() {
		this._move = {
			forward: false,
			backward: false,
			left: false,
			right: false,
		};

		document.addEventListener('keydown', ({ key }) => this._onKeyDown(key), false);
		document.addEventListener('keyup', ({ key }) => this._onKeyUp(key), false);
	}

	/** Keyboard events */
	_onKeyDown(key) {
		switch (key) {
			case 'w':
				this._move.forward = true;
				break;
			case 'a':
				this._move.left = true;
				break;
			case 's':
				this._move.backward = true;
				break;
			case 'd':
				this._move.right = true;
			case 'ArrowUp':
			case 'ArrowLeft':
			case 'ArrowDown':
			case 'ArrowRight':
				break;
			default:
				break;
		}
	}

	_onKeyUp(key) {
		switch (key) {
			case 'w':
				this._move.forward = false;
				break;
			case 'a':
				this._move.left = false;
				break;
			case 's':
				this._move.backward = false;
				break;
			case 'd':
				this._move.right = false;
			case 'ArrowUp':
			case 'ArrowLeft':
			case 'ArrowDown':
			case 'ArrowRight':
				break;
			default:
				break;
		}
	}
}

class BasicModelControls {
	constructor(params) {
		this._Init(params);
	}

	_Init(params) {
		this._params = params;

		/** A Vector3 is used to represent most values which have x, y, and z coordinates,
		 * so you can use it to animate many object transforms like position, scale, or rotation. */
		this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
		this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
		this._velocity = new THREE.Vector3(0, 0, 0);
		this._position = new THREE.Vector3();
		this._input = new CharacterControllerInput();
		this._mixers = [];
		this._target;

		/** Dynamic Models */
		const zombie = {
			path: './resources/zombie/',
			baseModel: 'mremireh_o_desbiens.fbx',
			animation: 'walk.fbx',
			positionArr: [-33, 0, 0],
		};
		this._LoadModels(zombie);
	}

	/** Dynamic 3D model */
	_LoadModels({ path, baseModel, animation, positionArr }) {
		const loader = new FBXLoader();
		loader.setPath(`${path}`);
		loader.load(`${baseModel}`, (fbx) => {
			fbx.scale.setScalar(0.1);
			fbx.traverse((c) => {
				c.castShadow = true;
			});

			/** Model's position relative to the ground */
			fbx.position.set(positionArr[0], positionArr[1], positionArr[2]);

			const anim = new FBXLoader();
			anim.setPath(`${path}`);
			anim.load(`${animation}`, (anim) => {
				const mesh = new THREE.AnimationMixer(fbx);
				this._mixers.push(mesh);

				const idle = mesh.clipAction(anim.animations[0]);
				idle.play();
			});
			this._target = fbx;
			this._params.scene.add(fbx);
		});
	}

	get Position() {
		return this._position;
	}

	get Rotation() {
		if (!this._target) {
			return new THREE.Quaternion();
		}

		return this._target.quaternion;
	}

	/** Updates at every frame */
	Update(timeInSeconds) {
		const velocity = this._velocity;
		const frameDecceleration = new THREE.Vector3(
			velocity.x * this._decceleration.x,
			velocity.y * this._decceleration.y,
			velocity.z * this._decceleration.z
		);

		/** Multiplies this vector by scalar s */
		frameDecceleration.multiplyScalar(timeInSeconds);

		/** The Math.sign() function returns either a positive or negative
-   *  +/- 1, indicating the sign of a number passed into the argument */
		frameDecceleration.z =
			Math.sign(frameDecceleration.z) *
			Math.min(Math.abs(frameDecceleration.z, Math.abs(velocity.z)));

		velocity.add(frameDecceleration);

		const controlObject = this._target;

		/** Quartenion describes orientation of an object or a vector. They are efficient
-   * and well suited to solve rotation and orientation problems in computer graphics
-   * and animation */

		const _Q = new THREE.Quaternion();
		const _A = new THREE.Vector3();

		if (controlObject) {
			const _R = controlObject.quaternion.clone();

			if (this._input._move.forward) {
				velocity.z += this._acceleration.z * timeInSeconds;
			}
			if (this._input._move.backward) {
				velocity.z -= this._acceleration.z * timeInSeconds;
			}
			if (this._input._move.left) {
				_A.set(0, 1, 0);
				_Q.setFromAxisAngle(_A, Math.PI * timeInSeconds * this._acceleration.y);
				_R.multiply(_Q);
			}
			if (this._input._move.right) {
				_A.set(0, 1, 0);
				_Q.setFromAxisAngle(_A, -Math.PI * timeInSeconds * this._acceleration.y);
				_R.multiply(_Q);
			}

			controlObject.quaternion.copy(_R);

			const oldPosition = new THREE.Vector3();
			oldPosition.copy(controlObject.position);

			const forward = new THREE.Vector3(0, 0, 1);
			forward.applyQuaternion(controlObject.quaternion);
			forward.normalize();

			const sideways = new THREE.Vector3(1, 0, 0);
			sideways.applyQuaternion(controlObject.quaternion);
			sideways.normalize();

			sideways.multiplyScalar(velocity.x * timeInSeconds);
			forward.multiplyScalar(velocity.z * timeInSeconds);

			controlObject.position.add(forward);
			controlObject.position.add(sideways);

			this._position.copy(controlObject.position);
			oldPosition.copy(controlObject.position);
		}
	}
}

class ThirdPersonCamera {
	constructor(params) {
		this._params = params;
		this._camera = params.camera;

		/** tracks the current position of the camera and looking at */
		this._currentPosition = new THREE.Vector3();
		this._currentLookAt = new THREE.Vector3();
	}

	_CalculateOffset(coordinates) {
		const [x, y, z] = coordinates;
		const offset = new THREE.Vector3(x, y, z);
		/** copies the character orientation because the offset is in local space*/
		offset.applyQuaternion(this._params.target.Rotation);

		/** sets the position */
		offset.add(this._params.target.Position);
		return offset;
	}

	Update(timeElapsed) {
		const idealOffSet = this._CalculateOffset([-15, 20, -30]);
		const idealLookAt = this._CalculateOffset([0, 10, 50]);

		this._currentPosition.copy(idealOffSet);
		this._currentLookAt.copy(idealLookAt);

		/** Orienting the camera */
		this._camera.position.copy(this._currentPosition);
		this._camera.lookAt(this._currentLookAt);
	}
}

/** MAIN CLASS :) */
class Word3D {
	constructor() {
		this._Initialize();
	}

	/* Sets up the WebGL render which displays everything on the screen such
  shadows, screen sizes and so on*/
	_Initialize() {
		this._threejs = new THREE.WebGLRenderer({ antialias: true });
		this._threejs.shadowMap.enabled = true;
		this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
		this._threejs.setPixelRatio(window.devicePixelRatio);
		this._threejs.setSize(window.innerWidth, window.innerHeight);
		this._mixers = [];

		document.body.appendChild(this._threejs.domElement);

		window.addEventListener(
			'resize',
			() => {
				this._OnWindowResize();
			},
			false
		);

		/** Perspective of a camera => settings */
		const fov = 60;
		const aspect = 1920 / 1080;
		const near = 1.0;
		const far = 1000.0;
		this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
		this._camera.position.set(75, 20, 0);

		/** Container for all the objects in the 3D world */
		this._scene = new THREE.Scene();

		/** Lightning settings */
		let light = new THREE.DirectionalLight(0xffffff);
		light.position.set(100, 100, 100);
		light.target.position.set(0, 0, 0);
		light.castShadow = true;
		light.shadow.bias = -0.001;
		light.shadow.mapSize.width = 2048;
		light.shadow.mapSize.height = 2048;
		light.shadow.camera.near = 1.0;
		light.shadow.camera.far = 500;
		light.shadow.camera.left = 200;
		light.shadow.camera.right = -200;
		light.shadow.camera.top = 200;
		light.shadow.camera.bottom = -200;

		/** Adds the light to the scene */
		this._scene.add(light);
		light = new THREE.AmbientLight(0x404040, 0.2);
		this._scene.add(light);

		/** Loads the skybox (Cube texture) in the background
		 * Special version of a texture but contain 6 sides (cube)*/
		const loader = new THREE.CubeTextureLoader();
		const texture = loader.load([
			'./resources/skyboxes/posx.jpg',
			'./resources/skyboxes/negx.jpg',
			'./resources/skyboxes/posy.jpg',
			'./resources/skyboxes/negy.jpg',
			'./resources/skyboxes/posz.jpg',
			'./resources/skyboxes/negz.jpg',
		]);

		/** Loads the cube texture on the scene background */
		this._scene.background = texture;

		/** Mesh is used for any kind of 3d Object that will be placed in a Scene,
		 * below we created a "ground" where we will place the 3D objects
		 */
		const plane = new THREE.Mesh(
			new THREE.PlaneGeometry(100, 100, 1, 1),
			new THREE.MeshStandardMaterial({
				color: 0xffffff,
			})
		);

		plane.castShadow = false;
		plane.receiveShadow = true;
		plane.rotation.x = -Math.PI / 2;
		this._scene.add(plane);

		this._previousRAF = null;

		this._LoadAnimatedModel();

		/** Request Animation Frame */
		this._RAF();
	}

	_LoadAnimatedModel() {
		const params = {
			camera: this._camera,
			scene: this._scene,
		};

		this._controls = new BasicModelControls(params);

		/** Workaround master :) */
		this._mixers = this._controls._mixers;

		this._thirdPersonCam = new ThirdPersonCamera({
			camera: this._camera,
			target: this._controls,
		});
	}

	/** Resizing settings */
	_OnWindowResize() {
		this._camera.aspect = window.innerWidth / window.innerHeight;
		this._camera.updateProjectionMatrix();
		this._threejs.setSize(window.innerWidth, window.innerHeight);
	}

	/** Request Animation Frame
	 * It is recursive call because it re renders at every frame */
	_RAF() {
		requestAnimationFrame((time) => {
			if (this._previousRAF === null) {
				this._previousRAF = time;
			}

			this._RAF();
			this._threejs.render(this._scene, this._camera);
			this._Step(time - this._previousRAF);
			this._previousRAF = time;
		});
	}

	_Step(timeElapsed) {
		const timeElapsedInSecs = timeElapsed * 0.001;

		if (this._mixers) {
			this._mixers.map((mixer) => mixer.update(timeElapsedInSecs));
		}

		/** Also updates the timing on basic controls  */
		if (this._controls) {
			this._controls.Update(timeElapsedInSecs);
		}

		/** Updates 3rd person camera each frame, e.g. if the player moves the
		 * update function will get this movement and smoothly move to follow the chracter */

		this._thirdPersonCam.Update(timeElapsedInSecs);
	}
} /** end class */

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
	_APP = new Word3D();
});
