// The paid site's legacy endpoint stays source-locked. Deployment replaces this
// with the verified HTTPS endpoint in an independently confirmed Workers Free
// account. Never accept a user-supplied endpoint or point this at a paid proxy.
export const REQUESTER_ENDPOINT = '/api/requester';
