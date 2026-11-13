# Creating a BIM desktop application with Electron and That Open Engine

Recorded Live Masterclass #2

Source: https://people.thatopen.com/c/recorded-live-masterclasses-master-bim-software-developer/masterclass-creating-a-bim-desktop-application-with-electro-and-that-open-engine

## Project layout

- `electron/` — secure Electron main/preload process and Forge packaging config.
- `viewer/` — a safe copy of the BIM-GIS application from live masterclass 01, including its semantic embeddings and audio transcription panel.
- `src/` — Electron shell source. Electron loads the viewer directly so OAuth can complete in the same window.

The viewer copy excludes the original `.env`, Firebase deployment state, service-account key, and generated dependencies/build output. Firebase web-app settings are read from `viewer/.env.local`; use your own project values and do not commit that file.

## Run

```powershell
npm install
Copy-Item viewer\.env.example viewer\.env.local
```

Fill in your Firebase web-app settings in `viewer/.env.local`, then start the viewer and Electron:

```powershell
npm run dev
```

This opens the native Electron desktop window directly on the viewer (it does not open a browser tab). Keep the terminal running while you use the app; press Ctrl+C to stop Electron and the viewer server. If Firebase is not configured, the viewer shows a setup notice instead of the BIM-GIS workspace.

The viewer CSP allows `unsafe-eval` because Cesium evaluates a string during module initialization. The Electron renderer keeps sandboxing, context isolation, and Node integration disabled.

The BIM-GIS viewer includes the CYPE/BIMserver.center workflow panel: sandbox contributions and issues work locally, including loading IFC files and syncing issues into project tasks. The active CYPE Functions endpoints are in `5-Connecting_Workflows/functions/src/cype.ts`.

For local OAuth/API testing, start the Functions emulator in a separate terminal:

```powershell
Set-Location ..\..\5-Connecting_Workflows
npm --prefix functions run build
firebase emulators:start --only functions --project master-bim-software
```

Then run `npm run dev` in this project. For deployed access, set `VITE_CYPE_FUNCTIONS_URL` in `viewer/.env.local` to the trusted HTTPS backend's `/cypeProxy` endpoint and configure that backend's allowed app origin. Client secrets and session tokens are kept in memory only and are not saved to local storage.

Register this exact callback URI in the CYPE Developers Portal for local desktop use: `http://127.0.0.1:5174/`.

Build the two apps and launch the built desktop renderer:

```powershell
npm start
```

Create a Windows installer with Electron Forge:

```powershell
npm run make
```

The viewer is built separately and copied into the Electron renderer output. Electron loads it as the top-level page, and allows only BIMserver.center OAuth navigation and the viewer's exact local callback. Build artifacts, copied assets, and dependencies are ignored by Git.

