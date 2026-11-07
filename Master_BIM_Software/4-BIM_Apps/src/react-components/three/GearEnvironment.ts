import * as THREE from "three";

/**
 * Industrial Mechanical HVAC Dyno Test Bench Environment
 * Surrounds the HVAC gear with a state-of-the-art mechanical test bench:
 * - Heavy cast-iron foundation plinth with yellow/black industrial hazard striping
 * - Companion high-speed drive pinion gear meshing with the primary gear
 * - Steel drive transmission shaft with heavy-duty pillow block roller bearings
 * - Real-time green laser inspection scan beam sweeping across the tooth profile
 * - Digital CAD pitch circle inspection dimension rings
 * - Overhead directional inspection spotlight
 */
export interface IGearEnvironment {
    group: THREE.Group;
    updateGearEnv: (time: number, isAutoRotating: boolean) => void;
    toggleLaser: (visible: boolean) => void;
    dispose: () => void;
}

export function buildGearEnvironment(): IGearEnvironment {
    const rootGroup = new THREE.Group();
    rootGroup.name = "IndustrialGearDynoEnvironment";

    const laserGroup = new THREE.Group();
    laserGroup.name = "LaserInspectionSystem";

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
    const castIronMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x1e293b, // Heavy cast-iron machine bed
        roughness: 0.7,
        metalness: 0.65,
    }));

    const hazardYellowMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xeab308, // OSHA warning yellow
        roughness: 0.35,
    }));

    const hazardBlackMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x0f172a, // OSHA warning black
        roughness: 0.35,
    }));

    const chromeShaftMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xe2e8f0, // Polished chrome-plated steel shaft
        roughness: 0.15,
        metalness: 0.95,
    }));

    const bronzePinionMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xd97706, // High-tensile bronze drive pinion
        roughness: 0.25,
        metalness: 0.85,
    }));

    const bearingBlockMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x334155, // Cast iron pillow block housing
        roughness: 0.6,
        metalness: 0.5,
    }));

    const laserGreenMat = trackMat(new THREE.LineBasicMaterial({
        color: 0x22c55e,
        linewidth: 2,
    }));

    const cadRingMat = trackMat(new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.65,
    }));

    const beaconMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x22c55e, // Operational status green
        emissive: 0x16a34a,
        emissiveIntensity: 0.9,
    }));

    // =========================================================================
    // 1. MACHINE BED & VIBRATION-ISOLATED FOUNDATION PLINTH
    // =========================================================================
    const plinthGeom = trackGeom(new THREE.BoxGeometry(18, 0.6, 18));
    const plinth = new THREE.Mesh(plinthGeom, castIronMat);
    plinth.position.y = -0.3;
    plinth.receiveShadow = true;
    rootGroup.add(plinth);

    // Hazard Safety Perimeter Border
    const stripeCount = 20;
    const stripeWidth = 0.8;
    for (let s = -stripeCount / 2; s < stripeCount / 2; s++) {
        const stripeMat = s % 2 === 0 ? hazardYellowMat : hazardBlackMat;
        const stripeGeom = trackGeom(new THREE.PlaneGeometry(stripeWidth, 0.55));
        const stripeMesh = new THREE.Mesh(stripeGeom, stripeMat);
        stripeMesh.position.set(s * stripeWidth + stripeWidth / 2, -0.3, 8.95);
        rootGroup.add(stripeMesh);
    }

    // =========================================================================
    // 2. COMPANION HIGH-SPEED DRIVE PINION GEAR (Z-axis offset)
    // =========================================================================
    // Main gear centers at (0, 6.07, 0). Place companion drive gear at (-4.8, 6.07, 0)
    const pinionGroup = new THREE.Group();
    pinionGroup.position.set(-4.8, 6.07, 0);

    const pinionBodyGeom = trackGeom(new THREE.CylinderGeometry(1.4, 1.4, 0.85, 24));
    const pinionBody = new THREE.Mesh(pinionBodyGeom, bronzePinionMat);
    pinionBody.rotation.x = Math.PI / 2;
    pinionBody.castShadow = true;
    pinionGroup.add(pinionBody);

    // Articulated Pinion Gear Teeth
    const toothCount = 14;
    const toothGeom = trackGeom(new THREE.BoxGeometry(0.35, 0.85, 0.45));
    for (let t = 0; t < toothCount; t++) {
        const angle = (t / toothCount) * Math.PI * 2;
        const tooth = new THREE.Mesh(toothGeom, bronzePinionMat);
        tooth.position.set(Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, 0);
        tooth.rotation.z = angle;
        tooth.castShadow = true;
        pinionGroup.add(tooth);
    }
    rootGroup.add(pinionGroup);

    // =========================================================================
    // 3. DRIVE TRANSMISSION SHAFT & PILLOW BLOCK BEARINGS
    // =========================================================================
    const shaftGeom = trackGeom(new THREE.CylinderGeometry(0.35, 0.35, 7.5, 16));
    const shaft = new THREE.Mesh(shaftGeom, chromeShaftMat);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(-4.8, 6.07, 0);
    shaft.castShadow = true;
    rootGroup.add(shaft);

    // Two Pillow Block Bearing Housings
    const bearingGeom = trackGeom(new THREE.BoxGeometry(1.2, 1.8, 0.9));
    [-3.0, 3.0].forEach((bz) => {
        const bearing = new THREE.Mesh(bearingGeom, bearingBlockMat);
        bearing.position.set(-4.8, 5.2, bz);
        bearing.castShadow = true;
        rootGroup.add(bearing);
    });

    // =========================================================================
    // 4. PRECISION GREEN CAD LASER ALIGNMENT INSPECTION SYSTEM
    // =========================================================================
    // Laser emitter mounted on pedestal
    const laserPedestalGeom = trackGeom(new THREE.CylinderGeometry(0.12, 0.16, 2.4, 12));
    const laserPedestal = new THREE.Mesh(laserPedestalGeom, castIronMat);
    laserPedestal.position.set(3.8, 6.07, 3.2);
    laserGroup.add(laserPedestal);

    const laserEmitter = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.45, 0.35, 0.65)), bronzePinionMat);
    laserEmitter.position.set(3.8, 7.3, 3.2);
    laserGroup.add(laserEmitter);

    // Sweeping Laser Beam Line
    const laserPoints = [
        new THREE.Vector3(3.8, 7.3, 3.2),
        new THREE.Vector3(0, 6.07, 0),
    ];
    const laserBeamGeom = trackGeom(new THREE.BufferGeometry().setFromPoints(laserPoints));
    const laserBeam = new THREE.Line(laserBeamGeom, laserGreenMat);
    laserGroup.add(laserBeam);

    // Status Indicator Beacon Bulb
    const beaconMesh = new THREE.Mesh(trackGeom(new THREE.SphereGeometry(0.18, 12, 12)), beaconMat);
    beaconMesh.position.set(3.8, 7.6, 3.2);
    laserGroup.add(beaconMesh);

    // Green Laser Guide PointLight
    const laserLight = new THREE.PointLight(0x22c55e, 1.5, 8);
    laserLight.position.set(0, 6.07, 0);
    laserGroup.add(laserLight);

    rootGroup.add(laserGroup);

    // =========================================================================
    // 5. DIGITAL CAD PITCH CIRCLE INSPECTION DIMENSION RINGS
    // =========================================================================
    const ringRadius = 4.2;
    const ringGeom = trackGeom(new THREE.BufferGeometry());
    const ringPoints: THREE.Vector3[] = [];
    const segments = 48;
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        ringPoints.push(new THREE.Vector3(Math.cos(theta) * ringRadius, Math.sin(theta) * ringRadius, 0));
    }
    ringGeom.setFromPoints(ringPoints);
    const cadRing = new THREE.Line(ringGeom, cadRingMat);
    cadRing.position.set(0, 6.07, 0);
    rootGroup.add(cadRing);

    // Dynamic Updates
    const updateGearEnv = (time: number, isAutoRotating: boolean) => {
        // Complementary high-speed pinion gear rotation
        if (isAutoRotating) {
            pinionGroup.rotation.z -= 0.025; // 2.5x rotation speed in reverse meshing direction
        }

        // Sweeping laser inspection line across teeth
        const sweepY = 6.07 + Math.sin(time * 2.5) * 1.6;
        const sweepX = Math.cos(time * 2.5) * 1.6;
        const posAttr = laserBeamGeom.attributes.position;
        posAttr.setXYZ(1, sweepX, sweepY, 0.4);
        posAttr.needsUpdate = true;
        laserLight.position.set(sweepX, sweepY, 0.4);

        // Beacon status pulse
        beaconMat.emissiveIntensity = 0.6 + 0.4 * Math.sin(time * 4.0);
    };

    const toggleLaser = (visible: boolean) => {
        laserGroup.visible = visible;
    };

    const dispose = () => {
        disposables.geometries.forEach((g) => g.dispose());
        disposables.materials.forEach((m) => m.dispose());
        disposables.geometries = [];
        disposables.materials = [];
    };

    return {
        group: rootGroup,
        updateGearEnv,
        toggleLaser,
        dispose,
    };
}
