# 02 · Game Design Document (GDD) — București Vice

> Stare: **v0.3 draft jucabil** · Responsabil: Divizia Gameplay („Gloanțe & Benzină”)

## 1. Bucle de joc

### Bucla mare (macro)
```
Furi mașină → conduci prin oraș → pornești o misiune (scenă) → recompensă (LEI + reputație)
      ↑                                                                    │
      └──────────── upgrade mașini / deblochezi cartiere și scene ←────────┘
```

### Bucla medie (roam)
```
Explorezi → găsești landmark/misiune/easter egg → interacționezi (E) → poliția? mită!
```

### Bucla mică (secundă cu secundă)
- **Pe jos:** mers, fugit, sărit, privit, intrat în mașini, împușcat.
- **La volan:** accelerație, frână, handbrake (drift), claxon, radio, ieșit din mașină.
- **În scenă:** obiective (elimină / apără / ajunge primul), checkpoint-uri, rating final (1–3 stele de șpagă).

## 2. Moduri de joc

| Mod | Descriere | Sursă inspirație |
|---|---|---|
| **Roam** | Lume continuă: centru de oraș, mașini de furat, NPC-uri, heat | GTA Vice City |
| **Shootout (scenă)** | Arene închise, valuri/obiective, arme, hit-scan, fără ragdoll | Counter-Strike |
| **Race (scenă)** | Curse point-to-point sau tururi, rivali AI, trafic, drift | NFS Underground 1 |
| **Stealth-lite (scenă)** | Infiltrare simplă (conuri de vedere), 1–2 rute, evadare | Hitman (foarte simplificat) |
| **Slow-mo „Max Pâine”** | Mecanică globală: diving shot încetinit, disponibil în scenele cu arme | Max Payne |
| **Foto/colecționar** | „Selfie la Palat”, colecție de repere turistice (conținut ieftin, multă caterincă) | — |

## 3. Sisteme esențiale (spec scurtă, suficientă pentru implementare)

### 3.1 Vehicule (arcade, nu simulator)
- 6 grade de libertate reduse: mașina stă pe șasiu, fără răsturnare; drift = handbrake + viraj, cu „puncte de stil” pentru unghi și durată.
- Parametri per mașină în JSON: `accel, topSpeed, grip, brake, weight` + `colors[]`.
- Furt de mașini: „spargi” în 2 secunde dacă nu ești urmărit (anim = mâini pe sub bord); unele mașini au alarmă (heat +1).
- Daune: bară de sănătate pe mașină; ciocnituri = zgomot + zgârieturi (mesh schimbă culoare spre gri) — fără deformare.
- **Flotila v1:** Dacia 1310 („Bătrâna”), Logan („Loganul”), ARO 24 („Ursoaica” — munte), taxi galben, dubă de mici, „Seria 3 de șmecher” (rivali), moped 50cc (scene mici).
- **Poliția:** mașini alb-albastre cu girofar (light = 2 conuri luminoase); AI simplu: „urmărește ultima poziție văzută + drum optim”.

### 3.2 „Nivel de Șpagă” (heat)
- 0–5 💰: 1–2 = poliția patrulează mai aproape; 3–4 = urmărire activă; 5 = baraje + mașini extra.
- Scade în timp dacă ești oprit și „fără martori”, sau plătești mită la un „punct de taxare” (chestie de caterincă).
- Afișare HUD: portofele, nu stele.

### 3.3 Armament (nume parodie, zero branduri)
| Armă | Tip | Note |
|---|---|---|
| „Portofelul” | pistol | muniție infinită, slab |
| „Țeava 47” | automat | scena CS-like |
| „Vânătoarea” | shotgun | scurtă distanță |
| „Bătrâna” | sniper (bolt) | rareori |
| „Mici iuți” | grenadă | efect: fum + zgomot (non-gore) |

- Hit-scan + „urme de gloanțe” (decals mici, max 50 active), fără ragdoll: inamicii au 3 stări (`idle/alert/dead`), mor cu o animație simplă (rotire + fade).
- Health bar jucător, reînvie la checkpoint.

### 3.4 Misiuni și scenaristică
- Format **data-driven**: `missions/` → JSON cu `type: race|shootout|stealth|freeroam`, obiective liniare, dialoguri scurte (subtitle), recompense.
- Script hooks minimale: `onStart, onObjectiveComplete, onFail, onEnd` — fiecare apelează funcții simple din cod, nu un limbaj de scripting.
- **Rating la final:** timp + daune + stil (drift/headshot-uri) → LEI.

### 3.5 Lume și NPC
- Oraș generat din **blocuri JSON** (vezi arhitectura): drumuri, trotuare, clădiri, parcuri, landmark-uri ca prefab-uri.
- NPC pietoni: merg pe trotuar pe rute aleatorii, evită mașina (fug dacă e aproape), dialoguri una-două replici din listă de caterincă.
- Piața de mici: tarabă + fum (particule simple) + NPC care stă la coadă — „loc sacru”, nu se atinge. ❤️

## 4. Misiunile (campanie v1 — 4 capitole)

