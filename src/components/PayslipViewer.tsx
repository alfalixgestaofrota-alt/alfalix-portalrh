/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useRef } from 'react';
import { 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Printer, 
  FileText, 
  User, 
  Briefcase, 
  Building2, 
  FileCheck, 
  Lock, 
  IdCard, 
  ExternalLink 
} from 'lucide-react';
import { Employee, Payslip } from '../types.js';
import { formatCPF, formatCompetence, formatDate, getDocumentLabels } from '../utils.js';

interface PayslipViewerProps {
  payslip: Payslip;
  employee: Employee;
  onDownload?: () => void;
}

export default function PayslipViewer({ payslip, employee, onDownload }: PayslipViewerProps) {
  const printRef = useRef<HTMLDivElement | null>(null);
  const documentLabels = getDocumentLabels(payslip.documentType);

  // Parse initials from name for profile avatar
  const initials = useMemo(() => {
    if (!employee.name) return 'CL';
    const parts = employee.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [employee]);

  // Construct PDF Data URI from base64 string safely
  const pdfDataUri = useMemo(() => {
    if (!payslip.fileContent) return '';
    if (payslip.fileContent.startsWith('data:')) {
      return payslip.fileContent;
    }
    return `data:application/pdf;base64,${payslip.fileContent}`;
  }, [payslip]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 border border-slate-200/80 px-4 py-3 rounded-xl no-print shadow-sm">
        <div className="flex items-center gap-2">
          <FileCheck className={`w-5 h-5 ${documentLabels.type === 'ponto' ? 'text-purple-600' : documentLabels.type === 'ferias' ? 'text-teal-600' : 'text-blue-600'}`} />
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 text-sm">
              Visualização de {documentLabels.title} Escaneado
            </span>
            <span className="text-[10px] text-slate-500">Competência: {formatCompetence(payslip.competence)}</span>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handlePrint}
            title={`Imprimir ${documentLabels.title} e Termo`}
            className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button
            onClick={onDownload}
            title="Baixar PDF com Assinatura Embutida"
            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 hover:shadow-blue-600/10 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-md transition active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Baixar PDF Assinado
          </button>
        </div>
      </div>

      {/* Main Print Area Container */}
      <div 
        ref={printRef}
        className="w-full bg-white border border-slate-200 rounded-2xl shadow-md p-4 md:p-6 text-slate-800 leading-relaxed font-sans max-w-4xl mx-auto overflow-hidden print:border-0 print:p-0 print:shadow-none"
      >
        {/* 1. Cadastral Profile Section (Read-Only) */}
        <div className="mb-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3.5 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-700 to-indigo-900 rounded-full flex items-center justify-center text-white text-sm font-extrabold shadow-inner select-none uppercase">
                {initials}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">{employee.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Cadastro Ativo
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">CPF: {formatCPF(employee.cpf)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 px-2.5 py-1 rounded-lg text-slate-400 font-bold text-[10px] tracking-wide uppercase select-none self-stretch sm:self-auto justify-center">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Perfil Protegido • Apenas Visualização</span>
            </div>
          </div>

          {/* Bento-style cadastral specification card */}
          <div className="bg-slate-50 border border-slate-200/65 rounded-xl p-4 md:p-5">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              Informações Cadastrais do Colaborador
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Box 1 */}
              <div className="flex items-start gap-2.5 bg-white p-3 rounded-lg border border-slate-150 shadow-sm">
                <IdCard className="w-4.5 h-4.5 text-blue-500 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-slate-400 font-extrabold tracking-wide">Nome Completo</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 leading-snug">{employee.name}</span>
                </div>
              </div>

              {/* Box 2 */}
              <div className="flex items-start gap-2.5 bg-white p-3 rounded-lg border border-slate-150 shadow-sm">
                <Briefcase className="w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-slate-400 font-extrabold tracking-wide">Cargo / Função</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 leading-snug">{employee.cargo}</span>
                </div>
              </div>

              {/* Box 3 */}
              <div className="flex items-start gap-2.5 bg-white p-3 rounded-lg border border-slate-150 shadow-sm">
                <Building2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-slate-400 font-extrabold tracking-wide font-sans">Departamento</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 leading-snug">{employee.departamento}</span>
                </div>
              </div>

              {/* Box 4 */}
              <div className="flex items-start gap-2.5 bg-white p-3 rounded-lg border border-slate-150 shadow-sm">
                <FileText className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-slate-400 font-extrabold tracking-wide">Competência Selecionada</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 leading-snug">{formatCompetence(payslip.competence)}</span>
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-450 italic mt-3 flex items-center gap-1 bg-white/60 p-2 rounded-md border border-slate-100">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Este perfil é preenchido diretamente pelo Recursos Humanos e não pode ser editado pelo colaborador. Se encontrar divergências, contate o setor de RH.
            </p>
          </div>
        </div>

        {/* 2. PDF Document view frame */}
        <div className="mb-6 flex flex-col gap-2.5">
          <div className="flex justify-between items-center bg-slate-50 border border-slate-150 px-3 py-2 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className={`w-4 h-4 ${documentLabels.type === 'ponto' ? 'text-purple-500' : documentLabels.type === 'ferias' ? 'text-teal-500' : 'text-red-500'}`} />
              <span className="font-bold text-xs text-slate-700">
                Arquivo de {documentLabels.title} Disponibilizado: <strong className="font-mono text-[11px] text-slate-900 font-bold">{payslip.fileName}</strong> ({payslip.fileSize})
              </span>
            </div>
            <a 
              href={pdfDataUri} 
              target="_blank" 
              rel="noopener noreferrer"
              title="Abrir em nova aba do navegador"
              className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 transition py-1 px-2 hover:bg-blue-50 rounded"
            >
              Exibir Tela Cheia
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="w-full relative rounded-xl border border-slate-350 bg-slate-100/60 p-2.5 shadow-inner select-none flex flex-col items-center">
            {pdfDataUri ? (
              <iframe
                src={`${pdfDataUri}#toolbar=1&navpanes=0`}
                title={`Documento ${payslip.fileName}`}
                className="w-full h-[550px] rounded-lg border border-slate-200/80 shadow-sm bg-white"
              />
            ) : (
              <div className="py-24 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Erro ao carregar o arquivo PDF do documento.</p>
              </div>
            )}
            
            <p className="text-[10px] text-slate-400 mt-2 text-center w-full no-print">
              * O {documentLabels.lowerTitle} oficial é exibido diretamente do arquivo escaneado em PDF anexado pelo RH. Caso seu dispositivo bloqueie a reprodução em tela, utilize o botão "Baixar PDF" para salvá-lo localmente.
            </p>
          </div>
        </div>

        {/* 3. Bottom Receiver Digital Signature Box */}
        <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/70">
          <span className="text-[10px] uppercase text-slate-400 font-bold block mb-2 tracking-wide">
            Recibo de Entrega / Confirmação de Recebimento
          </span>
          
          {payslip.status === 'assinado' && payslip.signatureData ? (
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between border border-emerald-200 bg-emerald-50/50 p-4 rounded-lg">
              <div className="flex flex-col gap-1 text-slate-700 max-w-md">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>ASSINADO DIGITALMENTE</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Confirmo que recebi {documentLabels.receiptSubject} referente à competência de{' '}
                  <strong className="text-slate-900">{formatCompetence(payslip.competence)}</strong>. 
                  A assinatura foi auditada, confirmada via ambiente seguro por senha do colaborador.
                </p>
                <div className="mt-2 text-[10px] font-mono text-slate-500 leading-snug">
                  <div><strong>Data/Hora:</strong> <span className="text-slate-800 font-sans">{formatDate(payslip.signedAt || payslip.signatureData.timestamp)}</span></div>
                  <div><strong>Validação hash:</strong> <span className="font-mono text-slate-600 select-all">SHA256:{payslip.id.slice(4)}-{new Date(payslip.signedAt || payslip.signatureData.timestamp).getTime()}-OK</span></div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Selfie Photographic evidence */}
                {payslip.signatureData.facialSelfie && (
                  <div className="flex flex-col items-center bg-white border border-slate-250 rounded p-1 shadow-sm w-24">
                    <img 
                      src={payslip.signatureData.facialSelfie} 
                      alt="Biometria Facial" 
                      className="h-16 w-full object-cover rounded pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                    <div className="border-t border-slate-250 w-full text-center text-[7px] uppercase tracking-wider py-0.5 mt-0.5 text-emerald-700 bg-emerald-50 font-extrabold font-sans">
                      Selfie Ativa
                    </div>
                  </div>
                )}

                {/* Graphical signature element */}
                <div className="flex flex-col items-center bg-white border border-slate-200 rounded p-1 shadow-sm w-44">
                  <img 
                    src={payslip.signatureData.drawnSignature} 
                    alt="Assinatura Digital Colaborador" 
                    className="max-h-16 max-w-full object-contain pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                  <div className="border-t border-slate-200 w-full text-center text-[8px] uppercase tracking-wider py-0.5 mt-0.5 text-slate-400 bg-slate-50 font-bold">
                    Assinatura Auditada
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between border border-amber-200 bg-amber-50/65 p-3 rounded-lg text-slate-700 font-medium">
              <div className="flex gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-bold text-amber-800">AGUARDANDO ASSINATURA DIGITAL</span>
                  <p className="text-[11px] text-slate-600 font-normal mt-0.5 leading-normal">
                    Este documento já foi disponibilizado pelo RH e está pendente de confirmação de recebimento por sua parte.
                  </p>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider shrink-0 select-none bg-white py-1 px-2 border border-amber-100 rounded shadow-sm">
                Status: Pendente
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
