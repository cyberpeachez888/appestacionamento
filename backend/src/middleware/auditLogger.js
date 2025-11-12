import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';

/**
 * Log a user action to user_events table.
 * @param {object} params
 * @param {object} params.actor Current authenticated user (req.user)
 * @param {string} params.action Verb describing action (e.g., 'user.create')
 * @param {string} [params.targetType] Entity/table impacted
 * @param {string} [params.targetId] Identifier of impacted entity
 * @param {object} [params.details] Extra contextual data (serialized as JSON)
 */
export async function logEvent({ actor, action, targetType, targetId, details }) {
  try {
    if (!actor) return; // no actor, skip
    const payload = {
      id: uuid(),
      actor_id: actor.id,
      actor_login: actor.login,
      actor_name: actor.name,
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      details: details ? JSON.stringify(details) : null,
      created_at: new Date().toISOString(),
    };
    await supabase.from('user_events').insert(payload);
  } catch (err) {
    console.warn('Audit log failed:', err);
  }
}
