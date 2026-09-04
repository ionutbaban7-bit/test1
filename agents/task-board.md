# 📋 Task Board — echipa de agenți

> Stare: pilot 1 executat ✅ · Sprint 2 (misiunile satului) în așteptarea PM-ului.
> Legendă: ⬜ todo · 🟡 în lucru · ✅ gata · 🚫 blocat (cine blochează)

## Structura distribuită (din brief-ul PO)

```
Project Manager Agent (coordonator)   ✅ activ
├── Backend Agent (logică joc)        ✅ gata (pilot 1)
├── Frontend Agent (UI/rendering)     ✅ gata (pilot 1)
├── Asset Agent (resurse pe GitHub)   🟡 pe pilotul 2 (de la Scout)
├── Testing Agent (testează cod)      ✅ gata (pilot 1)
└── Integration Agent (combină tot)   ✅ gata (pilot 1)
```

## Dependențe (reguli de ordine)
- **Agent 2 (Frontend) așteaptă → Agent 1 (Backend) să termine API-ul** (spec: `src/game/physics.ts`).
- **Agent 5 (Integration) așteaptă → toți ceilalți** (Backend, Frontend, Testing, Scout/Asset).
- **Agent 3 (Scout) pleacă primul** când o decizie cere cercetare (nu blochează pe nimeni).

## Taskuri pilot 1 (executat 2026-09-04)

| # | Agent | Task | Fișiere | Stare | Notă |
|---|---|---|---|---|---|
| A1 | Backend | Sistem de coliziuni: API pur `physics.ts` (cerc vs dreptunghiuri, cerc vs OBB, cerc-cerc, ray vs rect) | `src/game/physics.ts` | ✅ | fără THREE; testabil în Node |
| A2 | Frontend | Render indicator de obiectiv („săgeata de misiune” 2D peste 3D, cu distanță) | `src/engine/objectiveArrow.ts`, `src/main.ts` | ✅ | folosește API-ul A1 pentru poziții/limite |
| A3 | Scout | Căutare pathfinding algorithms + proiecte similare | `agents/reports/scout-report-001.md` | ✅ | recomandare: waypoint-graph + A* |
| A4 | Testing | Unit tests pentru fizică (coliziuni, OBB, ray, cerc-cerc, limită lume) | `tests/physics.test.ts` | ✅ | 8 teste verzi |
| A5 | Integration | Combină modulele: main.ts folosește API-ul physics; arrow integrat în buclă; build verde | `src/main.ts` | ✅ | typecheck+build+test verzi |

## Taskuri pilot 2 (plan — Sprint 2 din docs/05, misiunile satului M6–M11)

| # | Agent | Task | Dependențe | Stare |
|---|---|---|---|---|
| A6 | Backend | Hook-uri misiuni + state de inventar (plasă borcane, oboseală cal) | — | ⬜ |
| A7 | Frontend | Mini-joc „coasa & furca” (prompt ritm) + efect „lași fierbinți” | A6 (state) | ⬜ |
| A8 | Scout/Asset | Căutare sunete/pattern-uri pentru chase pe bicicletă + „pumn cartoon” | — | 🟡 |
| A9 | Testing | Teste misiuni sat (borcane: spargere la viteză; căruță: oboseală) | A6 | ⬜ |
| A10 | Integration | M6–M11 jucabile cap-coadă + raport | A6–A9 | ⬜ |

## Buguri deschise
*(gol — pilot 1 nu a produs buguri cunoscute; Testing a raportat 0 defecțiuni)*
