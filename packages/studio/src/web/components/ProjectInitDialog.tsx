import { useState } from 'react';
import { useToast } from '../hooks/useToast';

interface ProjectInitDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function ProjectInitDialog({ open, onClose, onCreated }: ProjectInitDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState('my-project');

  const handleCreate = async () => {
    if (!name.trim()) {
      toast('error', 'Project name is required');
      return;
    }
    try {
      const res = await fetch('/api/project/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        toast('success', `Project "${name}" created`);
        onCreated();
        onClose();
      } else {
        const data = await res.json();
        toast('error', data.error || 'Failed to create project');
      }
    } catch {
      toast('error', 'Failed to create project');
    }
  };

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog__header">
          <h2>Create New Project</h2>
          <button className="dialog__close" onClick={onClose}>&times;</button>
        </div>
        <div className="dialog__body">
          <label className="dialog__field">
            <span>Project Name</span>
            <input
              type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </label>
        </div>
        <div className="dialog__footer">
          <button className="dialog__btn" onClick={onClose}>Cancel</button>
          <button className="dialog__btn dialog__btn--primary" onClick={handleCreate}>Create</button>
        </div>
      </div>
    </div>
  );
}
