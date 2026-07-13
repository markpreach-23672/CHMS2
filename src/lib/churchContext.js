import { base44 } from '@/api/base44Client';

let cached;

// Returns the church id the current user belongs to.
// If the account isn't linked yet, asks the backend to link it
// (via the church login page they used, or their person profile email).
export async function getMyChurchId() {
  if (cached !== undefined) return cached;
  let cid = null;
  try {
    const u = await base44.auth.me();
    cid = u?.church_id || null;
  } catch (e) { /* not logged in */ }
  if (!cid) {
    try {
      const subdomain = localStorage.getItem('pending_church_subdomain') || undefined;
      const res = await base44.functions.invoke('linkUserToChurch', { subdomain });
      cid = res.data?.church_id || null;
      if (cid) localStorage.removeItem('pending_church_subdomain');
    } catch (e) { /* ignore */ }
  }
  cached = cid;
  return cid;
}