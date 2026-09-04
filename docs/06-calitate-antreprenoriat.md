# 06 · POLITICA DE CALITATE ȘI IDEI DE ANTREPRENORIAT

> „O mie de developari trebuie să sune ca unul singur — dar perfect.” — PMO
> Stare: aprobat în principiu de PO · Anexă la docs/03 (arhitectură) și docs/05 (roadmap).

## A. POLITICA DE CALITATE (reguli obligatorii pentru orice livrare)

### A1. Definiția „gata” (Definition of Done)
Un task e **gata** doar dacă are TOATE:
- [ ] codul trece `npm run typecheck` și `npm run build` (verde, fără warnings);
- [ ] `npm test` verde (unități pe module pure; smoke pe date);
- [ ] rulează local fără erori în consolă (testat manual pe scenariul-cheie);
- [ ] fișierul e ≤ ~400 linii (excepție documentată: orchestratorul);
- [ ] modificările sunt în commit-uri mici, cu mesaj explicit, pe branch-ul de lucru;
- [ ] 1 linie în `CHANGELOG.md` sau în raportul zilnic din docs/05;
- [ ] dacă s-a atins motorul (`engine/`), există aprobare de review.

### A2. Calitatea codului
1. **Un fișier = o treabă.** Fără clase de 600 de linii, fără „utils” universale.
2. **Date peste cod.** Conținutul (mașini, misiuni, replici, posturi) stă în date; codul doar rulează datele.
3. **Fără cod mort**: fără funcții nefolosite, fără `TODO` vechi, fără console.log în producție.
4. **Fără efecte deștepte**: dacă un efect cere un tutorial de shader, nu-l facem. Vrem „super bun la ochi”, nu „impresionant în screenshot”.
5. **Fizica/IA predictibile**, cu valori ușor de reglat în JSON (niciodată constante magice împrăștiate).
6. **Romanian in data, English in code**: `name: 'Bătrâna 1310'` în date; `class Vehicle` în TS.

### A3. Calitatea conținutului („caterinca de calitate”)
- Umorul e **cald, de stradă** — râdem împreună, nu râdem de nimeni. Fără politică, fără etnie, fără persoane reale, fără jigniri.
- Orice referință reală (Palatul, Obor, DN7C) e **interpretare artistică**: nume de firmă/brand → parodie; oameni reali → nu există.
- Textul din joc se scrie ca la radio adevărat: scurt, ritmat, fără greșeli de diacritice (verificat în review).
- **PEGI 16**: „mor” cartoonish, fără sânge, fără limbaj vulgaR (bip-uri la radio unde e cazul 😄).

### A4. Calitatea experienței (bugete de performanță — din docs/03)
| Metrică | Prag de calitate |
|---|---|
| FPS desktop mid | ≥ 60 constant |
| Load până la primul cadru jucabil | < 3 s |
| Build final | < 25 MB (țintă realistă < 15 MB) |
| Crash / bug blocker în sesiunea M1–M5 | 0 |
| Text care iese din ecran / se taie | 0 (verificat la 1366×768 și 1920×1080) |

### A5. Proces & raportare
- **Raport zilnic** (șablonul din docs/05): făcut / exit criterion / buguri / build / mâine.
- **Regula bugetului de timp**: orice funcție care nu încape într-o zi de agent se taie sau se împarte. Calitatea nu se negociază; conținutul da.
- **Testare**: smoke test manual la fiecare zi de lucru; testare de prieteni („test pe 3 prieteni”) la jaloane: Z7, Z14, fiecare capitol.
- **Bug tracker ușor**: secțiune „Buguri” în raportul zilnic + fișier `docs/buguri.md` (acumulăm acolo; nu în minte).

---

## B. IDEI DE ANTREPRENORIAT (două planuri)

### B1. Antreprenoriat de PRODUCȚIE (ca să trăiască proiectul, nu doar să existe)
1. **Free-to-keep, cu „mic de aur” plătit** (skin cosmetic; fără pay-to-win). v1.0+.
2. **Merch caterincă** odată cu v1.0: tricou „Bătrâna 1310 — nu moare, se transformă”, abțibild cu „Conducem cu șpagă” etc. (print-on-demand, zero stoc).
3. **DLC-uri-hărți plătite** după campania de bază (Cluj, Timișoara, Delta, Vama Veche) — „sezon turistic românesc”.
4. **Licențiere educatională/artistică**: demo-ul local e material de predare pentru școli de game dev din RO (gratis, PR excelent).
5. **Parteneriate locale de caterincă** (benzinării, service-uri, cârciumi cu nume parodie) pentru evenimente — departe, după v1.0.
6. **Roadmap public + buletin „De la Micuțu'”** (newsletter lunar cu progres) → comunitate înainte de lansare.

### B2. Antreprenoriat ÎN JOC (economia lui Gogu Parfum)
Idei de mini-afaceri jucabile pentru lumea deschisă (nu blocante pentru MVP, dar le păstrăm în design ca „economie extinsă” v1.1):

| # | Afacere | Mecanică | Stadiu |
|---|---|---|---|
| 1 | **Taraba de mici mobilă** | cumperi un cărucior, îl parchezi la evenimente, aprovizionezi, încasezi; risc: gălăgia îți dă heat | v1.1 |
| 2 | **Taxi „la negru”** | iei clienți cu mașina ta (marcaj galben), încasezi LEI; riști amenzi | v1.1 |
| 3 | **Service în spatele blocului** | găsești mașini „de ocazie”, le tunzi (vopsea + piese), le vinzi | v1.2 |
| 4 | **Livrări de borcane & compoturi** | comenzi de la babe; cutia nu se sparge = bonus; spart = pagubă | MVP-sat (vezi M7) |
| 5 | **Agenție de pază la nunți** | job secundar plătit: păzești cadourile de la nuntă de „șmecheri” | v1.2 |
| 6 | **Distilerie de țuică (autorizată?!)**, în sat | aduci prune de la babe, fierbi, vinzi; „control de la primărie” = misiune secundară | v1.2 |
| 7 | **Închirieri de căruțe pentru turiști** | în Poiana Brașov: „traseu cu căruța și țuică” | v1.2 |

**Regula de aur**: economia extinsă NU se implementează înainte ca buclele de bază (furat/condus/misiuni) să fie distractive. Banii sunt un condiment, nu felul principal. B1/B2 se revizuiesc la fiecare jalon cu PO.

---

## C. Semnături & revizuire
- Revizuirea politicii: la fiecare capitol livrat (București → Mare → Munte) sau la cererea PO.
- Orice excepție de la A1–A5 se scrie explicit în raportul zilei respective, cu motiv.
