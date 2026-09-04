# 🏗️ Arhitectura desktop — „București Vice” ca joc instalabil (Windows)

> Scop: jocul rulează azi în browser (dev/preview), dar arhitectura e gândită să
> producă și un **instalabil Windows (.exe NSIS)**, cu aceeași bază de cod.
> Actualizat: 2026-09-04.

## 1. Principiul: un singur nucleu, două învelișuri

```
┌─────────────────────────────────────────────────────────────┐
│  JOCUL (nucleu platform-independent)                         │
│  src/main.ts  +  src/engine/*  +  src/game/*                │
│  - Three.js, Vite, TypeScript                                │
│  - fără dependențe de browser/Node: doar DOM + WebGL +      │
│    storage abstract (src/engine/storage.ts)                  │
└───────────────┬──────────────────────────────┬───────────────┘
                │ browser                     │ desktop
┌───────────────▼──────────────┐  ┌────────────▼───────────────────┐
│  WEB (preview / hosting)     │  │  ELECTRON (app locala)          │
│  index.html + Vite dev/build │  │  desktop/main.cjs  (fereastra)  │
│  salvare: localStorage       │  │  desktop/preload.cjs (punte)    │
│                              │  │  salvare: JSON in userData      │
│                              │  │  distributie: electron-builder  │
│                              │  │  → release/*.exe (NSIS)         │
└──────────────────────────────┘  └─────────────────────────────────┘
```

**Regula de aur:** nicio linie din `src/` nu atinge direct `localStorage`,
`process`, `require` etc. Tot accesul la mediu trece prin `src/engine/storage.ts`
(web) sau prin puntea `window.bvDesktop` (Electron preload).

## 2. Repo (ce e în plus față de versiunea web-only)

| Cale | Rol |
|---|---|
| `desktop/main.cjs` | Proces principal Electron: fereastră 1280×720, `F11` fullscreen, deschide `dist/index.html` în producție sau `VITE_DEV_SERVER_URL` în dev; IPC `save:load` / `save:store` către `bv-save.json` în `userData`. |
| `desktop/preload.cjs` | `contextBridge` — expune doar `bvDesktop.loadSave()/storeSave()/platform`. `contextIsolation: true`, `sandbox: true`, fără `nodeIntegration`. |
| `.github/workflows/desktop-build.yml` | Build automat pe `windows-latest`: `npm ci` → teste → `npm run build` → `electron-builder --win` → artefact `.exe`. Rulează manual (Actions) sau la push de tag `v*`. |
| `src/engine/storage.ts` | Abstracție save: detectează `window.bvDesktop`, altfel `localStorage`. |

## 3. Comenzi

```bash
# jocul in browser (ca pana acum)
npm install
npm run dev            # http://localhost:5173

# desktop (pe masina ta Windows, cu Node 20+):
npm install
npm i -D electron@^33.2.0 electron-builder@^25.1.8   # o singura data
npm run build          # produce dist/
npm run desktop        # ruleaza jocul ca aplicatie desktop (din dist)

# instalator Windows (.exe) local:
npm run build:desktop  # electron-builder --win → release/Bucuresti Vice Setup *.exe

# sau instalator construit in cloud (fara sa instalezi nimic):
#   1) git tag v0.1.0 && git push origin v0.1.0
#   2) GitHub → Actions → „Desktop Windows” → artefactul .exe
```

## 4. Persistența

- **Web:** `localStorage` cheia `bv_save_v1` (cum era).
- **Desktop:** fișier `bv-save.json` în `%APPDATA%/Bucuresti Vice/` (userData).
- Jocul nu-și dă seama unde salvează: apelează `loadSaveRaw()/storeSaveRaw()`.

## 5. Note de securitate desktop

- `contextIsolation` pornit, `nodeIntegration` oprit, `sandbox` pornit.
- Preload-ul expune DOAR 3 funcții; fără `ipcRenderer` generic în joc.
- Linkurile externe se deschid în browserul sistemului, nu în fereastra jocului.

## 6. Referințe open-source consultate

- Template Electron + Vite + Three.js (structură `electron/`, CI build pe mai multe
  platforme): https://github.com/Sv443/React-Three-Electron-Template
- Oraș procedural Three.js, zero asset-uri externe; iluminat stradal/neon/geamuri
  evaluate în materiale (model de buget pentru lumini):
  https://github.com/StarKnightt/night-street
- Generator procedural de oraș (referință pentru layout low-poly):
  https://github.com/photonlines/Procedural-City-Generator
- electron-builder (installer NSIS): https://www.electron.build/

## 7. Limitări cunoscute

- Electron nu poate fi instalat/rulat în sandbox-ul de develop (fără display);
  acolo QA = typecheck + teste + build web verde + review de cod + CI pe GitHub.
- Build-ul `.exe` final se face fie local pe Windows, fie în GitHub Actions
  (workflow-ul din `.github/workflows/desktop-build.yml`).
