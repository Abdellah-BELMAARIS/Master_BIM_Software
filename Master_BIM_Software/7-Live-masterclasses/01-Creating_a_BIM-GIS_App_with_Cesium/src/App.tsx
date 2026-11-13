import * as React from "react";

export function App() {
  const viewerUrl = import.meta.env.VITE_VIEWER_URL || "./viewer/index.html";

  return (
    <main className="desktop-app">
      <section className="workspace">
        <iframe className="viewer-frame" title="That Open BIM-GIS viewer" src={viewerUrl} />
      </section>
    </main>
  );
}
