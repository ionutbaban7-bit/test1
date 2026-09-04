# Scout Report 003 — „La mare!”: Constanța (episodul 2)

**Agent:** GitHub Scout / Asset · **Data:** 2026-09-04 · **Cerere:** A21 — repere pentru
lumea „Constanța”: faleză, Cazinoul, plajă, port. Misiuni cu barca = v1 doar decor.

## Referințe (scurt)
- Cazinoul din Constanța: **Art Nouveau / Beaux-Arts**, construit 1904–1910, pe faleză,
  lângă plajă; alb cu ornamente, turle/domuri, portic — „simbolul litoralului”.
- Faleza Cazinoului: promenadă publică între oraș și mare — banda noastră de curse.
- Portul Constanța: cheiuri, macarale, containere colorate; bărcile/bacul = decor v1.

## Concluzii pentru joc (regula: „cea mai simplă care merge”)
1. **Cazinoul în low-poly**: corp alb + 4 turnulețe (cilindri) + domulețe mici + portic —
   fără vitralii/foiță de aur (buget zero, vibe retro PS2).
2. **Marea**: plan albastru + fâșii de valuri mai deschise + spumă; **barieră intermitentă**
   (obstacole 7 m cu goluri de 3 m): mașinile nu intră în apă, pietonii trec printre ele.
3. **Faleza = drumul de curse** (ca Bulevardul Unirii, dar lângă apă); plaja între faleză și
   valuri. Port în est: chei + containere + macara + „bac” decor.
4. **Misiuni cu barca**: NU în v1 (fizică nouă, vaporaș, cost) — doar decor pe apă.
   Pescărușii: 2-3 „păsări” albe pe clădiri/pier, fără AI.
5. Poliția nu urmărește la mare (alt județ 😄); cursa e „amicală”, între pescari.

## Ce construim (A22–A23)
- `src/game/worldMare.ts`: faleza cu promenadă, Cazinoul, plaja, Pescărușul Șchiop
  (restaurant cu terasă + pier), Portul cu containere + macara + bac decor, case dobrogeene.
- M12 „Coletul lui Costel” + M13 „Faleza nebună” (cursă între pescari) — `mareQuests.ts`.
- Deblocare: **biletul la mare** din M5 → tasta J ajunge și la Constanța.
