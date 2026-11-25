/** System-generated default password preview, e.g. "Lib@A7F3C9" (server generates the real one). */
export function generateDefaultPassword(): string {
  const chars = "ABCDEF0123456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `Lib@${out}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^\+?[\d\s-]{7,15}$/.test(phone);
}

export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Weak", "Weak", "Good", "Strong"];
  const colorsList = ["#EF4444", "#EF4444", "#F59E0B", "#10B981"];
  return { score: score as 0 | 1 | 2 | 3, label: labels[score], color: colorsList[score] };
}

export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(t?: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}
