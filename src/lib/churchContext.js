import { base44 } from '@/api/base44Client';

let cached;

// Returns the church id the current user works under (falls back to the first church for super admins).
export async function getMyChurchId() {
  if (cached !== undefined) return cached;
  let cid = null;
  try {
    const u = await base44.auth.me();
    cid = u?.church_id || null;
  } catch (e) { /* not logged in */ }
  if (!cid) {
    try {
      const churches = await base44.entities.Church.list();
      cid = churches[0]?.id || null;
    } catch (e) { /* ignore */ }
  }
  cached = cid;
  return cid;
}