// Release-owned setting. Change 'open' to 'preview', test, build and deploy to restore the original content restriction.
// This does not change authentication, classroom collection, billing, owner preview or service authorization.
export const PUBLIC_LAB_ACCESS = 'open';
export function labsAreOpen(access = PUBLIC_LAB_ACCESS) {
  if (!['open','preview'].includes(access)) throw new Error('Public lab access must be open or preview.');
  return access === 'open';
}
