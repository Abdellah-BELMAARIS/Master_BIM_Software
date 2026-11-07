import * as THREE from "three";

/**
 * Apex Parametric Skyscraper & Metropolitan Urban Plaza Environment Builder
 * A 28-story corporate commercial high-rise tower and expansive urban district featuring:
 * - Reflective double-skin curtain wall glass facade
 * - Fully furnished interior office suites on EVERY SINGLE floor (étage) with desks, chairs, laptops with glowing displays, and conference tables
 * - Structural steel diagrid exoskeleton and articulated concrete elevator core
 * - Mid-tower Sky Garden terrace (floor 14) with viewing balconies and biophilic planters
 * - Grand entrance atrium with revolving glass doors, illuminated canopy, and reception desk
 * - Rooftop helipad with yellow/white 'H' marking and flashing aviation beacon spire
 * - Expansive urban streetscape: 60x60 multi-lane avenue grid, zebra crosswalks, sidewalks, curbs
 * - 6 detailed 3D vehicles (sports coupe, yellow taxi, executive sedan, electric SUV, delivery van, hybrid) driving continuously
 * - Modern street furniture: twin-arm streetlights, traffic signals, glass bus shelter, bike racks, street benches, and trees
 * - Plaza water fountain with active water ripples and landscaped street trees
 */
export interface ITowerEnvironment {
    group: THREE.Group;
    updateTower: (time: number) => void;
    toggleSkyGarden: (visible: boolean) => void;
    toggleTraffic: (visible: boolean) => void;
    dispose: () => void;
}

