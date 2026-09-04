# Scout Report 002 — Chase, melee „cartoon” & feedback pentru misiunile satului

> Agent: GitHub-Scout / Asset · Data: 2026-09-04 · Sprint: Pilot 2 (M6–M11)
> Context: implementarea misiunilor rurale a cerut pattern-uri pentru urmărire pe
> bicicletă, „pumni cartoon” și semnale audio/vizuale simple, în stilul nostru retro.

## 1. Ce am verificat & recomandări adoptate (decise cu Backend/Integration)

**A. Chase cu waypoint vs urmărire directă.** Concluzia raportului 001 rămâne valabilă:
waypoint-graph + A* e pentru AI „de șosea” (poliție, rivali), dar pentru **fuga de
polițistul satului** am adoptat urmărire directă (steering spre jucător, viteză
constantă, condiții de reușită: zonă de ascunzătoare / oboseală / distanță) — e
suficient de amuzant și predictibil, zero alocări. Sursa de principiu (GameDev SE:
„start with the simplest thing that works”; grid vs waypoint vs navmesh — reprezentare
≠ algoritm) din raportul 001. Repo-ul de referință pentru „wanted/police chase”:
[gta7 (MIT)](https://github.com/depixeled-chris/gta7) + [Gta-Clone](https://github.com/Faizankhan17623/Gta-Clone)
(5-stele, zi/noapte, sunet procedural — confirmă simplitatea abordării noastre).

**B. „Punch cartoon” (fără ragdoll).** Regula noastră din ADR-007 (fără ragdoll)
se respectă: loviturile folosesc HP-ul existent pe Ped + starea `dead` cu animația
de „căzut pătrat” (rotire 90° + fade). Feedback: flash emissive pe materiale
(deja existent), sunet metalic scurt (`clang`) + numărătoare pe ecran. Nu am
găsit nimic mai bun decât ce avem fără să aducem fizică; **nu adoptăm nimic nou**.

**C. Efectul „lași fierbinți” (amețeală).** Pattern standard: sway sinusoidal pe
cameră + reducerea sprintului + text HUD. Fără postprocesare (regula ADR-002) —
doar mișcări de cameră și un banner. Simplu, zero cost FPS.

**D. Asset-uri găsite care merită păstrate la dosar (nu le folosim încă):**
- Modele low-poly Three.js (licență liberă/MIT) pentru animale/vehicule — le
  verificăm la faza de „polish” dacă vrem să înlocuim boxele; până atunci
  boxele noastre colorate sunt perfect în stilul retro și nu cer licențe.
- Sunete sintetice: continuăm cu WebAudio (nicio mostră de importat).

## 2. Licențe
Nimic copiat: repo-urile citate (MIT sau demonstrative) au fost folosite doar ca
reper de arhitectură. Toate sistemele noi (M6–M11) sunt cod original.

## 3. Concluzie pentru PM
Abordarea „cea mai simplă care merge” e și cea mai rapidă și cea mai în ton cu
politica de calitate (docs/06). Nu introducem dependențe noi. Implementarea
M6–M11 a mers pe Backend + Frontend + Testing fără să aștepte asset-uri externe.
