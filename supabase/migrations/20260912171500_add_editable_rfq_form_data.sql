alter table public.rfqs
  add column if not exists form_data jsonb;

comment on column public.rfqs.form_data is
  'Editable snapshot of the official MSU-Gensan RFQ form fields and item lines.';
