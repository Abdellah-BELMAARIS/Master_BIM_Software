import * as THREE from "three";

/**
 * Architectural Luxury Villa Environment Builder
 * Adds a high-end infinity swimming pool, teak sun-deck terrace, poolside loungers,
 * landscape garden planters, and fully furnished interior suites (living room, dining/kitchen,
 * and master bedroom) to turn the villa into an award-winning BIM showcase model.
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

    // =========================================================================
    // 1. OUTDOOR LIVING: TEAK DECK & INFINITY SWIMMING POOL
    // =========================================================================

    // Large architectural ground terrace deck extending around the villa & pool
    const deckGeom = trackGeom(new THREE.BoxGeometry(16, 0.18, 14));
    const deckMesh = new THREE.Mesh(deckGeom, teakMat);
    deckMesh.position.set(0, 0.09, 3.2);
    deckMesh.receiveShadow = true;
    poolGroup.add(deckMesh);

    // Modern grass boundary surrounds the terrace
    const lawnGeom = trackGeom(new THREE.BoxGeometry(20, 0.1, 18));
    const lawnMesh = new THREE.Mesh(lawnGeom, grassMat);
    lawnMesh.position.set(0, 0.04, 3.2);
    lawnMesh.receiveShadow = true;
    poolGroup.add(lawnMesh);

    // Luxury Infinity Pool (Sunken Coping Rim + Deep Water Basin)
    const poolCenterZ = 6.4;
    const poolWidth = 6.8;
    const poolDepth = 3.6;
    const poolHeight = 0.7;

    // Outer pool limestone coping
    const copingGeom = trackGeom(new THREE.BoxGeometry(poolWidth + 0.6, 0.25, poolDepth + 0.6));
    const copingMesh = new THREE.Mesh(copingGeom, copingMat);
    copingMesh.position.set(0, 0.13, poolCenterZ);
    copingMesh.receiveShadow = true;
    poolGroup.add(copingMesh);

    // Sunken pool basin floor & walls
    const basinGeom = trackGeom(new THREE.BoxGeometry(poolWidth, poolHeight, poolDepth));
    const basinMesh = new THREE.Mesh(basinGeom, poolTileMat);
    basinMesh.position.set(0, -poolHeight / 2 + 0.22, poolCenterZ);
    poolGroup.add(basinMesh);

    // Translucent water surface
    const waterGeom = trackGeom(new THREE.PlaneGeometry(poolWidth - 0.05, poolDepth - 0.05, 12, 12));
    const waterMesh = new THREE.Mesh(waterGeom, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(0, 0.22, poolCenterZ);
    poolGroup.add(waterMesh);

    // Submerged cyan underwater LED pool light
    const poolUnderLight = new THREE.PointLight(0x38bdf8, 2.0, 9);
    poolUnderLight.position.set(0, 0.05, poolCenterZ);
    poolGroup.add(poolUnderLight);

    // Pool Stainless Steel Grab Rails / Ladder
    const railGeom = trackGeom(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 12));
    const leftRail = new THREE.Mesh(railGeom, chromeMat);
    leftRail.position.set(2.8, 0.45, poolCenterZ - 1.6);
    const rightRail = new THREE.Mesh(railGeom, chromeMat);
    rightRail.position.set(3.1, 0.45, poolCenterZ - 1.6);
    poolGroup.add(leftRail, rightRail);

    // Poolside Sun Loungers (2 modern loungers with white cushions)
    const createLounger = (xPos: number) => {
        const lounger = new THREE.Group();
        // Frame
        const frameGeom = trackGeom(new THREE.BoxGeometry(0.85, 0.15, 2.1));
        const frameMesh = new THREE.Mesh(frameGeom, teakMat);
        frameMesh.position.set(0, 0.22, 0);

        // Main cushion
        const cushionGeom = trackGeom(new THREE.BoxGeometry(0.8, 0.1, 1.4));
        const cushionMesh = new THREE.Mesh(cushionGeom, cushionWhiteMat);
        cushionMesh.position.set(0, 0.32, -0.3);

        // Angled headrest
        const headrestGeom = trackGeom(new THREE.BoxGeometry(0.8, 0.1, 0.65));
        const headrestMesh = new THREE.Mesh(headrestGeom, cushionWhiteMat);
        headrestMesh.position.set(0, 0.42, 0.65);
        headrestMesh.rotation.x = -0.35; // 20-deg incline

        lounger.add(frameMesh, cushionMesh, headrestMesh);
        lounger.position.set(xPos, 0, poolCenterZ);
        return lounger;
    };

    poolGroup.add(createLounger(-4.4));
    poolGroup.add(createLounger(-5.6));

    // Cocktail side-table between loungers
    const sideTableGeom = trackGeom(new THREE.CylinderGeometry(0.3, 0.3, 0.35, 16));
    const sideTable = new THREE.Mesh(sideTableGeom, teakMat);
    sideTable.position.set(-5.0, 0.3, poolCenterZ);
    poolGroup.add(sideTable);

    // Large Minimalist Square Patio Parasol (Umbrella)
    const parasolGroup = new THREE.Group();
    const poleGeom = trackGeom(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 12));
    const pole = new THREE.Mesh(poleGeom, darkSlateMat);
    pole.position.set(0, 1.4, 0);

    const canopyGeom = trackGeom(new THREE.ConeGeometry(1.6, 0.5, 4)); // Modern square canopy
    const canopy = new THREE.Mesh(canopyGeom, cushionWhiteMat);
    canopy.position.set(0, 2.65, 0);
    canopy.rotation.y = Math.PI / 4;
    parasolGroup.add(pole, canopy);
    parasolGroup.position.set(-5.0, 0, poolCenterZ - 1.2);
    poolGroup.add(parasolGroup);

    // Architectural Landscape Planters with Boxwood Hedges
    const createPlanter = (x: number, z: number, w: number, d: number) => {
        const planterGroup = new THREE.Group();
        const box = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(w, 0.45, d)), darkSlateMat);
        box.position.y = 0.35;
        const hedge = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(w - 0.1, 0.6, d - 0.1)), hedgeMat);
        hedge.position.y = 0.8;
        planterGroup.add(box, hedge);
        planterGroup.position.set(x, 0, z);
        return planterGroup;
    };

    poolGroup.add(createPlanter(5.8, poolCenterZ - 1.5, 0.9, 3.2));
    poolGroup.add(createPlanter(-5.8, poolCenterZ + 2.5, 0.9, 1.8));

    // Warm bollard pathway lights
    const bollardZ = [poolCenterZ - 1.8, poolCenterZ + 1.8];
    for (const bz of bollardZ) {
        const bollardGeom = trackGeom(new THREE.CylinderGeometry(0.04, 0.04, 0.65, 12));
        const bollardMesh = new THREE.Mesh(bollardGeom, darkSlateMat);
        bollardMesh.position.set(4.2, 0.45, bz);

        const glowLight = new THREE.PointLight(0xfde047, 0.8, 3.5);
        glowLight.position.set(4.2, 0.75, bz);
        poolGroup.add(bollardMesh, glowLight);
    }

    // =========================================================================
    // 2. INTERIOR HOME FURNITURE (GROUND FLOOR & FIRST FLOOR)
    // =========================================================================

    // Floor 1 Slab (Interior parquet timber)
    const floorSlabGeom = trackGeom(new THREE.BoxGeometry(7.6, 0.12, 5.8));
    const floorSlab = new THREE.Mesh(floorSlabGeom, oakWoodMat);
    floorSlab.position.set(0, 0.15, 0);
    furnitureGroup.add(floorSlab);

    // --- Ground Floor Living Area (Left Wing) ---
    const livingGroup = new THREE.Group();
    livingGroup.position.set(-1.8, 0.2, 0.6);

    // Charcoal Sectional L-Sofa (Main Bench + Chaise Lounge)
    const sofaMain = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.1, 0.5, 0.85)), sofaFabricMat);
    sofaMain.position.set(0, 0.35, 0);
    const sofaBack = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.1, 0.45, 0.2)), sofaFabricMat);
    sofaBack.position.set(0, 0.75, 0.35);

    const sofaChaise = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.85, 0.5, 1.2)), sofaFabricMat);
    sofaChaise.position.set(-0.62, 0.35, -0.9);

    // Colorful accent throw pillows
    const pillow1 = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.35, 0.25, 0.12)), trackMat(new THREE.MeshStandardMaterial({ color: 0x38bdf8 })));
    pillow1.position.set(0.6, 0.68, 0.22);
    pillow1.rotation.y = 0.2;

    const pillow2 = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.35, 0.25, 0.12)), trackMat(new THREE.MeshStandardMaterial({ color: 0xf59e0b })));
    pillow2.position.set(-0.3, 0.68, 0.22);

    livingGroup.add(sofaMain, sofaBack, sofaChaise, pillow1, pillow2);

    // Scandinavian Oak Coffee Table
    const coffeeTable = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.2, 0.32, 0.65)), oakWoodMat);
    coffeeTable.position.set(0.2, 0.25, -0.7);
    livingGroup.add(coffeeTable);

    // Textured Living Room Area Rug
    const rug = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.4, 0.02, 2.0)), trackMat(new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95 })));
    rug.position.set(-0.1, 0.02, -0.6);
    livingGroup.add(rug);

    // Ultra-thin 75" Media Screen mounted on architectural slatted panel
    const tvWall = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.0, 1.8, 0.06)), darkSlateMat);
    tvWall.position.set(0.1, 1.1, -1.8);
    const tvScreen = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.6, 0.9, 0.03)), trackMat(new THREE.MeshBasicMaterial({ color: 0x090d16 })));
    tvScreen.position.set(0.1, 1.25, -1.75);
    livingGroup.add(tvWall, tvScreen);

    // Minimalist Arc Floor Lamp with warm interior glow
    const lampPole = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 12)), chromeMat);
    lampPole.position.set(1.2, 1.0, 0.4);
    const lampShade = new THREE.Mesh(trackGeom(new THREE.ConeGeometry(0.2, 0.25, 16)), cushionWhiteMat);
    lampShade.position.set(0.9, 1.9, 0.1);
    lampShade.rotation.x = 0.4;
    const lampGlow = new THREE.PointLight(0xfef08a, 1.2, 4.0);
    lampGlow.position.set(0.9, 1.7, 0.1);
    livingGroup.add(lampPole, lampShade, lampGlow);

    furnitureGroup.add(livingGroup);

    // --- Ground Floor Kitchen & Dining Suite (Right Wing) ---
    const kitchenGroup = new THREE.Group();
    kitchenGroup.position.set(2.0, 0.2, 0.4);

    // Luxury Waterfall Calacatta Marble Kitchen Island
    const island = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.2, 0.9, 0.95)), marbleWhiteMat);
    island.position.set(0, 0.55, -0.8);
    island.castShadow = true;

    // 3 Matte Black Designer Bar Stools
    for (let i = -0.65; i <= 0.65; i += 0.65) {
        const stoolBase = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.02, 0.02, 0.65, 8)), darkSlateMat);
        stoolBase.position.set(i, 0.4, -0.15);
        const stoolSeat = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 16)), oakWoodMat);
        stoolSeat.position.set(i, 0.72, -0.15);
        kitchenGroup.add(stoolBase, stoolSeat);
    }
    kitchenGroup.add(island);

    // Solid Timber Dining Table with 4 Chairs
    const diningTable = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.8, 0.75, 0.9)), teakMat);
    diningTable.position.set(0, 0.45, 1.2);
    kitchenGroup.add(diningTable);

    // 4 Scandinavian Dining Chairs
    const chairOffsets = [
        [-0.55, 0.7], [0.55, 0.7],
        [-0.55, 1.7], [0.55, 1.7],
    ];
    for (const [cx, cz] of chairOffsets) {
        const chair = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.4, 0.8, 0.4)), darkSlateMat);
        chair.position.set(cx, 0.48, cz);
        kitchenGroup.add(chair);
    }

    furnitureGroup.add(kitchenGroup);

    // --- First Floor Master Suite (Y = 3.1) ---
    const upperFloorGroup = new THREE.Group();
    upperFloorGroup.position.set(0, 3.1, 0);

    // Intermediate Upper Floor Slab
    const upperSlab = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(5.2, 0.14, 4.4)), oakWoodMat);
    upperSlab.position.set(0, 0.07, 0);
    upperFloorGroup.add(upperSlab);

    // King Size Platform Bed (Headboard + Crisp Bedding + Sapphire Throw)
    const bedFrame = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.0, 0.35, 2.2)), darkSlateMat);
    bedFrame.position.set(0, 0.25, 0.6);

    const headboard = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(2.2, 0.9, 0.15)), darkSlateMat);
    headboard.position.set(0, 0.65, 1.65);

    const mattress = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.85, 0.3, 2.0)), cushionWhiteMat);
    mattress.position.set(0, 0.5, 0.55);

    const throwRunner = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(1.88, 0.04, 0.65)), trackMat(new THREE.MeshStandardMaterial({ color: 0x1d4ed8 })));
    throwRunner.position.set(0, 0.66, -0.15);

    // Pillows
    const pLeft = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.65, 0.16, 0.4)), cushionWhiteMat);
    pLeft.position.set(-0.5, 0.68, 1.25);
    const pRight = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.65, 0.16, 0.4)), cushionWhiteMat);
    pRight.position.set(0.5, 0.68, 1.25);

    upperFloorGroup.add(bedFrame, headboard, mattress, throwRunner, pLeft, pRight);

    // Floating Nightstands with Bedside Reading Lights
    for (const side of [-1.3, 1.3]) {
        const stand = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(0.45, 0.22, 0.4)), teakMat);
        stand.position.set(side, 0.4, 1.4);

        const miniLamp = new THREE.Mesh(trackGeom(new THREE.CylinderGeometry(0.08, 0.12, 0.25, 12)), cushionWhiteMat);
        miniLamp.position.set(side, 0.62, 1.4);

        const nightGlow = new THREE.PointLight(0xfef08a, 0.6, 2.5);
        nightGlow.position.set(side, 0.75, 1.4);

        upperFloorGroup.add(stand, miniLamp, nightGlow);
    }

    // Tempered Glass Balcony Balustrade
    const balconyGlass = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(4.8, 0.9, 0.05)), glassBalustradeMat);
    balconyGlass.position.set(0, 0.55, -2.15);

    const handrail = new THREE.Mesh(trackGeom(new THREE.BoxGeometry(4.85, 0.06, 0.08)), chromeMat);
    handrail.position.set(0, 1.0, -2.15);

    upperFloorGroup.add(balconyGlass, handrail);
    furnitureGroup.add(upperFloorGroup);

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
