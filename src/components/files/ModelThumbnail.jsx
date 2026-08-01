/**
 * Model Thumbnail Component
 * 
 * Renders a small Three.js preview of 3D models for thumbnails
 * Uses GLTFLoader to load and display models in a mini 3D scene
 * 
 * @component ModelThumbnail
 */

import React, { useRef, useEffect, useState } from 'react';

export default function ModelThumbnail({ src, onError }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const modelRef = useRef(null);
  const rafRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!src || !containerRef.current) return;

    let cancelled = false;

    async function initThreeJS() {
      try {
        const THREE = await import("three");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Create renderer
        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.setClearColor(0x2a2a2a, 1);
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x2a2a2a);
        sceneRef.current = scene;

        // Create camera
        const camera = new THREE.PerspectiveCamera(
          45,
          width / height,
          0.1,
          100
        );
        camera.position.set(0, 1, 3);
        cameraRef.current = camera;

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(2, 4, 3);
        scene.add(dirLight);

        // Load model
        const loader = new GLTFLoader();
        loader.load(
          src,
          (gltf) => {
            if (cancelled) return;
            const model = gltf.scene;
            scene.add(model);
            modelRef.current = model;

            // Auto-fit camera to model
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxSize = Math.max(size.x, size.y, size.z);
            const fitDistance = maxSize * 2;

            camera.position.set(fitDistance * 0.5, fitDistance * 0.5, fitDistance);
            camera.lookAt(0, 0, 0);

            setLoading(false);
          },
          undefined,
          (error) => {
            if (cancelled) return;
            console.error('Model thumbnail load error:', error);
            setError('Failed to load model');
            setLoading(false);
            if (onError) onError(error);
          }
        );

        // Animation loop
        function animate() {
          if (cancelled) return;
          rafRef.current = requestAnimationFrame(animate);

          if (modelRef.current) {
            modelRef.current.rotation.y += 0.01;
          }

          renderer.render(scene, camera);
        }
        animate();

      } catch (err) {
        console.error('Three.js initialization error:', err);
        setError('Failed to initialize 3D viewer');
        setLoading(false);
        if (onError) onError(err);
      }
    }

    initThreeJS();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, [src, onError]);

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          flexDirection: "column",
          gap: "8px",
          background: "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)",
          borderRadius: "4px",
          color: "#888",
          fontSize: "10px"
        }}
      >
        <span style={{ fontSize: 32 }}>🧊</span>
        <span>Load Error</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          flexDirection: "column",
          gap: "8px",
          background: "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)",
          borderRadius: "4px",
          color: "#888",
          fontSize: "10px"
        }}
      >
        <span style={{ fontSize: 32 }}>🧊</span>
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "4px",
        overflow: "hidden"
      }}
    />
  );
}
