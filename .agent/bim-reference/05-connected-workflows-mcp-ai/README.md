# 05 · Connected Workflows, GIS, ACC & MCP AI BIM Agents

## 1. GIS + BIM (Cesium 3D Tiles + Fragments)
- Georeferencing building coordinates into world WGS84 coordinates.
- Overlaying That Open Fragments models on top of Cesium 3D photogrammetry and terrain tilesets with a synchronized 2D mini-map.

---

## 2. Autodesk Construction Cloud (ACC & APS)
- **Authentication:** 3-legged OAuth2 authentication to access Autodesk BIM 360 / ACC projects.
- **APIs:** Data Management API (fetching `.ifc` / `.rvt` models) and Issues API (reading/creating clash issues).

---

## 3. Claude MCP Framework + Fragments Edit API
- **Model Context Protocol (MCP):** Exposes BIM viewer tools (`query_elements`, `isolate_by_category`, `edit_property`) to Claude/LLMs.
- **Fragments Edit API:** Allows programmatic mutation of geometry, attributes, and materials directly in the browser or via automated AI scripts.
