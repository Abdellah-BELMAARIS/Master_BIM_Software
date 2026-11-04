# 03 · Three.js WebGL Lifecycle & GPU Memory Disposal in React

## 1. The Three.js Core Loop
Three.js structures 3D rendering around 4 primitives:
1. **`Scene`**: The directed acyclic graph (DAG) holding geometries, lights, and sub-groups.
2. **`PerspectiveCamera`**: Simulates the human eye with Field of View (FOV), aspect ratio, near, and far planes.
3. **`WebGLRenderer`**: Translates the scene and camera into WebGL draw calls onto an HTML `<canvas>`.
4. **`Animation Loop`**: Driven by `requestAnimationFrame` for 60 FPS redraws.

---

## 2. The Critical Rule: WebGL Memory Leak Prevention
Unlike standard JavaScript objects, GPU buffers allocated by WebGL (geometry vertex attributes, textures, shader materials) are **NOT garbage collected** automatically by JavaScript.

In React SPAs (`Module 3 Lesson 3.13`), when a viewer component unmounts (e.g., navigating away from the 3D page), you **MUST** recursively traverse and dispose of all GPU assets:

```typescript
useEffect(() => {
  // Setup viewer...

  return () => {
    cancelAnimationFrame(animationId);
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
```
