# Scout Report 001 — Pathfinding & proiecte similare

> Agent: GitHub-Scout (Agent 03) · Data: 2026-09-04 · Stare: ✅ livrat
> Context cerut de PO: „Căutare pathfinding algorithms” pentru AI de urmărire
> (poliția în oraș, polițistul pe bicicletă la sat, rivali la curse).

## 1. Ce avem noi (limitări & constrângeri)
- Hărțile noastre sunt **generate din drumuri pe grilă** (București: grilă 96 m + Bd. Unirii; satul: grilă 80 m) — clădirile sunt obstacole AABB între drumuri.
- Fizica e **arcade 2D pe sol (x, z)**; drumurile sunt coridoare drepte → problema de navigație e aproape 1D pe coridoare + intersecții.
- Entități: poliție (urmărire după „ultima poziție văzută”), rivali de cursă (waypoints), polițist pe bicicletă (M11), pietoni/babe (plimbare locală).

## 2. Ce am găsit (surse)

**Proiecte similare (stivă: TypeScript + Three.js + Vite):**
- [depixeled-chris/gta7](https://github.com/depixeled-chris/gta7) — MIT. GTA-like slice în browser, **arhitectura exact ca a noastră**: logica de joc pură și testabilă în Node, Three.js doar în stratul de rendering; teste unitare + headless Chromium. → **Adoptăm ca reper de arhitectură** (deja o respectăm în docs/03).
- [mauriciopoppe/Three.js-City](https://github.com/mauriciopoppe/Three.js-City) — oraș procedural + mașină condusă (prototip vechi; doar de studiat).
- [Faizankhan17623/Gta-Clone](https://github.com/topics/gta?l=javascript) — GTA-like în browser: wanted system 5 stele, day/night, sunet procedural → confirmă că feature-urile noastre (heat/„șpagă”, zi-noapte, sunet sintetizat) sunt fezabile fără asset-uri externe.

**Pathfinding (pattern-uri):**
- Sursă principală de decizie: articol „Pathfinding in Video Games: A*, Dijkstra and NavMesh” (udit.es) + discuții pe GameDev SE / Reddit r/gamedev:
  - **Reprezentarea lumii ≠ algoritmul**: grid-ul, waypoint-graph-ul și navmesh-ul sunt reprezentări; peste oricare rulezi A*.
  - Regula practică: *„start with the simplest thing that works"* — grid A* e pentru tile-games; **waypoint graph** e ideal când lumea are drumuri/coridoare bine definite (cazul nostru); navmesh justifică doar geometrie complexă 3D.
  - Greșeală clasică: agent mai mare decât coridorul → **umflă obstacolele cu raza agentului** înainte de rutare (noi: obstacolele sunt deja AABB-uri; adăugăm raza mașinii/polițistului la test).
- Coliziuni Three.js: discuții StackOverflow — pentru cuboizi verticali/sfere, **AABB + cerc e suficient și rapid**; `Raycaster` pe mesh-uri e overkill pentru fizica noastră. → Confirmă decizia noastră ADR-005/007.

## 3. Recomandare (decisă cu PM-ul)

**Adoptăm: waypoint-graph + A*, generat automat din harta de drumuri.**

- Noduri = **intersecțiile grilei de drumuri** (și punctele de capăt Bd. Unirii / serpentinele viitoare); muchii = segmente de drum dintre noduri.
- A* cu euristică euclidiană pe un graf de **câteva sute de noduri** = trivial ca timp (puteam rula în fiecare frame).
- Cost pe muchie ajustabil: lungime + „cât de periculos" (pentru poliție putem pune cost mai mare pe Centrul Vechi = pare că „pierde urma", exact caterinca din GDD).
- Polițistul pe bicicletă (M11) folosește același graf, dar cu viteză de bicicletă pe „drumuri de țară” (muchii de pământ) → pare firesc.
- Rivalii de cursă: A* o singură dată la start (rută fixă) + urmărirea waypoint-ului curent cu „steering” simplu (virează spre punct, accelerează după distanță). Rubber-banding subtil (ajustare viteză dacă rămân în spate).
- Pietonii/babele NU au nevoie de pathfinding: wandering local + flee (deja implementat).

**Cod-referință (pattern, rescris de noi, nu copiat):**
```ts
// nod = intersecție de drumuri; muchii = drumuri dintre noduri
interface PathNode { x: number; z: number; edges: number[] /* indecși vecini */ }
// A* clasic: openList cu prioritate f = g + h(heuristica euclidiana)
// → lista de noduri; urmărirea = „virează spre nodul curent; la < 2 m treci la următorul"
```
- Implementare planificată în Sprint 3 (după misiunile satului), în `src/game/pathfind.ts` (pur, testabil) + integrare în `police.ts`/AI rivali.

## 4. Licențe & igienă
- Repo-urile citate sunt MIT sau doar pentru studiu; nu copiem cod — extragem pattern-uri (arhitectură pură/testabilă, waypoint graph + A*).
- Codul nostru rămâne 100% original (contribuție proprie), cu mențiuni de „inspirat din” în comentarii unde e cazul.

## 5. Pași pentru Backend Agent (când primește taskul)
1. `src/game/pathfind.ts`: extragere noduri din grila drumurilor (funcție pură, fără THREE).
2. A* cu costuri opționale pe muchii; rută = `{x,z}[]`.
3. `followPath(entity, route, speed, dt)` cu steering simplu.
4. Teste în `tests/pathfind.test.ts` (rută dreaptă, rută cu ocolire de „piață”, entitate care nu găsește drum → null).
