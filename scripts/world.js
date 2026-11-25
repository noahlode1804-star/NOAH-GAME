
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

export function createWorld(scene, renderer) {
    const WORLD_SIZE = 2400;
    const HALF = WORLD_SIZE / 2;

    const forestAreas = [];
    const treePositions = [];
    const buildings = [];

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    function createTexture(type, size = 512) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        const image = ctx.createImageData(size, size);

        for (let i = 0; i < image.data.length; i += 4) {
            const n = Math.random();
            let r = 0, g = 0, b = 0;

            if (type === 'grass') {
                r = 28 + n * 35;
                g = 75 + n * 80;
                b = 18 + n * 28;
            } else if (type === 'road') {
                r = 35 + n * 28;
                g = 37 + n * 28;
                b = 40 + n * 28;
            } else if (type === 'bark') {
                r = 55 + n * 50;
                g = 30 + n * 30;
                b = 14 + n * 20;
            } else if (type === 'rock') {
                r = 85 + n * 75;
                g = 90 + n * 75;
                b = 95 + n * 75;
            }

            image.data[i] = r;
            image.data[i + 1] = g;
            image.data[i + 2] = b;
            image.data[i + 3] = 255;
        }

        ctx.putImageData(image, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = maxAnisotropy;

        return texture;
    }

    const grassTexture = createTexture('grass');
    grassTexture.repeat.set(150, 150);

    const roadTexture = createTexture('road');
    roadTexture.repeat.set(4, 150);

    const barkTexture = createTexture('bark');
    barkTexture.repeat.set(1, 3);

    const rockTexture = createTexture('rock');
    rockTexture.repeat.set(2, 2);

    const grassMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture,
        roughness: 1
    });

    const roadMaterial = new THREE.MeshStandardMaterial({
        map: roadTexture,
        roughness: 0.95
    });

    const barkMaterial = new THREE.MeshStandardMaterial({
        map: barkTexture,
        roughness: 1
    });

    const rockMaterial = new THREE.MeshStandardMaterial({
        map: rockTexture,
        roughness: 1
    });

    // GROUND
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE),
        grassMaterial
    );

    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ROADS
    function createRoad(x, z, width, length, rotation = 0) {
        const road = new THREE.Mesh(
            new THREE.PlaneGeometry(width, length),
            roadMaterial
        );

        road.rotation.x = -Math.PI / 2;
        road.rotation.z = rotation;
        road.position.set(x, 0.035, z);
        road.receiveShadow = true;
        scene.add(road);
    }

    createRoad(0, 0, 20, WORLD_SIZE);
    createRoad(0, 0, WORLD_SIZE, 20);

    createRoad(-500, 0, 13, WORLD_SIZE, 0);
    createRoad(500, 0, 13, WORLD_SIZE, 0);
    createRoad(0, -500, WORLD_SIZE, 13);
    createRoad(0, 500, WORLD_SIZE, 13);

    createRoad(0, -250, 13, 650, Math.PI / 4);
    createRoad(0, 250, 13, 650, -Math.PI / 4);

    const roadLineMaterial = new THREE.MeshBasicMaterial({
        color: 0xe7e0c7
    });

    for (let z = -HALF + 15; z < HALF; z += 28) {
        const line = new THREE.Mesh(
            new THREE.PlaneGeometry(0.22, 12),
            roadLineMaterial
        );

        line.rotation.x = -Math.PI / 2;
        line.position.set(0, 0.07, z);
        scene.add(line);
    }

    for (let x = -HALF + 15; x < HALF; x += 28) {
        const line = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 0.22),
            roadLineMaterial
        );

        line.rotation.x = -Math.PI / 2;
        line.position.set(x, 0.07, 0);
        scene.add(line);
    }

    // TREE MATERIALS
    const leafMaterials = [
        new THREE.MeshStandardMaterial({ color: 0x245b2b, roughness: 1 }),
        new THREE.MeshStandardMaterial({ color: 0x326c31, roughness: 1 }),
        new THREE.MeshStandardMaterial({ color: 0x194c28, roughness: 1 }),
        new THREE.MeshStandardMaterial({ color: 0x477c38, roughness: 1 })
    ];

    const treeGeometry = new THREE.IcosahedronGeometry(2.4, 1);
    const trunkGeometry = new THREE.CylinderGeometry(0.35, 0.55, 5, 10);

    function createTree(x, z, scale) {
        const tree = new THREE.Group();

        const trunk = new THREE.Mesh(trunkGeometry, barkMaterial);
        trunk.position.y = 2.5 * scale;
        trunk.scale.setScalar(scale);
        trunk.castShadow = true;
        tree.add(trunk);

        const material = leafMaterials[
            Math.floor(Math.random() * leafMaterials.length)
        ];

        for (let i = 0; i < 4; i++) {
            const leaves = new THREE.Mesh(treeGeometry, material);

            leaves.position.set(
                (Math.random() - 0.5) * scale,
                (4 + i * 1.1) * scale,
                (Math.random() - 0.5) * scale
            );

            leaves.scale.set(
                scale * (1 + Math.random() * 0.25),
                scale * (1.1 + Math.random() * 0.3),
                scale * (1 + Math.random() * 0.25)
            );

            leaves.castShadow = true;
            tree.add(leaves);
        }

        tree.position.set(x, 0, z);
        tree.rotation.y = Math.random() * Math.PI * 2;
        scene.add(tree);

        treePositions.push({ x, z });
    }

    // FORESTS
    const forestCenters = [
        [-850, -850, 190], [850, -850, 190],
        [-850, 850, 190], [850, 850, 190],
        [-350, -850, 135], [350, -850, 135],
        [-350, 850, 135], [350, 850, 135],
        [-850, 0, 145], [850, 0, 145],
        [0, -850, 130], [0, 850, 130],
        [-300, 300, 110], [300, -300, 110]
    ];

    for (const [x, z, radius] of forestCenters) {
        forestAreas.push({ x, z, radius });

        for (let i = 0; i < 105; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.sqrt(Math.random()) * radius;

            const treeX = x + Math.cos(angle) * distance;
            const treeZ = z + Math.sin(angle) * distance;

            if (Math.abs(treeX) < 30 || Math.abs(treeZ) < 30) {
                continue;
            }

            createTree(
                treeX,
                treeZ,
                0.8 + Math.random() * 1.3
            );
        }
    }

    // BUILDING MATERIALS
    const roofMaterial = new THREE.MeshStandardMaterial({
        color: 0x343b45,
        roughness: 0.9
    });

    const trimMaterial = new THREE.MeshStandardMaterial({
        color: 0xd0c5ae,
        roughness: 0.75
    });

    const darkTrimMaterial = new THREE.MeshStandardMaterial({
        color: 0x303b47,
        roughness: 0.8
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
        color: 0x69c9ed,
        emissive: 0x16445b,
        emissiveIntensity: 0.55,
        roughness: 0.2,
        metalness: 0.2
    });

    const doorMaterial = new THREE.MeshStandardMaterial({
        color: 0x49372b,
        roughness: 0.85
    });

    const lampMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd58b,
        emissive: 0xffa52c,
        emissiveIntensity: 1.4
    });

    function addBox(parent, width, height, depth, material, x, y, z) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            material
        );

        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);

        return mesh;
    }

    // DETAILED BUILDINGS
    function createBuilding(x, z, width, depth, height, rotation = 0) {
        const building = new THREE.Group();

        const wallColors = [
            0x777f83,
            0x9a8e7a,
            0x777b70,
            0x667b8b,
            0x9b9b91,
            0x887b70,
            0x66716e
        ];

        const wallMaterial = new THREE.MeshStandardMaterial({
            color: wallColors[Math.floor(Math.random() * wallColors.length)],
            roughness: 0.88
        });

        // Foundation
        addBox(
            building,
            width + 1.5,
            0.7,
            depth + 1.5,
            darkTrimMaterial,
            0,
            0.35,
            0
        );

        // Main walls
        addBox(
            building,
            width,
            height,
            depth,
            wallMaterial,
            0,
            height / 2 + 0.6,
            0
        );

        // Roof
        addBox(
            building,
            width + 2,
            0.8,
            depth + 2,
            roofMaterial,
            0,
            height + 1,
            0
        );

        // Roof rim
        addBox(
            building,
            width + 2.8,
            0.22,
            0.35,
            darkTrimMaterial,
            0,
            height + 1.45,
            depth / 2 + 0.9
        );

        addBox(
            building,
            width + 2.8,
            0.22,
            0.35,
            darkTrimMaterial,
            0,
            height + 1.45,
            -depth / 2 - 0.9
        );

        // Corner columns
        const cornerPositions = [
            [-width / 2 + 0.25, depth / 2 - 0.25],
            [width / 2 - 0.25, depth / 2 - 0.25],
            [-width / 2 + 0.25, -depth / 2 + 0.25],
            [width / 2 - 0.25, -depth / 2 + 0.25]
        ];

        for (const [cx, cz] of cornerPositions) {
            addBox(
                building,
                0.35,
                height,
                0.35,
                trimMaterial,
                cx,
                height / 2 + 0.6,
                cz
            );
        }

        // Front windows with frames and sills
        const windowCount = Math.max(2, Math.floor(width / 7));

        for (let i = 0; i < windowCount; i++) {
            const wx = -width / 2 + ((i + 1) * width) / (windowCount + 1);
            const wy = height * 0.58 + 0.6;
            const wz = depth / 2 + 0.075;

            addBox(building, 2.9, 3.3, 0.18, darkTrimMaterial, wx, wy, wz);
            addBox(building, 2.35, 2.75, 0.1, glassMaterial, wx, wy, wz + 0.12);

            // Window divider
            addBox(building, 0.12, 2.75, 0.12, trimMaterial, wx, wy, wz + 0.2);
            addBox(building, 2.35, 0.12, 0.12, trimMaterial, wx, wy, wz + 0.2);

            // Window sill
            addBox(building, 3.2, 0.25, 0.55, trimMaterial, wx, wy - 1.8, wz + 0.1);
        }

        // Door
        addBox(
            building,
            2.5,
            4.2,
            0.2,
            darkTrimMaterial,
            0,
            2.7,
            depth / 2 + 0.1
        );

        addBox(
            building,
            2.05,
            3.8,
            0.12,
            doorMaterial,
            0,
            2.7,
            depth / 2 + 0.23
        );

        // Door handle
        const handle = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 10, 10),
            lampMaterial
        );

        handle.position.set(0.65, 2.7, depth / 2 + 0.32);
        building.add(handle);

        // Entrance steps
        addBox(
            building,
            4,
            0.35,
            2,
            trimMaterial,
            0,
            0.45,
            depth / 2 + 1
        );

        // Exterior lamps
        for (const side of [-1, 1]) {
            addBox(
                building,
                0.35,
                0.8,
                0.3,
                darkTrimMaterial,
                side * (width / 2 - 1),
                4.1,
                depth / 2 + 0.2
            );

            addBox(
                building,
                0.25,
                0.45,
                0.12,
                lampMaterial,
                side * (width / 2 - 1),
                4.1,
                depth / 2 + 0.4
            );
        }

        // Side windows
        for (const side of [-1, 1]) {
            for (let i = 0; i < 2; i++) {
                const wz = -depth / 2 + ((i + 1) * depth) / 3;

                addBox(
                    building,
                    0.12,
                    2.4,
                    2.4,
                    darkTrimMaterial,
                    side * (width / 2 + 0.08),
                    height * 0.58 + 0.6,
                    wz
                );

                addBox(
                    building,
                    0.15,
                    1.9,
                    1.9,
                    glassMaterial,
                    side * (width / 2 + 0.16),
                    height * 0.58 + 0.6,
                    wz
                );
            }
        }

        // Rooftop ventilation units
        addBox(
            building,
            3,
            1.1,
            2.5,
            darkTrimMaterial,
            width * 0.25,
            height + 2,
            -depth * 0.2
        );

        addBox(
            building,
            1.2,
            0.2,
            1.2,
            trimMaterial,
            width * 0.25,
            height + 2.65,
            -depth * 0.2
        );

        // Balcony for larger buildings
        if (width >= 25) {
            addBox(
                building,
                width * 0.55,
                0.35,
                2.5,
                darkTrimMaterial,
                0,
                height * 0.4,
                depth / 2 + 1.4
            );

            for (let i = 0; i < 6; i++) {
                addBox(
                    building,
                    0.12,
                    1.2,
                    0.12,
                    trimMaterial,
                    -width * 0.25 + i * (width * 0.1),
                    height * 0.4 + 0.7,
                    depth / 2 + 2.5
                );
            }
        }

        building.position.set(x, 0, z);
        building.rotation.y = rotation;
        scene.add(building);

        buildings.push({
            x,
            z,
            width,
            depth,
            height
        });
    }

    const buildingLocations = [
        [-85, -80, 30, 25, 17],
        [-145, -80, 22, 22, 13],
        [85, -85, 32, 28, 20],
        [150, -85, 23, 22, 14],
        [-90, 90, 35, 28, 19],
        [-155, 90, 23, 22, 13],
        [90, 95, 30, 27, 18],
        [155, 95, 23, 22, 14],
        [-300, -150, 35, 30, 19],
        [300, 150, 35, 30, 19],
        [-350, 300, 28, 25, 16],
        [350, -300, 28, 25, 16],
        [-700, -350, 40, 35, 22],
        [700, 350, 40, 35, 22],
        [-700, 450, 30, 28, 17],
        [700, -450, 30, 28, 17],
        [-450, -700, 35, 30, 19],
        [450, 700, 35, 30, 19],
        [-950, 100, 28, 25, 16],
        [950, -100, 28, 25, 16]
    ];

    for (const data of buildingLocations) {
        createBuilding(...data);
    }

    // ROCKS
    for (let i = 0; i < 240; i++) {
        const x = Math.random() * (WORLD_SIZE - 100) - HALF + 50;
        const z = Math.random() * (WORLD_SIZE - 100) - HALF + 50;

        if (Math.abs(x) < 35 || Math.abs(z) < 35) continue;

        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(1.5 + Math.random() * 3, 1),
            rockMaterial
        );

        rock.position.set(x, 1 + Math.random() * 1.5, z);
        rock.rotation.set(
            Math.random(),
            Math.random() * Math.PI,
            Math.random()
        );

        rock.scale.set(
            1 + Math.random(),
            0.7 + Math.random(),
            1 + Math.random()
        );

        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
    }

    // GRASS DETAILS
    const grassDetailMaterial = new THREE.MeshStandardMaterial({
        color: 0x739b43,
        roughness: 1
    });

    const grassGeometry = new THREE.ConeGeometry(0.12, 0.7, 3);

    const grassDetails = new THREE.InstancedMesh(
        grassGeometry,
        grassDetailMaterial,
        9000
    );

    const dummy = new THREE.Object3D();

    for (let i = 0; i < 9000; i++) {
        const x = Math.random() * (WORLD_SIZE - 40) - HALF + 20;
        const z = Math.random() * (WORLD_SIZE - 40) - HALF + 20;

        if (Math.abs(x) < 25 || Math.abs(z) < 25) {
            dummy.position.set(0, -100, 0);
        } else {
            dummy.position.set(x, 0.25, z);
        }

        dummy.rotation.y = Math.random() * Math.PI;
        dummy.scale.setScalar(0.5 + Math.random());
        dummy.updateMatrix();

        grassDetails.setMatrixAt(i, dummy.matrix);
    }

    grassDetails.receiveShadow = true;
    scene.add(grassDetails);

    return {
        forestAreas,
        treePositions,
        buildings,
        worldSize: WORLD_SIZE
    };
}
