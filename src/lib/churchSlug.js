// Generates a URL-friendly login slug from a church name.
// "Elkhart Life Church" -> "elkhartlife"
export function churchSlug(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\bchurch\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function churchLoginUrl(subdomain) {
  return `${window.location.origin}/church/${subdomain}`;
}