// Operator configuration for the lab environment. Edit this file to switch the
// guided labs from the simulated desktop (default, runs in the browser) to the
// optional real-machine terminal service for the labs it hosts. Nothing here is
// a secret: it names where the service is reached and which labs it serves.
//
// environment: 'simulated-desktop' | 'remote-terminal'
// remote.base: where the terminal service is reached. A same-origin path such
//   as '/terminal' (proxied to the service) keeps the site's Content-Security-
//   Policy as it is; a separate origin such as 'https://terminal.example.test'
//   also needs that origin added to script-src, style-src and connect-src.
// remote.labs: scenario id -> lab id on the service. Labs that are not listed
//   fall back to the simulated desktop automatically.
export const LAB_ENVIRONMENT_CONFIG = Object.freeze({
  environment: 'simulated-desktop',
  remote: Object.freeze({
    base: '/terminal',
    labs: Object.freeze({'NET-201': 'NET-201', 'SEC-402': 'SEC-402', 'CODE-501': 'CODE-501'})
  })
});
