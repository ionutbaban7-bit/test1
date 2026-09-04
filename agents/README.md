# 🧑‍💼 Echipa de Agenți — „O mie de developari” (operational)

> Cum lucrăm cu agenți AI (Copilot, agenți Arena, orice alt agent) fără să o luăm razna:
> **un singur repo, roluri clare, prompturi scrise, taskuri mici, board vizibil.**

```
Project Manager Agent (coordonator)  →  agents/prompts/01-project-manager.md
├── Backend Agent (logică joc)       →  agents/prompts/02-backend.md
├── Frontend Agent (UI/rendering)    →  agents/prompts/03-frontend.md
├── GitHub Scout Agent (resurse)     →  agents/prompts/04-scout-github.md
├── Asset Agent (resurse art)        →  (folosește aceleași instrucțiuni ca Scout-ul,
│                                      dar caută doar assets & code samples)
├── Testing Agent (testează cod)     →  agents/prompts/05-testing.md
└── Integration Agent (combină)      →  agents/prompts/06-integration.md
```

## Regulile echipei (nu se negociază)
1. **Un task = un agent = o zi de lucru.** Task mai mare? PM-ul îl taie.
2. **Agentul nu atinge fișiere în afara listei lui** din prompt — fără excepții.
3. **Nimeni nu scrie în `engine/` fără aprobare** (ADR-006). Conținutul se scrie ca date.
4. **DoD universal**: `npm run typecheck` + `npm run build` + `npm test` verzi + raport într-o linie pe board.
5. **Dependențele se respectă** (vezi board): Integration pornește doar când toți ceilalți au raportat „gata”.
6. Fiecare agent își scrie **raportul** în `agents/reports/` (markdown scurt: făcut / nefăcut / decizii / linkuri).
7. Când rulezi un agent: **copiază promptul din `agents/prompts/`**, lipește într-un agent nou
   (Arena / Copilot / Claude etc.), adaugă taskul specific la `Task:` — gata, ai un coleg nou.
8. Scout-ul e primul care pleacă la drum (informează deciziile), Integration e ultimul.

## Ciclul unui sprint (5 pași)
1. **PM**: scoate taskuri din roadmap → le scrie pe `agents/task-board.md` cu dependențe.
2. **Scout** (dacă e nevoie de cercetare): raport cu linkuri + recomandare → PM decide.
3. **Backend → Frontend → Asset** în paralel, fiecare pe fișierele lui.
4. **Testing** scrie/rulează testele pe modulele pure; raportează buguri pe board.
5. **Integration**: combină, repară ruperile de API, rulează tot, actualizează README-ul
   dacă s-au schimbat comenzile → raport final către PM → commit pe `arena/01a06cde-test1`.

## Pilote rulat (2026-09-04) — vezi `agents/task-board.md`
Primul ciclu al echipei a fost executat integral în sesiunea curentă:
coliziuni (Backend) → săgeata de obiectiv (Frontend) → cercetare pathfinding (Scout)
→ teste fizică (Testing) → integrare (Integration). Rezultat: commit-uri verzi în repo.
