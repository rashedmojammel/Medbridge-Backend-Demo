// All shared enums live here (tutorial-style: no common/ folder)

export enum UserRole {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  CHW = 'CHW',
  PATIENT = 'PATIENT',
  PHARMACIST = 'PHARMACIST',
  STAFF = 'STAFF',
}

export enum TriageStatus {
  CRITICAL = 'CRITICAL',
  NON_CRITICAL = 'NON_CRITICAL',
}

export enum ConsultationStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PrescriptionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TreatmentPlanStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export enum NotificationType {
  EMERGENCY_ALERT = 'EMERGENCY_ALERT',
  PRESCRIPTION_READY = 'PRESCRIPTION_READY',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  LOW_STOCK = 'LOW_STOCK',
  ASSIGNMENT = 'ASSIGNMENT',
}

export enum StockAction {
  ADD = 'ADD',
  REDUCE = 'REDUCE',
  SET = 'SET',
}

export enum DispenseStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  DISPENSED = 'DISPENSED',
}

export enum ReferralUrgency {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum ReferralStatus {
  PENDING = 'PENDING',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum DiaryMood {
  BETTER = 'BETTER',
  SAME = 'SAME',
  WORSE = 'WORSE',
}

export enum VisitOutcome {
  ROUTINE_CHECK = 'ROUTINE_CHECK',
  TRIAGE_DONE = 'TRIAGE_DONE',
  REFERRED = 'REFERRED',
  NOT_HOME = 'NOT_HOME',
  FOLLOW_UP_NEEDED = 'FOLLOW_UP_NEEDED',
}

export enum AuditAction {
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGIN_FAILED = 'LOGIN_FAILED',
  DISPENSE = 'DISPENSE',
}
