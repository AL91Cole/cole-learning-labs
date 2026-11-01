// Informational entry only. The existing protected service verifies access.
// A normal link makes no request until the visitor chooses to continue.
const SIGN_IN_URL='https://codex-private-owner-preview.cole-learning-labs.pages.dev/learn/';

export function renderSignIn(){
  return `<section class="wrap sign-in-page" aria-labelledby="sign-in-title"><header><p class="eyebrow">Your account</p><h1 id="sign-in-title" tabindex="-1">Sign in</h1></header><div class="sign-in-card"><p class="sign-in-status" role="status">Approved accounts only. Use the email account already approved for this site. New accounts and public registration are unavailable.</p><a class="button sign-in-continue" href="${SIGN_IN_URL}" rel="noreferrer">Verify your account</a><p class="sign-in-help">Full lab access requires a verified, approved account. If this browser is already signed in, its existing session may open the labs without another prompt.</p><p class="sign-in-help">Subscriber sign-in is being prepared. Existing authorized access remains available.</p></div><p class="sign-in-free"><a class="text-link" href="#labs">Explore the free labs →</a></p></section>`;
}
