import {
  SupabaseConfigError,
  addLog,
  createEmployee,
  deleteEmployee,
  deletePayslip,
  employeeCpfExists,
  findEmployeeByCpf,
  findPayslipByDocumentKey,
  getCompany,
  getEmployee,
  getPayslip,
  listEmployees,
  listLogs,
  listPayslips,
  savePayslip,
  updateCompany,
  updatePayslip,
  verifyEmployeePassword,
} from './db.js';
import type { AuditLog, Payslip } from '../types.js';

export interface ApiRequest {
  method: string;
  path: string;
  body?: any;
  query?: Record<string, unknown>;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

function json(status: number, body: unknown): ApiResponse {
  return { status, body };
}

function getQueryValue(query: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = query?.[key];
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : undefined;
  }
  return value === undefined || value === null ? undefined : String(value);
}

function normalizePath(path: string): string[] {
  return path
    .replace(/^\/\.netlify\/functions\/api/, '/api')
    .replace(/^\/api/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);
}

function documentTypeDescription(documentType?: Payslip['documentType']): string {
  if (documentType === 'ponto') return 'folha de ponto';
  if (documentType === 'ferias') return 'recibo de ferias';
  return 'holerite';
}

async function handleLogin(body: any): Promise<ApiResponse> {
  const { cpf, password } = body || {};
  if (!cpf || !password) {
    return json(400, { error: 'CPF e senha sao obrigatorios.' });
  }

  const employee = await findEmployeeByCpf(cpf);
  if (!employee) {
    return json(401, { error: 'Colaborador nao encontrado ou inativo.' });
  }

  const validPassword = await verifyEmployeePassword(employee.id, password);
  if (!validPassword) {
    return json(401, { error: 'Senha incorreta.' });
  }

  await addLog('login', employee.id, employee.name, 'Acessou o portal');
  return json(200, { user: employee });
}

async function handleValidatePassword(body: any): Promise<ApiResponse> {
  const { employeeId, password } = body || {};
  if (!employeeId || !password) {
    return json(400, { error: 'Parametros insuficientes.' });
  }

  const validPassword = await verifyEmployeePassword(employeeId, password);
  if (!validPassword) {
    return json(401, { error: 'Senha incorreta.' });
  }

  return json(200, { success: true });
}

async function handleCreateEmployee(body: any): Promise<ApiResponse> {
  const { cpf, name, email, cargo, departamento, password, isAdmin } = body || {};

  if (!cpf || !name || !email || !cargo || !departamento) {
    return json(400, { error: 'Preencha todos os campos obrigatorios.' });
  }

  if (await employeeCpfExists(cpf)) {
    return json(400, { error: 'Este CPF ja esta cadastrado.' });
  }

  const employee = await createEmployee({
    cpf,
    name,
    email,
    cargo,
    departamento,
    password,
    isAdmin,
  });

  const roleText = employee.isAdmin ? 'administrador' : 'colaborador';
  await addLog('create_employee', undefined, 'RH Admin', `Cadastrou o ${roleText} ${name} (${cargo})`);

  return json(201, employee);
}

async function handleDeleteEmployee(id: string): Promise<ApiResponse> {
  const removedEmployee = await deleteEmployee(id);
  if (!removedEmployee) {
    return json(404, { error: 'Colaborador nao encontrado.' });
  }

  await addLog(
    'delete',
    undefined,
    'RH Admin',
    `Excluiu o colaborador ${removedEmployee.name} (${removedEmployee.cargo}) e todos os seus holerites`,
  );

  return json(200, { success: true, message: 'Colaborador e holerites excluidos com sucesso.' });
}

async function handleGetEmployeeProfile(id: string): Promise<ApiResponse> {
  const employee = await getEmployee(id);
  if (!employee) {
    return json(404, { error: 'Colaborador nao encontrado.' });
  }

  const payslips = await listPayslips(id);
  return json(200, { employee, payslips });
}

async function handleUpdateCompany(body: any): Promise<ApiResponse> {
  const { name, cnpj, address, ie } = body || {};

  if (!name || !cnpj) {
    return json(400, { error: 'Nome e CNPJ da empresa sao obrigatorios.' });
  }

  const company = await updateCompany({
    name,
    cnpj,
    address: address || '',
    ie: ie || '',
  });

  await addLog('upload', undefined, 'RH Admin', `Configuracoes de dados da empresa atualizadas: ${name}`);
  return json(200, company);
}

