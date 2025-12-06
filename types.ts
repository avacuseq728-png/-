export enum Role {
  DOCTOR = 'DOCTOR',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  username: string;
  role: Role;
  clinicName: string;
}

export interface MetricRule {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
}

export interface DrgRule {
  id: string;
  diseaseName: string;
  drgCode: string;
  maxCost: number;
  requiredMetrics: MetricRule[];
  isActive: boolean;
}

export interface PatientRecord {
  id: string;
  recordDate: string; // ISO String
  doctorName: string;
  clinicName: string;
  patientName: string;
  patientId: string; // ID Card or similar
  age: number;
  gender: string;
  ethnicity: string;      // New field
  contactNumber: string;
  allergyHistory: string; // New field
  pastMedicalHistory: string; // New field
  diseaseId: string;
  diseaseName: string;
  metrics: Record<string, number>;
  totalCost: number;
  status: 'COMPLIANT' | 'FLAGGED';
  validationMessages: string[];
}

export interface ValidationResult {
  isValid: boolean;
  messages: string[];
}