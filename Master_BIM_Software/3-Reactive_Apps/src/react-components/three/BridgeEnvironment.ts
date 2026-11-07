import * as THREE from "three";

/**
 * Nordic Span Cable-Stayed Bridge Environment Builder
 * A monumental civil infrastructure suspension bridge featuring:
 * - Dynamic undulating deep ocean water base
 * - Massive twin A-frame reinforced concrete pylon towers
 * - 32 high-tensile steel tension stay cables in harp/fan configuration
 * - Continuous 4-lane aerodynamic box girder roadway deck
 * - Highway traffic with 4 driving 3D cars (headlights & taillights)
 * - Maritime yacht / patrol vessel cruising beneath the center span
 * - Lane dividers, pedestrian sidewalks, and illuminated LED roadway lampposts
 * - Marine navigation markers and aviation warning beacons atop pylons
 */
export interface IBridgeEnvironment {
    group: THREE.Group;
    updateBridge: (time: number) => void;
    toggleTrafficLamps: (visible: boolean) => void;
    dispose: () => void;
}

export function buildBridgeEnvironment(): IBridgeEnvironment {
    const rootGroup = new THREE.Group();
    rootGroup.name = "NordicSpanCableStayedBridgeEnvironment";

    const lampsGroup = new THREE.Group();
    lampsGroup.name = "RoadwayLampposts";

    const trafficGroup = new THREE.Group();
    trafficGroup.name = "BridgeTrafficVehicles";

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

    // --- Engineering Grade Materials ---
    const waterGeom = trackGeom(new THREE.PlaneGeometry(64, 64, 48, 48));
    const waterMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x0369a1, // Deep coastal fjord blue
        roughness: 0.1,
        metalness: 0.85,
        transparent: true,
        opacity: 0.82,
    }));

    const concretePylonMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xe2e8f0, // High-strength slip-form concrete
        roughness: 0.65,
        metalness: 0.1,
    }));

    const marineCaissonMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x475569, // Heavy underwater marine concrete
        roughness: 0.85,
        metalness: 0.2,
    }));

    const asphaltMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x1e293b, // Dense graded road asphalt
        roughness: 0.8,
        metalness: 0.1,
    }));

    const laneMarkingMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xf8fafc, // Reflective road paint
        roughness: 0.3,
    }));

    const cableSteelMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x94a3b8, // Galvanized high-tensile bridge strand
        metalness: 0.95,
        roughness: 0.2,
    }));

    const guardrailMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xcbd5e1, // Galvanized W-beam steel barrier
        metalness: 0.85,
        roughness: 0.3,
    }));

    const sidewalkMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x64748b, // Precast concrete sidewalk paver
        roughness: 0.7,
    }));

    const lampLuminaireMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.95,
        roughness: 0.3,
    }));

    const pylonBeaconMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xef4444, // Aviation warning red
        emissive: 0xff0000,
        emissiveIntensity: 1.0,
    }));

    const navGreenMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x22c55e, // Marine navigation starboard
        emissive: 0x16a34a,
        emissiveIntensity: 0.9,
    }));

    const navRedMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xef4444, // Marine navigation port
        emissive: 0xdc2626,
        emissiveIntensity: 0.9,
    }));

    // Highway Vehicle Paint Materials
    const carRedMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.8, roughness: 0.2 }));
    const carWhiteMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.6, roughness: 0.3 }));
    const carBlueMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.85, roughness: 0.2 }));
    const carSilverMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.15 }));
    const headlampMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));
    const taillampMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xef4444 }));

    // =========================================================================
    // 1. DYNAMIC OCEAN WATER BASE
    // =========================================================================
    const waterMesh = new THREE.Mesh(waterGeom, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = -0.1;
    waterMesh.receiveShadow = true;
    rootGroup.add(waterMesh);

    // =========================================================================
    // 2. SUBMERGED MARINE CAISSON PIER FOUNDATIONS
    // =========================================================================
    const pylonXPositions = [-9, 9];
    const pierGeom = trackGeom(new THREE.BoxGeometry(4.2, 3.6, 7.8));

    pylonXPositions.forEach((px) => {
        const pier = new THREE.Mesh(pierGeom, marineCaissonMat);
        pier.position.set(px, 0.8, 0);
        pier.castShadow = true;
        pier.receiveShadow = true;
        rootGroup.add(pier);

        // Marine navigation lights under the bridge
        const greenLight = new THREE.Mesh(trackGeom(new THREE.SphereGeometry(0.18, 8, 8)), navGreenMat);
        greenLight.position.set(px + (px > 0 ? -1.8 : 1.8), 2.2, 3.2);
        rootGroup.add(greenLight);

        const redLight = new THREE.Mesh(trackGeom(new THREE.SphereGeometry(0.18, 8, 8)), navRedMat);
        redLight.position.set(px + (px > 0 ? -1.8 : 1.8), 2.2, -3.2);
        rootGroup.add(redLight);
    });

    // =========================================================================
    // 3. TWIN A-FRAME REINFORCED CONCRETE PYLON TOWERS
    // =========================================================================
    const pylonTotalHeight = 22;
    const deckLevelY = 3.2;

    pylonXPositions.forEach((px) => {
        const pylonGroup = new THREE.Group();
        pylonGroup.position.set(px, 0, 0);

        const legGeom = trackGeom(new THREE.CylinderGeometry(0.45, 0.85, pylonTotalHeight, 12));
        const inclineAngle = 0.085;

        const legNorth = new THREE.Mesh(legGeom, concretePylonMat);
        legNorth.position.set(0, pylonTotalHeight / 2, -1.8);
        legNorth.rotation.x = inclineAngle;
        legNorth.castShadow = true;
        legNorth.receiveShadow = true;
        pylonGroup.add(legNorth);

        const legSouth = new THREE.Mesh(legGeom, concretePylonMat);
        legSouth.position.set(0, pylonTotalHeight / 2, 1.8);
        legSouth.rotation.x = -inclineAngle;
        legSouth.castShadow = true;
        legSouth.receiveShadow = true;
        pylonGroup.add(legSouth);

        const lowerStrutGeom = trackGeom(new THREE.BoxGeometry(1.4, 0.85, 4.4));
        const lowerStrut = new THREE.Mesh(lowerStrutGeom, concretePylonMat);
        lowerStrut.position.set(0, deckLevelY - 0.45, 0);
        lowerStrut.castShadow = true;
        pylonGroup.add(lowerStrut);

        const upperStrutGeom = trackGeom(new THREE.BoxGeometry(1.2, 4.2, 1.6));
        const upperStrut = new THREE.Mesh(upperStrutGeom, concretePylonMat);
        upperStrut.position.set(0, pylonTotalHeight - 2.1, 0);
        upperStrut.castShadow = true;
        pylonGroup.add(upperStrut);

        const beaconGeom = trackGeom(new THREE.SphereGeometry(0.24, 12, 12));
        const beacon = new THREE.Mesh(beaconGeom, pylonBeaconMat);
        beacon.position.set(0, pylonTotalHeight + 0.15, 0);
        pylonGroup.add(beacon);

        rootGroup.add(pylonGroup);
    });

    // =========================================================================
    // 4. CONTINUOUS AERODYNAMIC BOX GIRDER ROADWAY DECK
    // =========================================================================
    const deckLength = 48;
    const deckWidth = 6.4;
    const deckThickness = 0.55;

    const deckGeom = trackGeom(new THREE.BoxGeometry(deckLength, deckThickness, deckWidth));
    const deckMesh = new THREE.Mesh(deckGeom, asphaltMat);
    deckMesh.position.set(0, deckLevelY, 0);
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    rootGroup.add(deckMesh);

    const sidewalkGeom = trackGeom(new THREE.BoxGeometry(deckLength, 0.15, 0.85));
    [-deckWidth / 2 + 0.42, deckWidth / 2 - 0.42].forEach((sz) => {
        const sidewalk = new THREE.Mesh(sidewalkGeom, sidewalkMat);
        sidewalk.position.set(0, deckLevelY + deckThickness / 2 + 0.08, sz);
        sidewalk.castShadow = true;
        sidewalk.receiveShadow = true;
        rootGroup.add(sidewalk);

        const railGeom = trackGeom(new THREE.BoxGeometry(deckLength, 0.45, 0.08));
        const rail = new THREE.Mesh(railGeom, guardrailMat);
        rail.position.set(0, deckLevelY + deckThickness / 2 + 0.35, sz + (sz > 0 ? 0.38 : -0.38));
        rail.castShadow = true;
        rootGroup.add(rail);
    });

    const dashLength = 1.4;
    const dashGap = 1.2;
    const dashCount = Math.floor(deckLength / (dashLength + dashGap));
    const dashGeom = trackGeom(new THREE.PlaneGeometry(dashLength, 0.14));

    for (let d = -dashCount / 2; d <= dashCount / 2; d++) {
        const dash = new THREE.Mesh(dashGeom, laneMarkingMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(d * (dashLength + dashGap), deckLevelY + deckThickness / 2 + 0.01, 0);
        rootGroup.add(dash);
    }

    // =========================================================================
    // 5. 32 HIGH-TENSILE STEEL STAY CABLES
    // =========================================================================
    const cablesPerSide = 8;
    const anchorSpacing = 2.4;
    const cableRadius = 0.04;

    pylonXPositions.forEach((px) => {
        for (let i = 0; i < cablesPerSide; i++) {
            const towerAnchorY = pylonTotalHeight - 3.8 + i * 0.45;
            const dir = i % 2 === 0 ? 1 : -1;
            const distIndex = Math.floor(i / 2) + 1;
            const deckAnchorX = px + dir * (distIndex * anchorSpacing + 0.5);

            [-deckWidth / 2 + 0.45, deckWidth / 2 - 0.45].forEach((anchorZ) => {
                const start = new THREE.Vector3(px, towerAnchorY, anchorZ * 0.28);
                const end = new THREE.Vector3(deckAnchorX, deckLevelY + 0.2, anchorZ);

                const length = start.distanceTo(end);
                const cableGeom = trackGeom(new THREE.CylinderGeometry(cableRadius, cableRadius, length, 6));
                const cable = new THREE.Mesh(cableGeom, cableSteelMat);

                cable.position.copy(start.clone().add(end).multiplyScalar(0.5));
                cable.quaternion.setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    end.clone().sub(start).normalize()
                );
                cable.castShadow = true;
                rootGroup.add(cable);
            });
        }
    });

    // =========================================================================
    // 6. ROADWAY LED LIGHTING LUMINAIRES
    // =========================================================================
    const lampSpacing = 5.2;
    const lampCount = Math.floor(deckLength / lampSpacing);

    const poleGeom = trackGeom(new THREE.CylinderGeometry(0.05, 0.08, 2.2, 8));
    const armGeom = trackGeom(new THREE.BoxGeometry(0.55, 0.06, 0.06));
    const luminaireGeom = trackGeom(new THREE.BoxGeometry(0.24, 0.08, 0.12));

    for (let l = -lampCount / 2; l <= lampCount / 2; l++) {
        const lx = l * lampSpacing;
        [deckWidth / 2 - 0.15, -deckWidth / 2 + 0.15].forEach((lz) => {
            const pole = new THREE.Mesh(poleGeom, guardrailMat);
            pole.position.set(lx, deckLevelY + deckThickness / 2 + 1.1, lz);
            lampsGroup.add(pole);

            const arm = new THREE.Mesh(armGeom, guardrailMat);
            arm.position.set(lx, deckLevelY + deckThickness / 2 + 2.15, lz + (lz > 0 ? -0.25 : 0.25));
            lampsGroup.add(arm);

            const luminaire = new THREE.Mesh(luminaireGeom, lampLuminaireMat);
            luminaire.position.set(lx, deckLevelY + deckThickness / 2 + 2.12, lz + (lz > 0 ? -0.45 : 0.45));
            lampsGroup.add(luminaire);
        });
    }
    rootGroup.add(lampsGroup);

    // =========================================================================
    // 7. HIGHWAY TRAFFIC VEHICLES (DRIVING ON BRIDGE LANES)
    // =========================================================================
    const createHighwayCar = (paintMat: THREE.Material): THREE.Group => {
        const car = new THREE.Group();
        const bodyGeom = trackGeom(new THREE.BoxGeometry(2.8, 0.45, 1.4));
        const body = new THREE.Mesh(bodyGeom, paintMat);
        body.position.y = 0.35;
        body.castShadow = true;
        car.add(body);

        const cabinGeom = trackGeom(new THREE.BoxGeometry(1.6, 0.4, 1.2));
        const cabin = new THREE.Mesh(cabinGeom, paintMat);
        cabin.position.set(-0.2, 0.7, 0);
        car.add(cabin);

        // Front Headlights
        const hlGeom = trackGeom(new THREE.BoxGeometry(0.05, 0.08, 0.2));
        const hlLeft = new THREE.Mesh(hlGeom, headlampMat);
        hlLeft.position.set(1.42, 0.38, 0.4);
        const hlRight = new THREE.Mesh(hlGeom, headlampMat);
        hlRight.position.set(1.42, 0.38, -0.4);
        car.add(hlLeft, hlRight);

        // Rear Taillights
        const tlGeom = trackGeom(new THREE.BoxGeometry(0.05, 0.08, 0.22));
        const tlLeft = new THREE.Mesh(tlGeom, taillampMat);
        tlLeft.position.set(-1.42, 0.38, 0.4);
        const tlRight = new THREE.Mesh(tlGeom, taillampMat);
        tlRight.position.set(-1.42, 0.38, -0.4);
        car.add(tlLeft, tlRight);

        return car;
    };

    // Commercial Freight Semi-Truck
    const createFreightTruck = (): THREE.Group => {
        const truck = new THREE.Group();
        const cab = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.6, 1.2, 1.5)), carBlueMat);
        cab.position.set(2.0, 0.7, 0);
        const container = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(4.2, 1.5, 1.6)), carSilverMat);
        container.position.set(-1.0, 0.95, 0);
        const wheels = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(4.8, 0.35, 1.4)), carTireMat);
        wheels.position.set(0.3, 0.2, 0);
        truck.add(cab, container, wheels);
        return truck;
    };

    // Eastbound Traffic (z = 1.4)
    const trafficCar1 = createHighwayCar(carRedMat);
    trafficCar1.position.set(-14, deckLevelY + deckThickness / 2, 1.4);
    trafficGroup.add(trafficCar1);

    const trafficCar2 = createHighwayCar(carWhiteMat);
    trafficCar2.position.set(8, deckLevelY + deckThickness / 2, 1.4);
    trafficGroup.add(trafficCar2);

    const trafficTruck = createFreightTruck();
    trafficTruck.position.set(-2, deckLevelY + deckThickness / 2, 1.4);
    trafficGroup.add(trafficTruck);

    // Westbound Traffic (z = -1.4, rotated 180 degrees)
    const trafficCar3 = createHighwayCar(carBlueMat);
    trafficCar3.rotation.y = Math.PI;
    trafficCar3.position.set(14, deckLevelY + deckThickness / 2, -1.4);
    trafficGroup.add(trafficCar3);

    const trafficCar4 = createHighwayCar(carSilverMat);
    trafficCar4.rotation.y = Math.PI;
    trafficCar4.position.set(-6, deckLevelY + deckThickness / 2, -1.4);
    trafficGroup.add(trafficCar4);

    const trafficVan = createHighwayCar(trackMat(new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 })));
    trafficVan.rotation.y = Math.PI;
    trafficVan.position.set(4, deckLevelY + deckThickness / 2, -1.4);
    trafficGroup.add(trafficVan);

    rootGroup.add(trafficGroup);

    // =========================================================================
    // 8. MARITIME YACHT / PATROL VESSEL CRUISING BENEATH MAIN SPAN
    // =========================================================================
    const boatGroup = new THREE.Group();
    boatGroup.position.set(0, 0, -18);

    const hullGeom = trackGeom(new THREE.BoxGeometry(2.4, 0.85, 7.2));
    const hull = new THREE.Mesh(hullGeom, carWhiteMat);
    hull.position.y = 0.25;
    hull.castShadow = true;
    boatGroup.add(hull);

    const bowGeom = trackGeom(new THREE.ConeGeometry(1.2, 2.0, 4));
    const bow = new THREE.Mesh(bowGeom, carWhiteMat);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.25, 4.2);
    boatGroup.add(bow);

    const boatCabinGeom = trackGeom(new THREE.BoxGeometry(1.8, 0.95, 3.4));
    const boatCabin = new THREE.Mesh(boatCabinGeom, carBlueMat);
    boatCabin.position.set(0, 0.95, -0.4);
    boatGroup.add(boatCabin);

    // Starboard (Green) and Port (Red) Navigation Lights
    const boatGreen = new THREE.Mesh(trackGeom(new THREE.SphereGeometry(0.12, 8, 8)), navGreenMat);
    boatGreen.position.set(1.25, 0.65, 2.8);
    boatGroup.add(boatGreen);

    const boatRed = new THREE.Mesh(trackGeom(new THREE.SphereGeometry(0.12, 8, 8)), navRedMat);
    boatRed.position.set(-1.25, 0.65, 2.8);
    boatGroup.add(boatRed);

    rootGroup.add(boatGroup);

    // Dynamic Updates
    const updateBridge = (time: number) => {
        // Dynamic water wave undulation
        const posAttr = waterGeom.attributes.position;
        const vertexCount = posAttr.count;
        for (let i = 0; i < vertexCount; i++) {
            const u = posAttr.getX(i);
            const v = posAttr.getY(i);
            const wave = Math.sin(u * 0.35 + time * 1.8) * 0.12 + Math.cos(v * 0.4 + time * 1.4) * 0.08;
            posAttr.setZ(i, wave);
        }
        posAttr.needsUpdate = true;

        // Aviation warning strobe pulse
        const strobe = Math.pow(Math.sin(time * 3.0), 6);
        pylonBeaconMat.emissiveIntensity = 0.4 + 2.6 * strobe;

        // Eastbound & Westbound Traffic Motion
        trafficCar1.position.x = -22 + ((time * 6.5) % 44);
        trafficCar2.position.x = -22 + (((time * 6.5) + 16) % 44);
        trafficTruck.position.x = -22 + (((time * 5.0) + 30) % 44);
        trafficCar3.position.x = 22 - ((time * 6.0) % 44);
        trafficCar4.position.x = 22 - (((time * 6.0) + 14) % 44);
        trafficVan.position.x = 22 - (((time * 5.5) + 28) % 44);

        // Boat Navigation Motion across the fjord
        boatGroup.position.z = -22 + ((time * 2.2) % 44);
        boatGroup.position.y = Math.sin(time * 2.0) * 0.05; // Gentle water bobbing
        boatGroup.rotation.z = Math.sin(time * 1.5) * 0.03; // Gentle water rolling
    };

    const toggleTrafficLamps = (visible: boolean) => {
        lampsGroup.visible = visible;
    };

    const dispose = () => {
        disposables.geometries.forEach((g) => g.dispose());
        disposables.materials.forEach((m) => m.dispose());
        disposables.geometries = [];
        disposables.materials = [];
    };

    return {
        group: rootGroup,
        updateBridge,
        toggleTrafficLamps,
        dispose,
    };
}