async function handleCreatePayslip(body: any): Promise<ApiResponse> {
  const { employeeId, competence, fileName, fileSize, fileContent, documentType } = body || {};

  if (!employeeId || !competence || !fileName || !fileContent) {
    return json(400, { error: 'Faltam dados para envio do arquivo.' });
  }

  const employee = await getEmployee(employeeId);
  if (!employee) {
    return json(404, { error: 'Colaborador nao encontrado.' });
  }

  const docType = documentType || 'holerite';
  const existing = await findPayslipByDocumentKey({
    employeeId,
    competence,
    documentType: docType,
  });

  const payslip = await savePayslip({
    id: existing?.id,
    employeeId,
    employeeName: employee.name,
    competence,
    status: 'pendente',
    fileName,
    fileSize,
    fileContent,
    documentType: docType,
    uploadedAt: new Date().toISOString(),
  });

  const docDescription = documentTypeDescription(docType);
  if (existing) {
    await addLog('replace', employeeId, 'RH Admin', `Substituiu o ${docDescription} de ${employee.name} - ${competence}`);
  } else {
    await addLog('upload', employeeId, 'RH Admin', `Enviou novo ${docDescription} para ${employee.name} - ${competence}`);
  }

  return json(201, payslip);
}

async function handleReplacePayslip(id: string, body: any): Promise<ApiResponse> {
  const oldPayslip = await getPayslip(id);
  if (!oldPayslip) {
    return json(404, { error: 'Documento nao encontrado.' });
  }

  const { fileName, fileSize, fileContent, documentType } = body || {};
  const updated = await updatePayslip(id, {
    status: 'pendente',
    fileName: fileName || oldPayslip.fileName,
    fileSize: fileSize || oldPayslip.fileSize,
    fileContent: fileContent || oldPayslip.fileContent,
    documentType: documentType || oldPayslip.documentType || 'holerite',
    uploadedAt: new Date().toISOString(),
    viewedAt: null,
    signedAt: null,
    signatureData: null,
  });

  if (!updated) {
    return json(404, { error: 'Documento nao encontrado.' });
  }

  const docDescription = documentTypeDescription(oldPayslip.documentType);
  await addLog(
    'replace',
    oldPayslip.employeeId,
    'RH Admin',
    `Substituiu o ${docDescription} de ${oldPayslip.employeeName} - ${oldPayslip.competence}`,
  );

  return json(200, updated);
}

async function handleDeletePayslip(id: string): Promise<ApiResponse> {
  const removed = await deletePayslip(id);
  if (!removed) {
    return json(404, { error: 'Documento nao encontrado.' });
  }

  const docDescription = documentTypeDescription(removed.documentType);
  await addLog('delete', removed.employeeId, 'RH Admin', `Excluiu o ${docDescription} de ${removed.employeeName} - ${removed.competence}`);

  return json(200, { success: true, message: 'Documento excluido com sucesso.' });
}

async function handleViewPayslip(id: string, body: any): Promise<ApiResponse> {
  const { employeeId } = body || {};
  const payslip = await getPayslip(id);
  if (!payslip) {
    return json(404, { error: 'Holerite nao encontrado.' });
  }

  let status = payslip.status;
  let updated = false;
  if (payslip.status === 'pendente') {
    const updatedPayslip = await updatePayslip(id, {
      status: 'visualizado',
      viewedAt: new Date().toISOString(),
    });
    status = updatedPayslip?.status || 'visualizado';
    updated = true;
  }

  if (employeeId === payslip.employeeId) {
    await addLog('view', payslip.employeeId, payslip.employeeName, `Visualizou o holerite da competencia ${payslip.competence}`);
  }

  return json(200, { success: true, status, updated });
}

async function handleSignPayslip(id: string, body: any): Promise<ApiResponse> {
  const { employeeId, drawnSignature, password, facialSelfie } = body || {};

  if (!employeeId || !drawnSignature || !password) {
    return json(400, { error: 'Faltam dados para conclusao da assinatura.' });
  }

  const payslip = await getPayslip(id);
  if (!payslip) {
    return json(404, { error: 'Holerite nao encontrado.' });
  }

  if (payslip.employeeId !== employeeId) {
    return json(403, { error: 'Voce nao tem permissao para assinar este documento.' });
  }

  const validPassword = await verifyEmployeePassword(employeeId, password);
  if (!validPassword) {
    return json(401, { error: 'Senha incorreta para assinatura.' });
  }

  const now = new Date().toISOString();
  const updated = await updatePayslip(id, {
    status: 'assinado',
    signedAt: now,
    viewedAt: payslip.viewedAt || now,
    signatureData: {
      drawnSignature,
      timestamp: now,
      confirmedWithPassword: true,
      facialSelfie: facialSelfie || undefined,
    },
  });

  if (!updated) {
    return json(404, { error: 'Holerite nao encontrado.' });
  }

  const extraMessage = facialSelfie ? ' com validacao fotografica facial' : '';
  const docDescription = payslip.documentType === 'ponto'
    ? 'a folha de ponto'
    : payslip.documentType === 'ferias'
      ? 'o recibo de ferias'
      : 'o holerite';

  await addLog(
    'signature',
    payslip.employeeId,
    payslip.employeeName,
    `Assinou digitalmente ${docDescription} da competencia ${payslip.competence}${extraMessage}`,
  );

  return json(200, { success: true, pay: updated });
}

