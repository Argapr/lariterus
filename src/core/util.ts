// ============================================================
// Utilitas kecil bersama
// ============================================================
export const todayKey = () => new Date().toISOString().slice(0, 10);

export function hashStr(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}
