import * as THREE from "three";

/**
 * Architectural Civil Site & EV Showroom Environment for Car BIM Model
 * Features an architectural showroom turntable plinth with neon halo edge,
 * smart high-speed EV charging pedestal with curved umbilical cable,
 * asphalt site pavement with thermoplastic BIM bay markings, concrete wheel stops,
 * bollards, and twin xenon headlights + red aerodynamic tail light glow.
 */
export interface ICarEnvironment {
    group: THREE.Group;
    updateLights: (time: number) => void;
    toggleChargingHub: (visible: boolean) => void;
    dispose: () => void;
}

export function buildCarShowroomEnvironment(): ICarEnvironment {
    const rootGroup = new THREE.Group();
    rootGroup.name = "CarShowroomEnvironment";

    const chargingHubGroup = new THREE.Group();
    chargingHubGroup.name = "EVChargingHub";

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

    // Shared Palette Materials
    const asphaltMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Dark asphalt
        roughness: 0.85,
        metalness: 0.1,
    }));

    const plinthMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x181e2b, // Polished basalt carbon
        roughness: 0.25,
        metalness: 0.3,
    }));

    const neonRingMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.2,
        roughness: 0.1,
    }));

    const whiteStripeMat = trackMat(new THREE.MeshBasicMaterial({
        color: 0xf8fafc,
    }));

    const pedestalMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.3,
        metalness: 0.4,
    }));

    const pedestalFasciaMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        roughness: 0.2,
    }));

    const oledScreenMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 1.5,
    }));

    const cableMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x090d16,
        roughness: 0.5,
        metalness: 0.2,
    }));

    const concreteMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.9,
    }));

    const headlampGlowMat = trackMat(new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
    }));

    const taillampGlowMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 2.0,
    }));

    // =========================================================================
    // 1. SHOWROOM PRESENTATION PLINTH & NEON HALO
    // =========================================================================

    // Ground Asphalt Site Pad
    const groundGeom = trackGeom(new THREE.BoxGeometry(14, 0.08, 12));
    const groundMesh = new THREE.Mesh(groundGeom, asphaltMat);
    groundMesh.position.set(0, 0.04, 0);
    groundMesh.receiveShadow = true;
    rootGroup.add(groundMesh);

    // Beveled Basalt Showroom Turntable Plinth
    const plinthGeom = trackGeom(new THREE.CylinderGeometry(3.6, 3.8, 0.16, 48));
    const plinthMesh = new THREE.Mesh(plinthGeom, plinthMat);
    plinthMesh.position.set(0, 0.12, 0);
    plinthMesh.receiveShadow = true;
    rootGroup.add(plinthMesh);

    // Glowing Cyan Neon Halo Perimeter Ring
    const haloGeom = trackGeom(new THREE.TorusGeometry(3.7, 0.035, 12, 48));
    const haloMesh = new THREE.Mesh(haloGeom, neonRingMat);
    haloMesh.rotation.x = Math.PI / 2;
    haloMesh.position.set(0, 0.19, 0);
    rootGroup.add(haloMesh);

    // BIM Thermoplastic Parking Bay Markings
    const createStripe = (x: number, z: number, w: number, d: number) => {
        const stripe = new THREE.Mesh(trackGeom(new THREE.PlaneGeometry(w, d)), whiteStripeMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(x, 0.085, z);
        return stripe;
    };

    rootGroup.add(createStripe(-2.4, 0, 0.12, 5.8));
    rootGroup.add(createStripe(2.4, 0, 0.12, 5.8));
    rootGroup.add(createStripe(0, 2.85, 4.8, 0.12));

    // Heavy-duty Concrete Wheel Stop Bumper
    const curbGeom = trackGeom(new THREE.BoxGeometry(2.4, 0.16, 0.25));
    const curb = new THREE.Mesh(curbGeom, concreteMat);
    curb.position.set(0, 0.16, 2.5);
    rootGroup.add(curb);

    // =========================================================================
    // 2. SMART EV FAST-CHARGING HUB & CABLE
    // =========================================================================

    // Monolith EV Charger Column
    const chargerColumn = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.5, 1.75, 0.35)), pedestalMat);
    chargerColumn.position.set(-2.8, 0.95, -0.6);
    chargerColumn.castShadow = true;

    // Charger Front Glass Fascia
    const fascia = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.42, 1.65, 0.03)), pedestalFasciaMat);
    fascia.position.set(-2.8, 0.95, -0.43);

    // Glowing OLED Screen: "FAST CHARGE · 85%"
    const oledScreen = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.34, 0.26, 0.02)), oledScreenMat);
    oledScreen.position.set(-2.8, 1.35, -0.41);

    // Status LED Halo Ring on charger
    const chargerStatusLight = new THREE.PointLight(0x10b981, 1.2, 3.0);
    chargerStatusLight.position.set(-2.8, 1.35, -0.3);

    chargingHubGroup.add(chargerColumn, fascia, oledScreen, chargerStatusLight);

    // Smooth Umbilical Heavy Charging Cable (Curved spline running from pedestal to car port)
    const cableCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.8, 0.8, -0.42),
        new THREE.Vector3(-2.5, 0.4, -0.45),
        new THREE.Vector3(-1.9, 0.22, -0.55),
        new THREE.Vector3(-1.4, 0.45, -0.65),
        new THREE.Vector3(-1.05, 0.72, -0.7),
    ]);
    const cableGeom = trackGeom(new THREE.TubeGeometry(cableCurve, 32, 0.035, 8, false));
    const cableMesh = new THREE.Mesh(cableGeom, cableMat);
    chargingHubGroup.add(cableMesh);

    // Glowing Car Port Socket Connector
    const socketPlug = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 12)), neonRingMat);
    socketPlug.rotation.z = Math.PI / 2;
    socketPlug.position.set(-1.05, 0.72, -0.7);
    chargingHubGroup.add(socketPlug);

    // Site Stainless Steel Bollards
    for (const bz of [-2.4, 2.4]) {
        const bollardGeom = trackGeom(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 16));
        const bollardMesh = new THREE.Mesh(bollardGeom, pedestalMat);
        bollardMesh.position.set(-2.8, 0.52, bz);

        const ringGeom = trackGeom(new THREE.TorusGeometry(0.072, 0.015, 8, 16));
        const ringMesh = new THREE.Mesh(ringGeom, neonRingMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.set(-2.8, 0.85, bz);

        chargingHubGroup.add(bollardMesh, ringMesh);
    }

    rootGroup.add(chargingHubGroup);

    // =========================================================================
    // 3. VEHICLE ACTIVE LIGHTING & HEADLAMP / TAILLAMP ACCENTS
    // =========================================================================

    const lightsGroup = new THREE.Group();
    lightsGroup.name = "VehicleActiveLights";

    // Brilliant Xenon Twin Headlamps
    const headlampLeft = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.24, 0.1, 0.08)), headlampGlowMat);
    headlampLeft.position.set(-0.68, 0.65, 1.88);

    const headlampRight = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.24, 0.1, 0.08)), headlampGlowMat);
    headlampRight.position.set(0.68, 0.65, 1.88);

    // Forward Spotlights simulating real automotive headlights
    const spotLeft = new THREE.SpotLight(0xe0f2fe, 2.5, 12, Math.PI / 6, 0.3);
    spotLeft.position.set(-0.68, 0.65, 1.9);
    spotLeft.target.position.set(-0.68, 0, 8);

    const spotRight = new THREE.SpotLight(0xe0f2fe, 2.5, 12, Math.PI / 6, 0.3);
    spotRight.position.set(0.68, 0.65, 1.9);
    spotRight.target.position.set(0.68, 0, 8);

    lightsGroup.add(headlampLeft, headlampRight, spotLeft, spotRight, spotLeft.target, spotRight.target);

    // Continuous Aerodynamic Red Rear LED Lightbar
    const tailBar = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.65, 0.08, 0.06)), taillampGlowMat);
    tailBar.position.set(0, 0.72, -1.86);

    const tailGlow = new THREE.PointLight(0xef4444, 1.6, 4.5);
    tailGlow.position.set(0, 0.72, -2.1);

    lightsGroup.add(tailBar, tailGlow);

    // Interior Sports Steering Wheel & Leather Bucket Seats (Visible through tinted glass)
    const interiorGroup = new THREE.Group();
    const seatGeom = trackGeom(new THREE.BoxGeometry(0.48, 0.65, 0.45));
    const seatLeft = new THREE.Mesh(seatGeom, pedestalMat);
    seatLeft.position.set(-0.38, 0.62, 0.1);
    const seatRight = new THREE.Mesh(seatGeom, pedestalMat);
    seatRight.position.set(0.38, 0.62, 0.1);

    const wheelGeom = trackGeom(new THREE.TorusGeometry(0.16, 0.025, 8, 16));
    const wheel = new THREE.Mesh(wheelGeom, cableMat);
    wheel.position.set(-0.38, 0.88, 0.55);
    wheel.rotation.x = -0.4;

    interiorGroup.add(seatLeft, seatRight, wheel);
    rootGroup.add(interiorGroup);
    rootGroup.add(lightsGroup);

    // Light animation pulse
    const updateLights = (time: number) => {
        const pulse = 1.0 + Math.sin(time * 3.0) * 0.25;
        chargerStatusLight.intensity = pulse * 1.2;
    };

    const toggleChargingHub = (visible: boolean) => {
        chargingHubGroup.visible = visible;
    };

    const dispose = () => {
        disposables.geometries.forEach((g) => g.dispose());
        disposables.materials.forEach((m) => m.dispose());
        disposables.geometries = [];
        disposables.materials = [];
    };

    return {
        group: rootGroup,
        updateLights,
        toggleChargingHub,
        dispose,
    };
}

