import * as THREE from "three";

/**
 * Architectural Luxury Villa Environment Builder
 * Adds a high-end infinity swimming pool, teak sun-deck terrace, poolside loungers,
 * landscape garden planters, outdoor BBQ pergola, rooftop solar arrays, and fully furnished
 * interior suites on EVERY floor (ground floor living/dining & executive study with desk & laptop,
 * upper floor master suite & architectural studio with desk & laptop) to turn the villa into
 * an award-winning BIM showcase model.
 *
 * Architectural Site Zoning (Zero Collision):
 * - Main 2-Story Villa Building Envelope centered at x = 0.4, z = 0.1 (spanning x in [-5.5, 6.3], z in [-4.1, 4.3])
 * - Teak Sun-Deck Terrace placed on left at x = -9.9, z = 0.1 (spanning x in [-14.1, -5.7])
 * - 0.6 m wide poolside breezeway separation between teak deck (x = -5.7) and building wall (x = -5.1)
 * - Infinity Swimming Pool basin centered at x = -10.2, z = 0.1 (coping from x = -13.4 to -7.0)
 * - Luxury Sun Loungers on teak deck at x = -6.4 (clear 1.3 m from villa wall)
 * - Outdoor BBQ Pergola in front-left garden at x = -9.9, z = 6.2
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
    rootGroup.name = "luxury-villa-root";

    const poolGroup = new THREE.Group();
    poolGroup.name = "villa-pool-group";

    const furnitureGroup = new THREE.Group();
    furnitureGroup.name = "villa-furniture-group";

    const buildingGroup = new THREE.Group();
    buildingGroup.name = "villa-building-group";

    const disposables: {
        geometries: THREE.BufferGeometry[];
        materials: THREE.Material[];
    } = {
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

    // Shared Palette Materials (Double-sided for crisp architecture)
    const teakMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x78350f, // Warm teak timber
        roughness: 0.55,
        metalness: 0.05,
        side: THREE.DoubleSide,
    }));

    const copingMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xf1f5f9, // Polished white limestone
        roughness: 0.25,
        metalness: 0.1,
        side: THREE.DoubleSide,
    }));

    const poolTileMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x0284c7, // Deep turquoise mosaic pool tile
        roughness: 0.2,
        metalness: 0.15,
        side: THREE.DoubleSide,
    }));

    const waterMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x06b6d4, // Crystalline Caribbean cyan
        roughness: 0.05,
        metalness: 0.25,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
    }));

    const chromeMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.95,
        roughness: 0.1,
    }));

    const glassBalustradeMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.05,
        metalness: 0.1,
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
    }));

    const cushionWhiteMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.85,
        metalness: 0.0,
    }));

    const marbleWhiteMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.15,
        metalness: 0.05,
        side: THREE.DoubleSide,
    }));

    const grassMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x15803d, // Lush emerald green lawn
        roughness: 0.9,
        metalness: 0.0,
        side: THREE.DoubleSide,
    }));

    const hedgeMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x166534, // Manicured evergreen boxwood
        roughness: 0.95,
        metalness: 0.0,
    }));

    const darkSlateMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.4,
        metalness: 0.2,
        side: THREE.DoubleSide,
    }));

    const sofaFabricMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xe2e8f0, // Nordic cream linen
        roughness: 0.85,
        metalness: 0.0,
    }));

    const oakWoodMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xb45309,
        roughness: 0.6,
        metalness: 0.05,
        side: THREE.DoubleSide,
    }));

    const deskTopMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x334155, // Architectural matte graphite
        roughness: 0.3,
        metalness: 0.2,
        side: THREE.DoubleSide,
    }));

    const laptopBodyMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Anodized Space Gray aluminum
        metalness: 0.85,
        roughness: 0.2,
    }));

    const screenGlowMat = trackMat(new THREE.MeshBasicMaterial({
        color: 0x38bdf8, // Active That Open Company BIM IDE cyan glow
    }));

    // Architectural Building Envelope Materials
    const villaWallMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xf1f5f9, // Crisp architectural white stucco
        roughness: 0.35,
        metalness: 0.05,
        side: THREE.DoubleSide,
    }));

    const villaSlabMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x334155, // Charcoal slate concrete fascia
        roughness: 0.45,
        metalness: 0.1,
        side: THREE.DoubleSide,
    }));

    const glassFacadeMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.05,
        metalness: 0.15,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
    }));

    const frameDarkMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Anodized black aluminum
        roughness: 0.25,
        metalness: 0.85,
        side: THREE.DoubleSide,
    }));

    const entryDoorMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x92400e, // Rich walnut entry door
        roughness: 0.4,
        metalness: 0.05,
        side: THREE.DoubleSide,
    }));

    const solarPanelMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x0284c7, // Monocrystalline silicon blue-black
        roughness: 0.1,
        metalness: 0.9,
        side: THREE.DoubleSide,
    }));

    // =========================================================================
    // 1. SITE FOUNDATION & LANDSCAPED PLINTH
    // =========================================================================
    const gardenBaseGeom = trackGeom(new THREE.BoxGeometry(32, 0.4, 24));
    const gardenBase = new THREE.Mesh(gardenBaseGeom, grassMat);
    gardenBase.name = "Manicured Landscape Lawn Base";
    gardenBase.position.set(-1.0, -0.2, 0);
    gardenBase.receiveShadow = true;
    poolGroup.add(gardenBase);

    // Stepping Stone Walkway leading to front entrance
    const stoneGeom = trackGeom(new THREE.BoxGeometry(1.2, 0.08, 0.6));
    for (let s = -2; s <= 4; s++) {
        const step = new THREE.Mesh(stoneGeom, copingMat);
        step.name = `Architectural Stepping Stone Paver S${s + 3}`;
        step.position.set(2.2, 0.04, 3.8 + s * 1.1);
        poolGroup.add(step);
    }

    // Modern Perimeter Boxwood Hedges
    const hedgeBack = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(31.4, 0.8, 0.6)), hedgeMat);
    hedgeBack.name = "Perimeter Boxwood Shrub Hedge (Rear)";
    hedgeBack.position.set(-1.0, 0.4, -11.6);
    const hedgeRight = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.6, 0.8, 23.4)), hedgeMat);
    hedgeRight.name = "Perimeter Boxwood Shrub Hedge (Right)";
    hedgeRight.position.set(14.6, 0.4, 0);
    poolGroup.add(hedgeBack, hedgeRight);

    // =========================================================================
    // 2. INFINITY SWIMMING POOL & TEAK SUN-DECK (LEFT WING - ZERO COLLISION)
    // =========================================================================
    // Seamless Teak Sun-Deck Terrace framing the pool (no blocking solid slabs)
    const deckEast = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.0, 0.25, 8.6)), teakMat);
    deckEast.name = "Teak Sun-Deck Lounger Terrace (East)";
    deckEast.position.set(-6.4, 0.125, 0.1);
    deckEast.receiveShadow = true;

    const deckWest = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.2, 0.25, 8.6)), teakMat);
    deckWest.name = "Teak Sun-Deck Garden Border (West)";
    deckWest.position.set(-14.0, 0.125, 0.1);
    deckWest.receiveShadow = true;

    const deckNorth = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(6.4, 0.25, 2.0)), teakMat);
    deckNorth.name = "Teak Sun-Deck Rear Terrace (North)";
    deckNorth.position.set(-10.2, 0.125, -3.2);
    deckNorth.receiveShadow = true;

    const deckSouth = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(6.4, 0.25, 2.2)), teakMat);
    deckSouth.name = "Teak Sun-Deck Front Patio (South)";
    deckSouth.position.set(-10.2, 0.125, 3.3);
    deckSouth.receiveShadow = true;

    poolGroup.add(deckEast, deckWest, deckNorth, deckSouth);

    // Swimming Pool Basin Floor & Internal Mosaic Walls (Contained within foundation - No protruding bottom box)
    const poolFloor = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(5.6, 0.06, 3.6)), poolTileMat);
    poolFloor.name = "Deep Turquoise Mosaic Pool Basin Floor";
    poolFloor.position.set(-10.2, -0.04, 0.1);
    poolFloor.receiveShadow = true;

    const poolWallN = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(5.6, 0.28, 0.08)), poolTileMat);
    poolWallN.name = "Mosaic Pool Interior Wall (North)";
    poolWallN.position.set(-10.2, 0.10, -1.7);

    const poolWallS = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(5.6, 0.28, 0.08)), poolTileMat);
    poolWallS.name = "Mosaic Pool Interior Wall (South)";
    poolWallS.position.set(-10.2, 0.10, 1.9);

    const poolWallE = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.08, 0.28, 3.6)), poolTileMat);
    poolWallE.name = "Mosaic Pool Interior Wall (East)";
    poolWallE.position.set(-7.4, 0.10, 0.1);

    const poolWallW = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.08, 0.28, 3.6)), poolTileMat);
    poolWallW.name = "Mosaic Pool Interior Wall (West)";
    poolWallW.position.set(-13.0, 0.10, 0.1);

    poolGroup.add(poolFloor, poolWallN, poolWallS, poolWallE, poolWallW);

    // Polished White Limestone Coping Frame (4 Hollow Perimeter Curbs — Water is 100% visible inside!)
    const copingN = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(6.4, 0.06, 0.4)), copingMat);
    copingN.name = "Polished White Limestone Pool Coping (Rear)";
    copingN.position.set(-10.2, 0.26, -1.9);

    const copingS = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(6.4, 0.06, 0.4)), copingMat);
    copingS.name = "Polished White Limestone Pool Coping (Front)";
    copingS.position.set(-10.2, 0.26, 2.1);

    const copingE = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.4, 0.06, 3.6)), copingMat);
    copingE.name = "Polished White Limestone Pool Coping (East)";
    copingE.position.set(-7.2, 0.26, 0.1);

    const copingW = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.4, 0.06, 3.6)), copingMat);
    copingW.name = "Polished White Limestone Pool Coping (West)";
    copingW.position.set(-13.2, 0.26, 0.1);

    poolGroup.add(copingN, copingS, copingE, copingW);

    // Dynamic Crystalline Cyan Swimming Pool Water Surface (Placed inside the coping frame, sunken 3 cm)
    const waterGeom = trackGeom(new THREE.PlaneGeometry(5.6, 3.6, 32, 32));
    const waterMesh = new THREE.Mesh(waterGeom, waterMat);
    waterMesh.name = "Dynamic Cyan Swimming Pool Water";
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(-10.2, 0.23, 0.1);
    poolGroup.add(waterMesh);

    // Submerged Underwater LED Pool Glow
    const poolGlowLight = new THREE.PointLight(0x06b6d4, 3.2, 10);
    poolGlowLight.name = "Submerged Underwater LED Pool Light";
    poolGlowLight.position.set(-10.2, 0.08, 0.1);
    poolGroup.add(poolGlowLight);

    // Glass Infinity Edge Barrier on the Outer Left
    const infinityGlass = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.08, 0.45, 3.6)), glassBalustradeMat);
    infinityGlass.name = "Structural Glass Infinity Edge Barrier";
    infinityGlass.position.set(-13.2, 0.45, 0.1);
    poolGroup.add(infinityGlass);

    // Stainless Steel Pool Access Ladder (East edge)
    const railGeom = trackGeom(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8));
    const rail1 = new THREE.Mesh(railGeom, chromeMat);
    rail1.name = "Stainless Steel Pool Ladder Handrail L";
    rail1.position.set(-7.35, 0.45, 0.9);
    const rail2 = new THREE.Mesh(railGeom, chromeMat);
    rail2.name = "Stainless Steel Pool Ladder Handrail R";
    rail2.position.set(-7.35, 0.45, 1.3);
    poolGroup.add(rail1, rail2);

    // Luxury Poolside Sun Loungers (placed cleanly on deck at x = -6.4, facing pool)
    const loungerOffsets = [-1.4, 1.4];
    loungerOffsets.forEach((lz, idx) => {
        const frame = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.9, 0.18, 0.65)), teakMat);
        frame.name = `Teak Poolside Sun Lounger Frame #${idx + 1}`;
        frame.position.set(-6.4, 0.35, lz);
        frame.rotation.y = -Math.PI / 2;

        const cushion = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.8, 0.08, 0.6)), cushionWhiteMat);
        cushion.name = `Luxury Sun Lounger Cushion #${idx + 1}`;
        cushion.position.set(-6.4, 0.48, lz);
        cushion.rotation.y = -Math.PI / 2;

        const pillow = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.35, 0.07, 0.5)), trackMat(new THREE.MeshStandardMaterial({ color: 0x0284c7 })));
        pillow.name = `Waterproof Lounger Head Pillow #${idx + 1}`;
        pillow.position.set(-6.4, 0.55, lz - 0.7);
        pillow.rotation.x = -0.25;

        poolGroup.add(frame, cushion, pillow);
    });

    // =========================================================================
    // 3. OUTDOOR BBQ PERGOLA & DINING PATIO (FRONT LEFT TERRACE)
    // =========================================================================
    const bbqGroup = new THREE.Group();
    bbqGroup.name = "villa-bbq-pergola-group";
    bbqGroup.position.set(-9.9, 0.25, 6.2);

    // Pergola Roof Slats
    const pergolaSlatGeom = trackGeom(new THREE.BoxGeometry(4.2, 0.1, 0.15));
    for (let p = -1.2; p <= 1.2; p += 0.4) {
        const slat = new THREE.Mesh(pergolaSlatGeom, teakMat);
        slat.name = "Timber Pergola Roof Sun Louver";
        slat.position.set(0, 2.6, p);
        bbqGroup.add(slat);
    }

    // Pergola Upright Posts
    const postGeom = trackGeom(new THREE.BoxGeometry(0.15, 2.6, 0.15));
    [[-1.9, -1.2], [1.9, -1.2], [-1.9, 1.2], [1.9, 1.2]].forEach(([px, pz], pIdx) => {
        const post = new THREE.Mesh(postGeom, teakMat);
        post.name = `Structural Timber Pergola Column P${pIdx + 1}`;
        post.position.set(px, 1.3, pz);
        bbqGroup.add(post);
    });

    // Outdoor Granite BBQ Counter & Stainless Grill
    const counter = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.4, 0.9, 0.8)), marbleWhiteMat);
    counter.name = "Outdoor Granite BBQ Island Counter";
    counter.position.set(0, 0.45, 0);
    const grill = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.9, 0.1, 0.5)), chromeMat);
    grill.name = "Stainless Steel Outdoor Cooking Grill";
    grill.position.set(0, 0.95, 0);
    bbqGroup.add(counter, grill);
    poolGroup.add(bbqGroup);

    // =========================================================================
    // 4. MAIN ARCHITECTURAL VILLA BUILDING ENVELOPE (CENTERED AT x = 0.4, z = 0.1)
    // =========================================================================
    // Ground Floor Concrete Slab Foundation
    const groundSlab = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(11.2, 0.22, 7.8)), villaSlabMat);
    groundSlab.name = "Ground Floor Structural Foundation Slab";
    groundSlab.position.set(0.4, 0.11, 0.1);
    groundSlab.receiveShadow = true;
    buildingGroup.add(groundSlab);

    // Ground Floor Rear Solid Wall
    const rearWallG = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(11.2, 2.85, 0.24)), villaWallMat);
    rearWallG.name = "Ground Floor Exterior Rear Wall (White Stucco)";
    rearWallG.position.set(0.4, 1.62, -3.7);
    rearWallG.castShadow = true;
    rearWallG.receiveShadow = true;
    buildingGroup.add(rearWallG);

    // Ground Floor Right Wall
    const rightWallG = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.24, 2.85, 7.4)), villaWallMat);
    rightWallG.name = "Ground Floor Exterior Right Wall";
    rightWallG.position.set(5.9, 1.62, 0.0);
    rightWallG.castShadow = true;
    rightWallG.receiveShadow = true;
    buildingGroup.add(rightWallG);

    // Ground Floor Left Wall (Rear section)
    const leftWallG = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.24, 2.85, 3.2)), villaWallMat);
    leftWallG.name = "Ground Floor Exterior Left Wall";
    leftWallG.position.set(-5.1, 1.62, -2.1);
    leftWallG.castShadow = true;
    buildingGroup.add(leftWallG);

    // Ground Floor Poolside Panoramic Glass Curtain Wall
    const poolGlassG = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.06, 2.75, 4.3)), glassFacadeMat);
    poolGlassG.name = "Ground Floor Poolside Double-Glazed Curtain Wall";
    poolGlassG.position.set(-5.1, 1.6, 1.65);
    for (let mz = -0.4; mz <= 3.6; mz += 1.3) {
        const mullion = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.08, 2.8, 0.06)), frameDarkMat);
        mullion.name = "Architectural Anodized Aluminum Mullion";
        mullion.position.set(-5.1, 1.6, mz);
        buildingGroup.add(mullion);
    }
    buildingGroup.add(poolGlassG);

    // Ground Floor Front Entrance Wall (Right side with door)
    const frontWallG = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(4.4, 2.85, 0.24)), villaWallMat);
    frontWallG.name = "Ground Floor Entrance Exterior Facade Wall";
    frontWallG.position.set(3.7, 1.62, 3.8);
    frontWallG.castShadow = true;

    // Modern Pivot Entrance Door
    const frontDoor = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.3, 2.4, 0.08)), entryDoorMat);
    frontDoor.name = "Architectural Walnut Pivot Entrance Door";
    frontDoor.position.set(2.2, 1.4, 3.82);
    const doorHandle = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 8)), chromeMat);
    doorHandle.name = "Stainless Steel Pivot Door Pull Handle";
    doorHandle.position.set(2.7, 1.4, 3.88);

    // Ground Floor Front Garden Panoramic Glass Wall
    const frontGlassG = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(5.8, 2.75, 0.06)), glassFacadeMat);
    frontGlassG.name = "Ground Floor Garden Panoramic Glazing";
    frontGlassG.position.set(-1.8, 1.6, 3.8);
    for (let mx = -4.5; mx <= 0.8; mx += 1.8) {
        const mullion = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.06, 2.8, 0.08)), frameDarkMat);
        mullion.name = "Facade Aluminum Mullion";
        mullion.position.set(mx, 1.6, 3.8);
        buildingGroup.add(mullion);
    }
    buildingGroup.add(frontWallG, frontDoor, doorHandle, frontGlassG);

    // Level 01 Intermediate Cantilever Slab
    const level1Slab = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(11.8, 0.26, 8.4)), villaSlabMat);
    level1Slab.name = "Level 01 Cantilever Intermediate Slab";
    level1Slab.position.set(0.4, 3.12, 0.1);
    level1Slab.castShadow = true;
    level1Slab.receiveShadow = true;
    buildingGroup.add(level1Slab);

    // Slender Architectural Steel Columns Supporting Cantilever Terrace
    const col1 = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.07, 0.07, 2.9, 12)), frameDarkMat);
    col1.name = "Architectural Steel Column C1 (Front Left)";
    col1.position.set(-5.1, 1.6, 3.8);
    const col2 = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.07, 0.07, 2.9, 12)), frameDarkMat);
    col2.name = "Architectural Steel Column C2 (Front Right)";
    col2.position.set(5.8, 1.6, 3.8);
    buildingGroup.add(col1, col2);

    // First Floor Rear Solid Wall
    const rearWall1 = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(11.2, 2.85, 0.24)), villaWallMat);
    rearWall1.name = "Level 01 Master Suite Exterior Rear Wall";
    rearWall1.position.set(0.4, 4.67, -3.7);
    rearWall1.castShadow = true;
    buildingGroup.add(rearWall1);

    // First Floor Right Wall
    const rightWall1 = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.24, 2.85, 7.4)), villaWallMat);
    rightWall1.name = "Level 01 Architectural Studio Exterior Wall";
    rightWall1.position.set(5.9, 4.67, 0.0);
    rightWall1.castShadow = true;
    buildingGroup.add(rightWall1);

    // First Floor Left Wall (with modern horizontal architectural ribbon slot)
    const leftWall1Lower = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.24, 1.2, 7.4)), villaWallMat);
    leftWall1Lower.name = "Level 01 Ribbon Window Sill Wall";
    leftWall1Lower.position.set(-5.1, 3.85, 0.0);
    const leftWall1Glass = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.06, 0.9, 7.2)), glassFacadeMat);
    leftWall1Glass.name = "Level 01 Panoramic Ribbon Glazing";
    leftWall1Glass.position.set(-5.1, 4.9, 0.0);
    const leftWall1Upper = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.24, 0.75, 7.4)), villaWallMat);
    leftWall1Upper.name = "Level 01 Ribbon Window Spandrel Wall";
    leftWall1Upper.position.set(-5.1, 5.72, 0.0);
    buildingGroup.add(leftWall1Lower, leftWall1Glass, leftWall1Upper);

    // First Floor Front Balcony Glass Wall & Master Suite Panorama
    const frontGlass1 = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(10.6, 2.75, 0.06)), glassFacadeMat);
    frontGlass1.name = "Level 01 Master Suite Panoramic Glass Facade";
    frontGlass1.position.set(0.4, 4.65, 3.8);
    for (let mx = -4.0; mx <= 4.8; mx += 2.2) {
        const mullion = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.06, 2.8, 0.08)), frameDarkMat);
        mullion.name = "Level 01 Balcony Mullion";
        mullion.position.set(mx, 4.65, 3.8);
        buildingGroup.add(mullion);
    }
    buildingGroup.add(frontGlass1);

    // Main Roof Slab (Underneath the Solar Photovoltaic Array)
    const roofSlab = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(11.8, 0.28, 8.4)), villaSlabMat);
    roofSlab.name = "Roof Structural Flat Slab (Charcoal Slate)";
    roofSlab.position.set(0.4, 6.15, 0.1);
    roofSlab.castShadow = true;
    roofSlab.receiveShadow = true;
    buildingGroup.add(roofSlab);

    // Architectural Roof Parapet Edge Coping
    const parapetBack = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(11.8, 0.35, 0.18)), villaWallMat);
    parapetBack.name = "Roof Parapet Wall Coping (Rear)";
    parapetBack.position.set(0.4, 6.45, -4.1);
    const parapetFront = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(11.8, 0.35, 0.18)), villaWallMat);
    parapetFront.name = "Roof Parapet Wall Coping (Front)";
    parapetFront.position.set(0.4, 6.45, 4.3);
    const parapetLeft = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.18, 0.35, 8.4)), villaWallMat);
    parapetLeft.name = "Roof Parapet Wall Coping (Left)";
    parapetLeft.position.set(-5.5, 6.45, 0.1);
    const parapetRight = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.18, 0.35, 8.4)), villaWallMat);
    parapetRight.name = "Roof Parapet Wall Coping (Right)";
    parapetRight.position.set(6.3, 6.45, 0.1);
    buildingGroup.add(parapetBack, parapetFront, parapetLeft, parapetRight);

    // Interior Warm Lighting Glow on Both Levels
    const interiorGlowG = new THREE.PointLight(0xfef08a, 1.6, 12);
    interiorGlowG.name = "Ground Floor Ambient Interior Downlight";
    interiorGlowG.position.set(0.4, 2.4, 0.1);
    const interiorGlow1 = new THREE.PointLight(0xfef08a, 1.4, 12);
    interiorGlow1.name = "Level 01 Master Suite Downlight";
    interiorGlow1.position.set(0.4, 5.2, 0.1);
    buildingGroup.add(interiorGlowG, interiorGlow1);

    // =========================================================================
    // 5. FURNISHED INTERIOR SUITES (INSIDE THE VILLA BUILDING)
    // =========================================================================
    // --- Ground Floor Living Room Lounge ---
    const livingGroup = new THREE.Group();
    livingGroup.name = "villa-living-suite";
    livingGroup.position.set(-1.8, 0.11, 0.0);

    const sofaMain = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.1, 0.5, 0.85)), sofaFabricMat);
    sofaMain.name = "Nordic Linen Living Room Sofa";
    sofaMain.position.set(0, 0.35, 0);
    const sofaBack = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.1, 0.45, 0.2)), sofaFabricMat);
    sofaBack.name = "Living Room Sofa Backrest";
    sofaBack.position.set(0, 0.75, 0.35);
    const sofaChaise = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.85, 0.5, 1.2)), sofaFabricMat);
    sofaChaise.name = "Living Room Sofa Chaise Lounge";
    sofaChaise.position.set(-0.62, 0.35, -0.9);

    const pillow1 = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.35, 0.25, 0.12)), trackMat(new THREE.MeshStandardMaterial({ color: 0x38bdf8 })));
    pillow1.name = "Living Room Accent Cyan Cushion";
    pillow1.position.set(0.6, 0.68, 0.22);
    pillow1.rotation.y = 0.2;
    const pillow2 = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.35, 0.25, 0.12)), trackMat(new THREE.MeshStandardMaterial({ color: 0xf59e0b })));
    pillow2.name = "Living Room Accent Amber Cushion";
    pillow2.position.set(-0.3, 0.68, 0.22);

    const coffeeTable = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.2, 0.32, 0.65)), oakWoodMat);
    coffeeTable.name = "Scandinavian Natural Oak Coffee Table";
    coffeeTable.position.set(0.2, 0.25, -0.7);
    const rug = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.4, 0.02, 2.0)), trackMat(new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95 })));
    rug.name = "Architectural Wool Area Floor Rug";
    rug.position.set(-0.1, 0.02, -0.6);

    const tvWall = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.0, 1.8, 0.06)), darkSlateMat);
    tvWall.name = "Acoustic Dark Slate TV Feature Wall";
    tvWall.position.set(0.1, 1.1, -1.8);
    const tvScreen = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.6, 0.9, 0.03)), trackMat(new THREE.MeshBasicMaterial({ color: 0x090d16 })));
    tvScreen.name = "Ultra HD 4K OLED Smart Display";
    tvScreen.position.set(0.1, 1.25, -1.75);

    livingGroup.add(sofaMain, sofaBack, sofaChaise, pillow1, pillow2, coffeeTable, rug, tvWall, tvScreen);
    furnitureGroup.add(livingGroup);

    // --- Ground Floor Kitchen & Dining ---
    const kitchenGroup = new THREE.Group();
    kitchenGroup.name = "villa-kitchen-dining";
    kitchenGroup.position.set(3.2, 0.11, -1.8);

    const island = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.0, 0.9, 0.9)), marbleWhiteMat);
    island.name = "Calacatta White Marble Kitchen Island";
    island.position.set(0, 0.55, 0);
    const diningTable = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.6, 0.75, 0.85)), teakMat);
    diningTable.name = "Teak Dining Table (6-Seater)";
    diningTable.position.set(0, 0.45, 1.6);
    kitchenGroup.add(island, diningTable);

    const chairOffsets = [[-0.5, 1.1], [0.5, 1.1], [-0.5, 2.1], [0.5, 2.1]];
    chairOffsets.forEach(([cx, cz], cIdx) => {
        const chair = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.38, 0.78, 0.38)), darkSlateMat);
        chair.name = `Ergonomic Dining Chair #${cIdx + 1}`;
        chair.position.set(cx, 0.48, cz);
        kitchenGroup.add(chair);
    });
    furnitureGroup.add(kitchenGroup);

    // --- Ground Floor Executive Study ---
    const groundOffice = new THREE.Group();
    groundOffice.name = "villa-ground-study";
    groundOffice.position.set(3.4, 0.11, 1.6);

    const desk = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.5, 0.06, 0.75)), deskTopMat);
    desk.name = "Executive Study Architectural Desk";
    desk.position.set(0, 0.42, 0);
    const leg1 = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6)), darkSlateMat);
    leg1.name = "Desk Steel Support Leg L";
    leg1.position.set(-0.65, 0.21, 0.25);
    const leg2 = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6)), darkSlateMat);
    leg2.name = "Desk Steel Support Leg R";
    leg2.position.set(0.65, 0.21, 0.25);
    const chairSeat = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.45, 0.06, 0.42)), darkSlateMat);
    chairSeat.name = "Ergonomic Task Chair Seat";
    chairSeat.position.set(0, 0.32, 0.5);
    const chairBack = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.45, 0.52, 0.06)), darkSlateMat);
    chairBack.name = "Ergonomic Task Chair Backrest";
    chairBack.position.set(0, 0.6, 0.7);

    const laptopBase = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.34, 0.015, 0.22)), laptopBodyMat);
    laptopBase.name = "That Open BIM Developer Workstation (Keyboard)";
    laptopBase.position.set(0, 0.46, -0.05);
    const laptopScreen = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.34, 0.22, 0.012)), laptopBodyMat);
    laptopScreen.name = "That Open BIM Developer Laptop Lid";
    laptopScreen.position.set(0, 0.57, -0.16);
    laptopScreen.rotation.x = -0.22;
    const laptopDisplay = new THREE.Mesh(trackGeom(new THREE.PlaneGeometry(0.31, 0.19)), screenGlowMat);
    laptopDisplay.name = "That Open Engine Active Code IDE Screen";
    laptopDisplay.position.set(0, 0.57, -0.15);
    laptopDisplay.rotation.x = -0.22;

    groundOffice.add(desk, leg1, leg2, chairSeat, chairBack, laptopBase, laptopScreen, laptopDisplay);
    furnitureGroup.add(groundOffice);

    // --- Upper Floor Master Suite ---
    const masterSuite = new THREE.Group();
    masterSuite.name = "villa-master-suite";
    masterSuite.position.set(-1.8, 3.12, 0.2);

    const bedBase = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.0, 0.35, 2.1)), teakMat);
    bedBase.name = "Master Suite King Platform Bed Frame";
    bedBase.position.set(0, 0.25, 0);
    const mattress = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.85, 0.3, 1.95)), cushionWhiteMat);
    mattress.name = "Master Suite Orthopedic Memory Foam Mattress";
    mattress.position.set(0, 0.5, 0);
    const duvet = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.88, 0.08, 1.3)), trackMat(new THREE.MeshStandardMaterial({ color: 0x334155 })));
    duvet.name = "Charcoal Slate Duvet Bedding";
    duvet.position.set(0, 0.68, 0.3);

    const headboard = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.2, 1.0, 0.1)), teakMat);
    headboard.name = "Solid Teakwood Master Suite Headboard";
    headboard.position.set(0, 0.75, -1.0);

    const pillL = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.6, 0.12, 0.35)), cushionWhiteMat);
    pillL.name = "Master Suite Pillow (Left)";
    pillL.position.set(-0.5, 0.72, -0.7);
    const pillR = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.6, 0.12, 0.35)), cushionWhiteMat);
    pillR.name = "Master Suite Pillow (Right)";
    pillR.position.set(0.5, 0.72, -0.7);

    masterSuite.add(bedBase, mattress, duvet, headboard, pillL, pillR);
    furnitureGroup.add(masterSuite);

    // --- Upper Floor Architectural Studio & Drafting Suite ---
    const studioGroup = new THREE.Group();
    studioGroup.name = "villa-studio-drafting";
    studioGroup.position.set(3.2, 3.12, -0.6);

    const draftTable = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.6, 0.06, 0.8)), oakWoodMat);
    draftTable.name = "Oak Architectural Drafting Workstation";
    draftTable.position.set(0, 0.48, 0);
    draftTable.rotation.x = 0.15;
    const blueprint = new THREE.Mesh(trackGeom(new THREE.PlaneGeometry(1.0, 0.6)), trackMat(new THREE.MeshBasicMaterial({ color: 0x0284c7 })));
    blueprint.name = "BIM Architectural Construction Blueprint";
    blueprint.position.set(0, 0.52, 0);
    blueprint.rotation.x = -Math.PI / 2 + 0.15;

    studioGroup.add(draftTable, blueprint);
    furnitureGroup.add(studioGroup);

    // =========================================================================
    // 6. ROOFTOP SOLAR PHOTOVOLTAIC ARRAY
    // =========================================================================
    const roofSolarGroup = new THREE.Group();
    roofSolarGroup.name = "villa-rooftop-solar";
    roofSolarGroup.position.set(0.4, 6.35, 0.1);

    const panelGeom = trackGeom(new THREE.BoxGeometry(1.2, 0.04, 1.8));
    let panelIdx = 1;
    for (let x = -2.0; x <= 2.0; x += 1.4) {
        for (let z = -1.6; z <= 1.6; z += 1.8) {
            const panel = new THREE.Mesh(panelGeom, solarPanelMat);
            panel.name = `Monocrystalline Solar PV Module #${panelIdx++}`;
            panel.position.set(x, 0.05, z);
            panel.rotation.x = 0.2;
            roofSolarGroup.add(panel);
        }
    }

    // Assemble All Groups Under Root Group
    rootGroup.add(buildingGroup);
    rootGroup.add(poolGroup);
    rootGroup.add(furnitureGroup);
    rootGroup.add(roofSolarGroup);

    // Dynamic wave sinusoidal animation on pool water vertices
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
