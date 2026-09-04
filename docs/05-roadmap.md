# 05 · Roadmap & MVP zi de zi

> Responsabil: PMO („Dispeceratul”) · Revizuit: 2026-09-04
> Capacitate realistă: **1 agent AI de producție (Arena) + GitHub Copilot în IDE** + review uman zilnic (~1–2h). „O mie de developari” e moralul nostru, nu headcount-ul. 😄
> Fiecare zi are un **exit criterion** măsurabil. Dacă nu-l atingem, tăiem conținut, nu calitate.

## Reguli de joc pentru execuție (convenite cu PO)

1. O misiune/element de conținut = **maxim 1 zi de agent**; ce nu încape, se taie sau se împarte.
2. **Duminica = buffer** (nu planificăm nimic duminica; acolo absorbim alunecările).
3. Fiecare zi se termină cu commit + build verde + demo live (vezi CI).
4. Review-urile umane: 15 min/zi pe codul agentului (sau PR la final de zi).
5. Ordinea capitolelor = ordinea pe care o vezi mai jos; MVP-ul e **Capitolul 1 complet jucabil**.

## ✅ Bilanț Sprint 1 (Zilele 1–3, executate) — „Fundațiile + primul sat”

Livrat efectiv (cod, nu doar plan):
- Engine retro (rezoluție mică, cer/ceață/lumini), HUD DOM cu ceas, input, sunet sintetizat.
- Orașul „București Centru”: Bd. Unirii, Palatul, Piața Unirii cu fântâni, Obor cu mici & fum, Centrul Vechi, parcuri.
- **Satul „La Cruce”** (comutare cu J): drumuri de pământ, babe cu batic, crâșma „La Micuțu’”, primăria, biserica, câmpuri cu fân, porci/gâște/câini, tractor/căruță cu cal/mobră/scuter/bicicletă.
- **Ciclu zi/noapte** (T = sari în timp) + **6 posturi de radio** cu nume haioase (M/N).
- Vehicule arcade: 11 tipuri (autohtone + rurale), fiecare cu senzație diferită.
- Misiuni demo M1 (tutorial) + M2 (shootout Obor), salvare localStorage.
- Typecheck + build + teste verzi; CI GitHub Actions.

## Sprint 2 (Zilele 4–8) — „Gogu Parfum & satul” (misiunile rurale M6–M11)

Conținut aprobat de PO (vezi docs/07 §3). Ordinea de execuție:

| Zi | Misiune / lucrare | Exit criterion |
|---|---|---|
| Z4 | M8 „Furtul tractorului” (omul cu pălărie pleacă cu tractorul; chase) | urmărești + furi tractorul; omul cu pălărie iese din scenă cu replică |
| Z5 | M6 „Borcanele babei” (transport plasa cu borcane, clinchet, fără spargere) + M9 „Cu căruța la fân” | livrezi plasa intactă; căruța are „oboseală” și zornăie |
| Z6 | M7 „Coasa & furca” (mini-joc ritm la fân + gâște de alungat) | mini-joc câștigabil; gâștele fug cu panica (viteză + zgomot) |
| Z7 | M10 „La Micuțu’, la țuică fiartă” (minigame pahare + efect „lași fierbinți”) + mecanică melee „pumnul de la bloc” | secvența se joacă; efect de amețeală 60 s; pumnul lovește NPC |
| Z8 | M11 „Primarul & Polițistu' cu bicicleta” (bătaia primarului + fuga prin sat) | M6–M11 se joacă cap-coadă; polițistul pe bicicletă te urmărește și poți scăpa |

Regula: fiecare misiune = fișier de date + hook-uri mici; o misiune = o zi de agent.

## ✅ Bilanț Sprint 2 (Zilele 4–8, executate) — „Gogu Parfum & satul”

Misiunile rurale **M6–M11 sunt implementate și jucabile** (apasă J în joc):
- M6 „Borcanele babei” (livrare fără fugă, gâște periculoase) · M7 „Coasa la fân” (QTE la fix) ·
  M8 „Furtul tractorului” (chase cu Nea Păun) · M9 „Căruța cu fân” (cal cu oboseală) ·
  M10 „Țuică fiartă — lași fierbinți” (efect de amețeală 45 s) · M11 „Primarul & Polițistu'” (pumni + fugă pe bicicletă).
- Personaje noi pe Ped: pălării (Nea Păun, primarul, polițistul), plasa cu borcane la babă.
- Modul curat `src/game/satQuests.ts` (state machine + logică pură testată) — fără să umplem main-ul.
- 31 teste verzi (fizică + misiuni + smoke), build verde, echipa de agenți cu board la zi (`agents/`).

## Sprint 3 (Zilele 9–12, executate) — „Pathfinding & Poliția”
- A12–A16 (vezi `agents/task-board.md`): `src/game/pathfind.ts` (graf pe grilă + A*),
  `src/game/police.ts` (Poliția „Șpagă” 0–5: urmărire pe drumuri, vezi–pierzi, amendă),
  `src/game/cityRace.ts` (Cursa „Noaptea Unirii” cu 3 rivali AI + rubber-band).
