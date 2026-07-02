create table if not exists public.employees (
  id text primary key,
  cpf text not null,
  cpf_digits text not null unique,
  name text not null,
  email text not null,
  cargo text not null,
  departamento text not null,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.employee_passwords (
  employee_id text primary key references public.employees(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.company_profiles (
  id text primary key default 'default' check (id = 'default'),
  name text not null,
  cnpj text not null,
  address text not null default '',
  ie text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.payslips (
  id text primary key,
  employee_id text not null references public.employees(id) on delete cascade,
  employee_name text not null,
  competence text not null,
  status text not null default 'pendente' check (status in ('pendente', 'visualizado', 'assinado')),
  file_name text not null,
  file_size text not null default '180 KB',
  file_content text not null,
  document_type text not null default 'holerite' check (document_type in ('holerite', 'ponto', 'ferias')),
  uploaded_at timestamptz not null default now(),
  viewed_at timestamptz,
  signed_at timestamptz,
  signature_data jsonb,
  constraint payslips_unique_document unique (employee_id, competence, document_type)
);

create table if not exists public.audit_logs (
  id text primary key,
  occurred_at timestamptz not null default now(),
  type text not null check (type in ('login', 'view', 'download', 'upload', 'signature', 'delete', 'replace', 'create_employee')),
  employee_id text references public.employees(id) on delete set null,
  employee_name text not null,
  details text not null
);

create index if not exists payslips_employee_id_idx on public.payslips(employee_id);
create index if not exists payslips_competence_idx on public.payslips(competence desc);
create index if not exists audit_logs_occurred_at_idx on public.audit_logs(occurred_at desc);

alter table public.employees enable row level security;
alter table public.employee_passwords enable row level security;
alter table public.company_profiles enable row level security;
alter table public.payslips enable row level security;
alter table public.audit_logs enable row level security;

insert into public.employees (
  id,
  cpf,
  cpf_digits,
  name,
  email,
  cargo,
  departamento,
  status,
  is_admin,
  created_at
) values (
  'emp-admin',
  '000.000.000-00',
  '00000000000',
  'Ana Souza (RH)',
  'ana.souza@empresa.com.br',
  'Gerente de Recursos Humanos',
  'Recursos Humanos',
  'ativo',
  true,
  '2025-01-10T09:00:00Z'
) on conflict (id) do update set
  cpf = excluded.cpf,
  cpf_digits = excluded.cpf_digits,
  name = excluded.name,
  email = excluded.email,
  cargo = excluded.cargo,
  departamento = excluded.departamento,
  status = excluded.status,
  is_admin = excluded.is_admin;

insert into public.employee_passwords (
  employee_id,
  password_hash
) values (
  'emp-admin',
  '064369b841ea15785385cdcc3b6a9564150abb1e663150cbb928e9080cf2d803'
) on conflict (employee_id) do nothing;

insert into public.company_profiles (
  id,
  name,
  cnpj,
  address,
  ie
) values (
  'default',
  'ALFA LIX SERVICOS E TRANSPORTE',
  '08.698.921/0001-81',
  'Embu das Artes - SP',
  ''
) on conflict (id) do nothing;
