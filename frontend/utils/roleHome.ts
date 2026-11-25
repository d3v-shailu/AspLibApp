import { Role } from "../types";

export function roleHome(role: Role | undefined | null): string {
  switch (role) {
    case "developer":
      return "/(developer)";
    case "admin":
      return "/(admin)";
    case "student":
      return "/(student)";
    default:
      return "/(auth)";
  }
}