- În joc: furi după M1 → „ȘPAGĂ 💰” + Dacia Poliției pe urmele tale (A* pe străzi);
  te prinde = amendă (Șpagă × 150 LEI); scapi = scade Șpagă. După M1+M2, marcaj roșu
  la vest de Bulevard → cursa cu 3 rivali (premii 400/200/100 LEI).
- 46 teste verzi (pathfinding + cursa + misiuni + fizică + smoke), build verde.

## Sprint 4 (Zilele 13–16, executate) — „Selfie la Palat & Datoria” (capitolul 1 complet)
- M4 „Selfie la Palat” (`src/game/cityQuests.ts`): stealth-lite cu Jandarmu' Florică pe
  patrulă (con de vedere, QTE de poză 2 s), alarmă → ȘPAGĂ 3 + evadare până la garaj.
- M5 „Datoria” (final de capitol): Nea Costel la fântâna din Centrul Vechi (Logan albastru),
  raidul Comisarului Dobre (ȘPAGĂ 4), fuga la Autogara de Est, **rating 1–3 portofele**.
- Cursa M3 e acum misiune de poveste (se salvează, deblochează M4); poziție live „LOC x/4” în HUD.
- Poliția: logică „Șpagă” extrasă pură + testată (`HEAT_CAP`, `fineAmount`, decay).
- Save extins (m3/m4/m5 + locul la cursă) — povestea continuă după refresh.
- 63 teste verzi (7 fișiere), build verde. **Capitolul 1 „O zi în Centru” e complet.**

## Sprint 5 (plan — „La mare!”: Constanța, episodul următor)
- A21+: lumea Constanța (faleză, Cazinoul, „Pescărușul Șchiop”), misiunile de la mare
  (coletul lui Costel, cursa pe faleză, Port), apoi Brașov + Transfăgărășan (cursa decisivă).

## Planul de produs (faze)

| Fază | Conținut | Livrabil public |
|---|---|---|
| **0. Fundații** | repo, tooling, schelet 3D, vehicul arcade, hartă test | demo tehnic „rulează și conduci” (făcut ✅) |
| **1. MVP — București Centru** | hub Unirii, 5 misiuni, furt mașini, heat poliție, shooter CS-like, cursă NFS-like, HUD, audio, meniu | **„București Vice — O zi în Centru”** (beta ziua 14) |
| **2. Constanța & Mamaia** | capitol 2: faleză, Cazinou, port, plajă; 3–4 misiuni noi | build „Vice la Mare” |
| **3. Brașov & Poiana** | capitol 3: centru istoric + Poiana + zăpadă; 3–4 misiuni | build „Poiana Vice” |
| **4. Transfăgărășan** | capitol final: cursa „Curvele Dracului” + 2 finaluri | build „Curvele Dracului” |
| **5. Campanie & polish** | harta țării, salvări, sunet, echilibrare, testare publică locală | **v1.0 „București Vice”** |

## MVP — planul zi de zi (Faza 1, zilele 1–14)

### Săptămâna 1 — Motoarele și Bucureștiul

| Zi | Sarcini | Exit criterion |
|---|---|---|
| **Z1** | Tooling + schelet engine (renderer, cameră, buclă joc, input) + entity de test | `npm run dev` → te plimbi pe o scenă gri cu WASD+mouse; build+CI verzi |
| **Z2** | Fizică vehicul arcade (accel, frână, handbrake, coliziune AABB cu lumea) + prima mașină (Dacia 1310 low-poly, 3 culori) | conduci fără să treci prin clădiri; drift produce „puncte stil” pe HUD |
| **Z3** | Generator de oraș din JSON (drumuri, trotuare, clădiri, parcuri, seed) + paletă București | harta „București Centru v0.1” generată identic la fiecare reload |
| **Z4** | Landmark-uri: Palatul, Bd. Unirii (drum 6 benzi cu fântâni), Piața Unirii, Piața Constituției; prefab-uri | cele 4 repere sunt recognoscibile din cockpit; se poate alerga Bd. Unirii cap-coadă < 60 s cu Bătrâna |
| **Z5** | Mers pe jos + intrat/ieșit din mașini + furt (E) + pietoni simpli (mers, evitare) | furi mașini de pe stradă, pietonii fug când vii cu viteză; FPS ≥ 55 cu 80 pietoni |
| **Z6** | Sistem heat „Șpagă” 0–5 + poliție (urmărire „vezi–pierzi”) + mită | heat 1–2 te urmărește o mașină; heat 5 → 3 mașini; pierzi urmăritorii în Centrul Vechi |
| **Z7** | Misiune M1 „Împrumut de la Bătrână” (tutorial) + HUD (viteză, heat, obiectiv) + meniu + radio | joci M1 cap-coadă cu tutorial complet; save/load în localStorage; **BUFFER dacă a rămas ceva** |

