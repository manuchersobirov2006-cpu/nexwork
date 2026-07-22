/*
# Auto-create and move a Kanban task for every order

## Why
When a tender bid is accepted (or a gig is ordered), the freelancer
should immediately see it on their "Доска задач" (Kanban board), and
have it move between columns as the order's status changes —
without either side needing write access to the other party's rows
under RLS. Same SECURITY DEFINER trigger pattern as migration 020.

## Mapping
  order status  -> task column
  pending       -> todo
  active        -> in_progress
  delivered     -> review
  completed     -> done
  cancelled/disputed -> left alone (order card in "Заказы" already
                        shows this state; no natural Kanban column)
*/

CREATE OR REPLACE FUNCTION handle_order_task_insert()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  task_title text;
  task_status text;
BEGIN
  SELECT COALESCE(
    (SELECT title FROM gigs WHERE id = NEW.gig_id),
    (SELECT title FROM projects WHERE id = NEW.project_id),
    'Order'
  ) INTO task_title;

  task_status := CASE NEW.status
    WHEN 'pending' THEN 'todo'
    WHEN 'active' THEN 'in_progress'
    WHEN 'delivered' THEN 'review'
    WHEN 'completed' THEN 'done'
    ELSE 'todo'
  END;

  INSERT INTO tasks (owner_id, related_order_id, related_project_id, title, status, priority)
  VALUES (NEW.seller_id, NEW.id, NEW.project_id, task_title, task_status, 'medium');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_created_task ON orders;
CREATE TRIGGER on_order_created_task
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_task_insert();

CREATE OR REPLACE FUNCTION handle_order_task_status()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  task_status text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    task_status := CASE NEW.status
      WHEN 'pending' THEN 'todo'
      WHEN 'active' THEN 'in_progress'
      WHEN 'delivered' THEN 'review'
      WHEN 'completed' THEN 'done'
      ELSE NULL
    END;

    IF task_status IS NOT NULL THEN
      UPDATE tasks SET status = task_status, updated_at = now()
      WHERE related_order_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_status_task_sync ON orders;
CREATE TRIGGER on_order_status_task_sync
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_task_status();
