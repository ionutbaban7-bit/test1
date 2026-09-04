# 01 · Viziune, nume și scop — „OPERAȚIUNEA 1310”

> Autori: Divizia Betoane (arhitectură) × Divizia Benzină (gameplay) × Product Ownerii.
> Stare: **validat în principiu** · Data: 2026-09-04

## 1. Declarația de viziune (1 frază)

> Un open-world românesc de acțiune cu grafică retro PS2, în care furi Dacii, fugi de poliție pe Bulevardul Unirii, mănânci mici la Obor, tragi în inamici ca în CS, apoi termini totul cu o cursă pe Transfăgărășan — totul în browser, deploy local, fără efecte pompoase și fără cod încurcat.

## 2. De ce există acest joc (PO — cerințe brute, citate)

- „Vreau să fie **caterincă** — mici, Palatul Parlamentului, Transfăgărășan.”
- „Grafică **exact ca în anii respectivi** (Vice City / NFS Underground 1), simplistă dar super bună la ochi.”
- „**Fără efecte complexe și cod aiurea** — trebuie să putem rula și extinde cu agenți AI (agent Arena + GitHub Copilot).”
- „Un pic de **Counter-Strike** (scene shooter), un pic de **NFS** (curse), un pic de **Hitman/Max Payne** (furate de mașini, umblat prin oraș, momente tactice).”
- „Hărți: **București, Constanța (plajă), Brașov/Poiana Brașov + munte**.”
- „Să pornească **local**, apoi oriunde.”

## 3. Publicul țintă

- Români 20–45 care au prins era PS2/CS 1.6/NFS Underground și vor nostalgie + caterincă.
- Internațional „curios de România” (exotic tourism: Palatul, mici, șoferi de taxi).
- **PEGI 16** (violență cartoonish, zero politică, zero persoane reale, zero branduri reale).

## 4. Pilonii de design (ce apărăm cu viața)

| # | Pilon | Înseamnă |
|---|---|---|
| P1 | **Caterincă românească** | Umor cald, de stradă: mici, taxiuri galbene, „șpagă” în loc de stele, reclame parodie. Nu jignim, nu facem politică. |
| P2 | **Retro frumos** | Low-poly + paletă limitată + ceață + rezoluție joasă. Arată „de atunci” cu 10× mai puțin efort decât realismul. |
| P3 | **Simplitate tehnică** | Module mici, date în JSON, fără framework-uri grele, cod lizibil de oameni ȘI de agenți AI. |
| P4 | **Libertate + scenetism** | Orașul e o scenă continuă de joacă; misiunile sunt „scene” instanțiate (shooter/ cursă/ stealth) — exact structura care face proiectul fezabil. |
| P5 | **Local-first** | Rulează din `npm run dev`; fără conturi, fără server obligatoriu, fără cloud. |

## 5. Nume — lista scurtă pentru vot

| # | Nume | Punctaj intern (1–5) | De ce |
|---|---|---|---|
| 🏆 | **București Vice** | 5 | Pune imediat „Vice City” în capul oricui; extensibil: „Constanța Vice”, „Poiana Vice”. Subtitle: *mici, mașini & gloanțe*. |
| 2 | **Daciada 1310** | 3,5 | Retro-comunist ironie fină + Dacia 1310; risc: publicul tânăr nu prinde gluma. |
| 3 | **Mici & Șmecheri** | 3 | Amuzant, dar sună a joc de societate. |
| 4 | **Logan Legends** | 3 | Bun pentru meme, slab ca titlu de franciză. |
| 5 | **Max Pâine** | 3 | Perfect pentru o *mecanică* (slow-motion), nu pentru tot jocul. |
| 6 | **Curvele Dracului** | 3 | Porecla reală a Transfăgărășanului; ideal pentru capitolul final. |
| 7 | **GTA: Cartierul 13** | 2 | Prea aproape de „District 13”, confuzie. |
| 8 | **Fură, Condu, Mănâncă** | 2 | Caterincă pură, dar nu ține un logo. |

**Recomandare echipă:** `BUCUREȘTI VICE — mici, mașini & gloanțe`, cu capitolele numite „București Vice”, „Mamaia Vice”, „Poiana Vice”, iar ultima cursă se cheamă **„Curvele Dracului”**. *(Vezi „Decizii pentru PO” la final.)*

## 6. Logline și poveste-cadru (nu blocăm dezvoltarea pe asta)

