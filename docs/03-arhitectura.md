# 03 · Arhitectura tehnică — București Vice

> Responsabil: Divizia Betoane & Arhitectură · Stare: **ADR-uri aprobate**, cod schelet în `src/`

## 1. Stack (decis)

| Component | Alegere | Motivație |
|---|---|---|
| Limbaj | **TypeScript** | siguranță + lizibil pentru agenți AI și review uman |
| Bundler/dev | **Vite** | instant, build static, deploy local trivial |
| 3D | **Three.js** | matur, nu necesită tooling greu; perfect pt. low-poly |
| Fizică | **proprie, arcade** (v1) | predictibilă, fără dependențe; Rapier = opțiune v2 dacă cer AI de pietoni complex |
| UI/HUD | **DOM/CSS** (nu canvas) | viteza de dezvoltare, accesibilitate, fonturi retro gratis |
| Hărți/misiuni | **JSON data-driven** | agenții produc conținut fără să atingă motorul |
| CI | **GitHub Actions** | build + typecheck la fiecare push |
| Teste | Vitest (unit pe module pure) + smoke test manual | pragmatice |

## 2. ADR-uri (Decision Records) — rezumat

### ADR-001: Web browser-first (nu Godot/Unity/nativ)
- **Context:** vrem deploy local ușor, iterație rapidă cu agenți AI, grafică retro simplă.
- **Decizie:** Vite + TypeScript + Three.js; mai târziu se poate împacheta cu Tauri/Electron.
- **Consecințe:** fizica și AI sunt ale noastre (ok — arcade); nu avem editor vizual (compensăm cu data-driven + prefab-uri în cod).

### ADR-002: „Retro prin constrângere”, nu prin postprocesare
- Rezoluție internă mică + upscale pixelat + paletă limitată + fog = look PS2 la cost ~0. **Fără** bloom/SSAO/umbre dinamice/reflexii în v1.
- Lumini: 1 `HemisphereLight` + 1 `DirectionalLight` (fără shadow map; umbre = „blob” dark circle sub entități — trucul clasic al anilor 2000).

### ADR-003: Lume continuă mică + scene instanțiate
- O singură zonă „hub” continuă pe capitol (București Centru în MVP), misiunile se joacă în scene încărcate separat.
- Consecință: performanță controlabilă, conținut modular, testare izolată. Jucătorul nu simte diferența (porți de misiune pe hartă).

### ADR-004: Oraș din „blocuri” JSON, generare deterministă
- Fiecare hartă = grilă de celule cu tip (`road/drivable/building/park/plaza/landmark`), plus parametri per hartă (paletă, ceață, cer, oră, seed).
- Clădirile rezultă din celule printr-un generator simplu (înălțime, culoare, etaj vizibil), cu **seed fix** ca să fie identice pentru toți.
- Landmark-uri reale (Palatul, Cazinoul, Biserica Neagră) = prefab-uri dedicate în cod, plasate prin JSON.
- **Scară:** 1:2,5–1:4 față de real (Bd. Unirii: 2,8 km real → ~800–900 m în joc) + „teleport turistic” între repere dacă zona se extinde.

### ADR-005: Entități = componente simple (nu ECS complet)
- Un `Entity` cu `type + transform + state`, iar sistemele (`vehicle.ts`, `pedestrian.ts`, `police.ts`, `combat.ts`) procesează liste. Suficient pentru sute de entități, fără overhead de ECS.
- Coliziuni: AABB (clădiri) vs cerc (entități) — simplu, rapid, suficient pentru stil arcade.

### ADR-006: Misiuni declarative + hooks
- JSON: obiective liniare, dialoguri, spawn-uri, condiții de fail/pass. Codul de gameplay expune ~10 funcții hook pe care JSON-ul le referențiază pe nume.
- Regulă: **un agent AI nu scrie niciodată în motor; doar date + un mic handler izolat** (fișier nou, < 150 linii, revizuit).

### ADR-007: Fără gloanțe „adevărate” de fizică în v1
- Hit-scan (raycast instant), decal-uri mici, fără ragdoll. Scena shooter rămâne satisfăcătoare prin ritm și sunet, nu prin simulare.

## 3. Structura repo-ului

