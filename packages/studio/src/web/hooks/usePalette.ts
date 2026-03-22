import { useEffect, useState } from 'react';

interface PaletteColor {
  index: number;
  hex: string;
  name: string | null;
  group: string | null;
}

interface PaletteData {
  name: string;
  description: string;
  colors: PaletteColor[];
}

export function usePalette(paletteName: string | null) {
  const [palette, setPalette] = useState<PaletteData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!paletteName) { setPalette(null); return; }
    setLoading(true);
    fetch(`/api/palette/${paletteName}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setPalette(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [paletteName]);

  const sortColors = async (mode: string) => {
    if (!paletteName) return;
    const res = await fetch(`/api/palette/${paletteName}/sort`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    if (res.ok) setPalette(await res.json());
  };

  return { palette, loading, sortColors };
}
