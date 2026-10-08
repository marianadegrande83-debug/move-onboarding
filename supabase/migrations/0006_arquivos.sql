-- =====================================================================
-- MOVE ONBOARDING · Arquivos dos clientes (Supabase Storage)
-- Rodar uma vez, depois do 0005.
-- Pasta = id da empresa. Bucket privado: arquivos só abrem com link temporário.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('client-files', 'client-files', false, 52428800)  -- 50 MB por arquivo
on conflict (id) do nothing;

create policy "client-files: ler da própria empresa"
  on storage.objects for select to authenticated
  using (bucket_id = 'client-files'
         and public.can_access_company(public.safe_uuid((storage.foldername(name))[1])));

create policy "client-files: enviar para a própria empresa"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'client-files'
              and public.can_access_company(public.safe_uuid((storage.foldername(name))[1])));

create policy "client-files: apagar o que enviou (ou gestão)"
  on storage.objects for delete to authenticated
  using (bucket_id = 'client-files'
         and public.can_access_company(public.safe_uuid((storage.foldername(name))[1]))
         and (owner_id = auth.uid()::text or public.is_manager()));
