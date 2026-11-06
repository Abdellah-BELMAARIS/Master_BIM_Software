# ⚛️ Module 03 — Creating Reactive Apps (ThreeJS, React & Firebase)

## 📌 Module Overview
This module transitions from vanilla web development to building production-grade, reactive 3D WebGL applications using **React**, **Three.js**, and **Firebase**.

---

## 🎯 Key Learning Objectives
1. **Three.js Core Fundamentals:**
   - Scene graph architecture (`THREE.Scene`), `THREE.PerspectiveCamera`, and `THREE.WebGLRenderer`.
   - Continuous animation loop via `requestAnimationFrame` (60 FPS rendering).
   - Coordinate systems, lighting (`AmbientLight`, `DirectionalLight`), and materials.
   - Orbit controls (`three/examples/jsm/controls/OrbitControls`).

2. **React + Three.js Integration & Lifecycle:**
   - Mounting Three.js canvas safely within React components via `useRef` and `useEffect`.
   - Handling window and container resizing smoothly using `ResizeObserver`.
   - **Crucial Memory Hygiene:** Preventing WebGL GPU leaks on component unmount (disposing geometries, materials, textures, and renderer buffers).

3. **Firebase Cloud Backend:**
   - Authentication (email/password & OAuth).
   - Firestore NoSQL Database for reactive real-time project synchronization.
   - Cloud Storage for BIM models and assets.
   - Firebase Hosting and security rules.

---

## 📂 Workspace Structure
```text
03 - ⚛️ Creating Reactive Apps (ThreeJS, React & Firebase)/
├── README.md
```
