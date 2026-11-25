
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

export function createWeapon(camera) {
    const weapon = new THREE.Group();

    // MATERIALS
    const slideMaterial = new THREE.MeshStandardMaterial({
        color: 0x343d49,
        metalness: 0.88,
        roughness: 0.28
    });

    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x151c25,
        metalness: 0.55,
        roughness: 0.55
    });

    const darkMetal = new THREE.MeshStandardMaterial({
        color: 0x080d13,
        metalness: 0.85,
        roughness: 0.3
    });

    const gripMaterial = new THREE.MeshStandardMaterial({
        color: 0x202b35,
        roughness: 0.95
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
        color: 0x168cff,
        emissive: 0x063c75,
        emissiveIntensity: 0.65,
        metalness: 0.7,
        roughness: 0.3
    });

    const metalHighlight = new THREE.MeshStandardMaterial({
        color: 0x8996a5,
        metalness: 0.95,
        roughness: 0.2
    });

    // GRIP TEXTURE
    const gripCanvas = document.createElement('canvas');
    gripCanvas.width = 256;
    gripCanvas.height = 256;

    const ctx = gripCanvas.getContext('2d');
    ctx.fillStyle = '#202b35';
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 12) {
        for (let x = 0; x < 256; x += 12) {
            ctx.fillStyle = '#35424e';
            ctx.fillRect(x + 2, y + 2, 5, 5);
        }
    }

    const gripTexture = new THREE.CanvasTexture(gripCanvas);
    gripTexture.colorSpace = THREE.SRGBColorSpace;

    gripMaterial.map = gripTexture;

    // MESH HELPERS
    function addBox(name, size, position, material, rotation = [0, 0, 0]) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(...size),
            material
        );

        mesh.name = name;
        mesh.position.set(...position);
        mesh.rotation.set(...rotation);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        weapon.add(mesh);
        return mesh;
    }

    function addCylinder(name, radius, length, position, material) {
        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(radius, radius, length, 32),
            material
        );

        mesh.name = name;
        mesh.position.set(...position);
        mesh.rotation.x = Math.PI / 2;
        mesh.castShadow = true;

        weapon.add(mesh);
        return mesh;
    }

    // MAIN SLIDE
    addBox(
        'Pistol_Slide',
        [0.22, 0.14, 0.57],
        [0.32, -0.23, -0.64],
        slideMaterial
    );

    // SLIDE TOP
    addBox(
        'Slide_Top',
        [0.18, 0.025, 0.48],
        [0.32, -0.145, -0.64],
        darkMetal
    );

    // LOWER FRAME
    addBox(
        'Pistol_Frame',
        [0.23, 0.085, 0.49],
        [0.32, -0.34, -0.61],
        frameMaterial
    );

    // FRONT BARREL
    addCylinder(
        'Inner_Barrel',
        0.037,
        0.24,
        [0.32, -0.23, -0.98],
        darkMetal
    );

    addCylinder(
        'Barrel_Outer',
        0.057,
        0.12,
        [0.32, -0.23, -0.98],
        slideMaterial
    );

    addCylinder(
        'Muzzle_Ring',
        0.06,
        0.025,
        [0.32, -0.23, -1.105],
        metalHighlight
    );

    // MUZZLE OPENING
    const muzzleOpening = new THREE.Mesh(
        new THREE.CircleGeometry(0.034, 24),
        darkMetal
    );

    muzzleOpening.position.set(0.32, -0.23, -1.119);
    weapon.add(muzzleOpening);

    // ANGLED GRIP
    addBox(
        'Grip_Main',
        [0.17, 0.30, 0.19],
        [0.32, -0.51, -0.47],
        gripMaterial,
        [-0.22, 0, 0]
    );

    addBox(
        'Grip_Base',
        [0.19, 0.035, 0.21],
        [0.32, -0.67, -0.44],
        darkMetal,
        [-0.22, 0, 0]
    );

    // GRIP SIDE PANELS
    for (const side of [-1, 1]) {
        addBox(
            'Grip_Side_Panel',
            [0.012, 0.22, 0.13],
            [0.408 * (side === 1 ? 1 : 0) + (side === -1 ? 0.232 : 0.408), -0.51, -0.47],
            frameMaterial,
            [-0.22, 0, 0]
        );
    }

    // SIDE DETAILS
    for (const side of [-1, 1]) {
        const x = 0.32 + side * 0.116;

        addBox(
            'Slide_Side_Plate',
            [0.012, 0.075, 0.36],
            [x, -0.23, -0.65],
            frameMaterial
        );

        addBox(
            'Blue_Side_Detail',
            [0.014, 0.012, 0.20],
            [x + side * 0.008, -0.245, -0.65],
            accentMaterial
        );

        // Slide grooves
        for (let i = 0; i < 6; i++) {
            addBox(
                'Slide_Groove',
                [0.014, 0.012, 0.018],
                [x + side * 0.008, -0.19, -0.48 - i * 0.045],
                darkMetal
            );
        }

        // Small screws
        for (let i = 0; i < 3; i++) {
            const screw = new THREE.Mesh(
                new THREE.CylinderGeometry(0.009, 0.009, 0.008, 12),
                metalHighlight
            );

            screw.position.set(
                x + side * 0.009,
                -0.22,
                -0.51 - i * 0.12
            );

            screw.rotation.z = Math.PI / 2;
            weapon.add(screw);
        }
    }

    // FRONT AND REAR SIGHTS
    addBox(
        'Front_Sight',
        [0.045, 0.035, 0.045],
        [0.32, -0.125, -0.91],
        darkMetal
    );

    addBox(
        'Rear_Sight',
        [0.075, 0.035, 0.045],
        [0.32, -0.125, -0.40],
        darkMetal
    );

    addBox(
        'Front_Sight_Mark',
        [0.012, 0.008, 0.012],
        [0.32, -0.105, -0.91],
        accentMaterial
    );

    // TRIGGER
    addBox(
        'Trigger',
        [0.025, 0.075, 0.035],
        [0.32, -0.405, -0.55],
        metalHighlight,
        [0.25, 0, 0]
    );

    // TRIGGER GUARD
    const triggerGuard = new THREE.Mesh(
        new THREE.TorusGeometry(0.057, 0.009, 8, 24),
        darkMetal
    );

    triggerGuard.position.set(0.32, -0.405, -0.55);
    weapon.add(triggerGuard);

    // SMALL BLUE STATUS LIGHT
    const statusLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 12, 12),
        new THREE.MeshBasicMaterial({
            color: 0x35d9ff
        })
    );

    statusLight.position.set(0.32, -0.16, -0.72);
    weapon.add(statusLight);

    // MUZZLE FLASH
    const flash = new THREE.Group();

    const flashCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 16, 12),
        new THREE.MeshBasicMaterial({
            color: 0xffc34e
        })
    );

    flash.add(flashCore);

    const flashCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.065, 0.25, 16),
        new THREE.MeshBasicMaterial({
            color: 0xffe4a0
        })
    );

    flashCone.rotation.x = -Math.PI / 2;
    flashCone.position.z = -0.13;
    flash.add(flashCone);

    const flashLight = new THREE.PointLight(0xffb43b, 5, 3);
    flash.add(flashLight);

    flash.position.set(0.32, -0.23, -1.13);
    flash.visible = false;
    weapon.add(flash);

    // MUZZLE POSITION
    const muzzlePoint = new THREE.Object3D();
    muzzlePoint.position.set(0.32, -0.23, -1.13);
    weapon.add(muzzlePoint);

    // WEAPON POSITION
    weapon.position.set(0, 0, 0);
    weapon.scale.setScalar(1);

    camera.add(weapon);

    weapon.userData.muzzleFlash = flash;
    weapon.userData.muzzlePoint = muzzlePoint;

    // MOVE WEAPON GUI TO THE RIGHT AND SHOW ONLY THE PISTOL
    const weaponStyle = document.createElement('style');

    weaponStyle.id = 'noah-pistol-interface-style';
    weaponStyle.textContent = `
        #weapon-hud {
            left: auto !important;
            right: 28px !important;
            bottom: 28px !important;
            transform: none !important;
            width: 220px;
            align-items: stretch !important;
        }

        #weapon-bar {
            display: none !important;
        }

        #weapon-info {
            width: 100% !important;
            max-width: none !important;
            background: linear-gradient(120deg, #101c2b, #1b3550);
            border: 1px solid #35baff99;
            box-shadow: 0 0 22px #168cff33;
        }

        @media (max-width: 600px) {
            #weapon-hud {
                right: 12px !important;
                bottom: 15px !important;
                width: 175px;
            }
        }
    `;

    document.getElementById('noah-pistol-interface-style')?.remove();
    document.head.appendChild(weaponStyle);

    return weapon;
}
