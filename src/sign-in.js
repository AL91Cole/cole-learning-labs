// Informational entry only. The existing protected service verifies access.
// A normal link makes no request until the visitor chooses to continue.
const SIGN_IN_URL='https://codex-private-owner-preview.cole-learning-labs.pages.dev/learn/';

export function renderSignIn(){
  return `<section class="wrap sign-in-page" aria-labelledby="sign-in-title"><header><p class="eyebrow">Your account</p><h1 id="sign-in-title" tabindex="-1">Sign in</h1></header><div class="sign-in-card"><p class="sign-in-status" role="status">Subscriber sign-in is being prepared. Existing authorized access remains available.</p><a class="button sign-in-continue" href="${SIGN_IN_URL}" rel="noreferrer">Continue to sign in</a><p class="sign-in-help">Access is checked before protected content opens.</p></div><p class="sign-in-free"><a class="text-link" href="#labs">Explore the free labs →</a></p></section>`;
}