### Săptămâna 2 — Scenele (shooter, cursă, stealth) și pachetul demo

| Zi | Sarcini | Exit criterion |
|---|---|---|
| **Z8** | Scena shooter CS-like: arena Obor, arme (Portofelul, Țeava 47), hit-scan, inamici 3 stări, valuri | M2 „Mici sub asediu” jucabilă și câștigabilă; inamicii mor cu animație simplă; fără ragdoll |
| **Z9** | Scena race NFS-like: circuit Bd. Unirii, 3 rivali AI (urmăresc waypoint), checkpoint-uri, clasament | M3 „Noaptea Unirii” câștigabilă; AI rival nu ia scurtături |
| **Z10** | Stealth-lite: conuri de vedere, alarmă, heat după alertă; obiectiv „Selfie” | M4 „Selfie la Palat” câștigabilă fără alertă ȘI cu alertă (2 rute) |
| **Z11** | M5 „Datoria” (urmărire nocturnă + dialog final capitol) + porți de misiune pe hub + sistem rating (1–3 portofele) | capitolele M1–M5 se joacă în lanț din hub; ratingul apare la final |
| **Z12** | Audio: sinteză motoare (turație în timp real), claxon, frâne, radio „Micuțu’” 3 piese; poluare fonică București 😄 | sunete distincte pe 5 mașini; radio schimbă piesa cu H; oprire motor pe M |
| **Z13** | Caterincă & conținut: Obor cu mici, reclame parodie, 15 replici pietoni, 5 easter eggs, selfie-spots; echilibrare | lista de catering din GDD e în joc; buget FPS respectat |
| **Z14** | **Beta „O zi în Centru”**: polish, bugfix, testare pe 3 mașini/browsere, build de prezentare + note de patch | demo-ul beta e jucabil cap-coadă fără crash; instructiuni de rulare; **BUFFER** |

## Criterii de acceptare MVP (PO va bifa)

- [ ] Joci M1→M5 în sesiune continuă (< 60 min total), fără crash.
- [ ] Furi ≥ 5 tipuri de mașini; fiecare se simte diferit (viteză, drift).
- [ ] Heat-ul funcționează: scapi, ești prins, plătești mită.
- [ ] Scena shooter e satisfăcătoare (30+ inamici, 3 valuri, boss cu șorț).
- [ ] Cursa are 3 rivali și se poate pierde/câștiga pe merit.
- [ ] Harta e recognoscibil „București centru” pentru un român (test pe 3 prieteni).
- [ ] 60 FPS pe laptop mid; load < 3 s; build < 25 MB.
- [ ] 100% local: fără cont, fără internet la runtime (doar la `npm install`).
- [ ] Codul trece typecheck; modulele sunt mici; niciun fișier > 400 linii (exceptând docs).

## După MVP — estimări faze mari (agent 1×, zile de lucru)

| Fază | Zile estimate | Note |
|---|---|---|
| Constanța & Mamaia | 10–14 | refolosim generatorul + prefab-uri; nou: plajă, apă, apus |
| Brașov & Poiana | 10–14 | noutăți: zăpadă (parametru), altitudine, telecabina decor |
| Transfăgărășan | 6–8 | un drum cu serpentine + cursa; foarte mult conținut „procedural” pe șablon |
| Campanie & polish | 7–10 | harta țării, echilibrare, sunet, teste publice, bugfix |
| **Total până la v1.0** | **~45–60 zile lucrătoare** | ~3 luni calendaristice cu buffer + review |

## Riscuri & plan de atenuare

| Risc | Prob. | Atenuare |
|---|---|---|
| Scope creep (PO vrea „încă o hartă”) | mare | regula: orice adăugare = scoatere de altă parte; revizuire săptămânală |
| Performanță slabă pe hărți mari | medie | bugete în ADR; măsurăm încă din Z4; scene instanțiate |
| Cod „aiurea” generat de AI | medie | convenții stricte (docs/03 §5), review zilnic, typecheck în CI |
| Plictiseală în hub (lumea pare goală) | medie | evenimente random: ambuteiaje, „taxi care te claxonează”, mici care se termină la tarabă; conținut de umplutură ieftin |
| Misiunile devin repetitive | medie | fiecare tip de scenă are 2+ variații de layout până la v1.0 |
| Boala agentului (context/limite) | medie | sarcini mici, fișiere < 400 linii, „documentație de mers” la zi |

## Cum raportăm zilnic (șablon)

```
📋 Raport zi X — [data]
✅ Făcut: …
🧪 Exit criterion: ATINS/NU (dacă nu: ce tăiem, plan de recuperare în buffer)
🐛 Buguri deschise: …
📦 Build: verde/roșu (link)
🔜 Mâine: …
```
