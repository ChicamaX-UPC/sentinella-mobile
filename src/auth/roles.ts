import type { UserRole } from "@/api/types";

export const MOBILE_APP_ROLE: UserRole = "FIELD_OPERATOR";

export function canUseMobileApp(role: UserRole | undefined): boolean {
  return role === MOBILE_APP_ROLE;
}
