# Archived CYPE / BIMserver.center Integration

All CYPE BIMserver.center source files are preserved here for future recovery without being bundled into the active build:

- `bim-components/CypeConnector/` → Restore to `src/bim-components/CypeConnector/`
- `ui-templates/sections/cype.ts` → Restore to `src/ui-templates/sections/cype.ts`
- `functions/cype-functions.ts` → Re-export `cypeLogin`, `cypeExchangeSession`, `cypeProxy`, `cypeDownloadFile` in `functions/src/index.ts`

## Re-enabling Checklist
1. Move folders back to `src/bim-components/CypeConnector` and `src/ui-templates/sections/cype.ts`.
2. Re-export `./CypeConnector` in `src/bim-components/index.ts`, register `components.get(CypeConnector)` in `src/bim-components/setup/index.ts`, and re-export `./cype` in `src/ui-templates/sections/index.ts`.
3. Re-add `cype` drawer + `cypeContainerRef` + header button in `src/react-components/ProjectDetailsPage.tsx` and `[data-drawer="cype"]` in `style.css`.
4. Optionally restore `CypeRedirectHandler` in `src/index.tsx` to handle `http://localhost:5173/` OAuth redirect return.

