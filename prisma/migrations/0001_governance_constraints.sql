-- Meridian production governance layer for Supabase/PostgreSQL.
-- Prisma owns the base schema; this migration adds BRD-critical constraints
-- that must exist below the UI/API layer.

alter table "Goal"
  add constraint goal_weightage_min check ("weightage" >= 10),
  add constraint goal_weightage_max check ("weightage" <= 100),
  add constraint zero_based_target_zero check (
    "uomType" <> 'ZERO_BASED' or "target" = 0
  ),
  add constraint timeline_requires_date check (
    "uomType" <> 'TIMELINE' or "targetDate" is not null
  );

create unique index if not exists one_primary_owner_per_shared_goal
  on "Goal" ("sharedFromId")
  where "isShared" = true and "isOwner" = true and "sharedFromId" is not null;

create or replace function audit_locked_goal_changes()
returns trigger
language plpgsql
as $$
declare
  sheet_status text;
begin
  select status::text into sheet_status from "GoalSheet" where id = new."sheetId";

  if sheet_status in ('LOCKED', 'APPROVED') and row_to_json(old)::jsonb <> row_to_json(new)::jsonb then
    insert into "AuditLog" (
      id,
      "entityType",
      "entityId",
      action,
      "fieldName",
      "oldValue",
      "newValue",
      "changedBy",
      "changedAt",
      "ipAddress",
      "userAgent"
    )
    values (
      gen_random_uuid()::text,
      'goal',
      new.id,
      'LOCKED_GOAL_CHANGE',
      null,
      row_to_json(old)::jsonb,
      row_to_json(new)::jsonb,
      coalesce(current_setting('request.jwt.claim.sub', true), 'system'),
      now(),
      null,
      null
    );
  end if;

  return new;
end;
$$;

drop trigger if exists audit_locked_goal_changes_trigger on "Goal";
create trigger audit_locked_goal_changes_trigger
after update on "Goal"
for each row
execute function audit_locked_goal_changes();

create or replace function prevent_employee_locked_goal_updates()
returns trigger
language plpgsql
as $$
declare
  sheet_status text;
begin
  select status::text into sheet_status from "GoalSheet" where id = old."sheetId";

  if sheet_status in ('LOCKED', 'APPROVED') and current_setting('app.role', true) = 'EMPLOYEE' then
    raise exception 'Locked goals cannot be edited by employees';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_employee_locked_goal_updates_trigger on "Goal";
create trigger prevent_employee_locked_goal_updates_trigger
before update on "Goal"
for each row
execute function prevent_employee_locked_goal_updates();
