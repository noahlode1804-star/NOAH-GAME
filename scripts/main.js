
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

import { createWorld } from './world.js';
import { createWeapon } from './weapon.js';

export function startGame() {
    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0x91b6d0);
    scene.fog = new THREE.FogExp2(0x91b6d0, 0.00045);

    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        2600
    );

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance'
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    document.body.appendChild(renderer.domElement);

    // LIGHTING
    const sunlight = new THREE.DirectionalLight(0xffe8c8, 3.2);
    sunlight.position.set(-250, 320, 180);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(4096, 4096);
    sunlight.shadow.camera.left = -500;
    sunlight.shadow.camera.right = 500;
    sunlight.shadow.camera.top = 500;
    sunlight.shadow.camera.bottom = -500;
    sunlight.shadow.normalBias = 0.035;
    scene.add(sunlight);

    scene.add(new THREE.HemisphereLight(0xc9e4ff, 0x46552d, 1.6));

    const fillLight = new THREE.DirectionalLight(0x8abaff, 0.7);
    fillLight.position.set(200, 120, -180);
    scene.add(fillLight);

    // WORLD
    const worldData = createWorld(scene, renderer);
    const worldLimit = worldData.worldSize / 2 - 20;

    // PLAYER
    const player = new THREE.Object3D();
    player.position.set(0, 1.7, 40);
    scene.add(player);
    player.add(camera);

    // JUMPING
    const groundHeight = 1.7;
    let verticalVelocity = 0;
    let onGround = true;

    const jumpStrength = 0.22;
    const gravity = 0.012;

    // WEAPON
    const weapon = createWeapon(camera);
    const muzzleFlash = weapon.userData.muzzleFlash;
    const muzzlePoint = weapon.userData.muzzlePoint;

    // GAME VARIABLES
    const keys = {};
    let paused = false;
    let ammo = 12;
    let reserveAmmo = 48;
    let lastShot = 0;
    let flashUntil = 0;
    let recoil = 0;
    let reloading = false;

    const maxAmmo = 12;

    const ammoCurrent = document.getElementById('ammo-current');
    const ammoTotal = document.getElementById('ammo-total');

    function updateAmmo() {
        if (ammoCurrent) ammoCurrent.textContent = ammo;
        if (ammoTotal) ammoTotal.textContent = reserveAmmo;
    }

    updateAmmo();

    // MINIMAP
    const mapStyle = document.createElement('style');
    mapStyle.textContent = `
        #noah-minimap {
            position: fixed;
            top: 22px;
            right: 22px;
            width: 220px;
            height: 220px;
            z-index: 8;
            border: 2px solid #55cfff;
            border-radius: 50%;
            overflow: hidden;
            background: #101c20;
            box-shadow: 0 0 22px #168cff66, inset 0 0 20px #000;
            pointer-events: none;
        }

        #noah-minimap canvas {
            width: 100%;
            height: 100%;
            display: block;
        }

        #noah-map-label {
            position: fixed;
            top: 250px;
            right: 22px;
            width: 220px;
            text-align: center;
            color: #d9f5ff;
            font: 900 9px Arial, sans-serif;
            letter-spacing: 3px;
            text-shadow: 0 2px 5px #000;
            z-index: 8;
            pointer-events: none;
        }

        #noah-map-direction {
            position: fixed;
            top: 30px;
            right: 118px;
            color: #fff;
            z-index: 9;
            font: bold 12px Arial;
            pointer-events: none;
        }

        @media (max-width: 600px) {
            #noah-minimap {
                width: 145px;
                height: 145px;
                top: 12px;
                right: 12px;
            }

            #noah-map-label {
                top: 160px;
                right: 12px;
                width: 145px;
                font-size: 7px;
            }

            #noah-map-direction {
                top: 17px;
                right: 75px;
            }
        }
    `;
    document.head.appendChild(mapStyle);

    const mapContainer = document.createElement('div');
    mapContainer.id = 'noah-minimap';

    const mapCanvas = document.createElement('canvas');
    mapCanvas.width = 512;
    mapCanvas.height = 512;
    mapContainer.appendChild(mapCanvas);
    document.body.appendChild(mapContainer);

    const mapLabel = document.createElement('div');
    mapLabel.id = 'noah-map-label';
    mapLabel.textContent = 'NOAH ISLAND • LIVE MAP';
    document.body.appendChild(mapLabel);

    const mapDirection = document.createElement('div');
    mapDirection.id = 'noah-map-direction';
    mapDirection.textContent = 'N';
    document.body.appendChild(mapDirection);

    const mapContext = mapCanvas.getContext('2d');

    function drawMinimap() {
        const ctx = mapContext;
        const size = mapCanvas.width;
        const center = size / 2;

        const scale = 0.19;

        ctx.clearRect(0, 0, size, size);

        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(player.rotation.y);
        ctx.scale(scale, scale);
        ctx.translate(-player.position.x, -player.position.z);

        ctx.fillStyle = '#547c45';
        ctx.fillRect(-1200, -1200, 2400, 2400);

        for (const area of worldData.forestAreas) {
            ctx.fillStyle = '#315d35';
            ctx.beginPath();
            ctx.arc(area.x, area.z, area.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Roads
        ctx.fillStyle = '#45494b';
        ctx.fillRect(-10, -1200, 20, 2400);
        ctx.fillRect(-1200, -10, 2400, 20);

        ctx.fillRect(-506, -1200, 13, 2400);
        ctx.fillRect(493, -1200, 13, 2400);
        ctx.fillRect(-1200, -506, 2400, 13);
        ctx.fillRect(-1200, 493, 2400, 13);

        ctx.strokeStyle = '#777a70';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(-500, -575);
        ctx.lineTo(500, 75);
        ctx.moveTo(-500, 575);
        ctx.lineTo(500, -75);
        ctx.stroke();

        // Buildings
        for (const building of worldData.buildings) {
            ctx.save();
            ctx.translate(building.x, building.z);
            ctx.fillStyle = '#b8a78b';
            ctx.fillRect(
                -building.width / 2,
                -building.depth / 2,
                building.width,
                building.depth
            );
            ctx.strokeStyle = '#e1d1b6';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                -building.width / 2,
                -building.depth / 2,
                building.width,
                building.depth
            );
            ctx.restore();
        }

        // Trees
        ctx.fillStyle = '#193f27';

        for (const tree of worldData.treePositions) {
            ctx.beginPath();
            ctx.arc(tree.x, tree.z, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Player marker
        ctx.save();
        ctx.translate(center, center);

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#35d9ff';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(13, 14);
        ctx.lineTo(0, 8);
        ctx.lineTo(-13, 14);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Compass
        const angle = (
            (THREE.MathUtils.radToDeg(player.rotation.y) % 360) + 360
        ) % 360;

        const directions = ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'];
        mapDirection.textContent =
            directions[Math.round(angle / 45) % 8];
    }

    // PAUSE MENU
    const pauseStyle = document.createElement('style');
    pauseStyle.textContent = `
        #pause-menu {
            position: fixed;
            inset: 0;
            z-index: 1000;
            display: flex;
            justify-content: flex-end;
            background: rgba(0, 5, 13, 0.55);
            backdrop-filter: blur(5px);
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.25s ease, visibility 0.25s ease;
            font-family: Arial, Helvetica, sans-serif;
        }

        #pause-menu.open {
            opacity: 1;
            visibility: visible;
        }

        #pause-panel {
            width: min(440px, 90vw);
            height: 100%;
            padding: 45px 35px;
            display: flex;
            flex-direction: column;
            background:
                radial-gradient(ellipse at 100% 0%, #123e67 0%, transparent 50%),
                linear-gradient(160deg, #101e30, #050b14 75%);
            border-left: 1px solid #35baff88;
            box-shadow: -15px 0 60px #0009;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(.2,.8,.2,1);
        }

        #pause-menu.open #pause-panel {
            transform: translateX(0);
        }

        .pause-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 25px;
            border-bottom: 1px solid #ffffff22;
        }

        .pause-brand {
            color: white;
            font-size: 19px;
            font-weight: 900;
            letter-spacing: 4px;
        }

        .pause-brand span { color: #35d9ff; }

        .pause-status {
            color: #55e8a6;
            font-size: 9px;
            letter-spacing: 2px;
        }

        .pause-heading {
            margin-top: 48px;
            margin-bottom: 8px;
            color: white;
            font-size: 43px;
            font-weight: 900;
            letter-spacing: 2px;
        }

        .pause-subtitle {
            margin-bottom: 35px;
            color: #7897b4;
            font-size: 11px;
            letter-spacing: 2px;
        }

        .pause-buttons {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .pause-button {
            width: 100%;
            min-height: 65px;
            padding: 0 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: #dceeff;
            background: linear-gradient(100deg, #152c43, #0c1928);
            border: 1px solid #41617d88;
            cursor: pointer;
            text-align: left;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 2px;
            transition: 0.2s;
        }

        .pause-button:hover {
            color: white;
            background: linear-gradient(100deg, #1763a2, #103252);
            border-color: #35d9ff;
            transform: translateX(-5px);
            box-shadow: 0 0 22px #168cff33;
        }

        .pause-button .pause-icon {
            margin-right: 15px;
            color: #35d9ff;
            font-size: 19px;
        }

        .pause-button .pause-arrow {
            color: #6d9cbd;
            font-size: 18px;
        }

        .pause-button.leave {
            margin-top: 20px;
            color: #ffaaaa;
            border-color: #a8444477;
            background: linear-gradient(100deg, #361c27, #1d121b);
        }

        .pause-button.leave:hover {
            color: white;
            background: linear-gradient(100deg, #a83242, #54202d);
            border-color: #ff6478;
        }

        .pause-footer {
            margin-top: auto;
            padding-top: 20px;
            border-top: 1px solid #ffffff20;
            color: #59748e;
            font-size: 9px;
            letter-spacing: 2px;
            display: flex;
            justify-content: space-between;
        }

        #pause-settings {
            display: none;
            margin-top: 25px;
        }

        #pause-settings.visible { display: block; }

        .pause-setting {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            padding: 20px 0;
            border-bottom: 1px solid #ffffff22;
            color: white;
            font-size: 12px;
        }

        .pause-setting input { accent-color: #168cff; }

        .pause-back {
            width: 100%;
            margin-top: 25px;
            padding: 16px;
            color: white;
            background: #1267ad;
            border: 1px solid #35d9ff;
            cursor: pointer;
            font-weight: bold;
            letter-spacing: 2px;
        }

        .pause-back:hover { background: #168cff; }

        @media (max-width: 500px) {
            #pause-panel { padding: 30px 22px; }
            .pause-heading { font-size: 35px; }
        }
    `;
    document.head.appendChild(pauseStyle);

    const pauseMenu = document.createElement('div');
    pauseMenu.id = 'pause-menu';

    pauseMenu.innerHTML = `
        <div id="pause-panel">
            <div class="pause-top">
                <div class="pause-brand">NOAH<span>GAME</span></div>
                <div class="pause-status">SYSTEM PAUSED</div>
            </div>

            <div id="pause-main">
                <div class="pause-heading">PAUSED</div>
                <div class="pause-subtitle">YOUR GAME IS CURRENTLY ON HOLD</div>

                <div class="pause-buttons">
                    <button class="pause-button" id="pause-resume">
                        <span><span class="pause-icon">▶</span>RESUME GAME</span>
                        <span class="pause-arrow">›</span>
                    </button>

                    <button class="pause-button" id="pause-settings-open">
                        <span><span class="pause-icon">⚙</span>SETTINGS</span>
                        <span class="pause-arrow">›</span>
                    </button>

                    <button class="pause-button" id="pause-feedback">
                        <span><span class="pause-icon">◈</span>GAME INFORMATION</span>
                        <span class="pause-arrow">›</span>
                    </button>

                    <button class="pause-button leave" id="pause-leave">
                        <span><span class="pause-icon">↪</span>LEAVE GAME</span>
                        <span class="pause-arrow">›</span>
                    </button>
                </div>
            </div>

            <div id="pause-settings">
                <div class="pause-heading">SETTINGS</div>
                <div class="pause-subtitle">GAME CONFIGURATION</div>

                <div class="pause-setting">
                    <span>Menu effects</span>
                    <input type="checkbox" id="pause-effects" checked>
                </div>

                <div class="pause-setting">
                    <span>Interface glow</span>
                    <input type="range" id="pause-glow" min="0" max="100" value="65">
                </div>

                <button class="pause-back" id="pause-settings-back">BACK</button>
            </div>

            <div class="pause-footer">
                <span>NOAH GAME</span>
                <span>VERSION 1.0.0</span>
            </div>
        </div>
    `;

    document.body.appendChild(pauseMenu);

    const pauseMain = document.getElementById('pause-main');
    const pauseSettings = document.getElementById('pause-settings');

    function openPauseMenu() {
        if (paused) return;

        paused = true;

        for (const key in keys) keys[key] = false;

        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        pauseMain.style.display = 'block';
        pauseSettings.classList.remove('visible');
        pauseMenu.classList.add('open');
    }

    function closePauseMenu() {
        if (!paused) return;

        paused = false;
        pauseMenu.classList.remove('open');
        renderer.domElement.requestPointerLock();
    }

    document.getElementById('pause-resume')
        .addEventListener('click', closePauseMenu);

    document.getElementById('pause-settings-open')
        .addEventListener('click', () => {
            pauseMain.style.display = 'none';
            pauseSettings.classList.add('visible');
        });

    document.getElementById('pause-settings-back')
        .addEventListener('click', () => {
            pauseSettings.classList.remove('visible');
            pauseMain.style.display = 'block';
        });

    document.getElementById('pause-leave')
        .addEventListener('click', () => window.location.reload());

    document.getElementById('pause-feedback')
        .addEventListener('click', () => alert('NOAH GAME V1.0.0'));

    const pauseEffects = document.getElementById('pause-effects');
    const pauseGlow = document.getElementById('pause-glow');

    pauseEffects.addEventListener('change', () => {
        pauseMenu.style.backdropFilter =
            pauseEffects.checked ? 'blur(5px)' : 'none';
    });

    pauseGlow.addEventListener('input', () => {
        document.documentElement.style.setProperty(
            '--glow-strength',
            pauseGlow.value / 100
        );
    });

    // KEYBOARD
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            event.preventDefault();

            if (paused) closePauseMenu();
            else openPauseMenu();

            return;
        }

        if (paused) return;

        // SPRINGEN MET SPATIE
        if (event.code === 'Space') {
            event.preventDefault();

            if (onGround && !event.repeat) {
                verticalVelocity = jumpStrength;
                onGround = false;
            }

            return;
        }

        keys[event.key.toLowerCase()] = true;

        if (event.key.toLowerCase() === 'r') reload();
    });

    document.addEventListener('keyup', event => {
        keys[event.key.toLowerCase()] = false;
    });

    // POINTER LOCK
    renderer.domElement.addEventListener('click', () => {
        if (paused) return;

        if (document.pointerLockElement !== renderer.domElement) {
            renderer.domElement.requestPointerLock();
        }
    });

    document.addEventListener('mousemove', event => {
        if (paused) return;
        if (document.pointerLockElement !== renderer.domElement) return;

        player.rotation.y -= event.movementX * 0.002;
        camera.rotation.x -= event.movementY * 0.002;

        camera.rotation.x = Math.max(
            -1.5,
            Math.min(1.5, camera.rotation.x)
        );
    });

    // SHOOTING
    const raycaster = new THREE.Raycaster();
    raycaster.far = 120;

    const effects = [];

    function isWeaponPart(object) {
        let current = object;

        while (current) {
            if (current === weapon) return true;
            current = current.parent;
        }

        return false;
    }

    function createTracer(start, end) {
        const geometry = new THREE.BufferGeometry()
            .setFromPoints([start, end]);

        const material = new THREE.LineBasicMaterial({
            color: 0xffd16b,
            transparent: true,
            opacity: 0.9
        });

        const tracer = new THREE.Line(geometry, material);
        scene.add(tracer);

        effects.push({
            object: tracer,
            expires: performance.now() + 75
        });
    }

    function createImpact(position) {
        const material = new THREE.MeshBasicMaterial({
            color: 0xffb43b
        });

        const spark = new THREE.Mesh(
            new THREE.SphereGeometry(0.055, 8, 8),
            material
        );

        spark.position.copy(position);
        scene.add(spark);

        effects.push({
            object: spark,
            expires: performance.now() + 130
        });
    }

    function shoot() {
        if (paused || reloading) return;

        const now = performance.now();

        if (now - lastShot < 170 || ammo <= 0) return;

        lastShot = now;
        ammo--;
        updateAmmo();

        muzzleFlash.visible = true;
        flashUntil = now + 65;
        recoil = Math.min(recoil + 0.11, 0.25);

        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

        const intersections = raycaster.intersectObjects(
            scene.children,
            true
        );

        const hit = intersections.find(
            result => !isWeaponPart(result.object)
        );

        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);

        const end = hit
            ? hit.point.clone()
            : camera.position.clone().add(direction.multiplyScalar(120));

        const start = new THREE.Vector3();
        muzzlePoint.getWorldPosition(start);

        createTracer(start, end);

        if (hit) createImpact(hit.point);
    }

    document.addEventListener('mousedown', event => {
        if (event.button !== 0 || paused) return;
        if (document.pointerLockElement !== renderer.domElement) return;

        shoot();
    });

    // RELOAD
    function reload() {
        if (paused || reloading) return;
        if (ammo === maxAmmo || reserveAmmo <= 0) return;

        reloading = true;

        const status = document.getElementById('weapon-name');
        if (status) status.textContent = 'RELOADING...';

        setTimeout(() => {
            const needed = maxAmmo - ammo;
            const amount = Math.min(needed, reserveAmmo);

            ammo += amount;
            reserveAmmo -= amount;
            reloading = false;

            updateAmmo();

            if (status) status.textContent = 'PISTOL';
        }, 1000);
    }

    // GAME LOOP
    function animate() {
        requestAnimationFrame(animate);

        const now = performance.now();

        if (!paused) {
            const speed = 0.22;

            if (keys.w) player.translateZ(-speed);
            if (keys.s) player.translateZ(speed);
            if (keys.a) player.translateX(-speed);
            if (keys.d) player.translateX(speed);

            // ZWAARTEKRACHT EN SPRONG
            if (!onGround) {
                verticalVelocity -= gravity;
                player.position.y += verticalVelocity;

                if (player.position.y <= groundHeight) {
                    player.position.y = groundHeight;
                    verticalVelocity = 0;
                    onGround = true;
                }
            }

            player.position.x = THREE.MathUtils.clamp(
                player.position.x,
                -worldLimit,
                worldLimit
            );

            player.position.z = THREE.MathUtils.clamp(
                player.position.z,
                -worldLimit,
                worldLimit
            );

            recoil = THREE.MathUtils.lerp(recoil, 0, 0.18);
            weapon.rotation.x = -recoil;

            if (now > flashUntil) muzzleFlash.visible = false;

            for (let i = effects.length - 1; i >= 0; i--) {
                if (now >= effects[i].expires) {
                    scene.remove(effects[i].object);
                    effects[i].object.geometry.dispose();
                    effects[i].object.material.dispose();
                    effects.splice(i, 1);
                }
            }
        }

        drawMinimap();
        renderer.render(scene, camera);
    }

    animate();

    // RESIZE
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );
    });
}
