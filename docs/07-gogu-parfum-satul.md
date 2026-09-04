# 07 · Content Bible v0.2 — Gogu Parfum, satul & posturile de radio

> Anexă de conținut la GDD. Stare: **în lucru** · 2026-09-04
> ⚠️ **Denumirile sunt TITLURI DE LUCRU.** PO a anunțat că le modifică ulterior —
> le tratăm ca placeholder-e (joc, personaje, posturi, sate) și le centralizăm în
> date (JSON/constante), ca schimbarea numelor să fie o operație de date, nu de cod.

## 1. Protagonistul: GOGU PARFUM (fix, decis de PO)

- **Gogu „Parfum”** — șmecher cu inimă bună din București. Mirosul lui de colonie
  „Parfum de Bulevard” se simte de la o stație de autobuz distanță (de aici numele).
- Motivație (neconfirmată de scriitor): vrea să-și cumpere o Dacie 1310 **neagră**,
  ca a lu' taică-su, și o ține tot amânând — tocmai de-aia fură mașini: „le probează”.
- Trăsături: ghinion cronic cu poliția, nas fin la mici bine făcuți, respect profund
  pentru babe („babele sunt VPN-ul cartierului: te văd pe tine, tu nu le vezi pe ele”).
- Voce: NU în v1 (subtitrări + TTS dacă găsim un TTS românesc bun). Replici scurte, caterincă:
  - la furt: „Împrumut și eu o țâră, îi fac și plinul la gaz, ce mai…”;
  - la poliție: „Domn' comisar, eu doar testam frânele pentru TÜV…”;
  - la mici: „Dacă miciul nu plesnește la grătar, nu-i mici, e chiftea cu pretenții.”

## 2. Posturile de radio (numiri haioase — deja în cod, în `src/engine/audio.ts`)

| Post | Tip muzică (sinteză) | DJ / motto |
|---|---|---|
| **RADIO MICUȚU’** | manele & șlagăre (scara frigiană, bass „de șmecher”) | „La Micuțu, la țuică!” |
| **RADIO DOINIȚA** | muzică populară autentică (pentatonică, lentă) | „Doină și horă, de la Sibiu pân' la mare!” |
| **RADIO BELEA** | folk de munte, rece, atmosferic | „Frig afară, cald la radio!” |
| **RADIO DEPECHE MODE FANCLUB** | synth 80s (bass sec, linii reci) | „Enjoy the silence... pe cocliu' lu' tata.” |
| **RADIO GOGU PARFUM** | hiturile șefului (major, rapid) | „Aici Gogu Parfum! Hai cu mine!” |
| **FĂRĂ RADIO** | doar motorul | — |

Taste: `M` = pornit/oprit · `N` = următorul post. Muzica e 100% generată în timp
real (WebAudio) → zero fișiere mari. Direcția „lăutărească autentică” cerută de PO
se aprofundează în Zilele 7–8 (ornamente, cobză sintetizată, rubato), fără sample-uri.

## 3. Satul „La Cruce” (lângă Brașov) — deja jucabil (tastează J)

Interpretează cerințele PO (citat): „drumuri neasfaltate pe la sate prin Brașov”,
„babe cu batic”, „mobre”, „scutere”, plus tot vibe-ul rural:

- **Drumuri de pământ** pe grilă, cu urme de căruță; câmpuri cu brazde, fân în claie.
- **Babe cu batic** (fuste lungi, tulpan colorat) care umblă agale pe ulițe;
  la primărie stă una pe bancă, la crâșmă alta „păzește butoiul”.
- **Cârciuma „La Micuțu’”** cu butoi de țuică, masă și scaune afară; porțile satului.
- **Primăria** cu drapel și câine cu cuscă; **biserica de lemn** cu turla; balta cu
  papură, porci, gâște, căței, salcâmi, pomi.
- **Vehiculele satului**: Tractorul U-650, Căruța cu cal (cu fân încărcat!),
  Mobra 50, Scuterul de la bloc, Bicicleta (albă, „a Poliției”).
- Limită sat: pădurea de hotar → nu te rătăci după 240 m.

### Misiunile satului (plan, M6–M11 — Zilele 4–8; nu sunt încă toate în cod)
Tabel = ce a cerut PO → cum o implementăm:

