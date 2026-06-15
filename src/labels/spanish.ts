import type { UserRole } from "../api/types";

export const ROLE_LABEL_ES: Record<UserRole, string> = {
  SYSTEM_ADMIN: "Administrador del sistema",
  PLANT_MANAGER: "Jefe de planta",
  FIELD_OPERATOR: "Operador de campo",
  READ_ONLY: "Solo lectura",
};

export function labelRole(role: string | undefined): string {
  if (!role) return "—";
  return ROLE_LABEL_ES[role as UserRole] ?? role;
}

const SENSOR_TYPE_LABEL_ES: Record<string, string> = {
  WATER_LEVEL: "Nivel de agua",
  PRESSURE: "Presión",
  INCLINATION: "Inclinación",
  PH: "pH",
  TURBIDITY: "Turbidez",
  PLUVIOMETER: "Pluviómetro",
  water_level: "Nivel de agua",
};

export function labelSensorType(code: string | undefined): string {
  if (!code) return "—";
  return SENSOR_TYPE_LABEL_ES[code] ?? SENSOR_TYPE_LABEL_ES[code.toUpperCase()] ?? code;
}

export function labelAlertSeverity(code: string | undefined): string {
  if (!code) return "—";
  const u = code.toUpperCase();
  if (u.includes("CRIT")) return "Crítica";
  if (u.includes("WARN")) return "Advertencia";
  if (u.includes("INFO")) return "Informativa";
  return code;
}

export function labelAlertStatus(st: string | undefined): string {
  if (!st) return "—";
  const u = st.toUpperCase();
  if (u.includes("RECEIVED") || u.includes("ACTIVE") || u.includes("OPEN")) {
    return "Recibida";
  }
  if (u.includes("ACK")) return "Reconocida";
  if (u.includes("COMPLETE")) return "En gestión";
  if (u.includes("CLOSE") || u.includes("CERRAD")) return "Cerrada";
  return st;
}

export function labelAuditAction(action: string | undefined): string {
  if (!action) return "—";
  const u = action.toUpperCase().replace(/\s/g, "_");
  const map: Record<string, string> = {
    ACKNOWLEDGED: "Reconocimiento",
    ACKNOWLEDGE: "Reconocimiento",
    ASSIGN: "Asignación",
    COMPLETE: "Completar gestión",
    CLOSE: "Cierre",
    CREATED: "Alta",
    CREATE: "Alta",
    UPDATE: "Actualización",
  };
  return map[u] ?? action;
}

export function labelRoundStatus(s: string | undefined): string {
  if (!s) return "—";
  const u = s.toUpperCase().replace(/-/g, "_");
  const map: Record<string, string> = {
    PENDING: "Pendiente",
    SCHEDULED: "Programada",
    IN_PROGRESS: "En curso",
    COMPLETED: "Completada",
    SYNCED: "Sincronizada",
    CANCELLED: "Cancelada",
  };
  return map[u] ?? s;
}

export function labelAssignableUser(u: {
  fullName: string;
  email: string;
}): string {
  return `${u.fullName} (${u.email})`;
}

export function shortId(id: string | undefined): string {
  if (!id) return "—";
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}
