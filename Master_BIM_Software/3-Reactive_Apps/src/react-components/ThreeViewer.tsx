import * as React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { Project, ModelType } from "../classes/Project";
import { ProjectsManager } from "../classes/ProjectsManager";

export interface ThreeViewerProps {
    project: Project;
    projectsManager?: ProjectsManager;
}

// Lesson 3.12: Creating a Three Viewer React Component
// Lesson 3.13: Disposing the Viewer on Component Unmount (3-Step Disposal Protocol)
export function ThreeViewer(props: ThreeViewerProps) {
    const { project, projectsManager } = props;
    const viewerContainerRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const viewerContainer = viewerContainerRef.current;
        if (!viewerContainer) { return; }

        // --- 1. References for Reassignment & Unmount Cleanup ---
        let scene: THREE.Scene | null = new THREE.Scene();

        let camera: THREE.PerspectiveCamera | null = new THREE.PerspectiveCamera(60);
        camera.position.set(14, 10, 18);
        camera.lookAt(0, 6, 0);

        let renderer: THREE.WebGLRenderer | null = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.outline = "none";
        viewerContainer.appendChild(renderer.domElement);

        let cameraControls: OrbitControls | null = new OrbitControls(camera, renderer.domElement);
        cameraControls.enableDamping = true;
        cameraControls.dampingFactor = 0.05;

        const resizeViewer = () => {
            if (!viewerContainer || !renderer || !camera) { return; }
            const containerDimensions = viewerContainer.getBoundingClientRect();
            if (containerDimensions.width === 0 || containerDimensions.height === 0) {
                return;
            }
            renderer.setSize(containerDimensions.width, containerDimensions.height);
            camera.aspect = containerDimensions.width / containerDimensions.height;
            camera.updateProjectionMatrix();
        };

        window.addEventListener("resize", resizeViewer);
        const viewerResizeObserver = new ResizeObserver(() => resizeViewer());
        viewerResizeObserver.observe(viewerContainer);
        resizeViewer();

        // 3D Architectural Massing Cube
        const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
        const cubeMaterial = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            roughness: 0.35,
            metalness: 0.2,
        });
        const cube = new THREE.Mesh(boxGeometry, cubeMaterial);
        cube.position.y = 1;

        const edges = new THREE.EdgesGeometry(boxGeometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0284c7, linewidth: 2 });
        const cubeEdges = new THREE.LineSegments(edges, lineMaterial);
        cube.add(cubeEdges);
        scene.add(cube);

        // Ground Coordinate Grid & 3D Axes Helper
        const axes = new THREE.AxesHelper(6);
        const grid = new THREE.GridHelper(30, 30);
        const gridMaterial = grid.material as THREE.LineBasicMaterial;
        gridMaterial.transparent = true;
        gridMaterial.opacity = 0.4;
        gridMaterial.color = new THREE.Color(0x808080);
        grid.position.y = 0;

        // Studio Architectural & Environmental Lighting (Hemisphere + Key + Fill + Ambient)
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.75);
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
        keyLight.position.set(18, 28, 22);

        const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.1);
        fillLight.position.set(-18, 12, -12);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);

        const directionalLightHelper = new THREE.DirectionalLightHelper(keyLight, 2);
        directionalLightHelper.visible = false;

        scene.add(grid, axes, hemiLight, keyLight, fillLight, ambientLight, directionalLightHelper);

        let gui: GUI | null = null;
        let gearMesh: THREE.Group | null = null;
        const gearDefaultPos = new THREE.Vector3(0, 6.07, 0);

        let carMesh: THREE.Group | null = null;
        const carDefaultPos = new THREE.Vector3(0, 0, 0);

        let villaMesh: THREE.Group | null = null;
        const villaDefaultPos = new THREE.Vector3(0, 0, 0);

        let activeModelType: ModelType = "cube";
        let activeModelFolder: any = null;

        const viewerState = {
            autoRotate: false,
            showBoundingBox: false,
        };

        const boundingBoxHelper = new THREE.BoxHelper(cube, 0x38bdf8);
        boundingBoxHelper.visible = false;
        scene.add(boundingBoxHelper);

        const gearPbrMaterial = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            metalness: 0.85,
            roughness: 0.25,
        });

        const switchActiveModel = (newModel: ModelType, resetCam: boolean = false) => {
            activeModelType = newModel;

            cube.visible = (newModel === "cube");
            if (gearMesh) gearMesh.visible = (newModel === "gear");
            if (carMesh) carMesh.visible = (newModel === "car");
            if (villaMesh) villaMesh.visible = (newModel === "villa");

            let activeObj: THREE.Object3D = cube;
            if (newModel === "gear" && gearMesh) activeObj = gearMesh;
            else if (newModel === "car" && carMesh) activeObj = carMesh;
            else if (newModel === "villa" && villaMesh) activeObj = villaMesh;
            boundingBoxHelper.setFromObject(activeObj);

            if (resetCam && cameraControls && camera) {
                if (newModel === "gear") {
                    cameraControls.target.set(0, 6, 0);
                    camera.position.set(14, 10, 18);
                } else if (newModel === "villa") {
                    cameraControls.target.set(0, 1.5, 0);
                    camera.position.set(12, 9, 14);
                } else if (newModel === "car") {
                    cameraControls.target.set(0, 0.75, 0);
                    camera.position.set(6, 4, 7);
                } else {
                    cameraControls.target.set(0, 1, 0);
                    camera.position.set(4, 3.5, 5);
                }
                cameraControls.update();
            }
        };

        let buildActiveFolder = () => {};

        // Update Viewer based on Project Model (Cube, Gear, Car, Villa)
        const updateViewerForProject = (proj: any, resetCameraView: boolean = true) => {
            if (!proj || !camera || !cameraControls) { return; }

            if (gui) {
                gui.destroy();
            }
            gui = new GUI({
                container: viewerContainer,
                title: "Viewer Options",
                width: 280,
            });
            gui.domElement.setAttribute("lang", "en-US");
            gui.domElement.style.position = "absolute";
            gui.domElement.style.top = "1rem";
            gui.domElement.style.right = "1rem";
            gui.domElement.style.zIndex = "25";

            const nameLower = (proj.name || "").toLowerCase();
            let initialModel: ModelType = proj.modelType || "cube";
            if (!proj.modelType) {
                if (nameLower.includes("gear")) initialModel = "gear";
                else if (nameLower.includes("car") || nameLower.includes("auto") || nameLower.includes("vehic")) initialModel = "car";
                else if (nameLower.includes("villa") || nameLower.includes("house") || nameLower.includes("building") || nameLower.includes("home") || nameLower.includes("residence")) initialModel = "villa";
            }
            activeModelType = initialModel;
            switchActiveModel(activeModelType, resetCameraView);

            // Top-level Model Selector dropdown
            const modelSelectorObj = { model: activeModelType };
            gui.add(modelSelectorObj, "model", {
                "Architectural Slab (Cube)": "cube",
                "Mechanical Core (Gear)": "gear",
                "Civil Sedan (Car)": "car",
                "Residential Villa (Architecture)": "villa",
            }).name("Select 3D Model").onChange((val: ModelType) => {
                switchActiveModel(val, true);
                buildActiveFolder();
            });

            buildActiveFolder = () => {
                if (activeModelFolder) {
                    activeModelFolder.destroy();
                    activeModelFolder = null;
                }

                if (activeModelType === "gear") {
                    activeModelFolder = gui!.addFolder("Mechanical Gear Controls");
                    activeModelFolder.open();
                    if (gearMesh) {
                        const posXCtrl = activeModelFolder.add(gearMesh.position, "x", -20, 20, 0.5).name("Position X").onChange(() => boundingBoxHelper.update());
                        const posYCtrl = activeModelFolder.add(gearMesh.position, "y", 0, 25, 0.5).name("Position Y").onChange(() => boundingBoxHelper.update());
                        const posZCtrl = activeModelFolder.add(gearMesh.position, "z", -20, 20, 0.5).name("Position Z").onChange(() => boundingBoxHelper.update());
                        const rotYCtrl = activeModelFolder.add(gearMesh.rotation, "y", -Math.PI, Math.PI, 0.05).name("Rotate Y").listen();
                        const scaleCtrl = activeModelFolder.add(gearMesh.scale, "x", 0.2, 3, 0.1).name("Scale").onChange((s: number) => {
                            gearMesh!.scale.set(s, s, s);
                            boundingBoxHelper.update();
                        });
                        activeModelFolder.add(gearMesh, "visible").name("Visible");
                        activeModelFolder.addColor(gearPbrMaterial, "color").name("Gear Color").onChange((c: THREE.Color) => {
                            gearMesh?.traverse((child) => {
                                if ((child as THREE.Mesh).isMesh) {
                                    const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                                    if (mat && mat.color) { mat.color.copy(c); }
                                }
                            });
                        });
                        activeModelFolder.add(gearPbrMaterial, "wireframe").name("Wireframe").onChange((w: boolean) => {
                            gearMesh?.traverse((child) => {
                                if ((child as THREE.Mesh).isMesh) {
                                    const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                                    if (mat) { mat.wireframe = w; }
                                }
                            });
                        });
                        activeModelFolder.add(viewerState, "autoRotate").name("Auto-Rotate");
                        activeModelFolder.add({
                            resetGear: () => {
                                gearMesh!.position.copy(gearDefaultPos);
                                gearMesh!.rotation.set(0, 0, 0);
                                gearMesh!.scale.set(1, 1, 1);
                                gearMesh!.visible = true;
                                gearPbrMaterial.color.setHex(0x94a3b8);
                                gearPbrMaterial.wireframe = false;
                                viewerState.autoRotate = false;
                                posXCtrl.updateDisplay();
                                posYCtrl.updateDisplay();
                                posZCtrl.updateDisplay();
                                rotYCtrl.updateDisplay();
                                scaleCtrl.updateDisplay();
                                boundingBoxHelper.update();
                            },
                        }, "resetGear").name("Reset Model");
                    } else {
                        activeModelFolder.add({ status: "Loading Gear..." }, "status").name("Status");
                    }
                } else if (activeModelType === "car") {
                    activeModelFolder = gui!.addFolder("Civil Sedan Controls");
                    activeModelFolder.open();
                    if (carMesh) {
                        const posXCtrl = activeModelFolder.add(carMesh.position, "x", -15, 15, 0.2).name("Position X").onChange(() => boundingBoxHelper.update());
                        const posYCtrl = activeModelFolder.add(carMesh.position, "y", 0, 10, 0.1).name("Position Y").onChange(() => boundingBoxHelper.update());
                        const posZCtrl = activeModelFolder.add(carMesh.position, "z", -15, 15, 0.2).name("Position Z").onChange(() => boundingBoxHelper.update());
                        const rotYCtrl = activeModelFolder.add(carMesh.rotation, "y", -Math.PI, Math.PI, 0.05).name("Rotate Y").listen();
                        const scaleCtrl = activeModelFolder.add(carMesh.scale, "x", 0.5, 3, 0.1).name("Scale").onChange((s: number) => {
                            carMesh!.scale.set(s, s, s);
                            boundingBoxHelper.update();
                        });
                        activeModelFolder.add(carMesh, "visible").name("Visible");
                        activeModelFolder.add(viewerState, "autoRotate").name("Auto-Rotate");
                        activeModelFolder.add({
                            resetCar: () => {
                                carMesh!.position.copy(carDefaultPos);
                                carMesh!.rotation.set(-Math.PI / 2, 0, 0);
                                carMesh!.scale.set(1, 1, 1);
                                carMesh!.visible = true;
                                viewerState.autoRotate = false;
                                posXCtrl.updateDisplay();
                                posYCtrl.updateDisplay();
                                posZCtrl.updateDisplay();
                                rotYCtrl.updateDisplay();
                                scaleCtrl.updateDisplay();
                                boundingBoxHelper.update();
                            },
                        }, "resetCar").name("Reset Model");
                    } else {
                        activeModelFolder.add({ status: "Loading Car..." }, "status").name("Status");
                    }
                } else if (activeModelType === "villa") {
                    activeModelFolder = gui!.addFolder("Residential Villa Controls");
                    activeModelFolder.open();
                    if (villaMesh) {
                        const posXCtrl = activeModelFolder.add(villaMesh.position, "x", -20, 20, 0.5).name("Position X").onChange(() => boundingBoxHelper.update());
                        const posYCtrl = activeModelFolder.add(villaMesh.position, "y", 0, 10, 0.1).name("Position Y").onChange(() => boundingBoxHelper.update());
                        const posZCtrl = activeModelFolder.add(villaMesh.position, "z", -20, 20, 0.5).name("Position Z").onChange(() => boundingBoxHelper.update());
                        const rotYCtrl = activeModelFolder.add(villaMesh.rotation, "y", -Math.PI, Math.PI, 0.05).name("Rotate Y").listen();
                        const scaleCtrl = activeModelFolder.add(villaMesh.scale, "x", 0.5, 3, 0.1).name("Scale").onChange((s: number) => {
                            villaMesh!.scale.set(s, s, s);
                            boundingBoxHelper.update();
                        });
                        activeModelFolder.add(villaMesh, "visible").name("Visible");
                        activeModelFolder.add(viewerState, "autoRotate").name("Auto-Rotate");
                        activeModelFolder.add({
                            resetVilla: () => {
                                villaMesh!.position.copy(villaDefaultPos);
                                villaMesh!.rotation.set(-Math.PI / 2, 0, 0);
                                villaMesh!.scale.set(1, 1, 1);
                                villaMesh!.visible = true;
                                viewerState.autoRotate = false;
                                posXCtrl.updateDisplay();
                                posYCtrl.updateDisplay();
                                posZCtrl.updateDisplay();
                                rotYCtrl.updateDisplay();
                                scaleCtrl.updateDisplay();
                                boundingBoxHelper.update();
                            },
                        }, "resetVilla").name("Reset Model");
                    } else {
                        activeModelFolder.add({ status: "Loading Villa..." }, "status").name("Status");
                    }
                } else {
                    activeModelFolder = gui!.addFolder("Cube Model Controls");
                    activeModelFolder.open();
                    const posXCtrl = activeModelFolder.add(cube.position, "x", -10, 10, 0.1).name("Position X").onChange(() => boundingBoxHelper.update());
                    const posYCtrl = activeModelFolder.add(cube.position, "y", 0, 10, 0.1).name("Position Y").onChange(() => boundingBoxHelper.update());
                    const posZCtrl = activeModelFolder.add(cube.position, "z", -10, 10, 0.1).name("Position Z").onChange(() => boundingBoxHelper.update());
                    const rotYCtrl = activeModelFolder.add(cube.rotation, "y", -Math.PI, Math.PI, 0.05).name("Rotate Y").listen();
                    const scaleCtrl = activeModelFolder.add(cube.scale, "x", 0.5, 3, 0.1).name("Scale").onChange((s: number) => {
                        cube.scale.set(s, s, s);
                        boundingBoxHelper.update();
                    });
                    activeModelFolder.add(cube, "visible").name("Visible");
                    activeModelFolder.addColor(cubeMaterial, "color").name("Cube Color");
                    activeModelFolder.add(cubeMaterial, "wireframe").name("Wireframe");
                    activeModelFolder.add(viewerState, "autoRotate").name("Auto-Rotate");
                    activeModelFolder.add({
                        resetCube: () => {
                            cube.position.set(0, 1, 0);
                            cube.rotation.set(0, 0, 0);
                            cube.scale.set(1, 1, 1);
                            cube.visible = true;
                            cubeMaterial.color.setHex(0x38bdf8);
                            cubeMaterial.wireframe = false;
                            viewerState.autoRotate = false;
                            posXCtrl.updateDisplay();
                            posYCtrl.updateDisplay();
                            posZCtrl.updateDisplay();
                            rotYCtrl.updateDisplay();
                            scaleCtrl.updateDisplay();
                            boundingBoxHelper.update();
                        },
                    }, "resetCube").name("Reset Model");
                }
            };

            buildActiveFolder();

            const helpersFolder = gui.addFolder("CAD Grid & Helpers");
            helpersFolder.open();
            helpersFolder.add(grid, "visible").name("Ground Grid");
            helpersFolder.add(axes, "visible").name("Origin Axes");
            helpersFolder.add(viewerState, "showBoundingBox").name("Bounding Box").onChange((v: boolean) => {
                boundingBoxHelper.visible = v;
                boundingBoxHelper.update();
            });
            helpersFolder.add(directionalLightHelper, "visible").name("Light Ray Helper");

            const lightFolder = gui.addFolder("Studio Lighting");
            lightFolder.close();
            lightFolder.add(keyLight, "intensity", 0, 5, 0.1).name("Key Light");
            lightFolder.addColor(keyLight, "color").name("Key Color");
            lightFolder.add(keyLight.position, "x", -30, 30, 1).name("Light X").onChange(() => directionalLightHelper.update());
            lightFolder.add(keyLight.position, "y", 0, 40, 1).name("Light Y").onChange(() => directionalLightHelper.update());
            lightFolder.add(keyLight.position, "z", -30, 30, 1).name("Light Z").onChange(() => directionalLightHelper.update());
            lightFolder.add(ambientLight, "intensity", 0, 2, 0.05).name("Ambient Light");

            const cameraFolder = gui.addFolder("Camera View");
            cameraFolder.close();
            cameraFolder.add({
                isoView: () => {
                    if (activeModelType === "gear") {
                        cameraControls?.target.set(0, 6, 0);
                        camera?.position.set(14, 10, 18);
                    } else if (activeModelType === "villa") {
                        cameraControls?.target.set(0, 1.5, 0);
                        camera?.position.set(12, 9, 14);
                    } else if (activeModelType === "car") {
                        cameraControls?.target.set(0, 0.75, 0);
                        camera?.position.set(6, 4, 7);
                    } else {
                        cameraControls?.target.set(0, 1, 0);
                        camera?.position.set(4, 3.5, 5);
                    }
                    cameraControls?.update();
                },
            }, "isoView").name("Isometric View");
            cameraFolder.add({
                topView: () => {
                    if (activeModelType === "gear") {
                        cameraControls?.target.set(0, 6, 0);
                        camera?.position.set(0, 26, 0.01);
                    } else if (activeModelType === "villa") {
                        cameraControls?.target.set(0, 1.5, 0);
                        camera?.position.set(0, 20, 0.01);
                    } else if (activeModelType === "car") {
                        cameraControls?.target.set(0, 0.75, 0);
                        camera?.position.set(0, 12, 0.01);
                    } else {
                        cameraControls?.target.set(0, 1, 0);
                        camera?.position.set(0, 10, 0.01);
                    }
                    cameraControls?.update();
                },
            }, "topView").name("Top Plan View");
            cameraFolder.add({
                frontView: () => {
                    if (activeModelType === "gear") {
                        cameraControls?.target.set(0, 6, 0);
                        camera?.position.set(0, 6, 22);
                    } else if (activeModelType === "villa") {
                        cameraControls?.target.set(0, 1.5, 0);
                        camera?.position.set(0, 3, 16);
                    } else if (activeModelType === "car") {
                        cameraControls?.target.set(0, 0.75, 0);
                        camera?.position.set(0, 1.5, 9);
                    } else {
                        cameraControls?.target.set(0, 1, 0);
                        camera?.position.set(0, 1, 7);
                    }
                    cameraControls?.update();
                },
            }, "frontView").name("Front Elevation");
            cameraFolder.add({
                resetCamera: () => {
                    if (activeModelType === "gear") {
                        cameraControls?.target.set(0, 6, 0);
                        camera?.position.set(14, 10, 18);
                    } else if (activeModelType === "villa") {
                        cameraControls?.target.set(0, 1.5, 0);
                        camera?.position.set(12, 9, 14);
                    } else if (activeModelType === "car") {
                        cameraControls?.target.set(0, 0.75, 0);
                        camera?.position.set(6, 4, 7);
                    } else {
                        cameraControls?.target.set(0, 1, 0);
                        camera?.position.set(4, 3.5, 5);
                    }
                    cameraControls?.update();
                },
            }, "resetCamera").name("Reset View");

            gui.open();
            gui.domElement.querySelectorAll("input[type='number']").forEach((inp) => {
                inp.setAttribute("type", "text");
                inp.setAttribute("inputmode", "decimal");
                inp.setAttribute("lang", "en-US");
            });
        };

        if (projectsManager) {
            projectsManager.onProjectSelected = (selectedProj) => {
                resizeViewer();
                updateViewerForProject(selectedProj);
            };
        }

        updateViewerForProject(project);

        let isDisposed = false;

        // 1. Mechanical Gear Loader
        const objLoader = new OBJLoader();
        const mtlLoader = new MTLLoader();
        objLoader.setPath("/Gear/");
        mtlLoader.setPath("/Gear/");
        objLoader.load(
            "Gear1.obj",
            (mesh) => {
                if (isDisposed || !scene) { return; }
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
                mesh.position.sub(center);
                const halfHeight = (box.max.y - box.min.y) / 2;
                mesh.position.set(
                    Math.round(mesh.position.x * 100) / 100,
                    Math.round((mesh.position.y + halfHeight) * 100) / 100,
                    Math.round(mesh.position.z * 100) / 100
                );
                gearDefaultPos.copy(mesh.position);
                scene.add(mesh);
                gearMesh.visible = (activeModelType === "gear");

                if (activeModelType === "gear") {
                    boundingBoxHelper.setFromObject(gearMesh);
                    buildActiveFolder();
                }

                mtlLoader.load(
                    "Gear1.mtl",
                    (materials) => {
                        materials.preload();
                        objLoader.setMaterials(materials);
                    },
                    undefined,
                    (err) => console.warn("MTL load notice:", err)
                );
            },
            undefined,
            (err) => console.error("OBJ load error:", err)
        );

        // 2. Civil Sedan Car Loader (MTL first for true colors, Z-up rotated to Three.js Y-up)
        const carMtlLoader = new MTLLoader();
        carMtlLoader.setPath("/models/car/");
        carMtlLoader.load(
            "car.mtl",
            (materials) => {
                materials.preload();
                const carObjLoader = new OBJLoader();
                carObjLoader.setMaterials(materials);
                carObjLoader.setPath("/models/car/");
                carObjLoader.load(
                    "car.obj",
                    (mesh) => {
                        if (isDisposed || !scene) return;
                        mesh.rotation.x = -Math.PI / 2;
                        mesh.updateMatrixWorld(true);

                        const box = new THREE.Box3().setFromObject(mesh);
                        const center = box.getCenter(new THREE.Vector3());
                        mesh.position.x = -center.x;
                        mesh.position.z = -center.z;
                        mesh.position.y = -box.min.y;
                        carDefaultPos.copy(mesh.position);

                        mesh.traverse((child) => {
                            if ((child as THREE.Mesh).isMesh) {
                                (child as THREE.Mesh).castShadow = true;
                                (child as THREE.Mesh).receiveShadow = true;
                            }
                        });

                        carMesh = mesh;
                        scene.add(carMesh);
                        carMesh.visible = (activeModelType === "car");

                        if (activeModelType === "car") {
                            boundingBoxHelper.setFromObject(carMesh);
                            buildActiveFolder();
                        }
                    },
                    undefined,
                    (err) => console.error("Car OBJ load error:", err)
                );
            },
            undefined,
            (err) => console.warn("Car MTL notice:", err)
        );

        // 3. Residential Villa Architecture Loader (MTL first for true colors, Z-up rotated to Three.js Y-up)
        const villaMtlLoader = new MTLLoader();
        villaMtlLoader.setPath("/models/villa/");
        villaMtlLoader.load(
            "villa.mtl",
            (materials) => {
                materials.preload();
                const villaObjLoader = new OBJLoader();
                villaObjLoader.setMaterials(materials);
                villaObjLoader.setPath("/models/villa/");
                villaObjLoader.load(
                    "villa.obj",
                    (mesh) => {
                        if (isDisposed || !scene) return;
                        mesh.rotation.x = -Math.PI / 2;
                        mesh.updateMatrixWorld(true);

                        const box = new THREE.Box3().setFromObject(mesh);
                        const center = box.getCenter(new THREE.Vector3());
                        mesh.position.x = -center.x;
                        mesh.position.z = -center.z;
                        mesh.position.y = -box.min.y;
                        villaDefaultPos.copy(mesh.position);

                        mesh.traverse((child) => {
                            if ((child as THREE.Mesh).isMesh) {
                                (child as THREE.Mesh).castShadow = true;
                                (child as THREE.Mesh).receiveShadow = true;
                            }
                        });

                        villaMesh = mesh;
                        scene.add(villaMesh);
                        villaMesh.visible = (activeModelType === "villa");

                        if (activeModelType === "villa") {
                            boundingBoxHelper.setFromObject(villaMesh);
                            buildActiveFolder();
                        }
                    },
                    undefined,
                    (err) => console.error("Villa OBJ load error:", err)
                );
            },
            undefined,
            (err) => console.warn("Villa MTL notice:", err)
        );

        let animFrameId: number;
        const renderScene = () => {
            if (isDisposed || !renderer || !scene || !camera || !cameraControls) { return; }
            if (viewerState.autoRotate) {
                if (activeModelType === "cube" && cube.visible) {
                    cube.rotation.y += 0.01;
                    if (cube.rotation.y > Math.PI) { cube.rotation.y = -Math.PI; }
                } else if (activeModelType === "gear" && gearMesh && gearMesh.visible) {
                    gearMesh.rotation.y += 0.01;
                    if (gearMesh.rotation.y > Math.PI) { gearMesh.rotation.y = -Math.PI; }
                } else if (activeModelType === "car" && carMesh && carMesh.visible) {
                    carMesh.rotation.y += 0.01;
                    if (carMesh.rotation.y > Math.PI) { carMesh.rotation.y = -Math.PI; }
                } else if (activeModelType === "villa" && villaMesh && villaMesh.visible) {
                    villaMesh.rotation.y += 0.01;
                    if (villaMesh.rotation.y > Math.PI) { villaMesh.rotation.y = -Math.PI; }
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

        // --- Lesson 3.13: 3-Step Disposal Protocol on Component Unmount ---
        return () => {
            isDisposed = true;
            cancelAnimationFrame(animFrameId);
            window.removeEventListener("resize", resizeViewer);
            viewerResizeObserver.disconnect();

            // Step 1: Remove all meshes and objects from the scene
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

            // Step 2: Dispose GPU buffers, materials, renderer & GUI
            if (gui) {
                gui.destroy();
            }
            cameraControls?.dispose();
            boxGeometry.dispose();
            cubeMaterial.dispose();
            edges.dispose();
            lineMaterial.dispose();
            gearPbrMaterial.dispose();
            gridMaterial.dispose();
            boundingBoxHelper.dispose();

            if (renderer) {
                renderer.dispose();
                if (renderer.domElement.parentElement === viewerContainer) {
                    viewerContainer.removeChild(renderer.domElement);
                }
            }

            // Step 3: Nullify references for JavaScript Garbage Collection
            scene = null;
            camera = null;
            renderer = null;
            cameraControls = null;
            gui = null;
            gearMesh = null;
            carMesh = null;
            villaMesh = null;
        };
    }, [project.id]);

    return (
        <div
            id="viewer-container"
            className="viewer-container"
            ref={viewerContainerRef}
            style={{ minWidth: 0, position: "relative", width: "100%", height: "100%" }}
        />
    );
}