Ești **Gigi** (nume implicit, se poate schimba), un șofer priceput din București care „împrumută” mașini ca să plătească o datorie către **Nea Costel**, interlop cu mustață și cu un Logan albastru. Ca să scape, Gigi acceptă „comisioane” prin toată țara: o livrare la Obor, o fugă la mare, o înțelegere la munte… iar la final, o cursă decisivă pe Transfăgărășan, contra timp și contra foștilor prieteni. Personaje-recurente: **Comisarul Dobre** (nu renunță niciodată), **Bunica cu sacoșe** (martoră la orice), **Taximetristul Mitică** (GPS uman), iar glumele țin loc de scenariu acolo unde lipsește bugetul de scriitor. 😄

## 7. Structura jocului: „Lume continuă + Scene”

Aceasta e decizia strategică centrală (vezi ADR-003 în arhitectură):

```
┌─────────────────────────────────────────────────────┐
│ HUB continuu (București Centru — open world-lite)    │
│ furat mașini · plimbat · NPC-uri · poliție · mic-gust │
└───────────────┬─────────────────────────────────────┘
        porți de misiune (marcaje pe hartă)
┌───────────────▼─────────────────────────────────────┐
│ SCENE instanțiate (fiecare = mini-nivel dedicat):    │
│  • shooter CS-like (Obor / Port / Cabana interlopilor)│
│  • curse NFS-like (Bd. Unirii / Mamaia / Transfăgărășan)│
│  • stealth/hitman-lite („Prizonier la Poiana”)        │
└──────────────────────────────────────────────────────┘
```

De ce: fiecare scenă e un fișier JSON + un mic script — exact ce poate produce și întreține un agent AI în mod fiabil, și ce se poate testa izolat.

## 8. Ce NU facem (non-goals — protejează-ne de noi înșine)

- ❌ Nu facem un GTA complet cu lume 1:1, AI de poliție complex, ragdoll, fizică avansată.
- ❌ Fără multiplayer în v1.
- ❌ Fără texturi foto, fără PBR, fără postprocesare scumpă, fără shadere custom dacă nu e nevoie.
- ❌ Fără branduri/locuri reale redate fidel („Banca de la Colț”, „Piața Țigăniei” → nume parodie: Obor rămâne Obor că e loc public, dar tarabele sunt generic „Mici la Grătar”).
- ❌ Fără politică, etnie, persoane reale. Umor de stradă, zero răutate.

## 9. Procesul de lucru (cum „discutăm” cu PO și echipele)

- **Sync săptămânal PO × Tech Lead:** verificăm roadmap, tăiem funcții, nu adăugăm.
- **Definition of Done (DoD)** pentru orice task: cod reviewat + build verde + rulează local + 1 linie în changelog.
- **Toate deciziile de arhitectură** se scriu ca ADR în `docs/03` înainte de implementare.
- **Fiecare zi de MVP are un „exit criterion”** măsurabil (vezi roadmap) — dacă nu-l atingem, tăiem din conținut, nu din calitate.
- **Echipa reală:** 1 agenți AI principali (agentul Arena de producție + GitHub Copilot) + developeri oameni la review. „O mie de developari” = 1000 de review-uri mentale zilnice. 🧠

## 10. Decizii PO (stadiu 2026-09-04)

**Luate (confirmate de PO):**
1. ✅ **Direcția generală** — continuăm pe tot ce e propus: joc complet, nu doar demo.
2. ✅ **Protagonist fix: Gogu Parfum** (vezi docs/07).
3. ✅ **Posturile de radio cu nume haioase** (Radio Micuțu', Radio Doinița, Radio Gogu Parfum ș.a. — vezi docs/07).
4. ✅ **Conținut sat rural** lângă Brașov: drumuri neasfaltate, babe cu batic, vehicule autohtone (mobre, scutere, tractor, căruță), rachiu la Micuțu', bătaia primarului, polițist pe bicicletă (docs/07).
5. ✅ **Zi și noapte + muzică lăutărească autentică** (direcție audio, vezi docs/07).
6. ✅ **„Politica de calitate și idei de antreprenoriat”** — document dedicat: docs/06.
7. ✅ **Denumirile se pot schimba ulterior** → toate numele din joc sunt *de lucru* și centralizate în date (reguli în docs/07 §6).

**Rămase deschise (nu blochează dezvoltarea):**
- Numele final al jocului (titlu de lucru: **București Vice — mici, mașini & gloanțe**).
- Platforma: browser-first rămâne alegerea implicită; build desktop (Tauri) = decizie v1.1.
- Nivelul de satiră: implicit „familie 16+” (fără limbaj vulgar; bip-uri la radio 😄).
- Conținutul primului demo public: Centru + satul „La Cruce” (recomandat) — confirmă la jalonul Z8/Z14.
