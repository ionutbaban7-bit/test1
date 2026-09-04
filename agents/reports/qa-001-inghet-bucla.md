# 🐞 QA-001 — Jocul „îngheață” pe un cadru static (P0, FIXED)

> Data: 2026-09-04 · Autor: Testing Agent (QA) · Severitate: **P0** — jocul nu pornește deloc
> Status: **REZOLVAT** în commit-ul de bugfix (vezi istoricul git)
> Raport: user a raportat „nu merge, sunt niște culori gri/albastru/verde și atât, totul blocat”.

---

## 1. Simptom

- Pagina se încarcă, WebGL funcționează (se vede un cadru randat: cer albastru, clădiri/străzi gri, verdeață — camera inițială `(-150, 8, 8)`), dar:
  - nimic nu se mișcă; jucătorul nu răspunde la WASD;
  - bannerul de intro nu apare; ceasul/misiunile/HUD nu se actualizează;
  - niciun mesaj de eroare în consolă (fără excepții — de aceea părea „mut”).

## 2. Cauza rădăcină (2 buguri care se întăresc reciproc)

### Bug 1 — Deadlock logic al buclei de joc (`src/main.ts`)

În bucla principală:

```ts
let elapsed = 0;                      // ← inițial 0
function update(dt) { elapsed += dt; ... }   // ← creștea DOAR aici
function frame() {
  requestAnimationFrame(frame);
  ...
  if (elapsed > 0.5) update(dt);      // ← gate-ul
  renderer.render();
}
```

`elapsed` era incrementat **doar în interiorul lui `update()`**, iar `update()` era apelat **doar când `elapsed > 0.5`** → condiția nu putea deveni adevărată **NICIODATĂ** → `update()` nu a rulat **niciun frame de la introducerea acestei structuri** (prezentă încă din commitul Pilot 3 `241a44d`). Jocul randa un singur cadru static.

**Dovadă (simulare pură a logicii, 10 s = 600 de frame-uri @60fps):**

```
înainte de fix: update() apelat de 0 ori  => ecran CONGELAT
după fix:       update() apelat de 570 ori => bucla RULEAZĂ (primele ~0,5 s sunt delay-ul intenționat)
```
(scripturi: `/tmp/qa-loop-proof.mjs`, `/tmp/qa-loop-proof-fixed.mjs`)

### Bug 2 — Build-ul de producție elimina jocul prin tree-shaking (același `main.ts`)

`vite build` (Rollup) „demonstra” că `update()` e neapelabil: `elapsed` e atribuit doar în `update()`, deci dacă `update` nu e apelat → `elapsed` rămâne constant `0` → `if (elapsed > 0.5)` e mereu fals → `update` nu e apelat. E un **punct fix circular** pe care Rollup îl rezolvă eliminând codul mort: din bundle-ul de 538 kB lipseau complet `update()`, `radio`, `persist()`, `questCtx`, ramurile sat/mare din `updateMissionUI` etc.

**Dovadă (build neminificat, diff între sursa veche și cea fixată):**

```
bundle vechi (sursa originală):  922.42 kB — conține 0 referințe la update()/persist/radio
bundle nou (sursa fixată):       982.81 kB — conține update(), persist(), radio, tot jocul
```

## 3. Fixul aplicat (`src/main.ts`, +31/−2)

1. `elapsed += dt` mutat din `update()` în `frame()` (increment necondiționat lângă `time += dt`) — rupe deadlock-ul **și** circularitatea care alimenta tree-shaking-ul.
2. `update(dt)` apelat într-un `try/catch` + funcție nouă `showFatal()`: orice eroare runtime viitoare apare **pe ecran** (bandă roșie jos), nu mai îngheață „mut”.
3. Listenere globale `window.onerror` + `unhandledrejection` → același overlay.

## 4. Verificări după fix

| Verificare | Rezultat |
|---|---|
| `npm run typecheck` | ✅ |
| `npm test` | ✅ 72/72 (8 fișiere) |
| `npm run build` | ✅ 574.91 kB (gzip 156.91) — bundle COMPLET |
| Integritate bundle | ✅ conține marcaje unice din `update()`: intro-ul „marea se deblochează…”, bannerul M5 „Răsare soarele peste Autogara…”, logica radio, overlay-ul „Eroare runtime” |
| Simulare buclă (600 frame-uri) | ✅ 570 de apeluri `update()` |
| Dev server | ✅ rulează, hot-reload cu sursa fixată |

## 5. Plan de teste manuale (următorul pas — nu există browser headless în sandbox)

1. **Pornire**: deschide preview-ul → după ~1 s apare bannerul de intro (BUCUREȘTI VICE + controale). Înainte NU apărea — e confirmarea fixului.
2. **Mers**: WASD mișcă protagonistul; mouse-ul rotește camera (click = pointer lock; fără lock există fallback „mouse steering”).
3. **M1**: mergi la mașina galbenă (marcaj), E → condus; mergi spre EST până la capătul Bulevardului → banner M1 bifat + bani.
4. **M2**: la Obor, click stânga împușcă golanii (6).
5. **M3**: cursa „Noaptea Unirii” la linia roșie din vest.
6. **M4/M5**: selfie la Palat, apoi fuga cu „Datoria” (Nea Costel → Autogara) → primești biletul.
7. **J** (după M5): oraș → sat → **Constanța** (M12 → Titi → Căpitanu' Spiridon; M13 → cursa pe faleză).
8. **Alte taste**: M radio, N post, T timp, H claxon, R reset, Space drift, Shift fugi.
9. **Reîncărcare pagină**: progresul (lei, misiuni bifate) se păstrează din localStorage.
10. **Regresie vizuală**: nicio bandă roșie „⚠ Eroare runtime” jos pe ecran (dacă apare, e un bug nou — raportează textul).

## 6. Notă pentru viitor (prevenție)

- Orice cronometru „care pornește jocul” trebuie incrementat în `frame()` (necondiționat), nu în funcția pe care o gate-uiește.
- Regula de aur QA: un build verde + teste verzi **nu** înseamnă că jocul pornește — e nevoie de un smoke-test interactiv (aici: imposibil fără browser în sandbox; overlay-ul de erori reduce riscul).
