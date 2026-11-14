import * as React from "react";
import { createRoot } from "react-dom/client";

const requiredFirebaseKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

const missingKeys = requiredFirebaseKeys.filter((key) => !import.meta.env[key]);
const appRoot = document.getElementById("app");
if (!appRoot) throw new Error("App root element was not found");

if (missingKeys.length) {
  const root = createRoot(appRoot);
  root.render(
    <main className="firebase-config-notice">
      <h1>Configure Firebase to start Master BIM Viewer</h1>
      <p>
        Copy <code>.env.example</code> to <code>.env.local</code> in the project root and enter
        your own Firebase web app settings.
      </p>
      <pre>{missingKeys.join("\n")}</pre>
    </main>,
  );
} else {
  void import("./index").catch((error: unknown) => {
    console.error("Could not start Master BIM Viewer:", error);
    const root = createRoot(appRoot);
    root.render(
      <main className="firebase-config-notice">
        <h1>Could not start Master BIM Viewer</h1>
        <pre>{error instanceof Error ? error.message : String(error)}</pre>
      </main>,
    );
  });
}
