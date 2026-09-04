// Misiunile demo-ului de fundatie (Ziua 1) — date, nu logica. Logica sta in main.ts.
// In fazele urmatoare acestea devin JSON-uri in assets/missions/.

export interface MarkerDef {
  x: number;
  z: number;
  label: string;
}

export interface MissionDef {
  id: string;
  name: string;
  desc: string;
  reward: number;
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'm1',
    name: 'M1 · „Împrumut de la Bătrână”',
    desc: 'Tutorial: intră în mașină (E), pornește (W) și du-te cu ea până la capătul Bulevardului Unirii, spre est.',
    reward: 150,
  },
  {
    id: 'm2',
    name: 'M2 · „Mici sub asediu”',
    desc: 'La Obor, băieții răi vor rețeta secretă de mici. Curăță zona — ai „Portofelul” la tine, trage cu mouse-ul.',
    reward: 500,
  },
  {
    id: 'm3',
    name: 'M3 · „Noaptea Unirii”',
    desc: 'Cursă pe Bulevard contra a 3 rivali. Apasă E la linia roșie din capătul vestic, cu orice mașină.',
    reward: 400,
  },
  {
    id: 'm4',
    name: 'M4 · „Selfie la Palat”',
    desc: 'Pozează Palatul pe furiș (E la punctul mov de pe esplanadă), apoi fugi cu Șpagă 3 până la garajul din Piața Unirii.',
    reward: 200,
  },
  {
    id: 'm5',
    name: 'M5 · „Datoria”',
    desc: 'Nea Costel te trimite la mare… dar mai întâi trebuie să fugi de Comisarul Dobre până la Autogara de Est.',
    reward: 800,
  },
];

export const M1_CAR_MARKER: MarkerDef = { x: -120, z: -178, label: 'Mașina ta (Dacia Bătrâna)' };
export const M1_END_MARKER: MarkerDef = { x: 330, z: -192, label: 'Capătul Bulevardului' };
export const M2_MARKER: MarkerDef = { x: 196, z: -240, label: 'Obor — tarabele cu mici' };
export const FIGHT_SPAWN: { x: number; z: number }[] = [
  { x: 150, z: -245 },
  { x: 196, z: -230 },
  { x: 176, z: -262 },
  { x: 228, z: -246 },
  { x: 140, z: -232 },
];

// --- M4 „Selfie la Palat”: coordonate pe esplanada Palatului ---
export const M4_APPROACH: MarkerDef = { x: -250, z: -248, label: 'Palatul „Divizia Betoane”' };
export const M4_SPOT = { x: -302, z: -288 };
export const M4_GARAGE = { x: -118, z: -176, r: 10 };

// --- M5 „Datoria”: Nea Costel în Centrul Vechi, evadarea la Autogara de Est ---
export const M5_SPOT: MarkerDef = { x: 64, z: -60, label: 'Nea Costel — fântâna din Centrul Vechi' };
export const M5_GATE = { x: 302, z: -192, bandZ: 46 };
export const M5_GATE_MARKER: MarkerDef = { x: 330, z: -192, label: 'Autogara de Est — biletul la mare' };
