-- Add durable follow-up context for Call Cockpit scheduled tasks.
--
-- The current Call Cockpit already inserts a pending task when a user logs a call
-- with both next_action and next_action_at. This migration makes that task richer
-- without forcing a large frontend rewrite:
--   - links the task back to the primary contact when possible
--   - links the task back to the call that created it when possible
--   - preserves summary/DB-note context for the next conversation
--   - moves active leads into follow_up_scheduled when a task is created

alter table public.tasks
  add column if not exists contact_id uuid references public.contacts(id) on delete set null;

alter table public.tasks
  add column if not exists call_id uuid references public.calls(id) on delete set null;

alter table public.tasks
  add column if not exists context text;

create index if not exists idx_tasks_tenant_status_when
  on public.tasks (tenant_id, status, next_action_at);

create index if not exists idx_tasks_event_when
  on public.tasks (event_id, next_action_at);

create index if not exists idx_tasks_call_id
  on public.tasks (call_id);

create index if not exists idx_tasks_contact_id
  on public.tasks (contact_id);

create or replace function public.hydrate_task_followup_context()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  latest_call record;
  event_context record;
begin
  if new.event_id is not null then
    select
      e.primary_contact_id,
      nullif(coalesce(e.where_left_off, e.notes, ''), '') as fallback_context,
      e.stage
    into event_context
    from public.events e
    where e.id = new.event_id
      and e.tenant_id = new.tenant_id;

    if new.contact_id is null then
      new.contact_id := event_context.primary_contact_id;
    end if;

    if new.call_id is null then
      select
        c.id,
        nullif(coalesce(c.summary, c.db_note_line, ''), '') as call_context
      into latest_call
      from public.calls c
      where c.tenant_id = new.tenant_id
        and c.user_id = new.user_id
        and c.event_id = new.event_id
        and c.created_at >= now() - interval '2 minutes'
      order by c.created_at desc
      limit 1;

      if latest_call.id is not null then
        new.call_id := latest_call.id;
      end if;

      if new.context is null then
        new.context := coalesce(latest_call.call_context, event_context.fallback_context);
      end if;
    elsif new.context is null then
      select nullif(coalesce(c.summary, c.db_note_line, ''), '')
      into new.context
      from public.calls c
      where c.id = new.call_id
        and c.tenant_id = new.tenant_id;

      new.context := coalesce(new.context, event_context.fallback_context);
    end if;

    update public.events e
    set stage = 'follow_up_scheduled',
        updated_at = now()
    where e.id = new.event_id
      and e.tenant_id = new.tenant_id
      and e.stage not in ('closed_won', 'closed_lost');
  end if;

  return new;
end;
$$;

drop trigger if exists hydrate_task_followup_context_on_tasks on public.tasks;

create trigger hydrate_task_followup_context_on_tasks
before insert on public.tasks
for each row
execute function public.hydrate_task_followup_context();

create or replace function public.backfill_recent_task_from_call()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  call_context text;
begin
  call_context := nullif(coalesce(new.summary, new.db_note_line, ''), '');

  update public.tasks t
  set call_id = new.id,
      context = coalesce(nullif(t.context, ''), call_context),
      updated_at = now()
  where t.tenant_id = new.tenant_id
    and t.user_id = new.user_id
    and t.event_id = new.event_id
    and t.status = 'pending'
    and t.call_id is null
    and t.created_at between new.created_at - interval '2 minutes' and new.created_at + interval '2 minutes';

  return new;
end;
$$;

drop trigger if exists backfill_recent_task_from_call_on_calls on public.calls;

create trigger backfill_recent_task_from_call_on_calls
after insert on public.calls
for each row
execute function public.backfill_recent_task_from_call();