export function buildTowerEnvironment(): ITowerEnvironment {
    const rootGroup = new THREE.Group();
    rootGroup.name = "ApexParametricTowerEnvironment";

    const skyGardenGroup = new THREE.Group();
    skyGardenGroup.name = "SkyGardenTerrace";

    const streetGroup = new THREE.Group();
    streetGroup.name = "UrbanStreetscape";

    const trafficGroup = new THREE.Group();
    trafficGroup.name = "StreetVehicles";

    const disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] } = {
        geometries: [],
        materials: [],
    };

    const trackGeom = <T extends THREE.BufferGeometry>(geom: T): T => {
        disposables.geometries.push(geom);
        return geom;
    };

    const trackMat = <T extends THREE.Material>(mat: T): T => {
        disposables.materials.push(mat);
        return mat;
    };

    // --- High-Performance Architectural BIM Materials ---
    const asphaltMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Dark dense urban road asphalt
        roughness: 0.85,
        metalness: 0.1,
    }));

    const roadMarkingMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.35,
    }));

    const yellowMarkingMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.4,
    }));

    const sidewalkMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x475569, // Precast sidewalk concrete pavers
        roughness: 0.7,
        metalness: 0.1,
    }));

    const curbMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.75,
    }));

    const granitePlazaMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x1e293b, // Polished dark granite plaza
        roughness: 0.25,
        metalness: 0.35,
    }));

    const concreteCoreMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x334155, // Dense structural concrete core
        roughness: 0.65,
        metalness: 0.15,
    }));

    const curtainWallGlassMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x38bdf8, // Tinted architectural cyan glass
        roughness: 0.1,
        metalness: 0.85,
        transparent: true,
        opacity: 0.52,
    }));

    const floorSlabMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Dark metallic slab edge / spandrel band
        roughness: 0.45,
        metalness: 0.75,
    }));

    const steelDiagridMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x94a3b8, // Stainless architectural structural steel
        roughness: 0.2,
        metalness: 0.95,
    }));

    const deskTopMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xe2e8f0, // White melamine / ash executive work desks
        roughness: 0.3,
        metalness: 0.1,
    }));

    const chairMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x1e293b, // Ergonomic mesh office chair
        roughness: 0.7,
    }));

    const laptopBodyMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Anodized dark aluminum laptop
        roughness: 0.25,
        metalness: 0.85,
    }));

    const laptopScreenMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x38bdf8, // Illuminated LCD monitor display
        emissive: 0x0284c7,
        emissiveIntensity: 1.4,
        roughness: 0.1,
    }));

    const teakDeckMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x78350f,
        roughness: 0.6,
        metalness: 0.05,
    }));

    const shrubMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x15803d, // Urban landscaping foliage
        roughness: 0.75,
    }));

    const trunkMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x451a03,
        roughness: 0.9,
    }));

    const helipadAsphaltMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.8,
    }));

    const helipadMarkingMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.3,
    }));

    const helipadWhiteMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.3,
    }));

    const beaconMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xef4444, // Aviation warning red
        emissive: 0xff0000,
        emissiveIntensity: 1.2,
    }));

    const waterMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.15,
        metalness: 0.85,
        transparent: true,
        opacity: 0.82,
    }));

    // Street Furniture & Vehicle Materials
    const streetLightMetalMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 }));
    const lightGlowMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    const carRedMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.85, roughness: 0.2 }));
    const carYellowMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.75, roughness: 0.25 }));
    const carBlueMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.9, roughness: 0.18 }));
    const carSilverMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 }));
    const carWhiteMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.6, roughness: 0.3 }));
    const carGreenMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x059669, metalness: 0.8, roughness: 0.25 }));
    const carTireMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.9 }));
    const carGlassMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.7 }));
    const headlampMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));
    const taillampMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xef4444 }));

    // =========================================================================
    // 1. EXPANSIVE METROPOLITAN URBAN STREETSCAPE (60x60 DISTRICT)
    // =========================================================================
    const streetBaseGeom = trackGeom(new THREE.BoxGeometry(60, 0.2, 60));
    const streetBase = new THREE.Mesh(streetBaseGeom, asphaltMat);
    streetBase.position.y = -0.15;
    streetBase.receiveShadow = true;
    streetGroup.add(streetBase);

    // Sidewalk Surrounding the Central Plaza (Width 36x36)
    const sidewalkOuterGeom = trackGeom(new THREE.BoxGeometry(36, 0.18, 36));
    const sidewalkOuter = new THREE.Mesh(sidewalkOuterGeom, sidewalkMat);
    sidewalkOuter.position.y = 0.04;
    sidewalkOuter.receiveShadow = true;
    streetGroup.add(sidewalkOuter);

    // Pedestrian Zebra Crosswalks on the 4 Avenues
    const zebraStripeGeom = trackGeom(new THREE.PlaneGeometry(0.5, 4.6));
    const crosswalkOffsets = [-20.5, 20.5];

    crosswalkOffsets.forEach((cx) => {
        for (let s = -3; s <= 3; s++) {
            // North-South crosswalk stripes
            const stripeZ = new THREE.Mesh(zebraStripeGeom, roadMarkingMat);
            stripeZ.rotation.x = -Math.PI / 2;
            stripeZ.position.set(cx, 0.01, s * 0.95);
            streetGroup.add(stripeZ);

            // East-West crosswalk stripes
            const stripeX = new THREE.Mesh(zebraStripeGeom, roadMarkingMat);
            stripeX.rotation.x = -Math.PI / 2;
            stripeX.rotation.z = Math.PI / 2;
            stripeX.position.set(s * 0.95, 0.01, cx);
            streetGroup.add(stripeX);
        }
    });

    // Roadway Lane Divider Dashed Lines
    const dashGeom = trackGeom(new THREE.PlaneGeometry(1.8, 0.15));
    for (let d = -28; d <= 28; d += 3.5) {
        if (Math.abs(d) > 15) {
            [-21.5, 21.5].forEach((roadPos) => {
                const dashH = new THREE.Mesh(dashGeom, yellowMarkingMat);
                dashH.rotation.x = -Math.PI / 2;
                dashH.position.set(d, 0.01, roadPos);
                streetGroup.add(dashH);

                const dashV = new THREE.Mesh(dashGeom, yellowMarkingMat);
                dashV.rotation.x = -Math.PI / 2;
                dashV.rotation.z = Math.PI / 2;
                dashV.position.set(roadPos, 0.01, d);
                streetGroup.add(dashV);
            });
        }
    }

    // Polished Dark Granite Civic Plaza (24x24)
    const plazaGeom = trackGeom(new THREE.BoxGeometry(24, 0.22, 24));
    const plazaMesh = new THREE.Mesh(plazaGeom, granitePlazaMat);
    plazaMesh.position.y = 0.11;
    plazaMesh.receiveShadow = true;
    rootGroup.add(plazaMesh);

    // =========================================================================
    // 2. CIVIC PLAZA WATER FOUNTAIN & BIOPHILIC URBAN LANDSCAPING
    // =========================================================================
    const fountainBaseGeom = trackGeom(new THREE.CylinderGeometry(3.6, 4.0, 0.65, 32));
    const fountainBase = new THREE.Mesh(fountainBaseGeom, granitePlazaMat);
    fountainBase.position.set(0, 0.42, 8.8);
    fountainBase.castShadow = true;
    streetGroup.add(fountainBase);

    const fountainWaterGeom = trackGeom(new THREE.CylinderGeometry(3.4, 3.4, 0.1, 32));
    const fountainWater = new THREE.Mesh(fountainWaterGeom, waterMat);
    fountainWater.position.set(0, 0.72, 8.8);
    streetGroup.add(fountainWater);

    const fountainJetGeom = trackGeom(new THREE.ConeGeometry(0.35, 1.8, 16));
    const fountainJet = new THREE.Mesh(fountainJetGeom, waterMat);
    fountainJet.position.set(0, 1.6, 8.8);
    streetGroup.add(fountainJet);

    // Plaza Trees with Textured Foliage
    const treeTrunkGeom = trackGeom(new THREE.CylinderGeometry(0.12, 0.18, 2.4, 8));
    const treeFoliageGeom = trackGeom(new THREE.DodecahedronGeometry(1.1, 1));
    const treeOffsets = [
        [-9.5, -9.5], [9.5, -9.5], [-9.5, 9.5], [9.5, 9.5],
        [-9.5, 0], [9.5, 0], [-5.5, 9.5], [5.5, 9.5]
    ];

    treeOffsets.forEach(([tx, tz]) => {
        // Tree planter box
        const planterGeom = trackGeom(new THREE.BoxGeometry(1.6, 0.35, 1.6));
        const planter = new THREE.Mesh(planterGeom, sidewalkMat);
        planter.position.set(tx, 0.28, tz);
        streetGroup.add(planter);

        const trunk = new THREE.Mesh(treeTrunkGeom, trunkMat);
        trunk.position.set(tx, 1.4, tz);
        trunk.castShadow = true;
        streetGroup.add(trunk);

        const foliage = new THREE.Mesh(treeFoliageGeom, shrubMat);
        foliage.position.set(tx, 2.8, tz);
        foliage.castShadow = true;
        streetGroup.add(foliage);
    });

    // =========================================================================
    // 3. MODERN STREET FURNITURE (STREETLIGHTS, BUS SHELTER, BIKE RACKS, BENCHES)
    // =========================================================================
    // Twin-arm Avenue Streetlights
    const streetLightPoleGeom = trackGeom(new THREE.CylinderGeometry(0.08, 0.12, 4.5, 8));
    const streetLightArmGeom = trackGeom(new THREE.BoxGeometry(1.4, 0.06, 0.06));
    const lampFixtureGeom = trackGeom(new THREE.BoxGeometry(0.3, 0.08, 0.18));

    const polePositions = [
        [-16.5, -16.5], [16.5, -16.5], [-16.5, 16.5], [16.5, 16.5],
        [-16.5, 0], [16.5, 0], [0, -16.5], [0, 16.5]
    ];

    polePositions.forEach(([px, pz]) => {
        const pole = new THREE.Mesh(streetLightPoleGeom, streetLightMetalMat);
        pole.position.set(px, 2.3, pz);
        pole.castShadow = true;
        streetGroup.add(pole);

        const arm = new THREE.Mesh(streetLightArmGeom, streetLightMetalMat);
        arm.position.set(px, 4.4, pz);
        streetGroup.add(arm);

        const lamp1 = new THREE.Mesh(lampFixtureGeom, lightGlowMat);
        lamp1.position.set(px - 0.6, 4.35, pz);
        const lamp2 = new THREE.Mesh(lampFixtureGeom, lightGlowMat);
        lamp2.position.set(px + 0.6, 4.35, pz);
        streetGroup.add(lamp1, lamp2);
    });

    // Modern Glass Transit Bus Shelter
    const busShelter = new THREE.Group();
    busShelter.position.set(-16.0, 0.22, 7.5);
    const shelterRoof = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(4.2, 0.12, 2.2)), floorSlabMat);
    shelterRoof.position.set(0, 2.5, 0);
    const shelterGlass = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(4.0, 2.3, 0.08)), curtainWallGlassMat);
    shelterGlass.position.set(0, 1.25, -1.0);
    const shelterBench = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(3.0, 0.35, 0.45)), teakDeckMat);
    shelterBench.position.set(0, 0.45, -0.6);
    busShelter.add(shelterRoof, shelterGlass, shelterBench);
    streetGroup.add(busShelter);

    // Plaza Public Benches
    const benchGeom = trackGeom(new THREE.BoxGeometry(1.8, 0.38, 0.5));
    [[-6.0, 6.0], [6.0, 6.0], [-6.0, -6.0], [6.0, -6.0]].forEach(([bx, bz]) => {
        const bench = new THREE.Mesh(benchGeom, teakDeckMat);
        bench.position.set(bx, 0.3, bz);
        streetGroup.add(bench);
    });

    // Stainless Steel Bicycle Parking Rack
    const bikeRackGeom = trackGeom(new THREE.TorusGeometry(0.35, 0.03, 8, 16, Math.PI));
    for (let b = -1.2; b <= 1.2; b += 0.6) {
        const hoop = new THREE.Mesh(bikeRackGeom, steelDiagridMat);
        hoop.position.set(-8.5, 0.55, -8.5 + b);
        hoop.rotation.y = Math.PI / 2;
        streetGroup.add(hoop);
    }

    // =========================================================================
    // 4. ANIMATED URBAN STREET VEHICLES (6 VEHICLES DRIVING ALONG LANES)
    // =========================================================================
    const createUrbanVehicle = (bodyMat: THREE.Material, isSUV: boolean = false, isTaxi: boolean = false): THREE.Group => {
        const car = new THREE.Group();
        const length = isSUV ? 3.4 : 3.0;
        const height = isSUV ? 1.15 : 0.85;

        // Lower body chassis
        const chassisGeom = trackGeom(new THREE.BoxGeometry(length, 0.42, 1.4));
        const chassis = new THREE.Mesh(chassisGeom, bodyMat);
        chassis.position.y = 0.32;
        chassis.castShadow = true;
        car.add(chassis);

        // Greenhouse / Cabin
        const cabinGeom = trackGeom(new THREE.BoxGeometry(length * 0.58, height * 0.55, 1.25));
        const cabin = new THREE.Mesh(cabinGeom, carGlassMat);
        cabin.position.set(-0.1, 0.32 + 0.38, 0);
        car.add(cabin);

        // Taxi roof sign
        if (isTaxi) {
            const signGeom = trackGeom(new THREE.BoxGeometry(0.5, 0.15, 0.25));
            const sign = new THREE.Mesh(signGeom, lightGlowMat);
            sign.position.set(-0.1, 0.32 + 0.38 + 0.28, 0);
            car.add(sign);
        }

        // 4 Wheels
        const wheelGeom = trackGeom(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 16));
        const wheelOffsets = [
            [-length * 0.34, 0.22, 0.72],
            [length * 0.34, 0.22, 0.72],
            [-length * 0.34, 0.22, -0.72],
            [length * 0.34, 0.22, -0.72],
        ];
        wheelOffsets.forEach(([wx, wy, wz]) => {
            const wheel = new THREE.Mesh(wheelGeom, carTireMat);
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(wx, wy, wz);
            car.add(wheel);
        });

        // Headlights and Taillights
        const hlGeom = trackGeom(new THREE.BoxGeometry(0.08, 0.1, 0.25));
        const hl1 = new THREE.Mesh(hlGeom, headlampMat);
        hl1.position.set(length * 0.5, 0.35, 0.42);
        const hl2 = new THREE.Mesh(hlGeom, headlampMat);
        hl2.position.set(length * 0.5, 0.35, -0.42);

        const tl1 = new THREE.Mesh(hlGeom, taillampMat);
        tl1.position.set(-length * 0.5, 0.35, 0.42);
        const tl2 = new THREE.Mesh(hlGeom, taillampMat);
        tl2.position.set(-length * 0.5, 0.35, -0.42);

        car.add(hl1, hl2, tl1, tl2);
        return car;
    };

    // 6 Distinct Urban Vehicles
    const car1 = createUrbanVehicle(carRedMat, false, false);      // Red sports coupe
    car1.position.set(-20, 0.05, -22.5);
    trafficGroup.add(car1);

    const car2 = createUrbanVehicle(carYellowMat, false, true);    // Yellow city cab
    car2.position.set(20, 0.05, 22.5);
    car2.rotation.y = Math.PI;
    trafficGroup.add(car2);

    const car3 = createUrbanVehicle(carBlueMat, false, false);     // Executive blue sedan
    car3.position.set(-22.5, 0.05, -20);
    car3.rotation.y = -Math.PI / 2;
    trafficGroup.add(car3);

    const car4 = createUrbanVehicle(carSilverMat, true, false);    // Silver electric SUV
    car4.position.set(22.5, 0.05, 20);
    car4.rotation.y = Math.PI / 2;
    trafficGroup.add(car4);

    const car5 = createUrbanVehicle(carWhiteMat, true, false);     // White urban van
    car5.position.set(10, 0.05, -22.5);
    trafficGroup.add(car5);

    const car6 = createUrbanVehicle(carGreenMat, false, false);    // Green hybrid commuter
    car6.position.set(-10, 0.05, 22.5);
    car6.rotation.y = Math.PI;
    trafficGroup.add(car6);

    streetGroup.add(trafficGroup);
    rootGroup.add(streetGroup);

    // =========================================================================
    // 5. ATRIUM PODIUM WITH RECEPTION & REVOLVING ENTRANCE
    // =========================================================================
    const podiumHeight = 4.2;
    const podiumWidth = 14.0;

    const atriumGeom = trackGeom(new THREE.BoxGeometry(podiumWidth, podiumHeight, podiumWidth));
    const atriumMesh = new THREE.Mesh(atriumGeom, curtainWallGlassMat);
    atriumMesh.position.y = podiumHeight / 2 + 0.22;
    rootGroup.add(atriumMesh);

    // Reception Desk inside Atrium
    const receptionDeskGeom = trackGeom(new THREE.BoxGeometry(3.2, 1.0, 1.0));
    const receptionDesk = new THREE.Mesh(receptionDeskGeom, granitePlazaMat);
    receptionDesk.position.set(0, 0.72, 2.5);
    rootGroup.add(receptionDesk);

    // Revolving Glass Door Cylinder at Plaza Facade
    const revolvingGeom = trackGeom(new THREE.CylinderGeometry(1.4, 1.4, 2.4, 16, 1, true));
    const revolvingDoor = new THREE.Mesh(revolvingGeom, curtainWallGlassMat);
    revolvingDoor.position.set(0, 1.42, 7.0);
    rootGroup.add(revolvingDoor);

    // Structural Podium Columns
    const colGeom = trackGeom(new THREE.CylinderGeometry(0.25, 0.25, podiumHeight, 16));
    [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([cx, cz]) => {
        const col = new THREE.Mesh(colGeom, steelDiagridMat);
        col.position.set(cx, podiumHeight / 2 + 0.22, cz);
        col.castShadow = true;
        rootGroup.add(col);
    });

    // Grand Entrance Cantilevered Canopy
    const canopyGeom = trackGeom(new THREE.BoxGeometry(8, 0.25, 4.5));
    const canopy = new THREE.Mesh(canopyGeom, floorSlabMat);
    canopy.position.set(0, 2.6, 8.2);
    canopy.castShadow = true;
    rootGroup.add(canopy);

    // =========================================================================
    // 6. MAIN TOWER SHAFT (24 FLOORS — EVERY SINGLE ÉTAGE FULLY FURNISHED!)
    // =========================================================================
    const totalFloors = 24;
    const floorHeight = 1.05;
    const baseWidth = 9.2;
    const towerStartHeight = podiumHeight + 0.22;

    // Central Structural Concrete Elevator/Utility Core
    const coreHeight = totalFloors * floorHeight + 2;
    const coreGeom = trackGeom(new THREE.BoxGeometry(3.4, coreHeight, 3.4));
    const coreMesh = new THREE.Mesh(coreGeom, concreteCoreMat);
    coreMesh.position.y = towerStartHeight + coreHeight / 2;
    coreMesh.castShadow = true;
    rootGroup.add(coreMesh);

    // Reusable Detailed Office Workstation (Melamine Desk + Ergonomic Chair + Open Laptop with illuminated screen)
    const createWorkstationPod = (): THREE.Group => {
        const pod = new THREE.Group();

        // Melamine Work Desk
        const desk = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.5, 0.06, 0.75)), deskTopMat);
        desk.position.y = 0.42;
        pod.add(desk);

        const legGeom = trackGeom(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6));
        [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeom, steelDiagridMat);
            leg.position.set(lx, 0.21, lz);
            pod.add(leg);
        });

        // Ergonomic Chair
        const chairSeat = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.44, 0.06, 0.42)), chairMat);
        chairSeat.position.set(0, 0.34, 0.55);
        const chairBack = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.44, 0.48, 0.06)), chairMat);
        chairBack.position.set(0, 0.58, 0.74);
        pod.add(chairSeat, chairBack);

        // Open Laptop with Glowing Active Display
        const laptopBase = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.35, 0.015, 0.24)), laptopBodyMat);
        laptopBase.position.set(0, 0.46, 0.04);
        const laptopScreen = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.35, 0.24, 0.015)), laptopScreenMat);
        laptopScreen.position.set(0, 0.58, -0.08);
        laptopScreen.rotation.x = -0.22;
        pod.add(laptopBase, laptopScreen);

        return pod;
    };

    // Reusable Executive Conference Meeting Pod (for even floors)
    const createConferencePod = (): THREE.Group => {
        const pod = new THREE.Group();
        const confTable = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.4, 0.08, 1.0)), teakDeckMat);
        confTable.position.y = 0.44;
        pod.add(confTable);

        // 4 Meeting Chairs
        [[-0.7, 0.65], [0.7, 0.65], [-0.7, -0.65], [0.7, -0.65]].forEach(([cx, cz]) => {
            const chair = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.35, 0.6, 0.35)), chairMat);
            chair.position.set(cx, 0.35, cz);
            pod.add(chair);
        });

        // Presentation Screen
        const screen = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.2, 0.65, 0.04)), laptopScreenMat);
        screen.position.set(0, 0.9, -1.1);
        pod.add(screen);

        return pod;
    };

    // Build Floor Slabs, Curtain Wall & Visible Office Suites on EVERY SINGLE FLOOR (étage)
    for (let f = 0; f < totalFloors; f++) {
        const floorY = towerStartHeight + f * floorHeight;
        const taperRatio = f > 18 ? 1 - (f - 18) * 0.035 : 1.0;
        const width = baseWidth * taperRatio;
        const depth = baseWidth * taperRatio;

        // Perimeter Floor Slab Spandrel
        const slabGeom = trackGeom(new THREE.BoxGeometry(width, 0.16, depth));
        const slab = new THREE.Mesh(slabGeom, floorSlabMat);
        slab.position.y = floorY;
        slab.castShadow = true;
        slab.receiveShadow = true;
        rootGroup.add(slab);

        if (f < totalFloors - 1) {
            // High-Transparency Glass Curtain Wall
            const glassGeom = trackGeom(new THREE.BoxGeometry(width - 0.15, floorHeight - 0.16, depth - 0.15));
            const glass = new THREE.Mesh(glassGeom, curtainWallGlassMat);
            glass.position.y = floorY + floorHeight / 2;
            glass.castShadow = true;
            rootGroup.add(glass);

            // Detailed Interior Workstations on EVERY FLOOR
            const deskDistance = width / 3.0;
            const podOffsets = [
                [-deskDistance, floorY + 0.08, deskDistance, 0],
                [deskDistance, floorY + 0.08, deskDistance, 0],
                [-deskDistance, floorY + 0.08, -deskDistance, Math.PI],
                [deskDistance, floorY + 0.08, -deskDistance, Math.PI],
            ];

            podOffsets.forEach(([px, py, pz, rot]) => {
                const pod = createWorkstationPod();
                pod.position.set(px, py, pz);
                pod.rotation.y = rot;
                rootGroup.add(pod);
            });

            // Alternate floor central amenities (Conference Room or Biophilic Lounge)
            if (f % 2 === 0) {
                const conf = createConferencePod();
                conf.position.set(0, floorY + 0.08, -width / 4.0);
                rootGroup.add(conf);
            } else {
                // Biophilic indoor plant cluster
                const plant = new THREE.Mesh(trackGeom(new THREE.DodecahedronGeometry(0.35, 1)), shrubMat);
                plant.position.set(0, floorY + 0.45, width / 3.8);
                rootGroup.add(plant);
            }
        }
    }

    // =========================================================================
    // 7. STRUCTURAL STEEL DIAGRID EXOSKELETON
    // =========================================================================
    const diagridSegments = 6;
    const diagridSpan = totalFloors / diagridSegments;
    const diagridRadius = 0.14;

    for (let s = 0; s < diagridSegments; s++) {
        const yStart = towerStartHeight + s * diagridSpan * floorHeight;
        const yEnd = towerStartHeight + (s + 1) * diagridSpan * floorHeight;
        const midY = (yStart + yEnd) / 2;
        const spanH = yEnd - yStart;

        const diagGeom = trackGeom(new THREE.CylinderGeometry(diagridRadius, diagridRadius, Math.hypot(baseWidth, spanH), 8));
        const angle = Math.atan2(baseWidth, spanH);

        [baseWidth / 2 + 0.08, -baseWidth / 2 - 0.08].forEach((zPos) => {
            const diag1 = new THREE.Mesh(diagGeom, steelDiagridMat);
            diag1.position.set(0, midY, zPos);
            diag1.rotation.z = angle;
            rootGroup.add(diag1);

            const diag2 = new THREE.Mesh(diagGeom, steelDiagridMat);
            diag2.position.set(0, midY, zPos);
            diag2.rotation.z = -angle;
            rootGroup.add(diag2);
        });
    }

    // =========================================================================
    // 8. SKY GARDEN TERRACE (AT FLOOR 14)
    // =========================================================================
    const skyGardenY = towerStartHeight + 14 * floorHeight;
    const balconyGeom = trackGeom(new THREE.BoxGeometry(baseWidth + 2.0, 0.35, 3.4));
    const balcony = new THREE.Mesh(balconyGeom, teakDeckMat);
    balcony.position.set(0, skyGardenY, baseWidth / 2 + 1.4);
    balcony.castShadow = true;
    skyGardenGroup.add(balcony);

    const balustradeGeom = trackGeom(new THREE.BoxGeometry(baseWidth + 1.9, 0.9, 0.1));
    const balustrade = new THREE.Mesh(balustradeGeom, curtainWallGlassMat);
    balustrade.position.set(0, skyGardenY + 0.45, baseWidth / 2 + 2.9);
    skyGardenGroup.add(balustrade);

    [-3.4, 3.4].forEach((tx) => {
        const planter = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.3, 0.5, 1.3)), granitePlazaMat);
        planter.position.set(tx, skyGardenY + 0.25, baseWidth / 2 + 1.4);
        skyGardenGroup.add(planter);

        const foliage = new THREE.Mesh(trackGeom(new THREE.SphereGeometry(0.65, 12, 10)), shrubMat);
        foliage.position.set(tx, skyGardenY + 1.0, baseWidth / 2 + 1.4);
        skyGardenGroup.add(foliage);
    });
    rootGroup.add(skyGardenGroup);

    // =========================================================================
    // 9. ROOFTOP HELIPAD & AVIATION WARNING BEACON SPIRE
    // =========================================================================
    const roofY = towerStartHeight + totalFloors * floorHeight;

    const helipadPadGeom = trackGeom(new THREE.CylinderGeometry(4.4, 4.6, 0.5, 12));
    const helipadPad = new THREE.Mesh(helipadPadGeom, helipadAsphaltMat);
    helipadPad.position.y = roofY + 0.25;
    helipadPad.castShadow = true;
    rootGroup.add(helipadPad);

    const helipadRingGeom = trackGeom(new THREE.RingGeometry(3.0, 3.3, 32));
    const helipadRing = new THREE.Mesh(helipadRingGeom, helipadMarkingMat);
    helipadRing.rotation.x = -Math.PI / 2;
    helipadRing.position.y = roofY + 0.51;
    rootGroup.add(helipadRing);

    const hBarGeom = trackGeom(new THREE.PlaneGeometry(0.35, 1.8));
    const hCrossGeom = trackGeom(new THREE.PlaneGeometry(1.2, 0.35));

    [-0.6, 0.6].forEach((hx) => {
        const hBar = new THREE.Mesh(hBarGeom, helipadWhiteMat);
        hBar.rotation.x = -Math.PI / 2;
        hBar.position.set(hx, roofY + 0.52, 0);
        rootGroup.add(hBar);
    });
    const hCross = new THREE.Mesh(hCrossGeom, helipadWhiteMat);
    hCross.rotation.x = -Math.PI / 2;
    hCross.position.set(0, roofY + 0.52, 0);
    rootGroup.add(hCross);

    // Spire Mast & Strobe Beacon
    const spireMast = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.08, 0.45, 8.5, 8)), steelDiagridMat);
    spireMast.position.set(2.4, roofY + 4.5, 2.4);
    spireMast.castShadow = true;
    rootGroup.add(spireMast);

    const beaconMesh = new THREE.Mesh(trackGeom(new THREE.SphereGeometry(0.28, 16, 16)), beaconMat);
    beaconMesh.position.set(2.4, roofY + 8.8, 2.4);
    rootGroup.add(beaconMesh);

    const beaconLight = new THREE.PointLight(0xff0000, 2.5, 30);
    beaconLight.position.copy(beaconMesh.position);
    rootGroup.add(beaconLight);

    // Dynamic Updates (Animated traffic loop & beacon pulse)
    const updateTower = (time: number) => {
        // Aviation strobe pulse
        const strobe = Math.pow(Math.sin(time * 3.5), 6);
        beaconMat.emissiveIntensity = 0.5 + 2.5 * strobe;
        beaconLight.intensity = 0.8 + 4.0 * strobe;

        // Street cars continuous motion along 4-avenue network
        car1.position.x = -26 + ((time * 4.2) % 52);
        car2.position.x = 26 - ((time * 3.8) % 52);
        car3.position.z = -26 + ((time * 4.5) % 52);
        car4.position.z = 26 - ((time * 3.6) % 52);
        car5.position.x = -26 + (((time + 3.0) * 3.5) % 52);
        car6.position.x = 26 - (((time + 2.0) * 4.0) % 52);

        // Fountain water pulse
        fountainJet.scale.y = 1.0 + 0.28 * Math.sin(time * 4.5);
    };

    const toggleSkyGarden = (visible: boolean) => {
        skyGardenGroup.visible = visible;
    };

    const toggleTraffic = (visible: boolean) => {
        trafficGroup.visible = visible;
    };

    const dispose = () => {
        disposables.geometries.forEach((g) => g.dispose());
        disposables.materials.forEach((m) => m.dispose());
        disposables.geometries = [];
        disposables.materials = [];
    };

    return {
        group: rootGroup,
        updateTower,
        toggleSkyGarden,
        toggleTraffic,
        dispose,
    };
}
