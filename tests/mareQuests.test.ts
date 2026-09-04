// Testing Agent (A24) — mare: cursa pe faleză + geometria lumii + misiunile.
import { describe, it, expect } from 'vitest';
import { falezaPlace } from '../src/game/mareQuests';
import { MARE_POS } from '../src/game/worldMare';
import { MISSIONS, M12_PESC, M12_PORT, M13_START } from '../src/game/missions';

describe('falezaPlace (cursa „Faleza nebună”)', () => {
  it('locul 1 când pescarii sunt în spate', () => {
    expect(falezaPlace([100, 150], 200)).toBe(1);
  });
  it('locul 2 cu un pescar în față', () => {
    expect(falezaPlace([100, 210], 200)).toBe(2);
  });
  it('ultimul loc când ambii au trecut', () => {
    expect(falezaPlace([205, 210], 200)).toBe(3);
  });
  it('fără rivali: locul 1', () => {
    expect(falezaPlace([], 200)).toBe(1);
  });
});

describe('geometria Constanței (worldMare)', () => {
  it('startul cursei e în VEST, finish-ul în EST (cursă spre Port)', () => {
    expect(MARE_POS.raceStart.x).toBeLessThan(MARE_POS.raceFinishX);
  });
  it('Pescărușul e pe faleză, Portul la est de el', () => {
    expect(MARE_POS.pescarus.x).toBeLessThan(MARE_POS.port.x);
    expect(Math.abs(MARE_POS.pescarus.z - 100)).toBeLessThan(60); // lângă faleză
  });
  it('autogara (intrarea) e la vest', () => {
    expect(MARE_POS.autogara.x).toBeLessThan(MARE_POS.raceStart.x + 30);
  });
});

describe('misiunile mării (date)', () => {
  it('M12 și M13 există în lista de misiuni (index 5/6)', () => {
    expect(MISSIONS[5].id).toBe('m12');
    expect(MISSIONS[6].id).toBe('m13');
    expect(MISSIONS[5].reward).toBe(250);
  });
  it('marcajele M12/M13 există și sunt pe litoral', () => {
    expect(M12_PESC.x).toBeLessThan(0); // restaurant în vest
    expect(M12_PORT.x).toBeGreaterThan(300); // port în est
    expect(M13_START.x).toBeLessThan(0); // linia de start în vest
  });
});
