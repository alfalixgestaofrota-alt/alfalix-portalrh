import { createHash } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AuditLog, Employee, Payslip } from '../types.js';

export interface CompanyDetails {
  name: string;
  cnpj: string;
  address: string;
  ie: string;
}

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConfigError';
  }
}

let supabaseClient: SupabaseClient | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new SupabaseConfigError(`Missing ${name}. Configure it in Netlify environment variables.`);
  }
  return value;
}

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const url = getRequiredEnv('SUPABASE_URL');
    const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

    supabaseClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export function hashPassword(password: string): string {
  return createHash('sha256').update(password, 'utf8').digest('hex');
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function assertNoError(error: { message?: string } | null, action: string): void {
  if (error) {
    throw new Error(`${action}: ${error.message || 'Supabase request failed'}`);
  }
}

function mapEmployee(row: any): Employee {
  return {
    id: row.id,
    cpf: row.cpf,
    name: row.name,
    email: row.email,
    cargo: row.cargo,
    departamento: row.departamento,
    status: row.status,
    isAdmin: !!row.is_admin,
    createdAt: row.created_at,
  };
}

function mapPayslip(row: any): Payslip {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    competence: row.competence,
    status: row.status,
    fileName: row.file_name,
    fileSize: row.file_size,
    fileContent: row.file_content,
    uploadedAt: row.uploaded_at,
    documentType: row.document_type || 'holerite',
    viewedAt: row.viewed_at || undefined,
    signedAt: row.signed_at || undefined,
    signatureData: row.signature_data || undefined,
  };
}

function mapLog(row: any): AuditLog {
  return {
    id: row.id,
    timestamp: row.occurred_at,
    type: row.type,
    employeeId: row.employee_id || undefined,
    employeeName: row.employee_name,
    details: row.details,
  };
}

function mapCompany(row: any): CompanyDetails {
  return {
    name: row.name,
    cnpj: row.cnpj,
    address: row.address || '',
    ie: row.ie || '',
  };
}

export const defaultCompany: CompanyDetails = {
  name: 'ALFA LIX SERVICOS E TRANSPORTE',
  cnpj: '08.698.921/0001-81',
  address: 'Embu das Artes - SP',
  ie: '',
};

export async function listEmployees(): Promise<Employee[]> {
  const { data, error } = await getSupabase()
    .from('employees')
    .select('*')
    .order('name', { ascending: true });

  assertNoError(error, 'Could not list employees');
  return (data || []).map(mapEmployee);
}

export async function findEmployeeByCpf(cpf: string): Promise<Employee | null> {
  const { data, error } = await getSupabase()
    .from('employees')
    .select('*')
    .eq('cpf_digits', cleanCPF(cpf))
    .eq('status', 'ativo')
    .maybeSingle();

  assertNoError(error, 'Could not find employee by CPF');
  return data ? mapEmployee(data) : null;
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const { data, error } = await getSupabase()
    .from('employees')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  assertNoError(error, 'Could not get employee');
  return data ? mapEmployee(data) : null;
}

export async function createEmployee(input: {
  cpf: string;
  name: string;
  email: string;
  cargo: string;
  departamento: string;
  password?: string;
  isAdmin?: boolean;
}): Promise<Employee> {
  const id = `emp-${Date.now()}`;
  const createdAt = new Date().toISOString();

  const { data, error } = await getSupabase()
    .from('employees')
    .insert({
      id,
      cpf: input.cpf,
      cpf_digits: cleanCPF(input.cpf),
      name: input.name,
      email: input.email,
      cargo: input.cargo,
      departamento: input.departamento,
      status: 'ativo',
      is_admin: !!input.isAdmin,
      created_at: createdAt,
    })
    .select()
    .single();

  assertNoError(error, 'Could not create employee');

  await setEmployeePassword(id, input.password || '123');
  return mapEmployee(data);
}

export async function employeeCpfExists(cpf: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('employees')
    .select('id')
    .eq('cpf_digits', cleanCPF(cpf))
    .maybeSingle();

  assertNoError(error, 'Could not check employee CPF');
  return !!data;
}

export async function deleteEmployee(id: string): Promise<Employee | null> {
  const employee = await getEmployee(id);
  if (!employee) {
    return null;
  }

  const { error } = await getSupabase()
    .from('employees')
    .delete()
    .eq('id', id);

  assertNoError(error, 'Could not delete employee');
  return employee;
}

export async function verifyEmployeePassword(employeeId: string, password: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('employee_passwords')
    .select('password_hash')
    .eq('employee_id', employeeId)
    .maybeSingle();

  assertNoError(error, 'Could not validate employee password');
  return (data?.password_hash || hashPassword('123')) === hashPassword(password);
}

export async function setEmployeePassword(employeeId: string, password: string): Promise<void> {
  const { error } = await getSupabase()
    .from('employee_passwords')
    .upsert({
      employee_id: employeeId,
      password_hash: hashPassword(password),
      updated_at: new Date().toISOString(),
    });

  assertNoError(error, 'Could not save employee password');
}

