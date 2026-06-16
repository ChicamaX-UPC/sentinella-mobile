export type UserRole =
  | "SYSTEM_ADMIN"
  | "PLANT_MANAGER"
  | "FIELD_OPERATOR"
  | "READ_ONLY";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tailingDamIds: string[];
  active: boolean;
  permissions?: string[];
  lastLogin?: string;
};

export type AuthSession = {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: SessionUser;
};

export type FieldKpi = {
  activeAlerts?: number;
  roundsInProgress?: number;
  pendingSyncRounds?: number;
  sensorsOutOfRange?: number;
  lastIncidentAt?: string | null;
};

export type RelaveResource = {
  id: string;
  name: string;
  tailingDamId: string;
};

export type SensorReading = {
  id: string;
  nodeId: string;
  timestamp?: string;
  sensorType?: string;
  value?: number | string;
  unit?: string;
  status?: string;
};

export type SensorNode = {
  id: string;
  name: string;
  externalId?: string;
  tailingDamId?: string;
  sensorType?: string;
  status?: string;
  lastSeen?: string;
  latitude?: number;
  longitude?: number;
  position3d?: string;
};

export type AlertRow = {
  id: string;
  status: string;
  severity?: string;
  nodeId?: string;
  sensorType?: string;
  triggeredValue?: string | number;
  resolutionNotes?: string | null;
};

export type AlertDetail = AlertRow & {
  ruleId?: string;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  assignedTo?: string | null;
  closedBy?: string | null;
  closedAt?: string | null;
};

export type AuditRow = {
  id: string;
  action: string;
  actorRole?: string;
  actorId?: string;
  notes?: string | null;
  timestamp: string;
};

export type ChecklistItem = {
  id: string;
  pointName: string;
  required?: boolean;
  completedAt?: string | null;
  observations?: string | null;
  photoS3Key?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  anomaly?: boolean;
};

export type Round = {
  id: string;
  status: string;
  operatorId?: string;
  tailingDamId?: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string | null;
  offlineCreated?: boolean;
  syncedAt?: string | null;
  checklistItems: ChecklistItem[];
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type NodeRow = {
  id: string;
  alias?: string;
  name?: string;
  tailingDamId?: string;
};

export type AssignableUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
};
