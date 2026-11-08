import * as React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { Project, ModelType } from "../classes/Project";
import { ProjectsManager } from "../classes/ProjectsManager";
import { buildCubeEnvironment, ICubeEnvironment } from "./three/CubeEnvironment";
import { buildGearEnvironment, IGearEnvironment } from "./three/GearEnvironment";
import { buildLuxuryVillaEnvironment, IVillaEnvironment } from "./three/VillaEnvironment";
import { buildCarShowroomEnvironment, ICarEnvironment } from "./three/CarEnvironment";
import { buildTowerEnvironment, ITowerEnvironment } from "./three/TowerEnvironment";
import { buildBridgeEnvironment, IBridgeEnvironment } from "./three/BridgeEnvironment";

export interface ThreeViewerProps {
    project: Project;
    projectsManager?: ProjectsManager;
}

interface ViewerActions {
    flyTo: (target: THREE.Vector3, pos: THREE.Vector3) => void;
    toggleAutoRotate: () => boolean;
    toggleWireframe: () => boolean;
    toggleLighting: () => boolean;
    focusModel: () => void;
    zoom: (delta: number) => void;
    capture: () => void;
    setPreset: (preset: "iso" | "top" | "front") => void;
}

/**
 * Professional Full-Featured BIM 3D Viewer Component
 * - Smooth kinematic camera damping & tweened swooping transitions
 * - Interactive glassmorphism CAD HUD toolbar overlay
 * - Full suite of 5 signature 3D BIM models (Pavilion Slab, Industrial Gear Dyno,
 *   Luxury Eco-Villa, EV Logistics Hub, Parametric Skyscraper, and Cable-Stayed Bridge)
 * - Daylight Studio vs. Dramatic Twilight Lighting Modes
 * - Keyboard navigation shortcuts (Space, F, W, L, 1, 2, 3)
 * - High-resolution PNG CAD snapshot export
 * - Strict 3-step GPU memory disposal protocol
 */
