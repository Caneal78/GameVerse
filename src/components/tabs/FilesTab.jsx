/**
 * Files Tab Component
 *
 * Tab for managing item files (images, audio, models, animations, scripts).
 * Supports drag & drop import, version management, and preview.
 *
 * @component FilesTab
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../../context/ToastContext.jsx";
import { toGvfileUrl } from "../../utils/gvfileUrl.js";
/**
 * Supported 3D model file extensions
 * @type {string[]}
 */
const MODEL_EXTS = [".glb", ".gltf", ".fbx", ".obj", ".stl", ".blend"];
/**
 * Supported animation file extensions
 * @type {string[]}
 */
const ANIMATION_EXTS = [".glb", ".gltf", ".fbx", ".dae", ".anim", ".bvh"];

/**
 * Supported image file extensions
 * @type {string[]}
 */
const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

/**
 * Get file extension from filename
 *
 * @param {string} name - Filename
 * @returns {string} File extension with dot
 */
function extOf(name) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function ThreeModelViewer({ src, autoRotate = true }) {
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

      const camera = new THREE.PerspectiveCamera(
        35,
        container.clientWidth / Math.max(container.clientHeight, 240),
        0.1,
        2000
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
      grid.position.y = -0.6;
      scene.add(grid);

      if (!src) {
        console.error("ThreeModelViewer: missing source URL");
        return;
      }

      const loader = new GLTFLoader();
      loader.load(
        src,
        (gltf) => {
          if (cancelled) return;
          const modelScene = gltf.scene || gltf.scenes?.[0];
          if (!modelScene) return;

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
            fitDistance * 1.2
          );
          camera.lookAt(0, 0, 0);
          camera.near = Math.max(0.1, fitDistance * 0.01);
          camera.far = Math.max(2000, fitDistance * 10);
          camera.updateProjectionMatrix();

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

function FbxAnimationViewer({
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

          const axes = new THREE.AxesHelper(Math.max(maxSize * 0.6, 1));
          scene.add(axes);

          const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(maxSize * 5, maxSize * 5),
            new THREE.MeshStandardMaterial({
              color: 0x222222,
              roughness: 0.9,
              metalness: 0.1,
            }),
          );
          ground.rotation.x = -Math.PI / 2;
          ground.position.y = -maxSize * 0.5;
          ground.receiveShadow = true;
          scene.add(ground);

          const boundingSphere = box.getBoundingSphere(new THREE.Sphere());
          const fitDistance = Math.max(
            boundingSphere.radius * 0.7,
            maxSize * 0.6,
          );
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

          const mixer = new THREE.AnimationMixer(object);
          mixerRef.current = mixer;
          clockRef.current = new THREE.Clock();
          elapsedTimeRef.current = 0;
          onPlayTimeUpdate?.(0);

          const clips = object.animations || [];
          const animationNames = clips.map(
            (clip, index) => clip.name || `Animation ${index + 1}`,
          );

          const actions = {};
          clips.forEach((clip, index) => {
            const name = animationNames[index];
            const action = mixer.clipAction(clip);
            action.loop = THREE.LoopRepeat;
            action.enabled = true;
            action.clampWhenFinished = true;
            actions[name] = action;
          });
          actionsRef.current = actions;

          onAvailableAnimations?.(animationNames);
          if (animationNames.length === 0) {
            console.warn("FBX loaded with no animation clips:", src);
          }
        },
        undefined,
        (error) => {
          console.error("FBX animation load failed:", error);
        },
      );

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

function GlbAnimationViewer({
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

/**
 * Files tab props
 *
 * @typedef {Object} FilesTabProps
 * @property {Object} item - Item data
 * @property {string} section - File section (Images, Audio, Models, etc.)
 * @property {function} onChange - Callback when files are updated
 */

/**
 * Files tab component
 *
 * @param {FilesTabProps} props - Component props
 * @returns {React.ReactNode} Rendered tab
 */
export default function FilesTab({ item, section, onChange }) {
  const { showToast } = useToast();
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [resolvedPaths, setResolvedPaths] = useState({});
  const [selectedReferenceImageId, setSelectedReferenceImageId] =
    useState(null);
  const [animationState, setAnimationState] = useState("playing");
  const [availableAnimations, setAvailableAnimations] = useState([]);
  const [selectedAnimationName, setSelectedAnimationName] = useState(null);
  const [animationResetKey, setAnimationResetKey] = useState(0);
  const [fbxPlayTime, setFbxPlayTime] = useState(0);
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const modelViewerRef = useRef(null);

  const files = useMemo(
    () => item.files.filter((f) => f.section === section && f.is_current),
    [item.files, section],
  );
  const imageFiles = useMemo(
    () => item.files.filter((f) => f.section === "Images" && f.is_current),
    [item.files],
  );
  const modelFiles = useMemo(
    () => item.files.filter((f) => f.section === "Models" && f.is_current),
    [item.files],
  );
  const olderVersions = useMemo(
    () => item.files.filter((f) => f.section === section && !f.is_current),
    [item.files, section],
  );

  useEffect(() => {
    let cancelled = false;
    async function resolveAll() {
      const map = {};
      const allFiles = [
        ...files,
        ...imageFiles,
        ...(section === "Animations" ? modelFiles : []),
      ];
      const seen = new Set();
      for (const f of allFiles) {
        if (seen.has(f.id)) continue;
        seen.add(f.id);
        const resolved = f.is_linked
          ? f.stored_path
          : await window.gameverse.files.resolvePath(f.stored_path);
        map[f.id] = resolved ? resolved.replace(/\\/g, "/") : null;
      }
      if (!cancelled) setResolvedPaths(map);
    }
    resolveAll();
    return () => {
      cancelled = true;
    };
  }, [files, imageFiles, modelFiles, section]);

  useEffect(() => {
    if (!selectedReferenceImageId && imageFiles.length > 0) {
      setSelectedReferenceImageId(imageFiles[0].id);
    }
  }, [imageFiles, selectedReferenceImageId]);

  useEffect(() => {
    if (modelFiles.length === 0) {
      setSelectedModelId(null);
      return;
    }
    if (!selectedModelId || !modelFiles.some((m) => m.id === selectedModelId)) {
      setSelectedModelId(modelFiles[0].id);
    }
  }, [modelFiles, selectedModelId]);

  useEffect(() => {
    if (!previewFile) return;
    setAnimationState("playing");
    setAvailableAnimations([]);
    setSelectedAnimationName(null);
    setAnimationResetKey((k) => k + 1);
    setFbxPlayTime(0);
  }, [previewFile]);

  useEffect(() => {
    const viewer = modelViewerRef.current;
    if (!viewer) return undefined;

    const handleModelLoad = () => {
      const names = Array.from(viewer.availableAnimations || []);
      setAvailableAnimations(names);
      if (!selectedAnimationName && names.length > 0) {
        setSelectedAnimationName(names[0]);
      }
    };

    viewer.addEventListener("load", handleModelLoad);
    return () => viewer.removeEventListener("load", handleModelLoad);
  }, [previewFile, selectedAnimationName]);

  useEffect(() => {
    if (!selectedAnimationName && availableAnimations.length > 0) {
      setSelectedAnimationName(availableAnimations[0]);
    }
  }, [availableAnimations, selectedAnimationName]);

  function playAnimation() {
    const viewer = modelViewerRef.current;
    if (viewer) {
      viewer.play();
    }
    setAnimationState("playing");
  }

  function pauseAnimation() {
    const viewer = modelViewerRef.current;
    if (viewer) {
      viewer.pause();
    }
    setAnimationState("paused");
  }

  function stopAnimation() {
    const viewer = modelViewerRef.current;
    if (viewer) {
      viewer.pause();
      viewer.currentTime = 0;
    }
    setAnimationState("stopped");
    setFbxPlayTime(0);
  }

  function resetAnimation() {
    const viewer = modelViewerRef.current;
    if (viewer) {
      viewer.currentTime = 0;
      if (animationState === "playing") {
        viewer.play();
      } else {
        viewer.pause();
      }
    }
    setAnimationResetKey((k) => k + 1);
  }

  async function handleImportDialog(mode = "copy") {
    setImporting(true);
    try {
      const res = await window.gameverse.files.importDialog(
        item.id,
        section,
        mode,
      );
      if (!res.canceled) {
        showToast(`Imported ${res.files.length} file(s).`, "success");
        onChange && onChange();
      }
    } catch (e) {
      showToast(e.message || "Import failed", "error");
    } finally {
      setImporting(false);
    }
  }

  async function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    const paths = droppedFiles
      .map((f) => window.gvGetPathForFile(f))
      .filter(Boolean);

    if (paths.length === 0) {
      showToast("Could not resolve dropped file paths.", "error");
      return;
    }

    setImporting(true);
    try {
      const imported = await window.gameverse.files.importPaths(
        item.id,
        section,
        paths,
        "copy",
      );
      showToast(`Imported ${imported.length} file(s).`, "success");
      onChange && onChange();
    } catch (err) {
      showToast(err.message || "Import failed", "error");
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(fileId) {
    if (!confirm("Delete this file? This cannot be undone.")) return;
    try {
      await window.gameverse.files.delete(fileId);
      onChange && onChange();
    } catch (err) {
      showToast(err.message || "Delete failed", "error");
    }
  }

  async function handleRestore(fileId) {
    try {
      await window.gameverse.files.restoreVersion(fileId);
      showToast("Version restored.", "success");
      onChange && onChange();
    } catch (err) {
      showToast(err.message || "Restore failed", "error");
    }
  }

  function renderPreview(file) {
    const p = resolvedPaths[file.id];
    if (!p) return <div className="file-card-preview">…</div>;
    const ext = extOf(file.original_name);
    const src = toGvfileUrl(p);

    if (section === "Images" || IMAGE_EXTS.includes(ext)) {
      return (
        <div className="file-card-preview" onClick={() => setPreviewFile(file)}>
          <img src={src} alt={file.original_name} />
        </div>
      );
    }
    if (section === "Models" && (ext === ".glb" || ext === ".gltf")) {
      return (
        <div className="file-card-preview" onClick={() => setPreviewFile(file)}>
          <ThreeModelViewer src={src} autoRotate={true} />
        </div>
      );
    }
    if (section === "Models" && ext === ".fbx") {
      return (
        <div className="file-card-preview" onClick={() => setPreviewFile(file)}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <span style={{ fontSize: 28 }}>🧷</span>
          </div>
        </div>
      );
    }

    if (section === "Audio") {
      return (
        <div className="file-card-preview" style={{ padding: 10 }}>
          <span style={{ fontSize: 28 }}>🔊</span>
        </div>
      );
    }
    if (section === "Animations") {
      if (ext === ".glb" || ext === ".gltf") {
        return (
          <div
            className="file-card-preview"
            onClick={() => setPreviewFile(file)}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                height: "100%",
              }}
            >
              <div style={{ fontSize: 28 }}>🏃</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Animation
              </div>
            </div>
          </div>
        );
      }
      return (
        <div
          className="file-card-preview"
          onClick={() => setPreviewFile(file)}
          style={{ padding: 10 }}
        >
          <span style={{ fontSize: 28 }}>🏃</span>
        </div>
      );
    }
    return (
      <div className="file-card-preview">
        <span style={{ fontSize: 28 }}>{sectionIcon(section)}</span>
      </div>
    );
  }

  function renderReferenceImagePanel() {
    if (imageFiles.length === 0) return null;
    const selectedImage =
      imageFiles.find((image) => image.id === selectedReferenceImageId) ||
      imageFiles[0];
    const selectedSrc = resolvedPaths[selectedImage?.id]
      ? toGvfileUrl(resolvedPaths[selectedImage.id])
      : null;

    return (
      <div className="preview-image-panel">
        <div className="preview-image-main">
          {selectedSrc ? (
            <img
              src={selectedSrc}
              alt={selectedImage.original_name}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <div className="empty-state">No reference image available.</div>
          )}
        </div>
        <div className="preview-image-list">
          {imageFiles.map((image) => {
            const imageSrc = resolvedPaths[image.id]
              ? toGvfileUrl(resolvedPaths[image.id])
              : null;
            return (
              <button
                key={image.id}
                type="button"
                className="preview-image-thumb"
                onClick={() => setSelectedReferenceImageId(image.id)}
              >
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={image.original_name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span>{image.original_name.slice(0, 2).toUpperCase()}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderSelectedModelPanel() {
    const selectedModel =
      modelFiles.find((model) => model.id === selectedModelId) || modelFiles[0];
    if (!selectedModel) {
      return (
        <div className="preview-model">
          <div className="empty-state" style={{ margin: "auto" }}>
            Add a 3D model in the Models tab to preview it here.
          </div>
        </div>
      );
    }

    const modelSrc = resolvedPaths[selectedModel.id]
      ? toGvfileUrl(resolvedPaths[selectedModel.id])
      : null;
    if (!modelSrc) {
      return (
        <div className="preview-model">
          <div className="empty-state" style={{ margin: "auto" }}>
            Selected model could not be resolved.
          </div>
        </div>
      );
    }

    return renderModelPreview(modelSrc, extOf(selectedModel.original_name));
  }

  function handleChooseReferenceModel(modelId) {
    setSelectedModelId(modelId);
    setShowModelPicker(false);
  }

  function renderModelPreview(src, ext) {
    if (ext === ".glb" || ext === ".gltf") {
      return (
        <div className="preview-model">
          <ThreeModelViewer src={src} autoRotate={true} />
        </div>
      );
    }

    if (ext === ".fbx") {
      return (
        <div className="preview-model">
          <div className="empty-state" style={{ margin: "auto" }}>
            FBX model preview is not rendered inline yet. Use Reveal to open it
            externally.
          </div>
        </div>
      );
    }

    return (
      <div className="preview-model">
        <div className="empty-state" style={{ margin: "auto" }}>
          No inline model preview available for this file type.
        </div>
      </div>
    );
  }

  function renderAnimationPreview(src, ext) {
    if (ext === ".fbx") {
      return (
        <div className="animation-preview">
          <div className="animation-viewer">
            <FbxAnimationViewer
              src={src}
              selectedAnimationName={selectedAnimationName}
              animationState={animationState}
              resetKey={animationResetKey}
              onAvailableAnimations={setAvailableAnimations}
              onPlayTimeUpdate={setFbxPlayTime}
            />
          </div>
          <div className="animation-controls">
            <button className="btn btn-sm" type="button" onClick={playAnimation}>
              Play
            </button>
            <button
              className="btn btn-sm"
              type="button"
              onClick={pauseAnimation}
            >
              Pause
            </button>
            <button className="btn btn-sm" type="button" onClick={stopAnimation}>
              Stop
            </button>
            <button
              className="btn btn-sm"
              type="button"
              onClick={resetAnimation}
            >
              Reset
            </button>
            <div
              style={{
                marginLeft: 12,
                color: "var(--text-muted)",
                fontSize: 12,
                alignSelf: "center",
              }}
            >
              Playtime: {fbxPlayTime.toFixed(2)}s
            </div>
            {availableAnimations.length > 0 && (
              <select
                className="animation-select"
                value={selectedAnimationName || availableAnimations[0]}
                onChange={(e) => setSelectedAnimationName(e.target.value)}
              >
                {availableAnimations.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      );
    }

    if (ext === ".glb" || ext === ".gltf") {
      return (
        <div className="animation-preview">
          <div className="animation-viewer">
            <GlbAnimationViewer
              src={src}
              selectedAnimationName={selectedAnimationName}
              animationState={animationState}
              resetKey={animationResetKey}
              onAvailableAnimations={setAvailableAnimations}
              onPlayTimeUpdate={setFbxPlayTime}
            />
          </div>
          <div className="animation-controls">
            <button className="btn btn-sm" type="button" onClick={playAnimation}>
              Play
            </button>
            <button
              className="btn btn-sm"
              type="button"
              onClick={pauseAnimation}
            >
              Pause
            </button>
            <button className="btn btn-sm" type="button" onClick={stopAnimation}>
              Stop
            </button>
            <button
              className="btn btn-sm"
              type="button"
              onClick={resetAnimation}
            >
              Reset
            </button>
            {availableAnimations.length > 0 && (
              <select
                className="animation-select"
                value={selectedAnimationName || availableAnimations[0]}
                onChange={(e) => setSelectedAnimationName(e.target.value)}
              >
                {availableAnimations.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="empty-state">
        No inline animation preview available for this file type ({ext || "unknown"}).
      </div>
    );
  }

  return (
    <div>
      <div
        className={`dropzone ${dragOver ? "drag-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div style={{ marginBottom: 10 }}>
          Drag & drop {section.toLowerCase()} files here, or use a button below.
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => handleImportDialog("copy")}
            disabled={importing}
          >
            {importing ? <span className="spinner" /> : "+ Import (Copy)"}
          </button>
          <button
            className="btn btn-sm"
            onClick={() => handleImportDialog("move")}
            disabled={importing}
          >
            Move Into GameVerse
          </button>
          <button
            className="btn btn-sm"
            onClick={() => handleImportDialog("link")}
            disabled={importing}
          >
            Link File (No Copy)
          </button>
        </div>
        {section === "Models" && (
          <div
            style={{ marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}
          >
            Supported: BLEND, GLB, GLTF, FBX, OBJ, STL — GLB/GLTF get a live 3D
            preview.
          </div>
        )}
        {section === "Scripts" && (
          <div
            style={{ marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}
          >
            Supported: GDScript, C#, Python, JSON, Shaders, Config files.
          </div>
        )}
      </div>

      {files.length === 0 ? (
        <div className="empty-state">
          <div>No {section.toLowerCase()} yet.</div>
        </div>
      ) : (
        <div className="file-grid">
          {files.map((file) => (
            <div className="file-card" key={file.id}>
              {renderPreview(file)}
              <div className="file-card-info">
                <div className="file-card-name" title={file.original_name}>
                  {file.original_name}
                </div>
                <div className="file-card-meta">
                  <span>
                    v{file.version}
                    {file.is_linked ? " · linked" : ""}
                  </span>
                  <span>{(file.size_bytes / 1024).toFixed(0)} KB</span>
                </div>
              </div>
              <div className="file-card-actions">
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(file.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {olderVersions.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 26 }}>
            Older Versions
          </div>
          {olderVersions.map((file) => (
            <div className="list-row" key={file.id}>
              <div>
                <strong>{file.original_name}</strong>{" "}
                <span className="pill">v{file.version}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-sm"
                  onClick={() => handleRestore(file.id)}
                >
                  Restore This Version
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(file.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {previewFile && (
        <div className="modal-overlay" onClick={() => setPreviewFile(null)}>
          <div
            className="modal"
            style={{ width: "90vw", height: "82vh", maxWidth: 1200 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{previewFile.original_name}</h3>
              <button className="icon-btn" onClick={() => setPreviewFile(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ flex: 1, padding: 0 }}>
              {(() => {
                const ext = extOf(previewFile.original_name);
                const src = toGvfileUrl(resolvedPaths[previewFile.id]);
                if (IMAGE_EXTS.includes(ext)) {
                  return (
                    <img
                      src={src}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  );
                }
                if (section === "Models") {
                  return (
                    <div className="preview-split">
                      {renderModelPreview(src, ext)}
                      {renderReferenceImagePanel()}
                    </div>
                  );
                }
                if (section === "Animations") {
                  return (
                    <div className="preview-split">
                      {renderAnimationPreview(src, ext)}
                      {renderSelectedModelPanel()}
                    </div>
                  );
                }
                return (
                  <div className="empty-state">
                    No inline preview available for this file type (
                    {ext || "unknown"}). Use Reveal in Finder/Explorer to open
                    externally.
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {showModelPicker && (
        <div className="modal-overlay" onClick={() => setShowModelPicker(false)}>
          <div
            className="modal"
            style={{ width: 720, maxWidth: "92vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Select Reference Model</h3>
              <button
                className="icon-btn"
                onClick={() => setShowModelPicker(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ display: "grid", gap: 10 }}>
              {modelFiles.length === 0 ? (
                <div className="empty-state">
                  No model files found yet. Add a GLB, GLTF, FBX, OBJ, or STL
                  in the Models tab first.
                </div>
              ) : (
                modelFiles.map((model) => {
                  const active = model.id === selectedModelId;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      className="list-row"
                      onClick={() => handleChooseReferenceModel(model.id)}
                      style={{
                        width: "100%",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <div>
                        <strong>{model.original_name}</strong>
                        <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                          {model.section} · v{model.version}
                        </div>
                      </div>
                      <span className="pill">{active ? "Selected" : "Use"}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function sectionIcon(section) {
  const map = {
    Models: "🧊",
    Animations: "🏃",
    Scripts: "📜",
    Audio: "🔊",
    Images: "🖼️",
  };
  return map[section] || "📄";
}
