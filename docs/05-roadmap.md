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
