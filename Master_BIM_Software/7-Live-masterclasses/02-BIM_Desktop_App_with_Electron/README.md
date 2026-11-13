# Creating a BIM desktop application with Electron and That Open Engine

Recorded Live Masterclass #2

Source: https://people.thatopen.com/c/recorded-live-masterclasses-master-bim-software-developer/masterclass-creating-a-bim-desktop-application-with-electro-and-that-open-engine

## Project layout

- `electron/` — secure Electron main/preload process and Forge packaging config.
- `viewer/` — a safe copy of the BIM-GIS application from live masterclass 01, including its semantic embeddings and audio transcription panel.
- `src/` — the Electron shell that hosts the independently built viewer.

The viewer copy excludes the original `.env`, Firebase deployment state, service-account key, and generated dependencies/build output. Firebase web-app settings are read from `viewer/.env.local`; use your own project values and do not commit that file.

## Run

```powershell
npm install
Copy-Item viewer\.env.example viewer\.env.local
```

Fill in your Firebase web-app settings in `viewer/.env.local`, then start both the viewer and the Electron shell:

```powershell
npm run dev
```

This opens the native Electron desktop window (it does not open a browser tab). Keep the terminal running while you use the app; press Ctrl+C to stop the app and both development servers. If Firebase is not configured, the viewer shows a setup notice instead of the BIM-GIS workspace.

The viewer CSP allows `unsafe-eval` because Cesium evaluates a string during module initialization. The Electron renderer keeps sandboxing, context isolation, and Node integration disabled.

The BIM-GIS viewer also includes the archived CYPE/BIMserver.center workflow panel: sandbox contributions and issues work locally, including loading IFC files and syncing issues into project tasks. Live OAuth/API actions require a trusted CYPE functions backend; set `VITE_CYPE_FUNCTIONS_URL` in `viewer/.env.local` to its `/cypeProxy` endpoint. The local emulator endpoint is used when this value is blank. Client secrets and session tokens are kept in memory only and are not saved to local storage.

Build the two apps and launch the built desktop renderer:

```powershell
npm start
```

Create a Windows installer with Electron Forge:

```powershell
npm run make
```

The viewer is built separately and copied into the Electron renderer output, following the two-application pattern from the lecture. Build artifacts, copied assets, and dependencies are ignored by Git.

