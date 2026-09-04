// Persistență locală cross-platform: browser (localStorage) vs desktop
// (Electron preload → fișier JSON în userData). Jocul nu depinde de platformă:
// folosește doar loadSaveRaw()/storeSaveRaw().

const LS_KEY = 'bv_save_v1';

interface DesktopBridge {
  loadSave: () => string | null;
  storeSave: (raw: string) => boolean;
}

function desktopBridge(): DesktopBridge | null {
  try {
    const w = window as unknown as { bvDesktop?: DesktopBridge };
    if (w.bvDesktop && typeof w.bvDesktop.loadSave === 'function') return w.bvDesktop;
  } catch {
    /* browser normal */
  }
  return null;
}

export function loadSaveRaw(): string | null {
  const d = desktopBridge();
  if (d) {
    try {
      const v = d.loadSave();
      if (v) return v;
    } catch {
      /* trecem la localStorage */
    }
  }
  try {
    return localStorage.getItem(LS_KEY);
  } catch {
    return null;
  }
}

export function storeSaveRaw(raw: string): void {
  const d = desktopBridge();
  if (d) {
    try {
      d.storeSave(raw);
      return;
    } catch {
      /* trecem la localStorage */
    }
  }
  try {
    localStorage.setItem(LS_KEY, raw);
  } catch {
    /* fara salvare */
  }
}
