# 📋 Task Board — echipa de agenți

> Stare: **Pilot 2 executat ✅ (M6–M11 jucabile în sat)** · Următorul: Sprint 3
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

## Pilot 3 (plan — Sprint 3: pathfinding pentru AI)
| # | Agent | Task | Dependențe | Stare |
|---|---|---|---|---|
| A11 | Scout | (deja făcut) waypoint-graph + A* — raport 001 | — | ✅ |
| A12 | Backend | `src/game/pathfind.ts`: noduri din grila drumurilor + A* + followPath | A11 | ⬜ |
| A13 | Backend | AI poliție „vezi-pierzi” cu heat pe drumuri (folosește A12) | A12 | ⬜ |
| A14 | Frontend | Rivali de cursă pe waypoints (M3) + minimap? (decizie PM) | A12 | ⬜ |
| A15 | Testing | Teste pathfind (rută dreaptă, ocolire, fără drum → null) | A12 | ⬜ |
| A16 | Integration | Integrare chase poliție în oraș + raport | A12–A15 | ⬜ |

## Buguri deschise
*(niciunul raportat în pilotul 2; Testing: 31/31 verzi)*