export function ThreeViewer(props: ThreeViewerProps) {
    const { project, projectsManager } = props;
    const viewerContainerRef = React.useRef<HTMLDivElement | null>(null);

    // React state for HUD toolbar active indicators
    const [isAutoRotating, setIsAutoRotating] = React.useState<boolean>(false);
    const [isWireframe, setIsWireframe] = React.useState<boolean>(false);
    const [isTwilight, setIsTwilight] = React.useState<boolean>(false);

    const viewerActionsRef = React.useRef<ViewerActions | null>(null);

    React.useEffect(() => {
        const viewerContainer = viewerContainerRef.current;
        if (!viewerContainer) { return; }

        // --- 1. Scene, Camera, and WebGL Renderer ---
        let scene: THREE.Scene | null = new THREE.Scene();

        let camera: THREE.PerspectiveCamera | null = new THREE.PerspectiveCamera(55);
        camera.position.set(16, 12, 20);
        camera.lookAt(0, 2, 0);

        let renderer: THREE.WebGLRenderer | null = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true, // Enables pristine PNG screenshot captures
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.outline = "none";
        viewerContainer.appendChild(renderer.domElement);

        // --- 2. Enhanced OrbitControls Navigation ---
        let cameraControls: OrbitControls | null = new OrbitControls(camera, renderer.domElement);
        cameraControls.enableDamping = true;
        cameraControls.dampingFactor = 0.05;
        cameraControls.screenSpacePanning = true;
        cameraControls.maxPolarAngle = Math.PI / 2 + 0.08;
        cameraControls.minDistance = 1.0;
        cameraControls.maxDistance = 160;
        cameraControls.zoomSpeed = 1.2;
        cameraControls.rotateSpeed = 0.85;
        cameraControls.panSpeed = 1.0;

        const resizeViewer = () => {
            if (!viewerContainer || !renderer || !camera) { return; }
            const rect = viewerContainer.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) { return; }
            renderer.setSize(rect.width, rect.height);
            camera.aspect = rect.width / rect.height;
            camera.updateProjectionMatrix();
        };

        window.addEventListener("resize", resizeViewer);
        const viewerResizeObserver = new ResizeObserver(() => resizeViewer());
        viewerResizeObserver.observe(viewerContainer);
        resizeViewer();

        // --- 3. Ground Coordinate Grid & 3D Axes Helper ---
        const axes = new THREE.AxesHelper(6);
        axes.visible = false;
        const grid = new THREE.GridHelper(40, 40, 0x38bdf8, 0x334155);
        const gridMaterial = grid.material as THREE.LineBasicMaterial;
        gridMaterial.transparent = true;
        gridMaterial.opacity = 0.35;
        grid.position.y = 0;
        scene.add(grid, axes);

        // --- 4. Studio & Twilight Lighting Architecture ---
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x0f172a, 0.85);
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
        keyLight.position.set(22, 32, 24);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.bias = -0.0001;

        const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.2);
        fillLight.position.set(-20, 14, -14);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
        scene.add(hemiLight, keyLight, fillLight, ambientLight);

        // --- 5. All 6 Modular BIM Environments ---
        const cubeEnv: ICubeEnvironment = buildCubeEnvironment();
        scene.add(cubeEnv.group);

        const gearEnv: IGearEnvironment = buildGearEnvironment();
        scene.add(gearEnv.group);

        const villaEnv: IVillaEnvironment = buildLuxuryVillaEnvironment();
        scene.add(villaEnv.group);

        const carEnv: ICarEnvironment = buildCarShowroomEnvironment();
        scene.add(carEnv.group);

        const towerEnv: ITowerEnvironment = buildTowerEnvironment();
        scene.add(towerEnv.group);

        const bridgeEnv: IBridgeEnvironment = buildBridgeEnvironment();
        scene.add(bridgeEnv.group);

        let gearMesh: THREE.Group | null = null;
        let carMesh: THREE.Group | null = null;
        let villaMesh: THREE.Group | null = null;

        const clock = new THREE.Clock();
        let activeModelType: ModelType = "cube";
        let activeModelFolder: any = null;
        let gui: GUI | null = null;

        const viewerState = {
            autoRotate: false,
            showBoundingBox: false,
            wireframe: false,
            twilight: false,
            showPool: true,
            showFurniture: true,
            showChargingHub: true,
            showSkyGarden: true,
            showTrafficLamps: true,
            showRebar: true,
            showLaser: true,
        };

        const boundingBoxHelper = new THREE.BoxHelper(cubeEnv.group, 0x38bdf8);
        boundingBoxHelper.visible = false;
        scene.add(boundingBoxHelper);

        const gearPbrMaterial = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            metalness: 0.9,
            roughness: 0.2,
        });

        // --- 6. Smooth Kinematic Camera Tweening System ---
        const cameraAnim = {
            animating: false,
            startTime: 0,
            duration: 0.85,
            startPos: new THREE.Vector3(),
            targetPos: new THREE.Vector3(),
            startLook: new THREE.Vector3(),
            targetLook: new THREE.Vector3(),
        };

        const flyCameraTo = (newTarget: THREE.Vector3, newPos: THREE.Vector3) => {
            if (!camera || !cameraControls) return;
            cameraAnim.animating = true;
            cameraAnim.startTime = clock.getElapsedTime();
            cameraAnim.startPos.copy(camera.position);
            cameraAnim.targetPos.copy(newPos);
            cameraAnim.startLook.copy(cameraControls.target);
            cameraAnim.targetLook.copy(newTarget);
        };

        // Calibrated Camera Position Presets
        const getCameraPreset = (model: ModelType, view: "iso" | "top" | "front"): { target: THREE.Vector3; pos: THREE.Vector3 } => {
            const presets: Record<ModelType, Record<"iso" | "top" | "front", { target: [number, number, number]; pos: [number, number, number] }>> = {
                cube: {
                    iso: { target: [0, 1.4, 0], pos: [7.5, 6.0, 8.5] },
                    top: { target: [0, 0, 0], pos: [0, 14, 0.01] },
                    front: { target: [0, 1.4, 0], pos: [0, 1.8, 9.5] },
                },
                gear: {
                    iso: { target: [0, 6.07, 0], pos: [14, 11, 16] },
                    top: { target: [0, 6.07, 0], pos: [0, 24, 0.01] },
                    front: { target: [0, 6.07, 0], pos: [0, 6.07, 20] },
                },
                car: {
                    iso: { target: [0, 0.8, 0], pos: [7.5, 4.5, 8.5] },
                    top: { target: [0, 0, 0], pos: [0, 12, 0.01] },
                    front: { target: [0, 0.7, 0], pos: [0, 1.2, 8.5] },
                },
                villa: {
                    iso: { target: [0, 2.0, 3.5], pos: [16, 12, 19] },
                    top: { target: [0, 0, 3.5], pos: [0, 28, 3.51] },
                    front: { target: [0, 1.5, 3.5], pos: [0, 3.5, 20] },
                },
                tower: {
                    iso: { target: [0, 11, 0], pos: [18, 16, 20] },
                    top: { target: [0, 0, 0], pos: [0, 42, 0.01] },
                    front: { target: [0, 11, 0], pos: [0, 12, 25] },
                },
                bridge: {
                    iso: { target: [0, 4.5, 0], pos: [32, 18, 28] },
                    top: { target: [0, 3.2, 0], pos: [0, 42, 0.01] },
                    front: { target: [0, 4.0, 0], pos: [0, 6.0, 34] },
                },
            };

            const p = presets[model] || presets.cube;
            const targetTuple = p[view].target;
            const posTuple = p[view].pos;
            return {
                target: new THREE.Vector3(...targetTuple),
                pos: new THREE.Vector3(...posTuple),
            };
        };

        const switchActiveModel = (newModel: ModelType, resetCam: boolean = false) => {
            activeModelType = newModel;

            // Toggle Modular Environments
            cubeEnv.group.visible = (newModel === "cube");
            gearEnv.group.visible = (newModel === "gear");
            if (gearMesh) gearMesh.visible = (newModel === "gear");
            if (carMesh) carMesh.visible = (newModel === "car");
            villaEnv.group.visible = (newModel === "villa");
            carEnv.group.visible = (newModel === "car");
            towerEnv.group.visible = (newModel === "tower");
            bridgeEnv.group.visible = (newModel === "bridge");

            let activeObj: THREE.Object3D = cubeEnv.group;
            if (newModel === "gear" && gearMesh) activeObj = gearMesh;
            else if (newModel === "car" && carMesh) activeObj = carMesh;
            else if (newModel === "villa") activeObj = villaEnv.group;
            else if (newModel === "tower") activeObj = towerEnv.group;
            else if (newModel === "bridge") activeObj = bridgeEnv.group;

            boundingBoxHelper.setFromObject(activeObj);

            if (resetCam) {
                const preset = getCameraPreset(newModel, "iso");
                flyCameraTo(preset.target, preset.pos);
            }
        };

        // Day vs. Dramatic Twilight Lighting Toggle
        const applyLightingMode = (twilight: boolean) => {
            if (twilight) {
                hemiLight.color.setHex(0x1e1b4b);
                hemiLight.groundColor.setHex(0x020617);
                hemiLight.intensity = 0.45;
                keyLight.color.setHex(0x38bdf8);
                keyLight.intensity = 1.2;
                fillLight.color.setHex(0x7c3aed);
                fillLight.intensity = 1.0;
                ambientLight.color.setHex(0x0f172a);
                ambientLight.intensity = 0.35;
                if (renderer) renderer.setClearColor(0x020617, 1);
            } else {
                hemiLight.color.setHex(0xffffff);
                hemiLight.groundColor.setHex(0x0f172a);
                hemiLight.intensity = 0.85;
                keyLight.color.setHex(0xffffff);
                keyLight.intensity = 2.4;
                fillLight.color.setHex(0x93c5fd);
                fillLight.intensity = 1.2;
                ambientLight.color.setHex(0xffffff);
                ambientLight.intensity = 0.45;
                if (renderer) renderer.setClearColor(0x000000, 0);
            }
        };

        // Global Wireframe Mode
        const toggleAllWireframe = (enable: boolean) => {
            scene?.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mat = (child as THREE.Mesh).material;
                    if (Array.isArray(mat)) {
                        mat.forEach((m) => { if ("wireframe" in m) m.wireframe = enable; });
                    } else if (mat && "wireframe" in mat) {
                        mat.wireframe = enable;
                    }
                }
            });
        };

        const focusActiveModel = () => {
            let activeObj: THREE.Object3D = cubeEnv.group;
            if (activeModelType === "gear" && gearMesh) activeObj = gearMesh;
            else if (activeModelType === "car" && carMesh) activeObj = carMesh;
            else if (activeModelType === "villa" && villaMesh) activeObj = villaMesh;
            else if (activeModelType === "tower") activeObj = towerEnv.group;
            else if (activeModelType === "bridge") activeObj = bridgeEnv.group;

            const box = new THREE.Box3().setFromObject(activeObj);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = (camera?.fov ?? 55) * (Math.PI / 180);
            const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.75;
            const newPos = center.clone().add(new THREE.Vector3(distance * 0.65, distance * 0.45, distance * 0.75));
            flyCameraTo(center, newPos);
        };

        let buildActiveFolder = () => {};

        const updateViewerForProject = (proj: any, resetCameraView: boolean = true) => {
            if (!proj || !camera || !cameraControls) { return; }

            if (gui) { gui.destroy(); }
            gui = new GUI({ container: viewerContainer, title: "3D Viewer Options", width: 310 });
            gui.domElement.setAttribute("lang", "en-US");
            gui.domElement.style.position = "absolute";
            gui.domElement.style.top = "1rem";
            gui.domElement.style.right = "1rem";
            gui.domElement.style.zIndex = "25";

            const nameLower = (proj.name || "").toLowerCase();
            let initialModel: ModelType = proj.modelType || "cube";
            if (!proj.modelType || proj.modelType === "cube") {
                if (nameLower.includes("tower") || nameLower.includes("skyscraper") || nameLower.includes("high-rise") || nameLower.includes("apex")) initialModel = "tower";
                else if (nameLower.includes("bridge") || nameLower.includes("span") || nameLower.includes("viaduct") || nameLower.includes("nordic")) initialModel = "bridge";
                else if (nameLower.includes("villa") || nameLower.includes("house") || nameLower.includes("residence") || nameLower.includes("azure")) initialModel = "villa";
                else if (nameLower.includes("car") || nameLower.includes("auto") || nameLower.includes("vehic") || nameLower.includes("ev")) initialModel = "car";
                else if (nameLower.includes("gear") || nameLower.includes("hvac") || nameLower.includes("plant") || nameLower.includes("mech")) initialModel = "gear";
            }
            activeModelType = initialModel;
            switchActiveModel(activeModelType, resetCameraView);

            const modelSelectorObj = { model: activeModelType };
            gui.add(modelSelectorObj, "model", {
                "🏢 Apex Skyscraper": "tower",
                "🌉 Nordic Bridge": "bridge",
                "🏡 Azure Eco-Villa": "villa",
                "🚗 EV Cyber Coupe": "car",
                "⚙️ HVAC Dyno Gear": "gear",
                "🏛️ BIM Pavilion": "cube",
            }).name("Active Model").onChange((val: ModelType) => {
                switchActiveModel(val, true);
                buildActiveFolder();
            });

            buildActiveFolder = () => {
                if (activeModelFolder) {
                    activeModelFolder.destroy();
                    activeModelFolder = null;
                }

                if (activeModelType === "cube") {
                    activeModelFolder = gui!.addFolder("BIM Pavilion Controls");
                    activeModelFolder.open();
                    activeModelFolder.add(viewerState, "showRebar").name("Rebar Layer").onChange((v: boolean) => cubeEnv.toggleRebar(v));
                    activeModelFolder.add(viewerState, "showFurniture").name("Lounge Suite").onChange((v: boolean) => cubeEnv.toggleFurniture(v));
                    activeModelFolder.add(viewerState, "autoRotate").name("Auto-Rotate").listen().onChange((v: boolean) => setIsAutoRotating(v));
                } else if (activeModelType === "gear") {
                    activeModelFolder = gui!.addFolder("Mechanical Gear Controls");
                    activeModelFolder.open();
                    activeModelFolder.add(viewerState, "showLaser").name("Laser Inspection").onChange((v: boolean) => gearEnv.toggleLaser(v));
                    activeModelFolder.add(viewerState, "autoRotate").name("Rotate Dyno").listen().onChange((v: boolean) => setIsAutoRotating(v));
                } else if (activeModelType === "villa") {
                    activeModelFolder = gui!.addFolder("Luxury Villa Controls");
                    activeModelFolder.open();
                    activeModelFolder.add(viewerState, "showPool").name("Infinity Pool").onChange((v: boolean) => villaEnv.togglePool(v));
                    activeModelFolder.add(viewerState, "showFurniture").name("Furnished Suites").onChange((v: boolean) => villaEnv.toggleFurniture(v));
                    activeModelFolder.add(viewerState, "autoRotate").name("Auto-Rotate").listen().onChange((v: boolean) => setIsAutoRotating(v));
                } else if (activeModelType === "car") {
                    activeModelFolder = gui!.addFolder("EV Showroom Controls");
                    activeModelFolder.open();
                    activeModelFolder.add(viewerState, "showChargingHub").name("EV Charger Hub").onChange((v: boolean) => carEnv.toggleChargingHub(v));
                    activeModelFolder.add(viewerState, "autoRotate").name("Rotate Turntable").listen().onChange((v: boolean) => setIsAutoRotating(v));
                } else if (activeModelType === "tower") {
                    activeModelFolder = gui!.addFolder("Apex Tower Controls");
                    activeModelFolder.open();
                    activeModelFolder.add(viewerState, "showSkyGarden").name("Sky Garden Terrace").onChange((v: boolean) => towerEnv.toggleSkyGarden(v));
                    activeModelFolder.add(viewerState, "autoRotate").name("Auto-Rotate").listen().onChange((v: boolean) => setIsAutoRotating(v));
                } else if (activeModelType === "bridge") {
                    activeModelFolder = gui!.addFolder("Nordic Bridge Controls");
                    activeModelFolder.open();
                    activeModelFolder.add(viewerState, "showTrafficLamps").name("Roadway Lampposts").onChange((v: boolean) => bridgeEnv.toggleTrafficLamps(v));
                    activeModelFolder.add(viewerState, "autoRotate").name("Auto-Rotate").listen().onChange((v: boolean) => setIsAutoRotating(v));
                }
            };
            buildActiveFolder();

            const helpersFolder = gui.addFolder("CAD Grid & Helpers");
            helpersFolder.close();
            helpersFolder.add(grid, "visible").name("Ground Grid");
            helpersFolder.add(axes, "visible").name("Origin Axes");
            helpersFolder.add(viewerState, "showBoundingBox").name("Bounding Box").onChange((v: boolean) => {
                boundingBoxHelper.visible = v;
                boundingBoxHelper.update();
            });

            gui.open();
        };

        // Wire Actions to External React HUD & Shortcuts
        viewerActionsRef.current = {
            flyTo: (target, pos) => flyCameraTo(target, pos),
            toggleAutoRotate: () => {
                viewerState.autoRotate = !viewerState.autoRotate;
                setIsAutoRotating(viewerState.autoRotate);
                return viewerState.autoRotate;
            },
            toggleWireframe: () => {
                viewerState.wireframe = !viewerState.wireframe;
                setIsWireframe(viewerState.wireframe);
                toggleAllWireframe(viewerState.wireframe);
                return viewerState.wireframe;
            },
            toggleLighting: () => {
                viewerState.twilight = !viewerState.twilight;
                setIsTwilight(viewerState.twilight);
                applyLightingMode(viewerState.twilight);
                return viewerState.twilight;
            },
            focusModel: () => {
                focusActiveModel();
            },
            zoom: (delta: number) => {
                if (!camera || !cameraControls) return;
                const forward = new THREE.Vector3();
                camera.getWorldDirection(forward);
                camera.position.addScaledVector(forward, delta);
                cameraControls.update();
            },
            capture: () => {
                if (!renderer || !scene || !camera) return;
                renderer.render(scene, camera);
                const dataUrl = renderer.domElement.toDataURL("image/png");
                const a = document.createElement("a");
                a.download = `${project.name.replace(/\s+/g, "_")}_BIM_View.png`;
                a.href = dataUrl;
                a.click();
            },
            setPreset: (preset: "iso" | "top" | "front") => {
                const p = getCameraPreset(activeModelType, preset);
                flyCameraTo(p.target, p.pos);
            },
        };

        // Keyboard Shortcuts Handler
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            if (tag === "input" || tag === "textarea" || tag === "select") return;

            if (e.code === "Space") {
                e.preventDefault();
                viewerActionsRef.current?.toggleAutoRotate();
            } else if (e.key === "f" || e.key === "F") {
                e.preventDefault();
                viewerActionsRef.current?.focusModel();
            } else if (e.key === "w" || e.key === "W") {
                e.preventDefault();
                viewerActionsRef.current?.toggleWireframe();
            } else if (e.key === "l" || e.key === "L") {
                e.preventDefault();
                viewerActionsRef.current?.toggleLighting();
            } else if (e.key === "1") {
                viewerActionsRef.current?.setPreset("iso");
            } else if (e.key === "2") {
                viewerActionsRef.current?.setPreset("top");
            } else if (e.key === "3") {
                viewerActionsRef.current?.setPreset("front");
            } else if (e.key === "+" || e.key === "=") {
                viewerActionsRef.current?.zoom(2.5);
            } else if (e.key === "-" || e.key === "_") {
                viewerActionsRef.current?.zoom(-2.5);
            }
        };
        window.addEventListener("keydown", handleKeyDown);

        if (projectsManager) {
            projectsManager.onProjectSelected = (selectedProj) => {
                resizeViewer();
                updateViewerForProject(selectedProj);
            };
        }

        updateViewerForProject(project);

        let isDisposed = false;

        // Load 3D Meshes from Files (Gear, Car, Villa)
        const objLoader = new OBJLoader();
        const mtlLoader = new MTLLoader();
        objLoader.setPath("/Gear/");
        mtlLoader.setPath("/Gear/");
        objLoader.load("Gear1.obj", (mesh) => {
            if (isDisposed || !scene) return;
            gearMesh = mesh;
            mesh.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    (child as THREE.Mesh).material = gearPbrMaterial;
                    (child as THREE.Mesh).castShadow = true;
                    (child as THREE.Mesh).receiveShadow = true;
                }
            });
            const box = new THREE.Box3().setFromObject(mesh);
            const center = box.getCenter(new THREE.Vector3());
            mesh.position.x = -center.x;
            mesh.position.z = -center.z;
            mesh.position.y = 6.07;
            scene.add(gearMesh);
            gearMesh.visible = (activeModelType === "gear");
        }, undefined, (err) => console.error("Gear OBJ error:", err));

        const carMtlLoader = new MTLLoader();
        carMtlLoader.setPath("/models/car/");
        carMtlLoader.load("car.mtl", (materials) => {
            materials.preload();
            const carObjLoader = new OBJLoader();
            carObjLoader.setMaterials(materials);
            carObjLoader.setPath("/models/car/");
            carObjLoader.load("car.obj", (mesh) => {
                if (isDisposed || !scene) return;
                mesh.rotation.x = -Math.PI / 2;
                mesh.updateMatrixWorld(true);
                const box = new THREE.Box3().setFromObject(mesh);
                const center = box.getCenter(new THREE.Vector3());
                mesh.position.x = -center.x;
                mesh.position.z = -center.z;
                mesh.position.y = -box.min.y;
                mesh.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        (child as THREE.Mesh).castShadow = true;
                        (child as THREE.Mesh).receiveShadow = true;
                    }
                });
                carMesh = mesh;
                scene.add(carMesh);
                carMesh.visible = (activeModelType === "car");
            });
        });



        let animFrameId: number;
        const renderScene = () => {
            if (isDisposed || !renderer || !scene || !camera || !cameraControls) { return; }

            const elapsedTime = clock.getElapsedTime();

            // Smooth Camera Interpolation
            if (cameraAnim.animating) {
                const progress = Math.min(1, (elapsedTime - cameraAnim.startTime) / cameraAnim.duration);
                const ease = progress < 0.5
                    ? 4 * progress * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2;

                camera.position.lerpVectors(cameraAnim.startPos, cameraAnim.targetPos, ease);
                cameraControls.target.lerpVectors(cameraAnim.startLook, cameraAnim.targetLook, ease);
                if (progress >= 1) {
                    cameraAnim.animating = false;
                }
            }

            // Real-Time Environment Updates
            if (activeModelType === "cube") {
                cubeEnv.updatePavilion(elapsedTime);
            } else if (activeModelType === "gear") {
                gearEnv.updateGearEnv(elapsedTime, viewerState.autoRotate);
            } else if (activeModelType === "villa") {
                villaEnv.updateWater(elapsedTime);
            } else if (activeModelType === "car") {
                carEnv.updateLights(elapsedTime);
            } else if (activeModelType === "tower") {
                towerEnv.updateTower(elapsedTime);
            } else if (activeModelType === "bridge") {
                bridgeEnv.updateBridge(elapsedTime);
            }

            // Smooth Auto-Rotation
            if (viewerState.autoRotate) {
                if (activeModelType === "cube" && cubeEnv.group.visible) {
                    cubeEnv.group.rotation.y += 0.008;
                } else if (activeModelType === "gear" && gearMesh && gearMesh.visible) {
                    gearMesh.rotation.y += 0.01;
                } else if (activeModelType === "car" && carMesh && carMesh.visible) {
                    carMesh.rotation.y += 0.008;
                } else if (activeModelType === "villa" && villaMesh && villaMesh.visible) {
                    villaMesh.rotation.y += 0.006;
                } else if (activeModelType === "tower" && towerEnv.group.visible) {
                    towerEnv.group.rotation.y += 0.005;
                } else if (activeModelType === "bridge" && bridgeEnv.group.visible) {
                    bridgeEnv.group.rotation.y += 0.004;
                }
            }

            if (boundingBoxHelper.visible) {
                boundingBoxHelper.update();
            }
            cameraControls.update();
            renderer.render(scene, camera);
            animFrameId = requestAnimationFrame(renderScene);
        };
        renderScene();

        // --- 3-Step Disposal Protocol on Component Unmount ---
        return () => {
            isDisposed = true;
            cancelAnimationFrame(animFrameId);
            window.removeEventListener("resize", resizeViewer);
            window.removeEventListener("keydown", handleKeyDown);
            viewerResizeObserver.disconnect();

            if (scene) {
                scene.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const mesh = child as THREE.Mesh;
                        mesh.geometry?.dispose();
                        if (Array.isArray(mesh.material)) {
                            mesh.material.forEach((mat) => mat.dispose());
                        } else if (mesh.material) {
                            mesh.material.dispose();
                        }
                    }
                });
                scene.clear();
            }

            if (gui) { gui.destroy(); }
            cubeEnv.dispose();
            gearEnv.dispose();
            villaEnv.dispose();
            carEnv.dispose();
            towerEnv.dispose();
            bridgeEnv.dispose();
            cameraControls?.dispose();
            gearPbrMaterial.dispose();
            gridMaterial.dispose();
            boundingBoxHelper.dispose();

            if (renderer) {
                renderer.dispose();
                if (renderer.domElement.parentElement === viewerContainer) {
                    viewerContainer.removeChild(renderer.domElement);
                }
            }

            scene = null;
            camera = null;
            renderer = null;
            cameraControls = null;
            gui = null;
            gearMesh = null;
            carMesh = null;
            villaMesh = null;
            viewerActionsRef.current = null;
        };
    }, [project.id]);

    return (
        <div
            id="viewer-container"
            className="viewer-container"
            ref={viewerContainerRef}
            style={{ minWidth: 0, position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
        >
            {/* Professional 3D CAD Navigation Floating HUD Toolbar */}
            <div className="viewer-pro-hud">
                <div className="hud-pill-group">
                    <button
                        type="button"
                        className="hud-btn"
                        title="Isometric 3D View [Press 1]"
                        onClick={() => viewerActionsRef.current?.setPreset("iso")}
                    >
                        <span className="material-icons-round">view_in_ar</span>
                        <span className="hud-label">3D View</span>
                    </button>
                    <button
                        type="button"
                        className="hud-btn"
                        title="Top Plan View [Press 2]"
                        onClick={() => viewerActionsRef.current?.setPreset("top")}
                    >
                        <span className="material-icons-round">layers</span>
                        <span className="hud-label">Plan</span>
                    </button>
                    <button
                        type="button"
                        className="hud-btn"
                        title="Front Elevation [Press 3]"
                        onClick={() => viewerActionsRef.current?.setPreset("front")}
                    >
                        <span className="material-icons-round">crop_portrait</span>
                        <span className="hud-label">Front</span>
                    </button>
                    <button
                        type="button"
                        className="hud-btn"
                        title="Focus & Frame Model [Press F]"
                        onClick={() => viewerActionsRef.current?.focusModel()}
                    >
                        <span className="material-icons-round">center_focus_strong</span>
                        <span className="hud-label">Focus</span>
                    </button>
                </div>

                <div className="hud-divider" />

                <div className="hud-pill-group">
                    <button
                        type="button"
                        className="hud-btn"
                        title="Zoom In [Press +]"
                        onClick={() => viewerActionsRef.current?.zoom(3.0)}
                    >
                        <span className="material-icons-round">add</span>
                    </button>
                    <button
                        type="button"
                        className="hud-btn"
                        title="Zoom Out [Press -]"
                        onClick={() => viewerActionsRef.current?.zoom(-3.0)}
                    >
                        <span className="material-icons-round">remove</span>
                    </button>
                    <button
                        type="button"
                        className={`hud-btn ${isAutoRotating ? "active" : ""}`}
                        title="Toggle Auto-Orbit [Press Space]"
                        onClick={() => viewerActionsRef.current?.toggleAutoRotate()}
                    >
                        <span className="material-icons-round">sync</span>
                        <span className="hud-label">Auto-Orbit</span>
                    </button>
                </div>

                <div className="hud-divider" />

                <div className="hud-pill-group">
                    <button
                        type="button"
                        className={`hud-btn ${isWireframe ? "active" : ""}`}
                        title="Toggle BIM Wireframe [Press W]"
                        onClick={() => viewerActionsRef.current?.toggleWireframe()}
                    >
                        <span className="material-icons-round">grid_4x4</span>
                    </button>
                    <button
                        type="button"
                        className={`hud-btn ${isTwilight ? "active" : ""}`}
                        title="Toggle Twilight / Studio Lighting [Press L]"
                        onClick={() => viewerActionsRef.current?.toggleLighting()}
                    >
                        <span className="material-icons-round">{isTwilight ? "bedtime" : "wb_sunny"}</span>
                    </button>
                    <button
                        type="button"
                        className="hud-btn"
                        title="Capture Pristine 3D PNG View"
                        onClick={() => viewerActionsRef.current?.capture()}
                    >
                        <span className="material-icons-round">photo_camera</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
