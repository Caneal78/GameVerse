/**
 * GLB Animation Viewer Component
 * 
 * Renders GLB/GLTF animations using Three.js with playback controls.
 * 
 * @component GlbAnimationViewer
 */

import React, { useEffect, useRef } from "react";

export default function GlbAnimationViewer({
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
      const { GLTFLoader } =
        await import("three/examples/jsm/loaders/GLTFLoader.js");
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

      if (!src) {
        console.error("GLB animation viewer: missing source URLs");
        return;
      }

      const loader = new GLTFLoader();
      const loadScene = () =>
        new Promise((resolve, reject) => {
          loader.load(src, resolve, undefined, reject);
        });

      let sceneGltf;
      try {
        sceneGltf = await loadScene();
      } catch (error) {
        console.error("GLB animation load failed:", error);
        return;
      }

      if (cancelled) return;

      const modelScene = sceneGltf.scene || sceneGltf.scenes?.[0];
      const animationClips = sceneGltf.animations || [];
      if (!modelScene) {
        console.error("GLB animation viewer: model scene missing");
        return;
      }

      modelScene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            const applyMaterial = (material) => {
              material.side = THREE.DoubleSide;
              material.depthWrite = true;
              material.needsUpdate = true;
            };
            if (Array.isArray(child.material)) {
              child.material.forEach(applyMaterial);
            } else {
              applyMaterial(child.material);
            }
          }
        }
      });

      scene.add(modelScene);

      const box = new THREE.Box3().setFromObject(modelScene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z, 0.01);

      modelScene.position.sub(center);
      modelScene.scale.setScalar((1 / maxSize) * 1.2);
      modelScene.updateMatrixWorld(true);

      const boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      const fitDistance = Math.max(boundingSphere.radius * 0.7, maxSize * 0.6);
      camera.position.set(
        fitDistance * 1.2,
        fitDistance * 0.6,
        fitDistance * 1.2,
      );
      camera.lookAt(0, 0, 0);
      camera.near = Math.max(0.1, fitDistance * 0.01);
      camera.far = Math.max(2000, fitDistance * 10);
      camera.updateProjectionMatrix();
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.minDistance = Math.max(0.01, maxSize * 0.05);
        controlsRef.current.maxDistance = fitDistance * 6;
        controlsRef.current.update();
      }

      const mixer = new THREE.AnimationMixer(modelScene);
      mixerRef.current = mixer;
      clockRef.current = new THREE.Clock();
      elapsedTimeRef.current = 0;
      onPlayTimeUpdate?.(0);

      const animationNames = animationClips.map(
        (clip, index) => clip.name || `Animation ${index + 1}`,
      );

      const actions = {};
      animationClips.forEach((clip, index) => {
        const name = animationNames[index];
        const action = mixer.clipAction(clip);
        action.loop = THREE.LoopRepeat;
        action.enabled = true;
        action.clampWhenFinished = true;
        actions[name] = action;
      });
      actionsRef.current = actions;
      onAvailableAnimations?.(animationNames);

      const initialClipName =
        (selectedAnimationName && actions[selectedAnimationName]
          ? selectedAnimationName
          : animationNames[0]) || null;
      if (initialClipName && actions[initialClipName]) {
        const initialAction = actions[initialClipName];
        initialAction.reset();
        initialAction.setEffectiveWeight(1);
        initialAction.enabled = true;
        initialAction.play();
        initialAction.paused = animationState !== "playing";
        activeActionRef.current = initialAction;
      }

      function resize() {
        if (!rendererRef.current || !cameraRef.current || !containerRef.current)
          return;
        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        rendererRef.current.setSize(width, height, false);
        cameraRef.current.aspect = width / Math.max(height, 240);
        cameraRef.current.updateProjectionMatrix();
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
        if (controlsRef.current) controlsRef.current.dispose();
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
  }, [src, onAvailableAnimations, onPlayTimeUpdate]);

  useEffect(() => {
    const actions = actionsRef.current;
    if (!actions || Object.keys(actions).length === 0) return;

    const nextClipName = selectedAnimationName || Object.keys(actions)[0];
    const nextAction = actions[nextClipName];
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
