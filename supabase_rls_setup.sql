-- ============================================================
-- DZesta — Enforcement real del plan Free/Pro a nivel de base de datos
-- Ejecuta esto en Supabase > SQL Editor
-- ============================================================

-- 1. Tabla que guarda el plan REAL del usuario.
--    Solo la escribe la Edge Function (con la Service Role Key),
--    nunca el cliente/app directamente.
create table if not exists public.perfiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  updated_at timestamptz not null default now()
);

alter table public.perfiles enable row level security;

-- Cualquier usuario logueado puede LEER su propio plan.
drop policy if exists "perfiles_select_own" on public.perfiles;
create policy "perfiles_select_own" on public.perfiles
  for select using (auth.uid() = user_id);

-- A propósito NO se crea policy de insert/update/delete para 'authenticated':
-- así, ni siquiera con el anon key + JWT del usuario se puede escribir aquí.
-- Solo el service_role (que la Edge Function usa) puede hacerlo, porque
-- el service_role se salta RLS por completo.

-- 2. Función helper: ¿este usuario es Pro ahora mismo?
create or replace function public.es_usuario_pro(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where user_id = uid and plan = 'pro'
  );
$$;

-- ============================================================
-- 3. Proteger 'carrito': solo Pro puede CREAR/ACTUALIZAR filas.
--    SELECT y DELETE se dejan abiertos para el dueño de los datos,
--    para que si baja de plan igual pueda ver/borrar lo que ya tenía.
--
--    IMPORTANTE: si ya tienes políticas con otros nombres en tu proyecto,
--    entra a Supabase > Authentication > Policies, identifica los nombres
--    reales de las políticas de 'carrito' y cámbialos abajo antes de correr
--    esto (o bórralas manualmente desde el dashboard y deja solo estas).
-- ============================================================

drop policy if exists "carrito_select_own" on public.carrito;
create policy "carrito_select_own" on public.carrito
  for select using (auth.uid() = user_id);

drop policy if exists "carrito_insert_own" on public.carrito;
create policy "carrito_insert_own" on public.carrito
  for insert with check (auth.uid() = user_id and public.es_usuario_pro(auth.uid()));

drop policy if exists "carrito_update_own" on public.carrito;
create policy "carrito_update_own" on public.carrito
  for update using (auth.uid() = user_id and public.es_usuario_pro(auth.uid()));

drop policy if exists "carrito_delete_own" on public.carrito;
create policy "carrito_delete_own" on public.carrito
  for delete using (auth.uid() = user_id);

-- ============================================================
-- 4. Mismo patrón para 'listas_guardadas'
-- ============================================================

drop policy if exists "listas_select_own" on public.listas_guardadas;
create policy "listas_select_own" on public.listas_guardadas
  for select using (auth.uid() = user_id);

drop policy if exists "listas_insert_own" on public.listas_guardadas;
create policy "listas_insert_own" on public.listas_guardadas
  for insert with check (auth.uid() = user_id and public.es_usuario_pro(auth.uid()));

drop policy if exists "listas_update_own" on public.listas_guardadas;
create policy "listas_update_own" on public.listas_guardadas
  for update using (auth.uid() = user_id and public.es_usuario_pro(auth.uid()));

drop policy if exists "listas_delete_own" on public.listas_guardadas;
create policy "listas_delete_own" on public.listas_guardadas
  for delete using (auth.uid() = user_id);