```
/                       # root
├── docs/               # toată documentația (aceste fișiere)
├── src/
│   ├── main.ts         # bootstrap + game loop
│   ├── engine/         # miez reutilizabil
│   │   ├── scene.ts    # renderer, camere, cer, ceață
│   │   ├── input.ts    # tastatură/mouse (pointer lock)
│   │   ├── audio.ts    # sinteză WebAudio (motor, claxon, radio)
│   │   ├── collide.ts  # AABB/cerc
│   │   └── hud.ts      # overlay DOM
│   ├── game/
│   │   ├── world.ts    # generare oraș din hartă JSON + prefab-uri
│   │   ├── vehicle.ts  # fizică arcade + modele mașini
│   │   ├── player.ts   # mers/fugit/intrat în mașină
│   │   ├── combat.ts   # arme hit-scan, inamici simpli
│   │   ├── police.ts   # heat + urmărire simplă
│   │   └── missions/   # 1 fișier TS per tip de scenă
│   ├── assets/         # date: hărți JSON, palete, piese (fără binare mari)
│   └── ui/             # CSS, fonturi mici
├── public/             # favicon etc.
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .github/workflows/ci.yml
```

## 4. Flux de date (o imagine)

```
assets/maps/*.json ──► world.ts ──► Three.js scene
assets/missions/*.json ──► mission runner ──► hooks game/ (vehicle/combat/police)
input.ts ──► player.ts/vehicle.ts ──► hud.ts (DOM) ◄── state (un singur GameState)
```

- **Un singur GameState** (obiect tipizat) — fără variabile globale împrăștiate; testabil și „serializabil” pentru save în localStorage.
- Evenimente simple: `bus.emit/on` (mini event bus, ~30 linii) pentru „heat changed”, „health low”, „mission done” — nu aducem o bibliotecă.

## 5. Convenții pentru lucrul cu AI (Copilot + agentul Arena) — obligatoriu

Astea sunt regulile care ne țin proiectul curat când 80% din cod e scris de agenți:

1. **Fișiere mici:** maxim ~400 linii TS; mai mult = split. Un fișier = o responsabilitate. *(Excepție singură: `src/main.ts`, orchestratorul de bootstrap — se subția pe măsură ce misiunile devin JSON.)*
2. **Date peste cod:** orice conținut (mașini, hărți, misiuni, replici) merge în JSON; codul doar interpretează.
3. **Fără dependențe noi** fără ADR (discutăm întâi în doc, apoi `npm i`).
4. **Nume românești în date, engleză în cod** (ex. `car.dacia1310` în JSON, `export class Vehicle` în TS).
5. **Typecheck & build obligatoriu** înainte de orice commit: `npm run typecheck && npm run build`.
6. **Prompt template pentru Copilot/agenți** (folosit intern, în comentariu la început de task):
   ```
   Sarcina: <obiectiv>
   Fișiere permise: <lista>
   Stil: module mici, fără efecte, fără cod mort
   DoD: typecheck + build verde + rulare manuală local
   ```
7. **Commit-uri mici, mesaje explicite** (`feat(vehicle): drift points`, `data(map): bd-unirii v2`).
8. **Niciodată** generare de cod în fișiere existente fără să citești întâi fișierul.
9. Review uman: fiecare PR cu modificări în `engine/` are nevoie de 1 aprobare; `game/` și `assets/` pot merge cu smoke test.

## 6. Performanță — bugete (v1)

| Metrică | Buget |
|---|---|
| Draw calls | < 300 |
| Triunghiuri pe cadru | < 400k |
| Entități dinamice | < 200 (pietoni ~80, trafic ~30, restul FX) |
| Distanță vizibilitate | 150–400 m (fog) |
| Rezoluție internă | 0,5–0,75 × display, upscale pixelat |
| Frame | 60 FPS desktop / 30 mobil |

## 7. Deploy (local → oriunde)

- **Local:** `npm run dev` → http://localhost:5173
- **Release:** `npm run build` → `dist/` static; poate fi servit de orice (nginx, GitHub Pages, Netlify, un `python -m http.server`).
- **CI (.github/workflows/ci.yml):** pe fiecare push → `npm ci && npm run typecheck && npm run build && npm run test`.
- Viitor (opțional): Tauri/Electron pentru un `.exe` de pus pe stick la prieteni. 😄
