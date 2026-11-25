export const colors = {
  bgDeep: "#0F172A",
  bgPurple: "#1E1B4B",
  bgBlue: "#312E81",
  purple: "#7C3AED",
  cyan: "#06B6D4",
  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
  gray: "#6B7280",
  white: "#FFFFFF",
  white70: "rgba(255,255,255,0.7)",
  white50: "rgba(255,255,255,0.5)",
  white30: "rgba(255,255,255,0.3)",
  glassBorder: "rgba(255,255,255,0.15)",
  glassFill: "rgba(255,255,255,0.08)",
};

export const radius = { sm: 12, md: 20, lg: 24 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const statusColors: Record<string, string> = {
  booked: colors.cyan,
  checked_in: colors.green,
  completed: colors.purple,
  no_show: colors.red,
  cancelled: colors.gray,
  available: colors.green,
  maintenance: colors.gray,
  active: colors.green,
  suspended: colors.red,
  archived: colors.gray,
  blocked: colors.red,
};

export const gradients = {
  bg: [colors.bgPurple, colors.bgBlue, colors.bgDeep] as const,
  primary: [colors.purple, "#5B21B6"] as const,
  secondary: [colors.cyan, "#0E7490"] as const,
  danger: [colors.red, "#B91C1C"] as const,
  success: [colors.green, "#047857"] as const,
};
