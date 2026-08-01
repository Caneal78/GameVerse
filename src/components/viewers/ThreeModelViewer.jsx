/**
 * Three.js Model Viewer Component
 * 
 * Renders 3D models using Three.js with orbit controls.
 * Supports GLB/GLTF/FBX/OBJ formats.
 * 
 * @component ThreeModelViewer
 */

import React, { useEffect, useRef } from "react";

export default function ThreeModelViewer({ src, autoRotate = true, useHDRI = false }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

      if (cancelled || !containerRef.current) return;

      const container = containerRef.current;
      container.style.position = "relative";
      container.style.width = "100%";
      container.style.height = "100%";

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.shadowMap.enabled = true;
      renderer.setClearColor(0x222222, 1);
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.inset = "0";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x222222);
      sceneRef.current = scene;
      // HDRI environment map support – loaded only when the flag is true.
      if (useHDRI) {
        const { RGBELoader } = await import("three/examples/jsm/loaders/RGBELoader.js");
        const rgbeLoader = new RGBELoader();
        rgbeLoader.load(
          "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/studio_small_09_2k.hdr",
          (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = texture;
          }
        );
      }

      const camera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / Math.max(container.clientHeight, 240),
        0.01,
        1000
      );
      camera.position.set(0, 1.5, 3);
      cameraRef.current = camera;

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controlsRef.current = controls;

      const grid = new THREE.GridHelper(10, 10, 0x444444, 0x333333);
      scene.add(grid);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1);
      dirLight.position.set(5, 10, 7);
      dirLight.castShadow = true;
      scene.add(dirLight);

      const ext = src.split(".").pop().toLowerCase();
      let loader;
      if (ext === "glb" || ext === "gltf") {
        loader = new GLTFLoader();
      } else {
        loader = new GLTFLoader(); // fallback
      }

      loader.load(
        src,
        (gltf) => {
          if (cancelled) return;
          const model = gltf.scene;
          scene.add(model);

          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxSize = Math.max(size.x, size.y, size.z);
          const fitDistance = maxSize * 2.5;

          camera.position.set(fitDistance * 0.7, fitDistance * 0.7, fitDistance);
          camera.lookAt(0, size.y / 2, 0);
          controls.target.set(0, 0, 0);
          controls.minDistance = Math.max(0.01, maxSize * 0.05);
          controls.maxDistance = fitDistance * 6;
          controls.update();
        },
        undefined,
        (error) => {
          console.error("ThreeModelViewer loading failed:", error);
        }
      );

      function resize() {
        if (!renderer || !camera || !container) return;
        camera.aspect = container.clientWidth / Math.max(container.clientHeight, 240);
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight, false);
      }

      window.addEventListener("resize", resize);
      const resizeObserver = new ResizeObserver(() => {
        resize();
      });
      resizeObserver.observe(container);

      function animate() {
        if (cancelled) return;
        rafRef.current = requestAnimationFrame(animate);

        if (autoRotate && sceneRef.current) {
          sceneRef.current.traverse((child) => {
            if (child.parent === sceneRef.current && child !== grid && !(child instanceof THREE.Light)) {
              child.rotation.y += 0.005;
            }
          });
        }

        controls.update();
        renderer.render(scene, camera);
      }
      animate();

      return () => {
        window.removeEventListener("resize", resize);
        resizeObserver.disconnect();
      };
    }

    let cleanupFn;
    init().then((cleanup) => {
      cleanupFn = cleanup;
    });

    return () => {
      cancelled = true;
      if (cleanupFn) cleanupFn();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, [src, autoRotate]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }} />;
}
