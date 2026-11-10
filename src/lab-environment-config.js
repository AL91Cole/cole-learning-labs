// Operator configuration for the lab environment. Edit this file to switch the
// guided labs from the simulated desktop (default, runs in the browser) to the
// optional real-machine terminal service for the labs it hosts. Nothing here is
// a secret: it names where the service is reached and which labs it serves.
//
// environment: 'simulated-desktop' | 'remote-terminal'
//   'remote-terminal' takes effect only while the service answers its health
//   check with status "enabled"; otherwise every lab keeps the simulated
//   desktop. The gateway at functions/terminal/[[path]].js answers 503 until
//   TERMINAL_ORIGIN points at a running controller, so this can be set ahead
//   of the deployment.
// remote.base: where the terminal service is reached. A same-origin path such
//   as '/terminal' (proxied to the service) keeps the site's Content-Security-
//   Policy as it is; a separate origin such as 'https://terminal.example.test'
//   also needs that origin added to script-src, style-src and connect-src.
// remote.labs: scenario id -> lab id on the service. Labs that are not listed
//   fall back to the simulated desktop automatically.
export const LAB_ENVIRONMENT_CONFIG = Object.freeze({
  environment: 'remote-terminal',
  remote: Object.freeze({
    base: '/terminal',
    // Every networking, security and coding lab. A lab is used on a real machine
    // only if the running service also lists it; otherwise it stays simulated.
    labs: Object.freeze(Object.fromEntries([
      'NET-201', 'NET-202', 'NET-203', 'NET-204', 'NET-205', 'NET-206', 'NET-207', 'NET-208',
      'NET-209', 'NET-210', 'NET-211', 'NET-212', 'NET-213', 'NET-214', 'NET-215', 'NET-216',
      'SEC-401', 'SEC-402', 'SEC-403', 'SEC-404', 'SEC-405', 'SEC-406', 'CODE-501', 'CODE-502',
      'CODE-503', 'CODE-504', 'CODE-505', 'CODE-506'
    ].map(id => [id, id])))
  })
});
