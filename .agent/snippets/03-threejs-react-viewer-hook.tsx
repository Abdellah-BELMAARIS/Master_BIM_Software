/**
 * Snippet 03: Three.js Responsive Viewer React Component with Safe GPU Disposal (Module 3)
 * Covers Lessons 2.1 - 2.7 & 3.12 - 3.13:
 * - Scene, PerspectiveCamera, WebGLRenderer, OrbitControls, Grid/Axes Helpers
 * - ResizeObserver for responsive canvas resizing
 * - Complete WebGL resource cleanup on React component unmount (prevents memory leaks)
 */

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export const ThreeViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#141619");

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(8, 8, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Controls, Lights & Helpers
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 10);
    const grid = new THREE.GridHelper(20, 20, 0x029ae0, 0x2d3239);
    scene.add(ambientLight, dirLight, grid);

    // 3. Responsive ResizeObserver (Lesson 2.5)
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);

    // 4. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 5. Unmount Cleanup to Prevent GPU Memory Leaks (Lesson 3.13)
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
};
