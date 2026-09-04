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
