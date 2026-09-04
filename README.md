# 🏁 BUCUREȘTI VICE
### *mici, mașini & gloanțe* — un open-world românesc de acțiune, grafică retro PS2, făcut să ruleze local

> **Cod intern de proiect:** `OPERAȚIUNEA 1310` · **Studiouri:** „Divizia Betoane” (EA) × „Divizia Benzină” (Rockstar) × „O mie de developari” 🧑‍💻
>
> Inspirație declarată: **GTA Vice City** (lume liberă, vibe), **NFS Underground 1** (curse pe străzi noaptea), **Counter-Strike** (scene shooter), **Hitman / Max Payne** (scenete de acțiune). Toate pe teren românesc: București, Constanța–Mamaia, Brașov–Poiana, Transfăgărășan.

---

## 🎮 Ce e jocul, pe scurt

Un joc **open-world-lite** în care:
- **furi o Dacie 1310** și te plimbi prin centrul Bucureștiului (Piața Unirii, Palatul Parlamentului, Bulevardul Unirii — cel mai lat bulevard din țară);
- intri în **scene** ca la Counter-Strike („apără taraba de mici de la Obor”);
- participi la **curse ilegale** ca în NFS Underground (Bulevardul Unirii noaptea, apoi Transfăgărășanul);
- ai momente **Hitman/Max Payne** (infiltrare, slow-motion „Max Pâine”);
- urmărești poliția? Nu, **poliția te urmărește pe tine** — cu „Nivel de Șpagă” în loc de stele.

Grafica e **low-poly voit retro** (flat colors, ceață, rezoluție mică upscalată) — adică exact stilul anilor respectivi, dar curat, fără efecte complicate și fără cod aiurea. 100% **deploy local** (browser), apoi oriunde.

## 📚 Documentație (punctul de plecare — citește în ordine)

| Doc | Ce conține |
|---|---|
| [docs/01-viziune.md](docs/01-viziune.md) | Viziune, nume, piloni, ce NU facem, procesul cu PO, deciziile luate |
| [docs/02-gdd.md](docs/02-gdd.md) | Game Design Document: bucle de joc, misiuni, sisteme, armură, mașini, art direction |
| [docs/03-arhitectura.md](docs/03-arhitectura.md) | Stack tehnic, decizii (ADR), module, flux de date, convenții AI (Copilot + agent Arena) |
| [docs/04-lumea.md](docs/04-lumea.md) | Lumea: București, Constanța, Brașov–Poiana, Transfăgărășan + date reale cu surse |
| [docs/05-roadmap.md](docs/05-roadmap.md) | Planul pe echipe, MVP-ul **zi de zi** (Sprint 1 ✅, Sprint 2 în curs), criterii de acceptare |
| [docs/06-calitate-antreprenoriat.md](docs/06-calitate-antreprenoriat.md) | **Politica de calitate** (DoD, reguli cod, bugete) + **idei de antreprenoriat** (producție & în joc) |
| [docs/07-gogu-parfum-satul.md](docs/07-gogu-parfum-satul.md) | **Content Bible**: Gogu Parfum, satul „La Cruce”, posturile de radio, misiunile M6–M11 |

## 🚀 Quickstart (deja merge un demo de fundație)

```bash
npm install
npm run dev        # deschide http://localhost:5173 (sau linkul din preview)
```

Comenzi în demo: `WASD` mers/condus · `Mouse` privit (pe jos) · `E` intri/ieși din mașină · `Space` drift · `Shift` fugi · `H` claxon · `M` radio on/off · `N` schimbi postul (Radio Micuțu', Radio Doinița, Radio Gogu Parfum…) · `T` sari în timp (zi/noapte) · `J` **oraș ⇄ satul „La Cruce”** (babe cu batic, tractor, căruță cu cal, mobră) · `R` resetezi mașina. Protagonist: **Gogu Parfum**. 😄

## 🗺️ Faze mari

- **Faza 0 — Fundații** (făcută, vezi `src/`): repo, tooling, demo tehnic.
- **Faza 1 — MVP „București: O zi în Centru”** (zilele 1–14, vezi roadmap).
- **Faza 2** — Constanța & Mamaia („edition a la Vice City, la mare”).
- **Faza 3** — Brașov & Poiana Brașov (zăpadă, munte, telecabina).
- **Faza 4** — Transfăgărășan: cursa finală, „Curvele Dracului”.
- **Faza 5** — Campanie completă, polish, beta publică locală.

## ✅ Decizii deschise (vezi `docs/01-viziune.md` — secțiunea „Decizii pentru PO”)

1. Numele final (recomandare: **București Vice**; 7 alternative în doc).
2. Confirmare platformă: **web (browser)** vs desktop nativ.
3. Gradul de satiră (limbaj, umor, „Nivel de Șpagă”).
4. Ce intră în primul demo public: doar centrul sau și scena shooter.

## 🛠️ Stiva (pe scurt)

Vite + TypeScript + Three.js · fizică arcade proprie · hărți data-driven (JSON) · UI în DOM · CI pe GitHub Actions · generat cu AI (agent Arena + GitHub Copilot), revizuit de oameni.
