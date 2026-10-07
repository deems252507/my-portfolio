-- CMS profil & teks portofolio. Jalankan sekali di Supabase SQL Editor.
-- Tidak mengubah tabel projects / certificates / experiences / comments.

create table if not exists public.site_content (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

insert into public.site_content (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

alter table public.site_content disable row level security;

-- Foto di-upload ke bucket yang sudah dipakai proyek: project-images
-- Pastikan bucket project-images public (sama seperti upload gambar proyek).
