/**
 * FBX Animation Viewer Component
 * 
 * Renders FBX animations using Three.js with playback controls.
 * 
 * @component FbxAnimationViewer
 */

import React, { useEffect, useRef } from "react";

export default function FbxAnimationViewer({
  src,
  selectedAnimationName,
  animationState,
  resetKey,
  onAvailableAnimations,
  onPlayTimeUpdate,
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const gridRef = useRef(null);
  const mixerRef = useRef(null);
  const actionsRef = useRef({});
  const activeActionRef = useRef(null);
  const clockRef = useRef(null);
  const elapsedTimeRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const THREE = await import("three");
      const { FBXLoader } =
        await import("three/examples/jsm/loaders/FBXLoader.js");
      const { OrbitControls } =
        await import("three/examples/jsm/controls/OrbitControls.js");
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

      const camera = new THREE.PerspectiveCamera(
        35,
        container.clientWidth / Math.max(container.clientHeight, 240),
        0.1,
        2000,
      );
      camera.position.set(0, 120, 240);
      cameraRef.current = camera;

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.minDistance = 0.5;
      controls.maxDistance = 2000;
      controls.target.set(0, 0, 0);
      controls.update();
      controlsRef.current = controls;

      const ambient = new THREE.AmbientLight(0xffffff, 0.75);
      scene.add(ambient);

      const hemisphere = new THREE.HemisphereLight(0xf0f8ff, 0x202020, 0.9);
      scene.add(hemisphere);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
      keyLight.position.set(120, 220, 120);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(2048, 2048);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
      fillLight.position.set(-120, -80, -120);
      scene.add(fillLight);

      const grid = new THREE.GridHelper(10, 10, 0x777777, 0x333333);
      grid.position.y = -1.2;
      scene.add(grid);
      gridRef.current = grid;

      if (!src) {
        console.error("FBX viewer: missing source URL");
        return;
      }

      const loader = new FBXLoader();
      loader.load(
        src,
        (object) => {
          if (cancelled) return;
          object.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                const applyMaterial = (material) => {
                  material.side = THREE.DoubleSide;
                  material.depthWrite = true;
                  material.needsUpdate = true;
                  if (material.transparent && material.opacity === 0) {
                    material.opacity = 1;
                    material.transparent = false;
                  }
                };
                if (Array.isArray(child.material)) {
                  child.material.forEach(applyMaterial);
                } else {
                  applyMaterial(child.material);
                }
              }
            }
          });

          // Many FBX rigs import upside-down depending on exporter orientation.
          object.rotation.x = Math.PI;
          object.updateMatrixWorld(true);

          const box = new THREE.Box3().setFromObject(object);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const maxSize = Math.max(size.x, size.y, size.z, 0.01);

          object.position.sub(center);
          object.scale.setScalar((1 / maxSize) * 1.2);
          scene.add(object);

          const boxHelper = new THREE.Box3Helper(box, 0xffff00);
          scene.add(boxHelper);

          const gridScale = Math.max(maxSize * 1.5, 1);
          if (gridRef.current) {
            gridRef.current.scale.setScalar(gridScale);
            gridRef.current.position.y = -maxSize * 0.4;
          }

          const mixer = new THREE.AnimationMixer(object);
          mixerRef.current = mixer;
          clockRef.current = new THREE.Clock();

          const actions = {};
          if (object.animations && object.animations.length > 0) {
            object.animations.forEach((clip) => {
              const action = mixer.clipAction(clip);
              actions[clip.name] = action;
            });
            actionsRef.current = actions;
            onAvailableAnimations?.(Object.keys(actions));
          }
        },
        undefined,
        (error) => {
          console.error("FBX viewer loading failed:", error);
        }
      );

      function resize() {
        if (!renderer || !camera || !container) return;
        camera.aspect = container.clientWidth / Math.max(container.clientHeight, 240);
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight, false);
      }

      function animate() {
        rafRef.current = requestAnimationFrame(animate);
        const delta = clockRef.current ? clockRef.current.getDelta() : 0;
        if (mixerRef.current && clockRef.current) {
          if (animationState === "playing") {
            mixerRef.current.update(delta);
            elapsedTimeRef.current += delta;
            onPlayTimeUpdate?.(elapsedTimeRef.current);
          } else if (animationState === "stopped") {
            elapsedTimeRef.current = 0;
            onPlayTimeUpdate?.(0);
          }
        }
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        if (rendererRef.current && scene && camera) {
          rendererRef.current.render(scene, camera);
        }
      }

      window.addEventListener("resize", resize);
      requestAnimationFrame(() => {
        resize();
        animate();
      });

      return () => {
        cancelled = true;
        window.removeEventListener("resize", resize);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (controlsRef.current) {
          controlsRef.current.dispose();
        }
        if (rendererRef.current) {
          rendererRef.current.dispose();
          container.removeChild(rendererRef.current.domElement);
        }
      };
    }

    let cleanup;
    init().then((result) => {
      cleanup = result;
    });
    return () => {
      cancelled = true;
      if (cleanup && typeof cleanup === "function") cleanup();
    };
  }, [src, onAvailableAnimations]);

  useEffect(() => {
    const actions = actionsRef.current;
    if (!actions || Object.keys(actions).length === 0) return;

    const nextClipName = selectedAnimationName || Object.keys(actions)[0];
    let nextAction = actions[nextClipName];
    if (!nextAction) return;

    if (activeActionRef.current && activeActionRef.current !== nextAction) {
      activeActionRef.current.stop();
    }

    nextAction.reset();
    nextAction.setEffectiveWeight(1);
    nextAction.enabled = true;
    nextAction.play();
    nextAction.paused = animationState !== "playing";
    activeActionRef.current = nextAction;
  }, [selectedAnimationName, animationState]);

  useEffect(() => {
    if (resetKey === undefined) return;
    const active = activeActionRef.current;
    if (!active) return;
    active.reset();
    active.play();
    active.paused = animationState !== "playing";
  }, [resetKey, animationState]);

  return <div ref={containerRef} className="animation-viewer" />;
}
