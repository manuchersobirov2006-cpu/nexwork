import { supabase } from './supabase';

/**
 * Logs an admin action to the append-only admin_audit_log table.
 * Captures before/after values for user content edits.
 */
export async function logAdminAction(params: {
  adminId: string;
  actionType: string;
  targetTable: string;
  targetId: string;
  beforeValue?: Record<string, unknown> | null;
  afterValue?: Record<string, unknown> | null;
  reason?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('admin_audit_log').insert({
    admin_id: params.adminId,
    action_type: params.actionType,
    target_table: params.targetTable,
    target_id: params.targetId,
    before_value: params.beforeValue ?? null,
    after_value: params.afterValue ?? null,
    reason: params.reason ?? null,
  });
  if (error) console.error('Failed to log admin action:', error);
}
