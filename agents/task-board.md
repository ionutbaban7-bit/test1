# 📋 Task Board — echipa de agenți

> Stare: **Pilot 5 executat ✅ (episodul 2 — „La mare!”: Constanța cu M12 + M13)**
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

## Pilot 4 (executat 2026-09-04) — „Selfie la Palat & Datoria” (capitolul 1 complet)
| # | Agent | Task | Fișiere | Stare |
|---|---|---|---|---|
| A17 | Backend | M4 „Selfie la Palat” (stealth-lite: gardă cu con de vedere, poză 2 s, alarmă + ȘPAGĂ 3, garaj) + M5 „Datoria” (Nea Costel, raid Dobre ȘPAGĂ 4, fuga la Autogară, rating 1–3 portofele); date în missions.ts | `src/game/cityQuests.ts`, `src/game/missions.ts` | ✅ |
| A18 | Frontend | Poziție live „LOC x/4” în HUD la cursă; marcaje mov/auriu/albastru pentru M4/M5; noaptea la M5 (23:00) | `src/engine/hud.ts`, `src/main.ts` | ✅ |
| A19 | Testing | Logica „Șpagă” pură (cap, amendă, decay) + con gardă + patrulare + rating | `tests/police.test.ts`, `tests/cityQuests.test.ts` | ✅ (63 total) |
| A20 | Integration | Save extins (m3/m4/m5 + locul), M3 devine misiune de poveste, prinderea penalizează ratingul, capitol finalizat + bilet la mare | `src/main.ts`, docs/board | ✅ |

**Cum se joacă M1–M5 (capitolul 1):** M1 Bătrâna → M2 Obor → M3 cursa (primul finiș salvează M3) →
M4 selfie la Palat (E la marcajul mov → poza 2 s când garda e departe → fuga cu ȘPAGĂ 3 la garaj) →
M5 (noapte, Nea Costel la fântână → raid Dobre → fuga la Autogara de Est → rating 👜×1–3 + bilet la mare).
După M5: cursa rămâne deschisă pentru reluare, satul La Cruce cu M6–M11 intact.

