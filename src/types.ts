/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Employee {
  id: string;
  cpf: string;
  name: string;
  email: string;
  cargo: string;
  departamento: string;
  status: 'ativo' | 'inativo';
  isAdmin: boolean;
  createdAt: string;
}

export interface Payslip {
  id: string;
  employeeId: string;
  employeeName: string;
  competence: string; // Formatting: YYYY-MM
  status: 'pendente' | 'visualizado' | 'assinado';
  fileName: string;
  fileSize: string;
  fileContent: string; // Base64 or mock PDF template
  uploadedAt: string;
  documentType?: 'holerite' | 'ponto' | 'ferias'; // Defaults to 'holerite'
  viewedAt?: string;
  signedAt?: string;
  signatureData?: {
    drawnSignature: string; // base64 PNG data URL
    timestamp: string;
    confirmedWithPassword: boolean;
    facialSelfie?: string; // base64 selfie data URL
  };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  type: 'login' | 'view' | 'download' | 'upload' | 'signature' | 'delete' | 'replace' | 'create_employee';
  employeeId?: string;
  employeeName: string;
  details: string;
}
