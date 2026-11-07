import * as THREE from "three";

/**
 * Apex Parametric Skyscraper Environment Builder
 * A 28-story commercial high-rise tower featuring:
 * - Reflective double-skin curtain wall glass facade
 * - Articulated floor slabs and structural core
 * - Exterior diagrid structural steel exoskeleton
 * - Mid-tower Sky Garden terrace with cantilevered viewing balconies
 * - Ground-level grand entrance atrium with illuminated canopy and revolving doors
 * - Rooftop helipad with yellow/white 'H' marking and flashing aviation beacon spire
 */
export interface ITowerEnvironment {
    group: THREE.Group;
    updateTower: (time: number) => void;
    toggleSkyGarden: (visible: boolean) => void;
    dispose: () => void;
}

export function buildTowerEnvironment(): ITowerEnvironment {
    const rootGroup = new THREE.Group();
    rootGroup.name = "ApexParametricTowerEnvironment";

    const skyGardenGroup = new THREE.Group();
    skyGardenGroup.name = "SkyGardenTerrace";

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
    const granitePlazaMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Polished dark granite
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
        roughness: 0.12,
        metalness: 0.88,
        transparent: true,
        opacity: 0.65,
    }));

    const floorSlabMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x1e293b, // Dark metallic slab edge / spandrel band
        roughness: 0.45,
        metalness: 0.75,
    }));

    const steelDiagridMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x94a3b8, // Stainless architectural structural steel
        roughness: 0.2,
        metalness: 0.95,
    }));

    const interiorGlowMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xfef08a, // Warm illuminated office suites
        emissive: 0xd97706,
        emissiveIntensity: 0.35,
        roughness: 0.5,
    }));

    const teakDeckMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x78350f,
        roughness: 0.6,
        metalness: 0.05,
    }));

    const shrubMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x15803d, // Biophilic garden foliage
        roughness: 0.75,
        metalness: 0.0,
    }));

    const helipadAsphaltMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.8,
    }));

    const helipadMarkingMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xfacc15, // High-visibility yellow
        roughness: 0.3,
    }));

    const helipadWhiteMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xf8fafc, // Crisp runway white
        roughness: 0.3,
    }));

    const beaconMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xef4444, // Aviation warning red
        emissive: 0xff0000,
        emissiveIntensity: 1.0,
    }));

    // =========================================================================
    // 1. GROUND PLAZA & ENTRANCE ATRIUM
    // =========================================================================
    const plazaGeom = trackGeom(new THREE.BoxGeometry(22, 0.4, 22));
    const plazaMesh = new THREE.Mesh(plazaGeom, granitePlazaMat);
    plazaMesh.position.y = -0.2;
    plazaMesh.receiveShadow = true;
    rootGroup.add(plazaMesh);

    // Entrance Podium / Atrium (Double-height lobby)
    const podiumHeight = 2.4;
    const podiumGeom = trackGeom(new THREE.BoxGeometry(11, podiumHeight, 11));
    const podiumGlass = new THREE.Mesh(podiumGeom, curtainWallGlassMat);
    podiumGlass.position.y = podiumHeight / 2;
    podiumGlass.castShadow = true;
    podiumGlass.receiveShadow = true;
    rootGroup.add(podiumGlass);

    // Structural Podium Columns
    const colGeom = trackGeom(new THREE.CylinderGeometry(0.2, 0.2, podiumHeight, 16));
    const colPositions = [
        [-5, podiumHeight / 2, -5],
        [5, podiumHeight / 2, -5],
        [-5, podiumHeight / 2, 5],
        [5, podiumHeight / 2, 5],
    ];
    colPositions.forEach(([cx, cy, cz]) => {
        const col = new THREE.Mesh(colGeom, steelDiagridMat);
        col.position.set(cx, cy, cz);
        col.castShadow = true;
        rootGroup.add(col);
    });

    // Grand Entrance Cantilevered Canopy
    const canopyGeom = trackGeom(new THREE.BoxGeometry(7, 0.25, 4));
    const canopy = new THREE.Mesh(canopyGeom, floorSlabMat);
    canopy.position.set(0, 2.2, 7.5);
    canopy.castShadow = true;
    rootGroup.add(canopy);

    // =========================================================================
    // 2. MAIN TOWER SHAFT (24 FLOORS WITH DIAGRID & INTERIOR CORE)
    // =========================================================================
    const totalFloors = 24;
    const floorHeight = 0.95;
    const baseWidth = 8.6;
    const towerStartHeight = podiumHeight;

    // Central Elevator & Structural Concrete Core
    const coreHeight = totalFloors * floorHeight + 2;
    const coreGeom = trackGeom(new THREE.BoxGeometry(3.6, coreHeight, 3.6));
    const coreMesh = new THREE.Mesh(coreGeom, concreteCoreMat);
    coreMesh.position.y = towerStartHeight + coreHeight / 2;
    coreMesh.castShadow = true;
    rootGroup.add(coreMesh);

    // Loop through floor plates with slight parametric tapering
    for (let f = 0; f < totalFloors; f++) {
        const floorY = towerStartHeight + f * floorHeight;
        // Subtle aerodynamic tapering at top floors
        const taperRatio = f > 18 ? 1 - (f - 18) * 0.035 : 1.0;
        const width = baseWidth * taperRatio;
        const depth = baseWidth * taperRatio;

        // Floor Slab Perimeter Band
        const slabGeom = trackGeom(new THREE.BoxGeometry(width, 0.15, depth));
        const slab = new THREE.Mesh(slabGeom, floorSlabMat);
        slab.position.y = floorY;
        slab.castShadow = true;
        slab.receiveShadow = true;
        rootGroup.add(slab);

        // Glass Curtain Wall Facade Box for this floor
        if (f < totalFloors - 1) {
            const glassGeom = trackGeom(new THREE.BoxGeometry(width - 0.2, floorHeight - 0.15, depth - 0.2));
            const glass = new THREE.Mesh(glassGeom, curtainWallGlassMat);
            glass.position.y = floorY + floorHeight / 2;
            glass.castShadow = true;
            rootGroup.add(glass);

            // Glowing Interior Office Core Slab
            const glowGeom = trackGeom(new THREE.BoxGeometry(width - 1.2, floorHeight - 0.35, depth - 1.2));
            const glow = new THREE.Mesh(glowGeom, interiorGlowMat);
            glow.position.y = floorY + floorHeight / 2;
            rootGroup.add(glow);
        }
    }

    // =========================================================================
    // 3. STRUCTURAL STEEL DIAGRID EXOSKELETON
    // =========================================================================
    const diagridSegments = 6;
    const diagridSpan = totalFloors / diagridSegments;
    const diagridRadius = 0.12;

    for (let s = 0; s < diagridSegments; s++) {
        const yStart = towerStartHeight + s * diagridSpan * floorHeight;
        const yEnd = towerStartHeight + (s + 1) * diagridSpan * floorHeight;
        const midY = (yStart + yEnd) / 2;
        const spanH = yEnd - yStart;

        // X-cross braces on front and back
        const diagGeom = trackGeom(new THREE.CylinderGeometry(diagridRadius, diagridRadius, Math.hypot(baseWidth, spanH), 8));

        const angle = Math.atan2(baseWidth, spanH);

        // Front Face X
        const diagF1 = new THREE.Mesh(diagGeom, steelDiagridMat);
        diagF1.position.set(0, midY, baseWidth / 2 + 0.08);
        diagF1.rotation.z = angle;
        rootGroup.add(diagF1);

        const diagF2 = new THREE.Mesh(diagGeom, steelDiagridMat);
        diagF2.position.set(0, midY, baseWidth / 2 + 0.08);
        diagF2.rotation.z = -angle;
        rootGroup.add(diagF2);

        // Back Face X
        const diagB1 = new THREE.Mesh(diagGeom, steelDiagridMat);
        diagB1.position.set(0, midY, -baseWidth / 2 - 0.08);
        diagB1.rotation.z = angle;
        rootGroup.add(diagB1);

        const diagB2 = new THREE.Mesh(diagGeom, steelDiagridMat);
        diagB2.position.set(0, midY, -baseWidth / 2 - 0.08);
        diagB2.rotation.z = -angle;
        rootGroup.add(diagB2);
    }

    // =========================================================================
    // 4. SKY GARDEN TERRACE (AT FLOOR 14)
    // =========================================================================
    const skyGardenY = towerStartHeight + 14 * floorHeight;
    const balconyGeom = trackGeom(new THREE.BoxGeometry(baseWidth + 1.8, 0.35, 3.2));
    const balcony = new THREE.Mesh(balconyGeom, teakDeckMat);
    balcony.position.set(0, skyGardenY, baseWidth / 2 + 1.2);
    balcony.castShadow = true;
    skyGardenGroup.add(balcony);

    // Glass Balustrade
    const balustradeGeom = trackGeom(new THREE.BoxGeometry(baseWidth + 1.7, 0.85, 0.1));
    const balustrade = new THREE.Mesh(balustradeGeom, curtainWallGlassMat);
    balustrade.position.set(0, skyGardenY + 0.45, baseWidth / 2 + 2.7);
    skyGardenGroup.add(balustrade);

    // Ornamental Sky Garden Planters & Trees
    const planterGeom = trackGeom(new THREE.BoxGeometry(1.2, 0.45, 1.2));
    const treeTrunkGeom = trackGeom(new THREE.CylinderGeometry(0.08, 0.1, 0.75, 8));
    const foliageGeom = trackGeom(new THREE.SphereGeometry(0.55, 12, 10));

    [-3.2, 3.2].forEach((tx) => {
        const planter = new THREE.Mesh(planterGeom, granitePlazaMat);
        planter.position.set(tx, skyGardenY + 0.25, baseWidth / 2 + 1.2);
        skyGardenGroup.add(planter);

        const trunk = new THREE.Mesh(treeTrunkGeom, teakDeckMat);
        trunk.position.set(tx, skyGardenY + 0.7, baseWidth / 2 + 1.2);
        skyGardenGroup.add(trunk);

        const foliage = new THREE.Mesh(foliageGeom, shrubMat);
        foliage.position.set(tx, skyGardenY + 1.2, baseWidth / 2 + 1.2);
        skyGardenGroup.add(foliage);
    });

    rootGroup.add(skyGardenGroup);

    // =========================================================================
    // 5. CROWN, ROOFTOP HELIPAD & COMMUNICATIONS SPIRE
    // =========================================================================
    const roofY = towerStartHeight + totalFloors * floorHeight;

    // Helipad Octagonal Base Pad
    const helipadPadGeom = trackGeom(new THREE.CylinderGeometry(4.2, 4.4, 0.5, 8));
    const helipadPad = new THREE.Mesh(helipadPadGeom, helipadAsphaltMat);
    helipadPad.position.y = roofY + 0.25;
    helipadPad.castShadow = true;
    rootGroup.add(helipadPad);

    // Yellow Flight Landing Ring
    const helipadRingGeom = trackGeom(new THREE.RingGeometry(2.8, 3.1, 32));
    const helipadRing = new THREE.Mesh(helipadRingGeom, helipadMarkingMat);
    helipadRing.rotation.x = -Math.PI / 2;
    helipadRing.position.y = roofY + 0.51;
    rootGroup.add(helipadRing);

    // Bold White 'H' Landing Marking
    const hBarGeom = trackGeom(new THREE.PlaneGeometry(0.35, 1.8));
    const hCrossGeom = trackGeom(new THREE.PlaneGeometry(1.2, 0.35));

    const hLeft = new THREE.Mesh(hBarGeom, helipadWhiteMat);
    hLeft.rotation.x = -Math.PI / 2;
    hLeft.position.set(-0.6, roofY + 0.52, 0);
    rootGroup.add(hLeft);

    const hRight = new THREE.Mesh(hBarGeom, helipadWhiteMat);
    hRight.rotation.x = -Math.PI / 2;
    hRight.position.set(0.6, roofY + 0.52, 0);
    rootGroup.add(hRight);

    const hCross = new THREE.Mesh(hCrossGeom, helipadWhiteMat);
    hCross.rotation.x = -Math.PI / 2;
    hCross.position.set(0, roofY + 0.52, 0);
    rootGroup.add(hCross);

    // Communications Lattice Spire
    const spireMastGeom = trackGeom(new THREE.CylinderGeometry(0.08, 0.4, 7.5, 8));
    const spireMast = new THREE.Mesh(spireMastGeom, steelDiagridMat);
    spireMast.position.set(2.4, roofY + 4.0, 2.4);
    spireMast.castShadow = true;
    rootGroup.add(spireMast);

    // Aviation Beacon Light Bulb
    const beaconGeom = trackGeom(new THREE.SphereGeometry(0.25, 16, 16));
    const beaconMesh = new THREE.Mesh(beaconGeom, beaconMat);
    beaconMesh.position.set(2.4, roofY + 7.8, 2.4);
    rootGroup.add(beaconMesh);

    // PointLight for flashing aviation beacon
    const beaconLight = new THREE.PointLight(0xff0000, 2.5, 25);
    beaconLight.position.copy(beaconMesh.position);
    rootGroup.add(beaconLight);

    // Dynamic Updates
    const updateTower = (time: number) => {
        // High-intensity aviation beacon flash (strobe pulse)
        const strobe = Math.pow(Math.sin(time * 3.5), 6);
        beaconMat.emissiveIntensity = 0.5 + 2.5 * strobe;
        beaconLight.intensity = 0.8 + 4.0 * strobe;

        // Subtle interior office lighting pulsation
        interiorGlowMat.emissiveIntensity = 0.3 + 0.08 * Math.sin(time * 0.8);
    };

    const toggleSkyGarden = (visible: boolean) => {
        skyGardenGroup.visible = visible;
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
        dispose,
    };
}

