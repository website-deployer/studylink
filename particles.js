import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let camera, scene, renderer, composer, particleSystem, particleGeometry;
const particles = [];
const particleCount = 1000;
const maxDistance = 100;
const minDistance = 20;
const lineGeometry = new THREE.BufferGeometry();
const linePositions = [];
const lineColors = [];

class Particle {
    constructor() {
        this.position = new THREE.Vector3(
            Math.random() * 2000 - 1000,
            Math.random() * 2000 - 1000,
            Math.random() * 2000 - 1000
        );
        this.velocity = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        );
        this.acceleration = new THREE.Vector3();
    }

    update() {
        const time = Date.now() * 0.0001;
        this.acceleration.x = Math.sin(time + this.position.x * 0.01) * 0.1;
        this.acceleration.y = Math.cos(time + this.position.y * 0.01) * 0.1;
        this.acceleration.z = Math.sin(time + this.position.z * 0.01) * 0.1;

        this.velocity.add(this.acceleration);
        this.velocity.multiplyScalar(0.99);
        this.position.add(this.velocity);

        if (Math.abs(this.position.x) > 1000) this.velocity.x *= -1;
        if (Math.abs(this.position.y) > 1000) this.velocity.y *= -1;
        if (Math.abs(this.position.z) > 1000) this.velocity.z *= -1;
    }
}

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.z = 1000;

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    document.getElementById('webgpu-container').appendChild(renderer.domElement);

    particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const particle = new Particle();
        particles.push(particle);
        positions[i * 3] = particle.position.x;
        positions[i * 3 + 1] = particle.position.y;
        positions[i * 3 + 2] = particle.position.z;

        const color = new THREE.Color();
        color.setHSL(Math.random() * 0.1 + 0.5, 0.7, 0.5);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
        vertexShader: `
            attribute vec3 color;
            varying vec3 vColor;
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = 2.0 * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                float r = distance(gl_PointCoord, vec2(0.5));
                if (r > 0.5) discard;
                gl_FragColor = vec4(vColor, 1.0 - (r * 2.0));
            }
        `,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        vertexColors: true
    });

    particleSystem = new THREE.Points(particleGeometry, material);
    scene.add(particleSystem);

    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,
        0.4,
        0.85
    );
    composer.addPass(bloomPass);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    window.addEventListener('resize', onWindowResize, false);
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const positions = particleGeometry.attributes.position.array;
    linePositions.length = 0;
    lineColors.length = 0;

    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        particle.update();
        positions[i * 3] = particle.position.x;
        positions[i * 3 + 1] = particle.position.y;
        positions[i * 3 + 2] = particle.position.z;

        // Draw lines based on distance
        for (let j = i + 1; j < particles.length; j++) {
            const distance = particles[i].position.distanceTo(particles[j].position);

            if (distance < maxDistance && distance > minDistance) {
                linePositions.push(
                    particles[i].position.x, particles[i].position.y, particles[i].position.z,
                    particles[j].position.x, particles[j].position.y, particles[j].position.z
                );

                const alpha = 1 - (distance - minDistance) / (maxDistance - minDistance);
                const color = new THREE.Color(0x2997ff);
                lineColors.push(
                    color.r, color.g, color.b,
                    color.r, color.g, color.b
                );
            }
        }
    }

    particleGeometry.attributes.position.needsUpdate = true;

    if (linePositions.length > 0) {
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));

        const lineMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.2
        });

        const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
        scene.add(lines);
    }

    composer.render();
}

export function initParticles() {
    init();
}
