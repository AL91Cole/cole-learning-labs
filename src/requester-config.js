// Keep browser traffic on the website's fixed broker endpoint. The private AI
// Worker is never a browser destination. Do not accept a caller-supplied URL.
export const REQUESTER_ENDPOINT = '/api/requester';
// Availability requires an explicit choice in page memory. The private service
// also enforces its own admission and budget limits; this flag cannot bypass them.
export const REQUESTER_CLOUD_ENABLED = true;
// Reserved for a separate legal, school, provider and insurance review. This
// export has no browser request path and cannot change the topic-only contract.
export const REQUESTER_OPEN_QUESTION_REVIEW_APPROVED = false;
