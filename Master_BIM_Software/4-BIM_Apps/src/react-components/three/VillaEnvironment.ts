import * as THREE from "three";

/**
 * Architectural Luxury Villa Environment Builder
 * Adds a high-end infinity swimming pool, teak sun-deck terrace, poolside loungers,
 * landscape garden planters, outdoor BBQ pergola, rooftop solar arrays, and fully furnished
 * interior suites on EVERY floor (ground floor living/dining & executive study with desk & laptop,
 * upper floor master suite & architectural studio with desk & laptop) to turn the villa into
 * an award-winning BIM showcase model.
 */
export interface IVillaEnvironment {
    group: THREE.Group;
    updateWater: (time: number) => void;
    togglePool: (visible: boolean) => void;
    toggleFurniture: (visible: boolean) => void;
    dispose: () => void;
}

export function buildLuxuryVillaEnvironment(): IVillaEnvironment {
    const rootGroup = new THREE.Group();
    rootGroup.name = "LuxuryVillaEnvironment";

    const poolGroup = new THREE.Group();
    poolGroup.name = "PoolAndTerrace";

    const furnitureGroup = new THREE.Group();
    furnitureGroup.name = "InteriorFurniture";

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
    const teakMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x78350f, // Warm teak timber
        roughness: 0.6,
        metalness: 0.05,
    }));

    const copingMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xe2e8f0, // Polished white limestone
        roughness: 0.25,
        metalness: 0.1,
    }));

    const poolTileMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x0284c7, // Deep turquoise mosaic pool tile
        roughness: 0.2,
        metalness: 0.1,
    }));

    const waterMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x06b6d4, // Crystalline Caribbean cyan
        roughness: 0.05,
        metalness: 0.2,
        transparent: true,
        opacity: 0.82,
    }));

    const chromeMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.1,
        metalness: 0.95,
    }));

    const cushionWhiteMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.85,
        metalness: 0.0,
    }));

    const darkSlateMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.8,
        metalness: 0.1,
    }));

    const sofaFabricMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x334155, // Charcoal modern weave
        roughness: 0.9,
    }));

    const oakWoodMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xd97706, // Scandinavian golden oak
        roughness: 0.45,
    }));

    const marbleWhiteMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xf1f5f9, // Calacatta white marble
        roughness: 0.15,
        metalness: 0.1,
    }));

    const grassMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x15803d, // Manicured emerald turf
        roughness: 0.95,
    }));

    const hedgeMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x166534, // Boxwood shrub
        roughness: 0.9,
    }));

    const glassBalustradeMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.05,
        metalness: 0.2,
        transparent: true,
        opacity: 0.45,
    }));

    // Office Furniture Materials (Desks & Laptops for each floor)
    const deskTopMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x475569, // Executive slate grey work surface
        roughness: 0.3,
        metalness: 0.1,
    }));

    const laptopBodyMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Space grey anodized aluminum
        roughness: 0.2,
        metalness: 0.85,
    }));

    const laptopScreenMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x38bdf8, // Illuminated LCD monitor display
        emissive: 0x0284c7,
        emissiveIntensity: 1.5,
        roughness: 0.1,
    }));

    const solarPanelMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.2,
        metalness: 0.9,
    }));

    // =========================================================================
    // 1. LANDSCAPED PLINTH & FOUNDATION TERRACE
    // =========================================================================
    const gardenBaseGeom = trackGeom(new THREE.BoxGeometry(26, 0.4, 22));
    const gardenBase = new THREE.Mesh(gardenBaseGeom, grassMat);
    gardenBase.position.set(0, -0.2, 0);
    gardenBase.receiveShadow = true;
    poolGroup.add(gardenBase);

    // Stepping Stone Walkway leading to Entrance
    const stoneGeom = trackGeom(new THREE.BoxGeometry(1.2, 0.08, 0.6));
    for (let s = -3; s <= 3; s++) {
        const step = new THREE.Mesh(stoneGeom, copingMat);
        step.position.set(s * 1.5, 0.04, 7.8);
        poolGroup.add(step);
    }

    // Modern Perimeter Boxwood Hedges
    const hedgeGeom = trackGeom(new THREE.BoxGeometry(25.6, 0.8, 0.6));
    const hedgeBack = new THREE.Mesh(hedgeGeom, hedgeMat);
    hedgeBack.position.set(0, 0.4, -10.6);
    poolGroup.add(hedgeBack);

    // =========================================================================
    // 2. INFINITY SWIMMING POOL & TEAK SUN-DECK
    // =========================================================================
    const deckGeom = trackGeom(new THREE.BoxGeometry(10.5, 0.25, 7.5));
    const teakDeck = new THREE.Mesh(deckGeom, teakMat);
    teakDeck.position.set(-6.5, 0.125, -2.5);
    teakDeck.receiveShadow = true;
    poolGroup.add(teakDeck);

    // Pool Shell Basin
    const poolShellGeom = trackGeom(new THREE.BoxGeometry(7.2, 1.4, 4.2));
    const poolShell = new THREE.Mesh(poolShellGeom, poolTileMat);
    poolShell.position.set(-6.5, -0.5, -2.5);
    poolGroup.add(poolShell);

    // Coping Edge Frame
    const copingGeom = trackGeom(new THREE.BoxGeometry(7.6, 0.06, 4.6));
    const coping = new THREE.Mesh(copingGeom, copingMat);
    coping.position.set(-6.5, 0.26, -2.5);
    poolGroup.add(coping);

    // Submerged Step Bench
    const stepBenchGeom = trackGeom(new THREE.BoxGeometry(1.2, 0.4, 3.8));
    const stepBench = new THREE.Mesh(stepBenchGeom, poolTileMat);
    stepBench.position.set(-9.4, -0.3, -2.5);
    poolGroup.add(stepBench);

    // Dynamic Swimming Pool Water Surface Mesh
    const waterGeom = trackGeom(new THREE.PlaneGeometry(6.8, 3.8, 24, 24));
    const waterMesh = new THREE.Mesh(waterGeom, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(-6.5, 0.18, -2.5);
    poolGroup.add(waterMesh);

    // Submerged Underwater LED Pool Glow
    const poolGlowLight = new THREE.PointLight(0x06b6d4, 1.8, 8);
    poolGlowLight.position.set(-6.5, -0.2, -2.5);
    poolGroup.add(poolGlowLight);

    // Glass Infinity Edge Barrier on the Far Side
    const infinityGlassGeom = trackGeom(new THREE.BoxGeometry(0.08, 0.65, 4.2));
    const infinityGlass = new THREE.Mesh(infinityGlassGeom, glassBalustradeMat);
    infinityGlass.position.set(-10.15, 0.35, -2.5);
    poolGroup.add(infinityGlass);

    // Pool Stainless Steel Ladder
    const railGeom = trackGeom(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 8));
    const rail1 = new THREE.Mesh(railGeom, chromeMat);
    rail1.position.set(-3.2, 0.45, -1.0);
    const rail2 = new THREE.Mesh(railGeom, chromeMat);
    rail2.position.set(-3.2, 0.45, -1.4);
    poolGroup.add(rail1, rail2);

    // 2 Luxury Pool Loungers
    const loungerOffsets = [-3.8, -2.2];
    for (const lz of loungerOffsets) {
        const frame = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.9, 0.18, 0.65)), teakMat);
        frame.position.set(-4.5, 0.35, lz);

        const cushion = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.8, 0.08, 0.6)), cushionWhiteMat);
        cushion.position.set(-4.5, 0.48, lz);

        const pillow = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.35, 0.07, 0.5)), trackMat(new THREE.MeshStandardMaterial({ color: 0x0284c7 })));
        pillow.position.set(-5.2, 0.55, lz);
        pillow.rotation.z = 0.25;

        poolGroup.add(frame, cushion, pillow);
    }

    // =========================================================================
    // 3. OUTDOOR BBQ PERGOLA & BAR
    // =========================================================================
    const bbqGroup = new THREE.Group();
    bbqGroup.position.set(-8.5, 0.25, 2.5);

    // Pergola Slats
    const pergolaSlatGeom = trackGeom(new THREE.BoxGeometry(4.0, 0.1, 0.15));
    for (let p = -1.2; p <= 1.2; p += 0.4) {
        const slat = new THREE.Mesh(pergolaSlatGeom, teakMat);
        slat.position.set(0, 2.6, p);
        bbqGroup.add(slat);
    }

    // Pergola Posts
    const postGeom = trackGeom(new THREE.BoxGeometry(0.15, 2.6, 0.15));
    [[-1.8, -1.2], [1.8, -1.2], [-1.8, 1.2], [1.8, 1.2]].forEach(([px, pz]) => {
        const post = new THREE.Mesh(postGeom, teakMat);
        post.position.set(px, 1.3, pz);
        bbqGroup.add(post);
    });

    // Outdoor Granite BBQ Counter
    const counter = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.4, 0.9, 0.8)), marbleWhiteMat);
    counter.position.set(0, 0.45, 0);
    const grill = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.9, 0.1, 0.5)), chromeMat);
    grill.position.set(0, 0.95, 0);
    bbqGroup.add(counter, grill);
    poolGroup.add(bbqGroup);

    // =========================================================================
    // 4. GROUND FLOOR SUITES (LIVING ROOM, KITCHEN, & EXECUTIVE HOME OFFICE)
    // =========================================================================
    // --- Living Room Lounge ---
    const livingGroup = new THREE.Group();
    livingGroup.position.set(-1.8, 0.2, -0.6);

    const sofaMain = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.1, 0.5, 0.85)), sofaFabricMat);
    sofaMain.position.set(0, 0.35, 0);
    const sofaBack = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.1, 0.45, 0.2)), sofaFabricMat);
    sofaBack.position.set(0, 0.75, 0.35);
    const sofaChaise = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.85, 0.5, 1.2)), sofaFabricMat);
    sofaChaise.position.set(-0.62, 0.35, -0.9);

    const pillow1 = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.35, 0.25, 0.12)), trackMat(new THREE.MeshStandardMaterial({ color: 0x38bdf8 })));
    pillow1.position.set(0.6, 0.68, 0.22);
    pillow1.rotation.y = 0.2;
    const pillow2 = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.35, 0.25, 0.12)), trackMat(new THREE.MeshStandardMaterial({ color: 0xf59e0b })));
    pillow2.position.set(-0.3, 0.68, 0.22);

    livingGroup.add(sofaMain, sofaBack, sofaChaise, pillow1, pillow2);

    // Scandinavian Oak Coffee Table & Rug
    const coffeeTable = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.2, 0.32, 0.65)), oakWoodMat);
    coffeeTable.position.set(0.2, 0.25, -0.7);
    const rug = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.4, 0.02, 2.0)), trackMat(new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95 })));
    rug.position.set(-0.1, 0.02, -0.6);
    livingGroup.add(coffeeTable, rug);

    // 75" TV Wall & Arc Lamp
    const tvWall = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.0, 1.8, 0.06)), darkSlateMat);
    tvWall.position.set(0.1, 1.1, -1.8);
    const tvScreen = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.6, 0.9, 0.03)), trackMat(new THREE.MeshBasicMaterial({ color: 0x090d16 })));
    tvScreen.position.set(0.1, 1.25, -1.75);
    livingGroup.add(tvWall, tvScreen);

    furnitureGroup.add(livingGroup);

    // --- Kitchen & Dining ---
    const kitchenGroup = new THREE.Group();
    kitchenGroup.position.set(2.0, 0.2, 0.4);

    const island = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.2, 0.9, 0.95)), marbleWhiteMat);
    island.position.set(0, 0.55, -0.8);
    kitchenGroup.add(island);

    const diningTable = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.8, 0.75, 0.9)), teakMat);
    diningTable.position.set(0, 0.45, 1.2);
    kitchenGroup.add(diningTable);

    const chairOffsets = [[-0.55, 0.7], [0.55, 0.7], [-0.55, 1.7], [0.55, 1.7]];
    for (const [cx, cz] of chairOffsets) {
        const chair = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.4, 0.8, 0.4)), darkSlateMat);
        chair.position.set(cx, 0.48, cz);
        kitchenGroup.add(chair);
    }
    furnitureGroup.add(kitchenGroup);

    // --- GROUND FLOOR EXECUTIVE STUDY (DESK + LAPTOP + DUAL MONITORS) ---
    const groundOffice = new THREE.Group();
    groundOffice.position.set(2.2, 0.2, -1.8);

    // Executive Work Desk
    const desk = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.6, 0.06, 0.8)), deskTopMat);
    desk.position.set(0, 0.42, 0);
    const leg1 = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6)), darkSlateMat);
    leg1.position.set(-0.7, 0.21, 0.3);
    const leg2 = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6)), darkSlateMat);
    leg2.position.set(0.7, 0.21, 0.3);
    groundOffice.add(desk, leg1, leg2);

    // High-Back Ergonomic Office Chair
    const chairSeat = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.48, 0.06, 0.45)), darkSlateMat);
    chairSeat.position.set(0, 0.32, 0.55);
    const chairBack = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.48, 0.55, 0.06)), darkSlateMat);
    chairBack.position.set(0, 0.6, 0.75);
    groundOffice.add(chairSeat, chairBack);

    // Open Laptop with Glowing Active BIM IDE Display
    const laptopBase = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.36, 0.015, 0.24)), laptopBodyMat);
    laptopBase.position.set(-0.25, 0.46, 0.02);
    const laptopScreen = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.36, 0.24, 0.015)), laptopScreenMat);
    laptopScreen.position.set(-0.25, 0.58, -0.09);
    laptopScreen.rotation.x = -0.22;
    groundOffice.add(laptopBase, laptopScreen);

    // Secondary 27" Curved Ultra-wide Designer Display
    const secMonitorStand = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8)), chromeMat);
    secMonitorStand.position.set(0.3, 0.55, -0.1);
    const secMonitor = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.65, 0.38, 0.02)), laptopScreenMat);
    secMonitor.position.set(0.3, 0.72, -0.1);
    secMonitor.rotation.y = -0.15;
    groundOffice.add(secMonitorStand, secMonitor);

    // Minimalist Bookshelf Unit
    const bookshelf = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.2, 1.4, 0.3)), teakMat);
    bookshelf.position.set(-0.9, 0.7, -0.5);
    groundOffice.add(bookshelf);

    furnitureGroup.add(groundOffice);

    // =========================================================================
    // 5. FIRST FLOOR SUITES (MASTER BEDROOM & ARCHITECTURAL STUDIO WITH LAPTOP)
    // =========================================================================
    const upperFloorGroup = new THREE.Group();
    upperFloorGroup.position.set(0, 3.1, 0);

    // Intermediate Upper Floor Slab
    const upperSlab = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(5.2, 0.14, 4.4)), oakWoodMat);
    upperSlab.position.set(0, 0.07, 0);
    upperFloorGroup.add(upperSlab);

    // King Size Platform Bed
    const bedFrame = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.0, 0.35, 2.2)), darkSlateMat);
    bedFrame.position.set(-0.8, 0.25, 0.6);
    const headboard = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.2, 0.9, 0.15)), darkSlateMat);
    headboard.position.set(-0.8, 0.65, 1.65);
    const mattress = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.85, 0.3, 2.0)), cushionWhiteMat);
    mattress.position.set(-0.8, 0.5, 0.55);
    const throwRunner = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.88, 0.04, 0.65)), trackMat(new THREE.MeshStandardMaterial({ color: 0x1d4ed8 })));
    throwRunner.position.set(-0.8, 0.66, -0.15);
    upperFloorGroup.add(bedFrame, headboard, mattress, throwRunner);

    // --- FIRST FLOOR ARCHITECTURAL STUDIO / WORKSTATION (DESK + LAPTOP) ---
    const studioGroup = new THREE.Group();
    studioGroup.position.set(1.4, 0.07, -0.4);

    const studioDesk = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.4, 0.05, 0.7)), teakMat);
    studioDesk.position.set(0, 0.42, 0);

    const studioChair = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.42, 0.5, 0.4)), darkSlateMat);
    studioChair.position.set(0, 0.35, 0.5);

    // Studio Laptop with Glowing Display
    const studioLaptop = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.34, 0.015, 0.22)), laptopBodyMat);
    studioLaptop.position.set(0, 0.46, 0.02);
    const studioScreen = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.34, 0.22, 0.015)), laptopScreenMat);
    studioScreen.position.set(0, 0.57, -0.08);
    studioScreen.rotation.x = -0.2;

    // Architectural Maquette on Studio Display Plinth
    const plinth = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.3, 0.15, 0.3)), marbleWhiteMat);
    plinth.position.set(0.5, 0.5, -0.15);
    const miniModel = new THREE.Mesh(trackGeom(new THREE.ConeGeometry(0.08, 0.15, 4)), chromeMat);
    miniModel.position.set(0.5, 0.65, -0.15);

    studioGroup.add(studioDesk, studioChair, studioLaptop, studioScreen, plinth, miniModel);
    upperFloorGroup.add(studioGroup);

    // Tempered Glass Balcony Balustrade
    const balconyGlass = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(4.8, 0.9, 0.05)), glassBalustradeMat);
    balconyGlass.position.set(0, 0.55, -2.15);
    const handrail = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(4.85, 0.06, 0.08)), chromeMat);
    handrail.position.set(0, 1.0, -2.15);
    upperFloorGroup.add(balconyGlass, handrail);

    furnitureGroup.add(upperFloorGroup);

    // =========================================================================
    // 6. ROOFTOP SOLAR PHOTOVOLTAIC ARRAY
    // =========================================================================
    const roofSolarGroup = new THREE.Group();
    roofSolarGroup.position.set(0, 6.2, 0);

    const panelGeom = trackGeom(new THREE.BoxGeometry(1.2, 0.04, 1.8));
    for (let x = -1.6; x <= 1.6; x += 1.6) {
        for (let z = -1.2; z <= 1.2; z += 2.2) {
            const panel = new THREE.Mesh(panelGeom, solarPanelMat);
            panel.position.set(x, 0.2, z);
            panel.rotation.x = 0.2; // 12-degree solar pitch
            roofSolarGroup.add(panel);
        }
    }
    rootGroup.add(roofSolarGroup);

    // Assemble Everything Under Root Group
    rootGroup.add(poolGroup);
    rootGroup.add(furnitureGroup);

    // Gentle wave sinusoidal animation on water surface vertices
    const updateWater = (time: number) => {
        const posAttr = waterGeom.attributes.position;
        if (!posAttr) return;
        const count = posAttr.count;
        for (let i = 0; i < count; i++) {
            const u = posAttr.getX(i);
            const v = posAttr.getY(i);
            const wave = Math.sin(u * 1.8 + time * 2.2) * 0.02 + Math.cos(v * 2.0 + time * 1.8) * 0.015;
            posAttr.setZ(i, wave);
        }
        posAttr.needsUpdate = true;
    };

    const togglePool = (visible: boolean) => {
        poolGroup.visible = visible;
    };

    const toggleFurniture = (visible: boolean) => {
        furnitureGroup.visible = visible;
    };

    const dispose = () => {
        disposables.geometries.forEach((g) => g.dispose());
        disposables.materials.forEach((m) => m.dispose());
        disposables.geometries = [];
        disposables.materials = [];
    };

    return {
        group: rootGroup,
        updateWater,
        togglePool,
        toggleFurniture,
        dispose,
    };
}