async function handleDownloadLog(id: string, body: any): Promise<ApiResponse> {
  const { employeeId, requesterName } = body || {};
  const payslip = await getPayslip(id);
  if (!payslip) {
    return json(404, { error: 'Holerite nao encontrado.' });
  }

  await addLog(
    'download',
    employeeId || payslip.employeeId,
    requesterName || payslip.employeeName,
    `Baixou o PDF do ${documentTypeDescription(payslip.documentType)} - ${payslip.competence}`,
  );

  return json(200, { success: true });
}

export async function handleApiRequest(request: ApiRequest): Promise<ApiResponse> {
  const method = request.method.toUpperCase();
  const segments = normalizePath(request.path);

  try {
    if (method === 'OPTIONS') {
      return json(204, null);
    }

    if (segments[0] === 'auth' && segments[1] === 'login' && method === 'POST') {
      return await handleLogin(request.body);
    }

    if (segments[0] === 'auth' && segments[1] === 'validate-password' && method === 'POST') {
      return await handleValidatePassword(request.body);
    }

    if (segments[0] === 'employees' && segments.length === 1 && method === 'GET') {
      return json(200, await listEmployees());
    }

    if (segments[0] === 'employees' && segments.length === 1 && method === 'POST') {
      return await handleCreateEmployee(request.body);
    }

    if (segments[0] === 'employees' && segments[1] && segments.length === 2 && method === 'GET') {
      return await handleGetEmployeeProfile(segments[1]);
    }

    if (segments[0] === 'employees' && segments[1] && segments.length === 2 && method === 'DELETE') {
      return await handleDeleteEmployee(segments[1]);
    }

    if (segments[0] === 'company' && segments.length === 1 && method === 'GET') {
      return json(200, await getCompany());
    }

    if (segments[0] === 'company' && segments.length === 1 && method === 'PUT') {
      return await handleUpdateCompany(request.body);
    }

    if (segments[0] === 'payslips' && segments.length === 1 && method === 'GET') {
      return json(200, await listPayslips(getQueryValue(request.query, 'employeeId')));
    }

    if (segments[0] === 'payslips' && segments.length === 1 && method === 'POST') {
      return await handleCreatePayslip(request.body);
    }

    if (segments[0] === 'payslips' && segments[1] && segments.length === 2 && method === 'GET') {
      const payslip = await getPayslip(segments[1]);
      return payslip ? json(200, payslip) : json(404, { error: 'Holerite nao encontrado.' });
    }

    if (segments[0] === 'payslips' && segments[1] && segments.length === 2 && method === 'PUT') {
      return await handleReplacePayslip(segments[1], request.body);
    }

    if (segments[0] === 'payslips' && segments[1] && segments.length === 2 && method === 'DELETE') {
      return await handleDeletePayslip(segments[1]);
    }

    if (segments[0] === 'payslips' && segments[1] && segments[2] === 'view' && method === 'POST') {
      return await handleViewPayslip(segments[1], request.body);
    }

    if (segments[0] === 'payslips' && segments[1] && segments[2] === 'sign' && method === 'POST') {
      return await handleSignPayslip(segments[1], request.body);
    }

    if (segments[0] === 'payslips' && segments[1] && segments[2] === 'download' && method === 'POST') {
      return await handleDownloadLog(segments[1], request.body);
    }

    if (segments[0] === 'logs' && segments.length === 1 && method === 'GET') {
      const logs: AuditLog[] = await listLogs();
      return json(200, logs);
    }

    return json(404, { error: 'Rota nao encontrada.' });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return json(500, {
        error: 'Supabase nao configurado.',
        details: error.message,
      });
    }

    console.error(error);
    return json(500, {
      error: 'Erro interno ao acessar o banco de dados.',
    });
  }
}
