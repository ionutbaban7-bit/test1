# 📋 Task Board — echipa de agenți

> Stare: **Pilot 3 executat ✅ (pathfinding + poliția „Șpagă” + cursa Unirii)**
> Legendă: ⬜ todo · 🟡 în lucru · ✅ gata · 🚫 blocat (cine blochează)

## Structura distribuită
```
Project Manager Agent (coordonator)   ✅ activ
├── Backend Agent (logică joc)        ✅ (pilot 1 + pilot 2)
├── Frontend Agent (UI/rendering)     ✅ (pilot 1 + pilot 2)
├── GitHub Scout Agent (resurse)      ✅ (rapoarte 001 & 002)
├── Asset Agent (resurse art)         ✅ (folosește rapoartele Scout)
├── Testing Agent (testează cod)      ✅ (31 teste verzi)
└── Integration Agent (combină tot)   ✅ (pilot 1 + pilot 2)
```

## Dependențe
- Agent 2 (Frontend) așteaptă → Agent 1 (Backend) API-ul (spec `src/game/physics.ts`).
- Agent 5 (Integration) așteaptă → toți ceilalți.
- Agent 3/Scout pleacă primul când o decizie cere cercetare.

## Pilot 1 (executat) — vezi istoricul commit-urilor
A1 coliziuni ✅ · A2 săgeată obiectiv ✅ · A3 scout pathfinding ✅ · A4 teste fizică ✅ · A5 integrare ✅

## Pilot 2 (executat 2026-09-04) — misiunile satului M6–M11

| # | Agent | Task | Fișiere | Stare |
|---|---|---|---|---|
| A6 | Backend | Hook-uri misiuni sat + state (borcane, oboseală cal, chase) + personaje (baba cu plasa, Nea Păun cu pălărie, primarul) | `src/game/satQuests.ts` | ✅ |
| A7 | Frontend | Mini-joc „coasa & furca” (QTE E la momentul potrivit), efect „lași fierbinți” (cameră + sprint blocat), punch „pumnul de la bloc”, săgeți/marcaje quest, gâște care sperie | `src/game/satQuests.ts` + `src/main.ts` + `src/game/combat.ts` (pălării/plasă pe Ped) | ✅ |
| A8 | Scout/Asset | Raport chase/melee/efecte — nimic nou de importat (regula „cea mai simplă care merge”) | `agents/reports/scout-report-002.md` | ✅ |
| A9 | Testing | Teste logică pură: spargerea borcanelor, oboseala calului, pragurile de oprire | `tests/satQuests.test.ts` | ✅ (11 teste) |
| A10 | Integration | M6–M11 conectate în bucla de joc (E consumat de questuri, limită viteză cu plasa, oprirea căruței, reset la schimbarea lumii) + build verde | `src/main.ts` | ✅ |

**Misiunile jucabile în sat (apasă J în joc):**
- **M6** — Baba îți dă plasa cu borcane de dus la mătușa de la biserică (fără fugă, ferește-te de gâște).
- **M7** — Coasa pe câmp: 3 clăi, apasă E exact la momentul potrivit.
- **M8** — Nea Păun îți ia tractorul înaintea nasului: prinde-l și oprește-l cu E.
- **M9** — Căruța cu fân până la cârciumă, cu cal care obosește (dă-i pauză!).
- **M10** — 3 rânduri de țuică fiartă la butoiul lui Micuțu → „lași fierbinți” (lumea se leagănă 45 s).
- **M11** — „Corecție” pentru primar (3 pumni, click), apoi fugă de Polițistu' pe bicicletă până la ascunzătoarea din cârciumă.

## Pilot 3 (executat 2026-09-04) — pathfinding & poliția
| # | Agent | Task | Fișiere | Stare |
|---|---|---|---|---|
| A11 | Scout | waypoint-graph + A* (recomandare, raport 001) | `agents/reports/scout-report-001.md` | ✅ |
| A12 | Backend | Pathfinding: graf din grila drumurilor, A*, angleDiff/turnToward, PathFollower | `src/game/pathfind.ts` | ✅ |
| A13 | Backend | Poliția „Șpagă” 0–5: urmărire pe drumuri (A*), „vezi–pierzi”, amendă la prindere, mașină de poliție nouă (`politie` în CAR_DEFS) | `src/game/police.ts` | ✅ |
| A14 | Frontend | Cursa „Noaptea Unirii”: 3 rivali AI pe waypoints + rubber-band, checkpoints, numărătoare, premii | `src/game/cityRace.ts` | ✅ |
| A15 | Testing | Teste pathfind (grilă, A*, unghiuri, follower) + cursa (locul la finiș) | `tests/pathfind.test.ts`, `tests/cityRace.test.ts` | ✅ (46 total) |
| A16 | Integration | Poliția + cursa în bucla de joc; HUD „ȘPAGĂ 💰”; furtul raportează; marcaj start cursă; reset la schimbarea lumii | `src/main.ts`, `src/engine/hud.ts` | ✅ |

**Cum se joacă:** furi o mașină în oraș (după M1) → „ȘPAGĂ 💰” urcă și vine Poliția (Dacia albă cu bandă albastră) pe drumuri reale, cu A*. Scapi: scade Șpagă. Te prinde: amendă = Șpagă × 150 LEI. După M1+M2, la capătul vestic al Bulevardului (marcaj roșu) pornești **Cursa „Noaptea Unirii”** cu 3 rivali.

## Pilot 4 (plan — Sprint 4: M3/M5 oraș + polish)
| # | Agent | Task | Dependențe | Stare |
|---|---|---|---|---|
| A17 | Backend | M5 „Datoria”: urmărire nocturnă scriptată + final de capitol (folosește poliția) | A13 | ⬜ |
| A18 | Frontend | Panouri/marcaje cursă în HUD + „locul tău” live în timpul cursei | A14 | ⬜ |
| A19 | Testing | Teste heat/amendă (logica pură din police.ts) | A13 | ⬜ |
| A20 | Integration | Echilibrare (viteze, sume), raport final | A17–A19 | ⬜ |

## Buguri deschise
*(niciunul raportat în pilotul 3; Testing: 46/46 verzi)*
