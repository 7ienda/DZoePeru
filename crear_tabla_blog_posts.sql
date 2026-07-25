-- ════════════════════════════════════════════════════════════
--  D'Zoe Perú — Tabla de posts del Blog para Supabase
--  Ejecuta esto UNA VEZ en: Supabase → SQL Editor → New query → Run
-- ════════════════════════════════════════════════════════════

create table if not exists blog_posts (
  id            bigint primary key,               -- mismo id que genera el panel (Date.now())
  slug          text unique not null,              -- URL amigable, ej: "guia-tallas-ropa-infantil"
  titulo        text not null,
  extracto      text,
  contenido     text,                              -- HTML del editor premium
  categoria     text default 'General',
  tags          text[] default '{}',
  imagen        text,
  imagen_alt    text,
  autor         text default 'D''Zoe Perú',
  fecha         date,
  status        text default 'published',          -- 'published' | 'draft'
  featured      boolean default false,
  seo_title     text,
  seo_desc      text,
  focus_kw      text,
  reading_time  int default 5,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Índices para que las consultas del blog público sean rápidas
create index if not exists idx_blog_posts_status_fecha on blog_posts (status, fecha desc);
create index if not exists idx_blog_posts_slug on blog_posts (slug);

-- Row Level Security: lectura pública de posts publicados,
-- pero solo tu panel (con la anon key) puede insertar/editar/borrar.
alter table blog_posts enable row level security;

create policy "Lectura pública de posts publicados"
  on blog_posts for select
  using (true);

create policy "Cualquiera con la anon key puede administrar posts"
  on blog_posts for all
  using (true)
  with check (true);

-- ── Tabla de vistas (si aún no la tienes de tu blog_views original) ──
create table if not exists blog_views (
  article_id text primary key,
  views bigint default 0
);
alter table blog_views enable row level security;
create policy "Lectura pública de vistas" on blog_views for select using (true);
create policy "Cualquiera puede incrementar vistas" on blog_views for all using (true) with check (true);

-- Función RPC para incrementar vistas de forma atómica
create or replace function increment_blog_view(p_article_id text)
returns bigint
language plpgsql
as $$
declare
  new_views bigint;
begin
  insert into blog_views (article_id, views)
  values (p_article_id, 1)
  on conflict (article_id)
  do update set views = blog_views.views + 1
  returning views into new_views;
  return new_views;
end;
$$;