| # | Cerința PO (citat) | Design-ul de joc | Mecanică nouă necesară |
|---|---|---|---|
| M6 | „iei la babe plasa cu borcane și compoturi” | Baba Ica îți dă plasa (10 borcane) să o duci la nepoată-n oraș: mers atent, borcanele sună la fiecare mișcare bruscă | obiect „plasă” pe jucător + numărătoare borcane + sunet clinchet |
| M7 | „mergi să dai cu coasa, cu grebla, cu furca după oameni sau după fân” | Mini-joc la fân: „cosit” = lovești clăile în ritm; bonus: alungat gâștele din lan cu furca (de caterincă) | timp-rhythm prompt pe clăi; gâște care fug haotic |
| M8 | „furi tractorul de pe câmp de la omul cu pălărie” | Omul cu pălărie se urcă pe tractor și pleacă → îl urmărești pe jos/cu alt vehicul, îl „claxonezi”, apoi furi tractorul (heat 0 la sat) | chase scriptat cu waypoint-uri |
| M9 | „mergi cu căruța” | Misiune de livrat lemne/fan cu căruța (calul are „oboseală”), printre gâște și gropi | parametru „oboseală cal” pe Vehicle cart |
| M10 | „bei rachiu la bar la Micuțu, în lași fierbinți” | Secvență caterincă la crâșmă: 3 runde de țuică fiartă (minigame de „noroc” cu pahare), efecte: vedere ușor încețoșată + mers instabil 60 s; „lași fierbinți” = lași bacșiș fierbinte la Micuțu | efect vizual simplu (vignette + waddle), timer |
| M11 | „bați primarul” + „te fugărește polițistul satului cu bicicleta” | Primarul a pus taxă pe fân → Gogu îl „convinge” (melee simplu, 3 pumni cartoon); apoi fuga: Polițistu' (pe Bicicleta Poliției, care e în sat!) te urmărește — trebuie să scapi prin câmpuri sau să-l faci să cadă în balta cu gâște | melee „pumnul de la bloc” + AI pursuit pe bicicletă (waypoint) |

Toate M6–M11 respectă regula: **1 misiune = 1 zi de agent**, date în JSON, fără
atin gere de motor decât prin hook-uri aprobate.

## 4. Parcul auto autohton (cerința PO: „mașini autohtone românești, motorete mobre, scutere”)

Deja în cod (`src/game/vehicle.ts`), cu nume de lucru:

| ID (cod) | Nume (de lucru) | Tip | Notă de caterincă |
|---|---|---|---|
| dacia | Bătrâna (1310) | sedan | „nu moare, se transformă” |
| logan | Loganul | sedan | mașina națională modernă |
| taxi | Taxi Galben | sedan | cu ”M” mare pe uși (parodie) |
| serie3 | Șmecheria | coupe | a lu' „Gigel” din Pipera |
| duba | Duba cu mici | dubă | reclamă „MICI & FII” |
| aro | Ursoaica (ARO) | 4×4 | pentru munte, cu lanțuri iarna |
| mobra | Mobra 50 | motoretă | „2 cai, unul obosit” |
| scuter | Scuterul de la bloc | scuter | roșu, cu coș de piață în față |
| tractor | Tractorul U-650 | tractor | pentru M8 |
| cart | Căruța lu' Nea Ion | căruță | cal + fân; claxon = clopoțel |
| bicicleta | Bicicleta Poliției | bicicletă | albă, pentru M11 |

Fiecare are parametri diferiți (viteză, aderență, frână) + sunet de motor propriu
(tractor = „brum-brum” grav, mobra = viespe supărată, căruța = clopoței).

## 5. Alte confirmări de conținut din partea PO (log)
- ✅ Zi și noapte (implementat: ciclu de ~64 s, ceas în HUD, cer/lumini interpolate; T = sari în timp).
- ✅ „Babe cu batic”, „drumuri neasfaltate”, „mobre/scutere” (satul de mai sus).
- ✅ „Muzică lăutărească autentică” — direcție Radio Doinița + ornamente în Zilele 7–8.
- ✅ „Gogu Parfum” protagonist fix.
- ✅ „Posturile de radio cu nume funny” (tabelul de mai sus; nume = de lucru).
- ✅ „Politica de calitate și idei de antreprenoriat” → docs/06.
- ⏳ „Vom mai modifica apoi denumuri” — toate numele sunt placeholder-e centralizate.

## 6. Reguli de igienă pentru placeholder-e
1. Numele de personaje/posturi/locuri stau în date (constante/JSON), nu în text împrăștiat.
2. Comentariile din cod nu folosesc nume „finale” în titluri de fișiere (ex. `worldSatellite.ts`, nu `lacruce.ts`).
3. Când PO alege numele finale: o singură trecere de date + update docs; zero schimbări de logică.