export async function getCompany(): Promise<CompanyDetails> {
  const { data, error } = await getSupabase()
    .from('company_profiles')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  assertNoError(error, 'Could not get company profile');
  return data ? mapCompany(data) : defaultCompany;
}

export async function updateCompany(company: CompanyDetails): Promise<CompanyDetails> {
  const { data, error } = await getSupabase()
    .from('company_profiles')
    .upsert({
      id: 'default',
      name: company.name,
      cnpj: company.cnpj,
      address: company.address || '',
      ie: company.ie || '',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  assertNoError(error, 'Could not update company profile');
  return mapCompany(data);
}

export async function listPayslips(employeeId?: string): Promise<Payslip[]> {
  let query = getSupabase()
    .from('payslips')
    .select('*')
    .order('competence', { ascending: false });

  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }

  const { data, error } = await query;
  assertNoError(error, 'Could not list payslips');
  return (data || []).map(mapPayslip);
}

export async function getPayslip(id: string): Promise<Payslip | null> {
  const { data, error } = await getSupabase()
    .from('payslips')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  assertNoError(error, 'Could not get payslip');
  return data ? mapPayslip(data) : null;
}

export async function findPayslipByDocumentKey(input: {
  employeeId: string;
  competence: string;
  documentType: string;
}): Promise<Payslip | null> {
  const { data, error } = await getSupabase()
    .from('payslips')
    .select('*')
    .eq('employee_id', input.employeeId)
    .eq('competence', input.competence)
    .eq('document_type', input.documentType)
    .maybeSingle();

  assertNoError(error, 'Could not find existing payslip');
  return data ? mapPayslip(data) : null;
}

export async function savePayslip(input: {
  id?: string;
  employeeId: string;
  employeeName: string;
  competence: string;
  status?: Payslip['status'];
  fileName: string;
  fileSize?: string;
  fileContent: string;
  documentType?: Payslip['documentType'];
  uploadedAt?: string;
  viewedAt?: string | null;
  signedAt?: string | null;
  signatureData?: Payslip['signatureData'] | null;
}): Promise<Payslip> {
  const { data, error } = await getSupabase()
    .from('payslips')
    .upsert({
      id: input.id || newId('pay'),
      employee_id: input.employeeId,
      employee_name: input.employeeName,
      competence: input.competence,
      status: input.status || 'pendente',
      file_name: input.fileName,
      file_size: input.fileSize || '180 KB',
      file_content: input.fileContent,
      document_type: input.documentType || 'holerite',
      uploaded_at: input.uploadedAt || new Date().toISOString(),
      viewed_at: input.viewedAt || null,
      signed_at: input.signedAt || null,
      signature_data: input.signatureData || null,
    })
    .select()
    .single();

  assertNoError(error, 'Could not save payslip');
  return mapPayslip(data);
}

export async function updatePayslip(
  id: string,
  updates: Partial<{
    employeeName: string;
    status: Payslip['status'];
    fileName: string;
    fileSize: string;
    fileContent: string;
    documentType: Payslip['documentType'];
    uploadedAt: string;
    viewedAt: string | null;
    signedAt: string | null;
    signatureData: Payslip['signatureData'] | null;
  }>,
): Promise<Payslip | null> {
  const row: Record<string, unknown> = {};

  if (updates.employeeName !== undefined) row.employee_name = updates.employeeName;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.fileName !== undefined) row.file_name = updates.fileName;
  if (updates.fileSize !== undefined) row.file_size = updates.fileSize;
  if (updates.fileContent !== undefined) row.file_content = updates.fileContent;
  if (updates.documentType !== undefined) row.document_type = updates.documentType;
  if (updates.uploadedAt !== undefined) row.uploaded_at = updates.uploadedAt;
  if (updates.viewedAt !== undefined) row.viewed_at = updates.viewedAt;
  if (updates.signedAt !== undefined) row.signed_at = updates.signedAt;
  if (updates.signatureData !== undefined) row.signature_data = updates.signatureData;

  const { data, error } = await getSupabase()
    .from('payslips')
    .update(row)
    .eq('id', id)
    .select()
    .maybeSingle();

  assertNoError(error, 'Could not update payslip');
  return data ? mapPayslip(data) : null;
}

export async function deletePayslip(id: string): Promise<Payslip | null> {
  const payslip = await getPayslip(id);
  if (!payslip) {
    return null;
  }

  const { error } = await getSupabase()
    .from('payslips')
    .delete()
    .eq('id', id);

  assertNoError(error, 'Could not delete payslip');
  return payslip;
}

export async function listLogs(): Promise<AuditLog[]> {
  const { data, error } = await getSupabase()
    .from('audit_logs')
    .select('*')
    .order('occurred_at', { ascending: false });

  assertNoError(error, 'Could not list audit logs');
  return (data || []).map(mapLog);
}

export async function addLog(
  type: AuditLog['type'],
  employeeId: string | undefined,
  employeeName: string,
  details: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from('audit_logs')
    .insert({
      id: newId('log'),
      occurred_at: new Date().toISOString(),
      type,
      employee_id: employeeId || null,
      employee_name: employeeName,
      details,
    });

  assertNoError(error, 'Could not add audit log');
}
