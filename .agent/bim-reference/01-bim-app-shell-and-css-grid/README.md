# 01 · BIM App Shell Layout, CSS Grid & Modal Architecture

## 1. The Fixed Sidebar + Fluid Viewport Pattern
A modern BIM web application requires a 100vh locked viewport layout where the 3D canvas or dashboard fills the screen without accidental page scrolling:

```css
:root {
  --sidebar-width: 260px;
  --bg-dark: #141619;
  --bg-card: #1f2328;
  --border-color: #2d3239;
  --primary-accent: #029ae0;
}

body {
  margin: 0;
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  height: 100vh;
  overflow: hidden; /* Prevents outer scrollbars when 3D viewer is active */
  background: var(--bg-dark);
}
```

---

## 2. Responsive Project Cards Grid (`repeat(auto-fill)`)
Rather than brittle media-query breakpoints, use modern CSS Grid auto-placement:

```css
#projects-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
  overflow-y: auto; /* Independent scrolling inside content area */
}
```

---

## 3. Native `<dialog>` Modal vs Third-Party Libraries
In Lesson 2.11, the course implements native `<dialog>`:
- **Open Modal:** `modalElement.showModal()` — opens a backdrop-blocked modal.
- **Close Modal:** `modalElement.close()`.
- **CSS Backdrop Styling:**
```css
dialog::backdrop {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}
```
