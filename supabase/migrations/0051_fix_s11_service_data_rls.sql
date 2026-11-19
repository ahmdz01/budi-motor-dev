-- S11: Restrict service, customer, vehicle, and return reads by role/ownership.
-- Draft only. Review and test before applying to any Supabase environment.
--
-- Access model:
--   owner/admin/super_admin: all rows
--   kasir: operational service/customer/vehicle reads; returns tied to own payments
--   mekanik: only assigned services and related customers/vehicles/items/history
--   mekanik: no return access

-- -----------------------------------------------------------------------------
-- Service rows: mechanics can read only services assigned to their user ID.
-- Cashiers retain operational access to all service rows.
-- -----------------------------------------------------------------------------
CREATE POLICY s11_services_select_role_gate
ON public.services
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role_code')
    IN ('owner', 'admin', 'super_admin', 'kasir')
  OR (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') = 'mekanik'
    AND mechanic_id = (SELECT auth.uid())
  )
);

-- -----------------------------------------------------------------------------
-- Service items and status history: mechanics inherit access only through an
-- assigned parent service. Service RLS also limits the EXISTS subquery.
-- -----------------------------------------------------------------------------
CREATE POLICY s11_service_items_select_role_gate
ON public.service_items
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role_code')
    IN ('owner', 'admin', 'super_admin', 'kasir')
  OR (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') = 'mekanik'
    AND EXISTS (
      SELECT 1
      FROM public.services AS s
      WHERE s.id = service_items.service_id
        AND s.mechanic_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY s11_service_status_history_select_role_gate
ON public.service_status_history
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role_code')
    IN ('owner', 'admin', 'super_admin', 'kasir')
  OR (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') = 'mekanik'
    AND EXISTS (
      SELECT 1
      FROM public.services AS s
      WHERE s.id = service_status_history.service_id
        AND s.mechanic_id = (SELECT auth.uid())
    )
  )
);

-- -----------------------------------------------------------------------------
-- Customers and vehicles:
-- managers and cashiers retain operational reads; mechanics see only records
-- linked to at least one service assigned to them.
-- -----------------------------------------------------------------------------
CREATE POLICY s11_customers_select_role_gate
ON public.customers
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role_code')
    IN ('owner', 'admin', 'super_admin', 'kasir')
  OR (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') = 'mekanik'
    AND EXISTS (
      SELECT 1
      FROM public.services AS s
      WHERE s.customer_id = customers.id
        AND s.mechanic_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY s11_vehicles_select_role_gate
ON public.vehicles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role_code')
    IN ('owner', 'admin', 'super_admin', 'kasir')
  OR (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') = 'mekanik'
    AND EXISTS (
      SELECT 1
      FROM public.services AS s
      WHERE s.vehicle_id = vehicles.id
        AND s.mechanic_id = (SELECT auth.uid())
    )
  )
);

-- -----------------------------------------------------------------------------
-- Returns:
-- managers can read all returns; cashiers can read only returns linked to a
-- transaction they cashiered, including the service-payment transaction for a
-- returned service item. Mechanics cannot read returns.
-- -----------------------------------------------------------------------------
CREATE POLICY s11_returns_select_role_gate
ON public.returns
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role_code')
    IN ('owner', 'admin', 'super_admin')
  OR (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') = 'kasir'
    AND (
      (
        returns.transaction_item_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.transaction_items AS ti
          JOIN public.transactions AS t
            ON t.id = ti.transaction_id
          WHERE ti.id = returns.transaction_item_id
            AND t.cashier_id = (SELECT auth.uid())
        )
      )
      OR
      (
        returns.service_item_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.service_items AS si
          JOIN public.transactions AS t
            ON t.service_id = si.service_id
           AND t.source = 'service'
          WHERE si.id = returns.service_item_id
            AND t.cashier_id = (SELECT auth.uid())
        )
      )
    )
  )
);

-- -----------------------------------------------------------------------------
-- SECURITY DEFINER RPCs bypass normal table RLS. Explicitly enforce mechanic
-- assignment before returning service details or status history.
-- Existing return shapes and role access for non-mechanics are preserved.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_service_detail(p_service_id uuid)
RETURNS TABLE(
  id uuid,
  status character varying,
  complaint character varying,
  customer_type_used character varying,
  is_warranty_claim boolean,
  created_at timestamp with time zone,
  customer_id uuid,
  customer_name character varying,
  customer_phone character varying,
  vehicle_id uuid,
  police_plate character varying,
  motor_brand character varying,
  motor_model character varying,
  mechanic_id uuid,
  mechanic_name character varying,
  created_by_name character varying
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_role text;
  v_user_id uuid;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  if v_role is null or v_role not in ('owner', 'admin', 'kasir', 'mekanik', 'super_admin') then
    raise exception 'Akses ditolak.' using errcode = '42501';
  end if;

  v_user_id := auth.uid();

  if v_role = 'mekanik' then
    if v_user_id is null or not exists (
      select 1
      from public.services assigned_service
      where assigned_service.id = p_service_id
        and assigned_service.mechanic_id = v_user_id
    ) then
      raise exception 'Akses ditolak: servis tidak ditugaskan kepada mekanik ini.'
        using errcode = '42501';
    end if;
  end if;

  return query
    select
      s.id, s.status, s.complaint, s.customer_type_used, s.is_warranty_claim, s.created_at,
      s.customer_id, c.name, c.phone_number,
      s.vehicle_id, v.police_plate, v.motor_brand, v.motor_model,
      s.mechanic_id, m.name,
      cb.name
    from public.services s
    join public.customers c on c.id = s.customer_id
    left join public.vehicles v on v.id = s.vehicle_id
    left join public.users m on m.id = s.mechanic_id
    join public.users cb on cb.id = s.created_by
    where s.id = p_service_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_service_status_history(p_service_id uuid)
RETURNS TABLE(
  status_from character varying,
  status_to character varying,
  reason character varying,
  created_at timestamp with time zone,
  changed_by_name character varying
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_role text;
  v_user_id uuid;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  if v_role is null or v_role not in ('owner', 'admin', 'kasir', 'mekanik', 'super_admin') then
    raise exception 'Akses ditolak.' using errcode = '42501';
  end if;

  v_user_id := auth.uid();

  if v_role = 'mekanik' then
    if v_user_id is null or not exists (
      select 1
      from public.services assigned_service
      where assigned_service.id = p_service_id
        and assigned_service.mechanic_id = v_user_id
    ) then
      raise exception 'Akses ditolak: servis tidak ditugaskan kepada mekanik ini.'
        using errcode = '42501';
    end if;
  end if;

  return query
    select h.status_from, h.status_to, h.reason, h.created_at, u.name
    from public.service_status_history h
    join public.users u on u.id = h.changed_by
    where h.service_id = p_service_id
    order by h.created_at asc;
end;
$function$;

-- Allow cashiers to add vehicles during service intake.
CREATE POLICY s11_vehicles_insert_cashier
ON public.vehicles
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role_code') = 'kasir'
);
