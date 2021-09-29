import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/loaders/GLTFLoader.js';

// For dynamic models
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';

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
		light.shadow.bias = -0.01;
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
		light = new THREE.AmbientLight(0x404040);
		this._scene.add(light);

		/** Orbit controls allow the camera to orbit around a target */
		const controls = new OrbitControls(this._camera, this._threejs.domElement);
		controls.target.set(0, 0, 0);
		controls.update();

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

		/** Add an 3D object to the scene / ground */
		const box = new THREE.Mesh(
			new THREE.BoxGeometry(2, 2, 2),
			new THREE.MeshStandardMaterial({
				color: 0x43fae4,
			})
		);
		box.position.set(0, 1, 0);
		box.castShadow = true;
		box.receiveShadow = true;

		/** Adds the box into the scene */
		this._scene.add(box);

		/** Static Model */
		this._LoadModel();

		/** Dynamic Model */
		this._LoadAnimatedModel();

		/** Request Animation Frame */
		this._RAF();
	}

	/** Instanciating a loader */
	_LoadModel() {
		const loader = new GLTFLoader();
		loader.load(
			'./resources/rocket/Rocket_Ship_01.gltf',
			(gltf) => {
				gltf.scene.traverse((c) => {
					c.castShadow = true;
					c.position.set(0, 0, 10);
					c.receiveShadow = true;
				});
				this._scene.add(gltf.scene);
			},
			undefined,
			(error) => console.log(error)
		);
	}

	/** Dynamic 3D model */
	_LoadAnimatedModel() {
		const loader = new FBXLoader();
		loader.setPath('./resources/soldier/');
		loader.load('derrick.fbx', (fbx) => {
			fbx.scale.setScalar(0.1);
			fbx.traverse((c) => {
				c.castShadow = true;
			});

			fbx.position.set(5, 0, 0);

			const anim = new FBXLoader();
			anim.setPath('./resources/soldier/');
			anim.load('zombie_scream.fbx', (anim) => {
				this._mixer = new THREE.AnimationMixer(fbx);
				const idle = this._mixer.clipAction(anim.animations[0]);
				idle.play();
			});

			this._scene.add(fbx);
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
		requestAnimationFrame(() => {
			this._threejs.render(this._scene, this._camera);
			this._RAF();
		});
	}
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
	_APP = new Word3D();
});
