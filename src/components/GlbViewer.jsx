/**
 * GLB/GLTF 3D Model Viewer Component
 * Uses Three.js directly for more reliable 3D model rendering
 * Supports animation playback
 * 
 * @component GlbViewer
 */

import React, { useState, useEffect, useRef } from 'react';

export default function GlbViewer({ src, onClose }) {
  console.log('[GlbViewer] Component mounted with src:', src);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableAnimations, setAvailableAnimations] = useState([]);
  const [selectedAnimation, setSelectedAnimation] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [modelStats, setModelStats] = useState({ vertexCount: 0, faceCount: 0 });
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const mixerRef = useRef(null);
  const clockRef = useRef(null);
  const modelRef = useRef(null);
  const rafRef = useRef(null);
  const animationsRef = useRef(null);

  useEffect(() => {
    console.log('[GlbViewer] useEffect called with src:', src);
    if (!src) {
      console.log('[GlbViewer] No src, returning early');
      return;
    }

    let cancelled = false;

    async function loadFile() {
      try {
        console.log('[GlbViewer] Starting file load...');

        // Extract the file path from the gvfile:// URL
        let filePath = src.replace(/^gvfile:\/\//, '').replace(/\//g, '\\');
        // Remove leading backslash if present
        if (filePath.startsWith('\\')) {
          filePath = filePath.substring(1);
        }
        console.log('[GlbViewer] Extracted file path:', filePath);

        // Check if window.gameverse exists
        if (!window.gameverse || !window.gameverse.files || !window.gameverse.files.readAsArrayBuffer) {
          throw new Error('window.gameverse.files.readAsArrayBuffer not available');
        }

        // Use IPC to read the file as ArrayBuffer
        console.log('[GlbViewer] Calling IPC to read file...');
        const arrayBuffer = await window.gameverse.files.readAsArrayBuffer(filePath);
        console.log('[GlbViewer] File read via IPC, size:', arrayBuffer.byteLength);

        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new Error('File is empty or could not be read');
        }

        // Extract vertex and face count from GLB
        const stats = extractGLBStats(arrayBuffer);
        console.log('[GlbViewer] Model stats:', stats);
        setModelStats(stats);

        // Create blob and blob URL
        const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);
        console.log('[GlbViewer] Blob URL created:', url);

        // Initialize Three.js scene
        await initThreeJS(url, stats);

        setLoading(false);
        console.log('[GlbViewer] File loaded successfully');
      } catch (err) {
        console.error('[GlbViewer] File load error:', err);
        console.error('[GlbViewer] Error stack:', err.stack);
        setError(`Failed to load file: ${err.message || err}`);
        setLoading(false);
      }
    }

    async function initThreeJS(blobUrl, stats) {
      if (cancelled || !containerRef.current) return;

      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

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
      controls.enableZoom = true;
      controls.enableRotate = true;
      controls.enablePan = true;
      controls.rotateSpeed = 0.8;
      controls.zoomSpeed = 1.2;
      controls.panSpeed = 0.8;
      controls.minDistance = 0.5;
      controls.maxDistance = 50;
      controls.minPolarAngle = 0.1;
      controls.maxPolarAngle = Math.PI - 0.1;
      controlsRef.current = controls;

      const grid = new THREE.GridHelper(10, 10, 0x444444, 0x333333);
      scene.add(grid);

      // Enhanced lighting setup
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight.position.set(5, 10, 7);
      dirLight.castShadow = true;
      scene.add(dirLight);

      // Additional directional light from opposite side
      const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
      dirLight2.position.set(-5, 5, -5);
      scene.add(dirLight2);

      // Hemisphere light for better overall illumination
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
      hemiLight.position.set(0, 20, 0);
      scene.add(hemiLight);

      // Point light for fill
      const pointLight = new THREE.PointLight(0xffffff, 0.5);
      pointLight.position.set(0, 5, 0);
      scene.add(pointLight);

      const loader = new GLTFLoader();

      loader.load(
        blobUrl,
        (gltf) => {
          if (cancelled) return;
          const model = gltf.scene;
          scene.add(model);
          modelRef.current = model;

          // Store animations for switching
          animationsRef.current = gltf.animations;

          // Set up animations
          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            mixerRef.current = mixer;
            clockRef.current = new THREE.Clock();

            const animationNames = gltf.animations.map(anim => anim.name);
            setAvailableAnimations(animationNames);

            if (animationNames.length > 0) {
              setSelectedAnimation(animationNames[0]);
              const action = mixer.clipAction(gltf.animations[0]);
              action.reset();
              action.play();
              console.log('[GlbViewer] Playing animation:', animationNames[0]);
            }
          }

          // Fix model orientation - rotate to match standard coordinate system
          model.rotation.x = 0;
          model.rotation.y = 0;
          model.rotation.z = 0;

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
          console.error("Three.js loading failed:", error);
          setError(`Failed to load 3D model: ${error.message || 'Unknown error'}`);
          setLoading(false);
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

        // Always update clock to keep animation timing correct
        if (clockRef.current) {
          const delta = clockRef.current.getDelta();

          // Update mixer if playing
          if (mixerRef.current && isPlaying) {
            mixerRef.current.update(delta);
          }
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

    loadFile();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
      }
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }
    };
  }, [src, isPlaying]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleAnimationChange = (e) => {
    const newAnimation = e.target.value;
    setSelectedAnimation(newAnimation);

    if (mixerRef.current && modelRef.current && animationsRef.current) {
      // Stop all current animations
      mixerRef.current.stopAllAction();

      // Find and play the new animation
      console.log('[GlbViewer] Switching to animation:', newAnimation);

      // Find the animation clip by name
      const animationClip = animationsRef.current.find(anim => anim.name === newAnimation);
      if (animationClip) {
        const action = mixerRef.current.clipAction(animationClip);
        action.reset();
        action.play();
        setIsPlaying(true);
        console.log('[GlbViewer] Found and playing animation:', newAnimation);
      } else {
        console.log('[GlbViewer] Animation not found:', newAnimation);
      }
    }
  };

  // Extract vertex and face count from GLB ArrayBuffer
  function extractGLBStats(arrayBuffer) {
    try {
      const view = new DataView(arrayBuffer);

      // GLB file structure: 12-byte header + chunks
      if (arrayBuffer.byteLength < 12) return { vertexCount: 0, faceCount: 0 };

      const magic = view.getUint32(0, true);
      if (magic !== 0x46546C67) return { vertexCount: 0, faceCount: 0 }; // Not a valid GLB

      let offset = 12;
      let vertexCount = 0;
      let faceCount = 0;

      const decoder = new TextDecoder();

      while (offset < arrayBuffer.byteLength) {
        if (offset + 8 > arrayBuffer.byteLength) break;

        const chunkLength = view.getUint32(offset, true);
        const chunkType = view.getUint32(offset + 4, true);

        if (offset + 8 + chunkLength > arrayBuffer.byteLength) break;

        // JSON chunk (chunkType = 0x4E4F534A)
        if (chunkType === 0x4E4F534A) {
          const jsonBytes = new Uint8Array(arrayBuffer, offset + 8, chunkLength);
          const jsonStr = decoder.decode(jsonBytes);
          try {
            const gltf = JSON.parse(jsonStr);

            // Count vertices and faces from all meshes
            if (gltf.meshes) {
              for (const mesh of gltf.meshes) {
                if (mesh.primitives) {
                  for (const primitive of mesh.primitives) {
                    // Get vertex count from POSITION accessor
                    if (primitive.attributes && primitive.attributes.POSITION) {
                      const accessor = gltf.accessors[primitive.attributes.POSITION];
                      if (accessor) {
                        vertexCount += accessor.count || 0;
                      }
                    }

                    // Get face count from indices accessor
                    if (primitive.indices !== undefined) {
                      const accessor = gltf.accessors[primitive.indices];
                      if (accessor) {
                        faceCount += Math.floor((accessor.count || 0) / 3);
                      }
                    } else if (primitive.attributes && primitive.attributes.POSITION) {
                      const accessor = gltf.accessors[primitive.attributes.POSITION];
                      if (accessor) {
                        faceCount += Math.floor((accessor.count || 0) / 3);
                      }
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error('[GlbViewer] Failed to parse GLB JSON:', e);
          }
        }

        offset += 8 + chunkLength;
      }

      return { vertexCount, faceCount };
    } catch (error) {
      console.error('[GlbViewer] Failed to extract GLB stats:', error);
      return { vertexCount: 0, faceCount: 0 };
    }
  }

  console.log('[GlbViewer] Rendering, loading:', loading, 'error:', error);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#222' }}>
      {error && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#e74c3c',
          flexDirection: 'column',
          gap: '10px',
          background: '#222',
          zIndex: 10
        }}>
          <div>⚠️ Error: {error}</div>
          {onClose && <button onClick={onClose} style={{ padding: '8px 16px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>}
        </div>
      )}

      {loading && !error && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#888',
          background: '#222',
          zIndex: 5
        }}>
          Loading 3D model...
        </div>
      )}

      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }} />

      {/* Model Stats Overlay */}
      {!loading && !error && (modelStats.vertexCount > 0 || modelStats.faceCount > 0) && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.7)',
          padding: '8px 12px',
          borderRadius: '6px',
          color: '#fff',
          fontSize: '12px',
          zIndex: 100
        }}>
          <div>Vertices: {modelStats.vertexCount.toLocaleString()}</div>
          <div>Faces: {modelStats.faceCount.toLocaleString()}</div>
        </div>
      )}

      {/* Animation Controls */}
      {!loading && !error && availableAnimations.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.7)',
          padding: '10px 15px',
          borderRadius: '8px',
          zIndex: 100
        }}>
          <button
            onClick={togglePlay}
            style={{
              padding: '6px 12px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <select
            value={selectedAnimation || ''}
            onChange={handleAnimationChange}
            style={{
              padding: '6px 10px',
              background: '#444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {availableAnimations.map((anim) => (
              <option key={anim} value={anim}>{anim}</option>
            ))}
          </select>
        </div>
      )}

      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '8px 16px',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: 1000
          }}
        >
          ✕ Close
        </button>
      )}
    </div>
  );
}