## Pilot 5 (executat 2026-09-04) — „La mare!” (episodul 2: Constanța)
| # | Agent | Task | Fișiere | Stare |
|---|---|---|---|---|
| A21 | Scout/Asset | Raport faleză & Cazinou (Art Nouveau, port); barca/bacul = doar decor v1 | `agents/reports/scout-report-003.md` | ✅ |
| A22 | Backend | Lumea „Constanța”: faleza de curse, Cazinoul „Alb cu Turnulețe”, plajă + barieră intermitentă, Pescărușul Șchiop (pier), Port (containere, macara, bac decor), palmieri, mașini de furat | `src/game/worldMare.ts` | ✅ |
| A23 | Frontend | M12 „Coletul lui Costel” (Titi → Căpitanu' Spiridon; lada te încetinește pe jos) + M13 „Faleza nebună” (2 rivali pescari, countdown, rubber-band, premii 300/150/100) | `src/game/mareQuests.ts`, `src/game/missions.ts` | ✅ |
| A24 | Testing | Poziția în cursa de pe faleză, geometria mării (start vest/finiș est), misiunile M12/M13 în date | `tests/mareQuests.test.ts` | ✅ (72 total) |
| A25 | Integration | Lumea a 3-a în J (oraș→sat→mare), deblocare cu biletul M5, save m12/m13, HUD LOC x/3, 3 lumi + radio + zi/noapte | `src/main.ts`, docs | ✅ |

**Cum se joacă:** termini M5 (biletul la mare) → `J` până la „Constanța” → M12: vorbește cu Titi la
Pescărușul Șchiop, du lada la Căpitanu' Spiridon (zona galbenă din Port) → M13: cursa pe faleză
la marcajul roșu din vest (premii + reluare oricând).

## Pilot 6 (plan — Sprint 6: „La munte!” Brașov & Transfăgărășan — finalul)
| # | Agent | Task | Dependențe | Stare |
|---|---|---|---|---|
| A26 | Scout | Referințe Brașov/Poiana + DN7C (viraje, altitudine) | — | ⬜ |
| A27 | Backend | Lumea „Brașov & munte” (oraș vechi, Poiana, drumul de munte) | A25 | ⬜ |
| A28 | Frontend | M14–M16 (înțelegerea la cabană, cursa decisivă pe Transfăgărășan, epilog) | A27 | ⬜ |
| A29 | Testing | Teste munte + cursa finală | A27–A28 | ⬜ |
| A30 | Integration | Final de poveste + ecran rating general | A28–A29 | ⬜ |

## Pilot 5.1 (executat 2026-09-04) — „Echipa de graficieni” 🎨 pass vizual major (feedback utilizator: „grafica e groaznică”)
| # | Task | Fișiere | Stare |
|---|---|---|---|
| V1 | **Render cinematografic**: ACES tone mapping + sRGB, antialiasing, pixel ratio 1.75 (scos look-ul CRT pixelat), umbre moi PCF care urmăresc camera (2048px, doar ziua), expunere ridicată noaptea | `src/engine/renderer.ts` | ✅ |
| V2 | **Cer viu**: dom shader cu gradient orizont→zenit, disc solar cu halou, lună pe boltă opusă, 650 de stele noaptea, ceață colorată după oră | `src/engine/renderer.ts` | ✅ |
| V3 | **Kit vizual PBR** `src/engine/look.ts`: materiale MeshStandard + texturi procedurale (canvas): iarbă/teren (oraș+sat), nisip (litoral), asfalt granulat pe șosele | `src/engine/look.ts` + `world*.ts` | ✅ |
| V4 | **Vehicule**: vopsea metalizată lucioasă, geamuri închise glossy, cauciuc mat; **pietoni** cu materiale standard; toate + clădirile aruncă umbre | `src/game/vehicle.ts`, `combat.ts`, `main.ts` | ✅ |
| V5 | **Marea** cu luciu specular (roughness 0.22), plaja cu nisip texturat | `src/game/worldMare.ts` | ✅ |
| V6 | **HUD modern**: panouri „sticlă” translucide cu blur, font clar, banner central cu border auriu, bara de viață gradient cu %, ceas cu ☀️/🌙, crosshair rafinat, vignetă cinematică | `src/engine/hud.ts` | ✅ |

Verificat: typecheck ✅ · 72/72 teste ✅ · build ✅ (587.99 kB). **De confirmat vizual de utilizator** (smoke-test: T = zi/noapte, J = lumi).

## Pilot 5.2 (executat 2026-09-04) — „Detalii & noaptea orașului” 🌙 (feedback: „adaugă faruri, detalii mașini, iluminat stradal, meniu start/loading/controls, noaptea vine prea repede”)
| # | Task | Fișiere | Stare |
|---|---|---|---|
| N1 | **Ritm zi/noapte realist**: ziua întreagă = 6 min (nu mai „se face noapte prea repede”); amurg/apus mai lungi | `src/main.ts` | ✅ |
| N2 | **Iluminat stradal oraș**: 3 inele de lampadare (Piața Unirii, esplanada Palatului, Obor) cu stâlpi + braț + glob cald + PointLight; se aprind la 19:30 și se sting la 6:30 | `src/main.ts` | ✅ |
| N3 | **Faruri vehicule**: spoturi de drum (2) + becuri + stopuri roșii; pornesc la amurg pe toate mașinile; mașina jucătorului are un spot „playerLight” în scenă care luminează drumul; **F = manual**; stopurile se intensifică la frânare | `src/game/vehicle.ts`, `src/main.ts` | ✅ |
| N4 | **Geamuri luminate** în blocurile comuniste (material emisiv „isWindow”), se aprind noaptea (oraș + sat) | `src/engine/look.ts`, `src/game/world.ts`, `src/main.ts` | ✅ |
| N5 | **Meniu de start** cu titlu, descriere, controale și buton „ÎNCEPE JOACA”; F1 = ajutor; jocul pornește pauzat, bucla rulează în fundal | `src/engine/startMenu.ts`, `src/main.ts` | ✅ |
| N6 | **Detalii**: stopuri/geamuri/umbre pe vehicule; lumini stradale vizibile în ceață; noapte jucabilă (faruri + expunere) | `vehicle/combat/main` | ✅ |

Verificat: typecheck ✅ · 72/72 teste ✅ · build ✅ (598.19 kB). **De confirmat vizual de utilizator** (smoke-test: T = zi/noapte, F = faruri manuale, noapte la oraș).

## Buguri deschise
- ~~**P0 QA-001 — jocul înghețat pe un cadru static** (bucla `update()` nu pornea: `elapsed` creștea doar în `update()`, dar `update()` era gate-uit de `elapsed > 0.5`; plus, `vite build` elimina `update()` prin tree-shaking circular)~~ → **FIXED** în `src/main.ts` (+31/−2: `elapsed += dt` mutat în `frame()`, `try/catch` + overlay `showFatal()` pentru erori vizibile). Verificat: typecheck ✅, 72/72 ✅, build complet 574.91 kB ✅. Detalii: `agents/reports/qa-001-inghet-bucla.md`. **De confirmat de utilizator în preview (smoke-test manual — vezi raportul §5).**
*(Testing: 72/72 verzi + raport QA-001)*
