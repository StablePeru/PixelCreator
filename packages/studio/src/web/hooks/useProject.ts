import { useEffect, useState } from 'react';

interface ProjectData {
  name: string;
  canvases: string[];
  palettes: string[];
}

export function useProject() {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch('/api/project');
      if (res.ok) setProject(await res.json());
    } catch { /* offline */ }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  return { project, loading, refresh };
}