### Capitolul 1 · BUCUREȘTI — „O zi în Centru” (MVP)
| Misiune | Tip | Locație | Twist |
|---|---|---|---|
| M1 „Împrumut de la Bătrână” | tutorial/freeroam | parcare Piața Unirii | furi prima Dacie 1310; înveți condusul |
| M2 „Mici sub asediu” | **shootout CS-like** | tarabe Obor | teroriști gastronomici vor rețeta secretă de mici; 3 valuri + șef cu șorț |
| M3 „Noaptea Unirii” | **race NFS-like** | Bd. Unirii → Piața Alba Iulia | 3 rivali, trafic, ploaie opțională |
| M4 „Selfie la Palat” | stealth-lite + fuga | Piața Constituției | „faci poza”, se declanșează alarma, evadare cu heat 3 |
| M5 „Datoria” | final capitol | centru, noapte | urmărire + întâlnire cu Nea Costel → te trimite la mare |

### Capitolul 2 · CONSTANȚA / MAMAIA — „Vice la Mare”
- vibe: apus portocaliu, faleză, cazinoul, dig, șezlonguri, terase pe plajă.
- scene: cursă pe faleză „Pescărușul Șchiop”; shootout la Port (containere); misiune cu barca? (v2 — doar fundal grafic în v1).
- mașini: ARO 24 de plajă, „Seria 3”, taxi de mare (break).

### Capitolul 3 · BRAȘOV / POIANA — „Poiana Vice”
- vibe: albastru rece, zăpadă, lumină de dimineață, căldură la cabană.
- Piața Sfatului (clădiri colorate, Biserica Neagră silhouetă), urcarea spre Poiana (13–15 km, serpentine), telecabina (decor), muntele Postăvarul.
- scene: „Prizonier la Poiana” (stealth: eliberezi un prieten din cabana interlopilor); cursă pe zăpadă cu ARO vs „duba cu mici” care derapează.
- mecanica zăpezii: aderență redusă (doar parametru, nu fizică nouă).

### Capitolul 4 · TRANSFĂGĂRĂȘAN — „Curvele Dracului”
- cursa finală: ~90 km reali → ~12–15 km în joc, de la barajul Vidraru la Bâlea Lac (2.042 m), serpentine, 2 tuneluri, ceață la altitudine.
- rivali: Nea Costel (Logan albastru), Comisarul Dobre (poliție, din greșeală în cursă), „Șmecherul din Brașov”.
- twist final: alegi să câștigi cursa sau s-o Iași pe doamna cu sacoșe să ajungă prima la nuntă (2 finaluri, caterincă).

## 5. Economie (mică, voit)
- **LEI**: din misiuni + „spargeri” (portofele pierdute). Cheltuieli: reparații, mită, vopsea pentru mașini, mici (health +10, „gustos”).
- Fără loot-box, fără micro-tranzacții. Evident.

## 6. Art direction — „Retro Frumos” (de acord cu Divizia Grafică)
- Ținte vizuale: **GTA III / Vice City / NFS Underground / Mafia 1** — nu San Andreas-ul tău modernizat.
- Reguli:
  - Poligoane puține: clădire = cutie + detalii minimale; mașină 800–1.500 tri; landmark = maxim 5–10k tri.
  - **Zero texturi foto**: culori plate (vertex/lambert), eventual texturi mici procedurale (faianta, cărămidă) generate în cod.
  - Paletă limitată pe hartă (max ~14 culori de clădire + accente); skyline per capitol (apus, noapte, zăpadă, ceață).
  - Fog puternic, distanță de desen 150–400 m, draw calls < 300.
  - „Film grain” + rezoluție internă mică upscalată cu `image-rendering: pixelated` = senzația de PS2 pe CRT, cost ~0.
  - Vignetting prin CSS, nu shader.
- Font retro în HUD (pixel font, ex. Press Start 2P / local), UI în DOM.

## 7. Audio (fără fișiere mari)
- Motoare: sinteză WebAudio în timp real (frecvență = turație), claxon, frână.
- Muzică: 3–4 piese synthwave/chiptune per capitol generate procedural sau licență liberă; „Radio Micuțu’” cu glume între piese.
- Voce: NU în v1 (subtitrări + sunete cartoon). Voice-over doar dacă găsim TTS românesc bun.

## 8. Conținut „caterincă” (easter eggs listă de bază)
- Tarabe de mici cu fum; statuie ecvestră pe un cal cu oglindă.
- „Atenție: șofer de taxi” semn peste tot.
- Găsca care traversează (referință GTA) → de fapt un „porumbel bugetar” pătrat.
- Autobuzul 232 care apare doar când nu ai nevoie de el.
- Telefon public care sună: „Gigi, datoria, mâine!”.
- Reclame: „Mici & Fii”, „Benzinăria Dac-Petrol”, „Scaune de șmecher: piele eco de mochetă”.
- Ștergătoarele care nu șterg (doar sunet) pe Dacia 1310. 😂

## 9. Performanță & platformă
- Target: **60 FPS** desktop mid (2015+), 30 FPS low-end/mobil; Chrome/Edge/Firefox.
- Start < 3 s; totul local; build < 50 MB (fără texturi mari, realistic < 15 MB).
- Salvare: `localStorage` (1 slot v1).
