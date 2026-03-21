let counter = 0;

export function generateId(prefix: string): string {
  counter++;
  const timestamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${timestamp}${rand}`;
}

export function generateSequentialId(prefix: string, index: number): string {
  return `${prefix}-${String(index).padStart(3, '0')}`;
}
