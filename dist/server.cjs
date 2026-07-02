var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_dotenv = __toESM(require("dotenv"), 1);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");

// src/server/db.ts
var import_crypto = require("crypto");
var import_supabase_js = require("@supabase/supabase-js");
var SupabaseConfigError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "SupabaseConfigError";
  }
};
var supabaseClient = null;
function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new SupabaseConfigError(`Missing ${name}. Configure it in Netlify environment variables.`);
  }
  return value;
}
function getSupabase() {
  if (!supabaseClient) {
    const url = getRequiredEnv("SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    supabaseClient = (0, import_supabase_js.createClient)(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return supabaseClient;
}
function cleanCPF(cpf) {
  return cpf.replace(/\D/g, "");
}
function hashPassword(password) {
  return (0, import_crypto.createHash)("sha256").update(password, "utf8").digest("hex");
}
function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function assertNoError(error, action) {
  if (error) {
    throw new Error(`${action}: ${error.message || "Supabase request failed"}`);
  }
}
function mapEmployee(row) {
  return {
    id: row.id,
    cpf: row.cpf,
    name: row.name,
    email: row.email,
    cargo: row.cargo,
    departamento: row.departamento,
    status: row.status,
    isAdmin: !!row.is_admin,
    createdAt: row.created_at
  };
}
function mapPayslip(row) {
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
    documentType: row.document_type || "holerite",
    viewedAt: row.viewed_at || void 0,
    signedAt: row.signed_at || void 0,
    signatureData: row.signature_data || void 0
  };
}
function mapLog(row) {
  return {
    id: row.id,
    timestamp: row.occurred_at,
    type: row.type,
    employeeId: row.employee_id || void 0,
    employeeName: row.employee_name,
    details: row.details
  };
}
function mapCompany(row) {
  return {
    name: row.name,
    cnpj: row.cnpj,
    address: row.address || "",
    ie: row.ie || ""
  };
}
var defaultCompany = {
  name: "ALFA LIX SERVICOS E TRANSPORTE",
  cnpj: "08.698.921/0001-81",
  address: "Embu das Artes - SP",
  ie: ""
};
async function listEmployees() {
  const { data, error } = await getSupabase().from("employees").select("*").order("name", { ascending: true });
  assertNoError(error, "Could not list employees");
  return (data || []).map(mapEmployee);
}
async function findEmployeeByCpf(cpf) {
  const { data, error } = await getSupabase().from("employees").select("*").eq("cpf_digits", cleanCPF(cpf)).eq("status", "ativo").maybeSingle();
  assertNoError(error, "Could not find employee by CPF");
  return data ? mapEmployee(data) : null;
}
async function getEmployee(id) {
  const { data, error } = await getSupabase().from("employees").select("*").eq("id", id).maybeSingle();
  assertNoError(error, "Could not get employee");
  return data ? mapEmployee(data) : null;
}
async function createEmployee(input) {
  const id = `emp-${Date.now()}`;
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const { data, error } = await getSupabase().from("employees").insert({
    id,
    cpf: input.cpf,
    cpf_digits: cleanCPF(input.cpf),
    name: input.name,
    email: input.email,
    cargo: input.cargo,
    departamento: input.departamento,
    status: "ativo",
    is_admin: !!input.isAdmin,
    created_at: createdAt
  }).select().single();
  assertNoError(error, "Could not create employee");
  await setEmployeePassword(id, input.password || "123");
  return mapEmployee(data);
}
async function employeeCpfExists(cpf) {
  const { data, error } = await getSupabase().from("employees").select("id").eq("cpf_digits", cleanCPF(cpf)).maybeSingle();
  assertNoError(error, "Could not check employee CPF");
  return !!data;
}
async function deleteEmployee(id) {
  const employee = await getEmployee(id);
  if (!employee) {
    return null;
  }
  const { error } = await getSupabase().from("employees").delete().eq("id", id);
  assertNoError(error, "Could not delete employee");
  return employee;
}
async function verifyEmployeePassword(employeeId, password) {
  const { data, error } = await getSupabase().from("employee_passwords").select("password_hash").eq("employee_id", employeeId).maybeSingle();
  assertNoError(error, "Could not validate employee password");
  return (data?.password_hash || hashPassword("123")) === hashPassword(password);
}
async function setEmployeePassword(employeeId, password) {
  const { error } = await getSupabase().from("employee_passwords").upsert({
    employee_id: employeeId,
    password_hash: hashPassword(password),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  assertNoError(error, "Could not save employee password");
}
async function getCompany() {
  const { data, error } = await getSupabase().from("company_profiles").select("*").eq("id", "default").maybeSingle();
  assertNoError(error, "Could not get company profile");
  return data ? mapCompany(data) : defaultCompany;
}
async function updateCompany(company) {
  const { data, error } = await getSupabase().from("company_profiles").upsert({
    id: "default",
    name: company.name,
    cnpj: company.cnpj,
    address: company.address || "",
    ie: company.ie || "",
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).select().single();
  assertNoError(error, "Could not update company profile");
  return mapCompany(data);
}
async function listPayslips(employeeId) {
  let query = getSupabase().from("payslips").select("*").order("competence", { ascending: false });
  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }
  const { data, error } = await query;
  assertNoError(error, "Could not list payslips");
  return (data || []).map(mapPayslip);
}
async function getPayslip(id) {
  const { data, error } = await getSupabase().from("payslips").select("*").eq("id", id).maybeSingle();
  assertNoError(error, "Could not get payslip");
  return data ? mapPayslip(data) : null;
}
async function findPayslipByDocumentKey(input) {
  const { data, error } = await getSupabase().from("payslips").select("*").eq("employee_id", input.employeeId).eq("competence", input.competence).eq("document_type", input.documentType).maybeSingle();
  assertNoError(error, "Could not find existing payslip");
  return data ? mapPayslip(data) : null;
}
async function savePayslip(input) {
  const { data, error } = await getSupabase().from("payslips").upsert({
    id: input.id || newId("pay"),
    employee_id: input.employeeId,
    employee_name: input.employeeName,
    competence: input.competence,
    status: input.status || "pendente",
    file_name: input.fileName,
    file_size: input.fileSize || "180 KB",
    file_content: input.fileContent,
    document_type: input.documentType || "holerite",
    uploaded_at: input.uploadedAt || (/* @__PURE__ */ new Date()).toISOString(),
    viewed_at: input.viewedAt || null,
    signed_at: input.signedAt || null,
    signature_data: input.signatureData || null
  }).select().single();
  assertNoError(error, "Could not save payslip");
  return mapPayslip(data);
}
async function updatePayslip(id, updates) {
  const row = {};
  if (updates.employeeName !== void 0) row.employee_name = updates.employeeName;
  if (updates.status !== void 0) row.status = updates.status;
  if (updates.fileName !== void 0) row.file_name = updates.fileName;
  if (updates.fileSize !== void 0) row.file_size = updates.fileSize;
  if (updates.fileContent !== void 0) row.file_content = updates.fileContent;
  if (updates.uploadedAt !== void 0) row.uploaded_at = updates.uploadedAt;
  if (updates.viewedAt !== void 0) row.viewed_at = updates.viewedAt;
  if (updates.signedAt !== void 0) row.signed_at = updates.signedAt;
  if (updates.signatureData !== void 0) row.signature_data = updates.signatureData;
  const { data, error } = await getSupabase().from("payslips").update(row).eq("id", id).select().maybeSingle();
  assertNoError(error, "Could not update payslip");
  return data ? mapPayslip(data) : null;
}
async function deletePayslip(id) {
  const payslip = await getPayslip(id);
  if (!payslip) {
    return null;
  }
  const { error } = await getSupabase().from("payslips").delete().eq("id", id);
  assertNoError(error, "Could not delete payslip");
  return payslip;
}
async function listLogs() {
  const { data, error } = await getSupabase().from("audit_logs").select("*").order("occurred_at", { ascending: false });
  assertNoError(error, "Could not list audit logs");
  return (data || []).map(mapLog);
}
async function addLog(type, employeeId, employeeName, details) {
  const { error } = await getSupabase().from("audit_logs").insert({
    id: newId("log"),
    occurred_at: (/* @__PURE__ */ new Date()).toISOString(),
    type,
    employee_id: employeeId || null,
    employee_name: employeeName,
    details
  });
  assertNoError(error, "Could not add audit log");
}

// src/server/api.ts
function json(status, body) {
  return { status, body };
}
function getQueryValue(query, key) {
  const value = query?.[key];
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : void 0;
  }
  return value === void 0 || value === null ? void 0 : String(value);
}
function normalizePath(path2) {
  return path2.replace(/^\/\.netlify\/functions\/api/, "/api").replace(/^\/api/, "").split("/").filter(Boolean).map(decodeURIComponent);
}
function documentTypeDescription(documentType) {
  if (documentType === "ponto") return "folha de ponto";
  if (documentType === "ferias") return "recibo de ferias";
  return "holerite";
}
async function handleLogin(body) {
  const { cpf, password } = body || {};
  if (!cpf || !password) {
    return json(400, { error: "CPF e senha sao obrigatorios." });
  }
  const employee = await findEmployeeByCpf(cpf);
  if (!employee) {
    return json(401, { error: "Colaborador nao encontrado ou inativo." });
  }
  const validPassword = await verifyEmployeePassword(employee.id, password);
  if (!validPassword) {
    return json(401, { error: "Senha incorreta." });
  }
  await addLog("login", employee.id, employee.name, "Acessou o portal");
  return json(200, { user: employee });
}
async function handleValidatePassword(body) {
  const { employeeId, password } = body || {};
  if (!employeeId || !password) {
    return json(400, { error: "Parametros insuficientes." });
  }
  const validPassword = await verifyEmployeePassword(employeeId, password);
  if (!validPassword) {
    return json(401, { error: "Senha incorreta." });
  }
  return json(200, { success: true });
}
async function handleCreateEmployee(body) {
  const { cpf, name, email, cargo, departamento, password, isAdmin } = body || {};
  if (!cpf || !name || !email || !cargo || !departamento) {
    return json(400, { error: "Preencha todos os campos obrigatorios." });
  }
  if (await employeeCpfExists(cpf)) {
    return json(400, { error: "Este CPF ja esta cadastrado." });
  }
  const employee = await createEmployee({
    cpf,
    name,
    email,
    cargo,
    departamento,
    password,
    isAdmin
  });
  const roleText = employee.isAdmin ? "administrador" : "colaborador";
  await addLog("create_employee", void 0, "RH Admin", `Cadastrou o ${roleText} ${name} (${cargo})`);
  return json(201, employee);
}
async function handleDeleteEmployee(id) {
  const removedEmployee = await deleteEmployee(id);
  if (!removedEmployee) {
    return json(404, { error: "Colaborador nao encontrado." });
  }
  await addLog(
    "delete",
    void 0,
    "RH Admin",
    `Excluiu o colaborador ${removedEmployee.name} (${removedEmployee.cargo}) e todos os seus holerites`
  );
  return json(200, { success: true, message: "Colaborador e holerites excluidos com sucesso." });
}
async function handleGetEmployeeProfile(id) {
  const employee = await getEmployee(id);
  if (!employee) {
    return json(404, { error: "Colaborador nao encontrado." });
  }
  const payslips = await listPayslips(id);
  return json(200, { employee, payslips });
}
async function handleUpdateCompany(body) {
  const { name, cnpj, address, ie } = body || {};
  if (!name || !cnpj) {
    return json(400, { error: "Nome e CNPJ da empresa sao obrigatorios." });
  }
  const company = await updateCompany({
    name,
    cnpj,
    address: address || "",
    ie: ie || ""
  });
  await addLog("upload", void 0, "RH Admin", `Configuracoes de dados da empresa atualizadas: ${name}`);
  return json(200, company);
}
async function handleCreatePayslip(body) {
  const { employeeId, competence, fileName, fileSize, fileContent, documentType } = body || {};
  if (!employeeId || !competence || !fileName || !fileContent) {
    return json(400, { error: "Faltam dados para envio do arquivo." });
  }
  const employee = await getEmployee(employeeId);
  if (!employee) {
    return json(404, { error: "Colaborador nao encontrado." });
  }
  const docType = documentType || "holerite";
  const existing = await findPayslipByDocumentKey({
    employeeId,
    competence,
    documentType: docType
  });
  const payslip = await savePayslip({
    id: existing?.id,
    employeeId,
    employeeName: employee.name,
    competence,
    status: "pendente",
    fileName,
    fileSize,
    fileContent,
    documentType: docType,
    uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  const docDescription = documentTypeDescription(docType);
  if (existing) {
    await addLog("replace", employeeId, "RH Admin", `Substituiu o ${docDescription} de ${employee.name} - ${competence}`);
  } else {
    await addLog("upload", employeeId, "RH Admin", `Enviou novo ${docDescription} para ${employee.name} - ${competence}`);
  }
  return json(201, payslip);
}
async function handleReplacePayslip(id, body) {
  const oldPayslip = await getPayslip(id);
  if (!oldPayslip) {
    return json(404, { error: "Documento nao encontrado." });
  }
  const { fileName, fileSize, fileContent } = body || {};
  const updated = await updatePayslip(id, {
    status: "pendente",
    fileName: fileName || oldPayslip.fileName,
    fileSize: fileSize || oldPayslip.fileSize,
    fileContent: fileContent || oldPayslip.fileContent,
    uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
    viewedAt: null,
    signedAt: null,
    signatureData: null
  });
  if (!updated) {
    return json(404, { error: "Documento nao encontrado." });
  }
  const docDescription = documentTypeDescription(oldPayslip.documentType);
  await addLog(
    "replace",
    oldPayslip.employeeId,
    "RH Admin",
    `Substituiu o ${docDescription} de ${oldPayslip.employeeName} - ${oldPayslip.competence}`
  );
  return json(200, updated);
}
async function handleDeletePayslip(id) {
  const removed = await deletePayslip(id);
  if (!removed) {
    return json(404, { error: "Documento nao encontrado." });
  }
  const docDescription = documentTypeDescription(removed.documentType);
  await addLog("delete", removed.employeeId, "RH Admin", `Excluiu o ${docDescription} de ${removed.employeeName} - ${removed.competence}`);
  return json(200, { success: true, message: "Documento excluido com sucesso." });
}
async function handleViewPayslip(id, body) {
  const { employeeId } = body || {};
  const payslip = await getPayslip(id);
  if (!payslip) {
    return json(404, { error: "Holerite nao encontrado." });
  }
  let status = payslip.status;
  let updated = false;
  if (payslip.status === "pendente") {
    const updatedPayslip = await updatePayslip(id, {
      status: "visualizado",
      viewedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    status = updatedPayslip?.status || "visualizado";
    updated = true;
  }
  if (employeeId === payslip.employeeId) {
    await addLog("view", payslip.employeeId, payslip.employeeName, `Visualizou o holerite da competencia ${payslip.competence}`);
  }
  return json(200, { success: true, status, updated });
}
async function handleSignPayslip(id, body) {
  const { employeeId, drawnSignature, password, facialSelfie } = body || {};
  if (!employeeId || !drawnSignature || !password) {
    return json(400, { error: "Faltam dados para conclusao da assinatura." });
  }
  const payslip = await getPayslip(id);
  if (!payslip) {
    return json(404, { error: "Holerite nao encontrado." });
  }
  if (payslip.employeeId !== employeeId) {
    return json(403, { error: "Voce nao tem permissao para assinar este documento." });
  }
  const validPassword = await verifyEmployeePassword(employeeId, password);
  if (!validPassword) {
    return json(401, { error: "Senha incorreta para assinatura." });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updated = await updatePayslip(id, {
    status: "assinado",
    signedAt: now,
    viewedAt: payslip.viewedAt || now,
    signatureData: {
      drawnSignature,
      timestamp: now,
      confirmedWithPassword: true,
      facialSelfie: facialSelfie || void 0
    }
  });
  if (!updated) {
    return json(404, { error: "Holerite nao encontrado." });
  }
  const extraMessage = facialSelfie ? " com validacao fotografica facial" : "";
  const docDescription = payslip.documentType === "ponto" ? "a folha de ponto" : payslip.documentType === "ferias" ? "o recibo de ferias" : "o holerite";
  await addLog(
    "signature",
    payslip.employeeId,
    payslip.employeeName,
    `Assinou digitalmente ${docDescription} da competencia ${payslip.competence}${extraMessage}`
  );
  return json(200, { success: true, pay: updated });
}
async function handleDownloadLog(id, body) {
  const { employeeId, requesterName } = body || {};
  const payslip = await getPayslip(id);
  if (!payslip) {
    return json(404, { error: "Holerite nao encontrado." });
  }
  await addLog(
    "download",
    employeeId || payslip.employeeId,
    requesterName || payslip.employeeName,
    `Baixou o PDF do holerite - ${payslip.competence}`
  );
  return json(200, { success: true });
}
async function handleApiRequest(request) {
  const method = request.method.toUpperCase();
  const segments = normalizePath(request.path);
  try {
    if (method === "OPTIONS") {
      return json(204, null);
    }
    if (segments[0] === "auth" && segments[1] === "login" && method === "POST") {
      return await handleLogin(request.body);
    }
    if (segments[0] === "auth" && segments[1] === "validate-password" && method === "POST") {
      return await handleValidatePassword(request.body);
    }
    if (segments[0] === "employees" && segments.length === 1 && method === "GET") {
      return json(200, await listEmployees());
    }
    if (segments[0] === "employees" && segments.length === 1 && method === "POST") {
      return await handleCreateEmployee(request.body);
    }
    if (segments[0] === "employees" && segments[1] && segments.length === 2 && method === "GET") {
      return await handleGetEmployeeProfile(segments[1]);
    }
    if (segments[0] === "employees" && segments[1] && segments.length === 2 && method === "DELETE") {
      return await handleDeleteEmployee(segments[1]);
    }
    if (segments[0] === "company" && segments.length === 1 && method === "GET") {
      return json(200, await getCompany());
    }
    if (segments[0] === "company" && segments.length === 1 && method === "PUT") {
      return await handleUpdateCompany(request.body);
    }
    if (segments[0] === "payslips" && segments.length === 1 && method === "GET") {
      return json(200, await listPayslips(getQueryValue(request.query, "employeeId")));
    }
    if (segments[0] === "payslips" && segments.length === 1 && method === "POST") {
      return await handleCreatePayslip(request.body);
    }
    if (segments[0] === "payslips" && segments[1] && segments.length === 2 && method === "GET") {
      const payslip = await getPayslip(segments[1]);
      return payslip ? json(200, payslip) : json(404, { error: "Holerite nao encontrado." });
    }
    if (segments[0] === "payslips" && segments[1] && segments.length === 2 && method === "PUT") {
      return await handleReplacePayslip(segments[1], request.body);
    }
    if (segments[0] === "payslips" && segments[1] && segments.length === 2 && method === "DELETE") {
      return await handleDeletePayslip(segments[1]);
    }
    if (segments[0] === "payslips" && segments[1] && segments[2] === "view" && method === "POST") {
      return await handleViewPayslip(segments[1], request.body);
    }
    if (segments[0] === "payslips" && segments[1] && segments[2] === "sign" && method === "POST") {
      return await handleSignPayslip(segments[1], request.body);
    }
    if (segments[0] === "payslips" && segments[1] && segments[2] === "download" && method === "POST") {
      return await handleDownloadLog(segments[1], request.body);
    }
    if (segments[0] === "logs" && segments.length === 1 && method === "GET") {
      const logs = await listLogs();
      return json(200, logs);
    }
    return json(404, { error: "Rota nao encontrada." });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return json(500, {
        error: "Supabase nao configurado.",
        details: error.message
      });
    }
    console.error(error);
    return json(500, {
      error: "Erro interno ao acessar o banco de dados."
    });
  }
}

// server.ts
import_dotenv.default.config({ path: ".env.local" });
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = Number(process.env.PORT || 3e3);
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
app.all(["/api", "/api/*"], async (req, res) => {
  const response = await handleApiRequest({
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query
  });
  if (response.body === null) {
    res.status(response.status).end();
    return;
  }
  res.status(response.status).json(response.body);
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
