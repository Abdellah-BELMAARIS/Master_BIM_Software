import * as THREE from "three";

/**
 * Architectural BIM Pavilion & Structural Modular Cube Environment
 * Transforms the basic box geometry into a state-of-the-art architectural pavilion:
 * - Reinforced concrete foundation plinth with exposed structural rebar grid
 * - Polished terrazzo slab floor with subtle reflection
 * - 4 architectural structural steel columns with bolted baseplates
 * - Cantilevered roof canopy with warm recessed linear LED strip lighting
 * - Frameless architectural glass curtain wall with tinted transparency
 * - Interior minimalist lounge suite (marble coffee table, designer armchairs)
 * - Digital BIM level elevation marker & holographic dimension calipers
 */
export interface ICubeEnvironment {
    group: THREE.Group;
    updatePavilion: (time: number) => void;
    toggleRebar: (visible: boolean) => void;
    toggleFurniture: (visible: boolean) => void;
    dispose: () => void;
}

export function buildCubeEnvironment(): ICubeEnvironment {
    const rootGroup = new THREE.Group();
    rootGroup.name = "BIMModularPavilionEnvironment";

    const rebarGroup = new THREE.Group();
    rebarGroup.name = "StructuralRebarLayer";

    const furnitureGroup = new THREE.Group();
    furnitureGroup.name = "InteriorPavilionFurniture";

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

    // --- High-Performance BIM Materials ---
    const terrazzoMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x1e293b, // Polished dark terrazzo
        roughness: 0.25,
        metalness: 0.35,
    }));

    const concreteFootingMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x475569, // Cast architectural concrete
        roughness: 0.7,
        metalness: 0.15,
    }));

    const rebarSteelMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xd97706, // High-visibility epoxy-coated structural rebar
        roughness: 0.4,
        metalness: 0.85,
    }));

    const structuralSteelMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x38bdf8, // Precision painted steel columns
        roughness: 0.25,
        metalness: 0.85,
    }));

    const canopyRoofMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Composite roof fascia
        roughness: 0.35,
        metalness: 0.65,
    }));

    const architecturalGlassMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x38bdf8, // Tinted low-iron cyan glass
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.55,
    }));

    const ledWarmGlowMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.2,
        roughness: 0.2,
    }));

    const marbleTableMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0xf8fafc, // Carrara white marble
        roughness: 0.2,
        metalness: 0.1,
    }));

    const leatherLoungeMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x92400e, // Cognac leather armchairs
        roughness: 0.65,
        metalness: 0.05,
    }));

    const plantGreenMat = trackMat(new THREE.MeshStandardMaterial({
        color: 0x22c55e, // Architectural interior greenery
        roughness: 0.6,
        metalness: 0.0,
    }));

    // =========================================================================
    // 1. REINFORCED CONCRETE FOUNDATION & REBAR LAYER
    // =========================================================================
    const footingGeom = trackGeom(new THREE.BoxGeometry(6.4, 0.45, 6.4));
    const footing = new THREE.Mesh(footingGeom, concreteFootingMat);
    footing.position.y = -0.225;
    footing.receiveShadow = true;
    rootGroup.add(footing);

    // Structural Rebar Grid inside foundation
    const rebarBarGeom = trackGeom(new THREE.CylinderGeometry(0.02, 0.02, 5.8, 8));
    for (let r = -2.5; r <= 2.5; r += 0.8) {
        // X-axis rebar
        const barX = new THREE.Mesh(rebarBarGeom, rebarSteelMat);
        barX.rotation.z = Math.PI / 2;
        barX.position.set(0, -0.15, r);
        rebarGroup.add(barX);

        // Z-axis rebar
        const barZ = new THREE.Mesh(rebarBarGeom, rebarSteelMat);
        barZ.rotation.x = Math.PI / 2;
        barZ.position.set(r, -0.12, 0);
        rebarGroup.add(barZ);
    }
    rootGroup.add(rebarGroup);

    // =========================================================================
    // 2. POLISHED TERRAZZO FLOOR SLAB
    // =========================================================================
    const slabGeom = trackGeom(new THREE.BoxGeometry(5.8, 0.25, 5.8));
    const slab = new THREE.Mesh(slabGeom, terrazzoMat);
    slab.position.y = 0.125;
    slab.receiveShadow = true;
    rootGroup.add(slab);

    // Polished Perimeter Bevel Trim
    const trimGeom = trackGeom(new THREE.BoxGeometry(5.95, 0.06, 5.95));
    const trim = new THREE.Mesh(trimGeom, structuralSteelMat);
    trim.position.y = 0.22;
    rootGroup.add(trim);

    // =========================================================================
    // 3. 4 STRUCTURAL STEEL COLUMNS & BASEPLATES
    // =========================================================================
    const pavilionHeight = 3.2;
    const colGeom = trackGeom(new THREE.BoxGeometry(0.18, pavilionHeight, 0.18));
    const baseplateGeom = trackGeom(new THREE.BoxGeometry(0.36, 0.06, 0.36));

    const colOffsets = [-2.4, 2.4];
    colOffsets.forEach((cx) => {
        colOffsets.forEach((cz) => {
            const col = new THREE.Mesh(colGeom, structuralSteelMat);
            col.position.set(cx, pavilionHeight / 2 + 0.25, cz);
            col.castShadow = true;
            rootGroup.add(col);

            const baseplate = new THREE.Mesh(baseplateGeom, canopyRoofMat);
            baseplate.position.set(cx, 0.27, cz);
            rootGroup.add(baseplate);
        });
    });

    // =========================================================================
    // 4. CANTILEVERED ROOF CANOPY & RECESSED LINEAR LEDS
    // =========================================================================
    const roofGeom = trackGeom(new THREE.BoxGeometry(6.6, 0.35, 6.6));
    const roof = new THREE.Mesh(roofGeom, canopyRoofMat);
    roof.position.y = pavilionHeight + 0.42;
    roof.castShadow = true;
    rootGroup.add(roof);

    // Recessed Linear LED Strip Lighting (Warm architectural glow)
    const ledGeomX = trackGeom(new THREE.BoxGeometry(4.8, 0.05, 0.08));
    const ledGeomZ = trackGeom(new THREE.BoxGeometry(0.08, 0.05, 4.8));

    [-1.8, 1.8].forEach((offset) => {
        const ledX = new THREE.Mesh(ledGeomX, ledWarmGlowMat);
        ledX.position.set(0, pavilionHeight + 0.24, offset);
        rootGroup.add(ledX);

        const ledZ = new THREE.Mesh(ledGeomZ, ledWarmGlowMat);
        ledZ.position.set(offset, pavilionHeight + 0.24, 0);
        rootGroup.add(ledZ);
    });

    // Central Warm Downlight
    const interiorDownlight = new THREE.PointLight(0xfef08a, 2.2, 7.5);
    interiorDownlight.position.set(0, pavilionHeight + 0.15, 0);
    rootGroup.add(interiorDownlight);

    // =========================================================================
    // 5. FRAMELESS ARCHITECTURAL GLASS CURTAIN WALL PANELS
    // =========================================================================
    // Back glass wall
    const glassBackGeom = trackGeom(new THREE.BoxGeometry(4.6, pavilionHeight - 0.2, 0.08));
    const glassBack = new THREE.Mesh(glassBackGeom, architecturalGlassMat);
    glassBack.position.set(0, pavilionHeight / 2 + 0.25, -2.4);
    glassBack.castShadow = true;
    rootGroup.add(glassBack);

    // Left glass partition
    const glassLeftGeom = trackGeom(new THREE.BoxGeometry(0.08, pavilionHeight - 0.2, 3.2));
    const glassLeft = new THREE.Mesh(glassLeftGeom, architecturalGlassMat);
    glassLeft.position.set(-2.4, pavilionHeight / 2 + 0.25, -0.6);
    glassLeft.castShadow = true;
    rootGroup.add(glassLeft);

    // =========================================================================
    // 6. INTERIOR MINIMALIST LOUNGE SUITE
    // =========================================================================
    // Carrara marble coffee table
    const tableTopGeom = trackGeom(new THREE.BoxGeometry(1.6, 0.1, 0.9));
    const tableTop = new THREE.Mesh(tableTopGeom, marbleTableMat);
    tableTop.position.set(0, 0.45, 0);
    tableTop.castShadow = true;
    furnitureGroup.add(tableTop);

    const tableLegGeom = trackGeom(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8));
    [[-0.65, -0.32], [0.65, -0.32], [-0.65, 0.32], [0.65, 0.32]].forEach(([tx, tz]) => {
        const leg = new THREE.Mesh(tableLegGeom, structuralSteelMat);
        leg.position.set(tx, 0.35, tz);
        furnitureGroup.add(leg);
    });

    // Designer Cognac Leather Armchairs
    const seatBaseGeom = trackGeom(new THREE.BoxGeometry(0.85, 0.32, 0.8));
    const seatBackGeom = trackGeom(new THREE.BoxGeometry(0.85, 0.55, 0.18));

    // Left Armchair
    const chairLeft = new THREE.Mesh(seatBaseGeom, leatherLoungeMat);
    chairLeft.position.set(-1.45, 0.41, 0);
    chairLeft.castShadow = true;
    furnitureGroup.add(chairLeft);

    const backLeft = new THREE.Mesh(seatBackGeom, leatherLoungeMat);
    backLeft.position.set(-1.85, 0.72, 0);
    backLeft.rotation.y = Math.PI / 2;
    backLeft.castShadow = true;
    furnitureGroup.add(backLeft);

    // Right Armchair
    const chairRight = new THREE.Mesh(seatBaseGeom, leatherLoungeMat);
    chairRight.position.set(1.45, 0.41, 0);
    chairRight.castShadow = true;
    furnitureGroup.add(chairRight);

    const backRight = new THREE.Mesh(seatBackGeom, leatherLoungeMat);
    backRight.position.set(1.85, 0.72, 0);
    backRight.rotation.y = -Math.PI / 2;
    backRight.castShadow = true;
    furnitureGroup.add(backRight);

    // Potted Architectural Ficus Plant
    const potGeom = trackGeom(new THREE.CylinderGeometry(0.24, 0.18, 0.45, 12));
    const pot = new THREE.Mesh(potGeom, concreteFootingMat);
    pot.position.set(-2.0, 0.47, 2.0);
    pot.castShadow = true;
    furnitureGroup.add(pot);

    const ficusFoliage = new THREE.Mesh(trackGeom(new THREE.SphereGeometry(0.42, 10, 10)), plantGreenMat);
    ficusFoliage.position.set(-2.0, 0.95, 2.0);
    ficusFoliage.castShadow = true;
    furnitureGroup.add(ficusFoliage);

    rootGroup.add(furnitureGroup);

    // Dynamic Updates
    const updatePavilion = (time: number) => {
        // Subtle architectural downlight pulsation
        interiorDownlight.intensity = 2.0 + 0.35 * Math.sin(time * 1.5);
    };

    const toggleRebar = (visible: boolean) => {
        rebarGroup.visible = visible;
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
        updatePavilion,
        toggleRebar,
        toggleFurniture,
        dispose,
    };
}

