// Lab environment providers. The guided lab asks for an environment by id and
// mounts whatever provider answers. The default is the simulated desktop that
// runs entirely in the browser. A school that deploys the optional Docker
// terminal service can register a provider for it with the same contract and
// select it with `window.COLE_LAB_ENVIRONMENT = '<id>'` or a
// `data-lab-environment` attribute on <html>; nothing in the guide changes.
//
// Provider contract:
//   id: string
//   label: string shown in the environment bar
//   render(scenario, record): HTML string for the environment pane
//   mount(root, context): {refresh(), dispose(), open(app?), hasUnsavedDraft()}
//   context: {scenario, record, getState, action, verify, renderConsole, onActivity, showNotice}
import {LAB_ENVIRONMENT_CONFIG} from './lab-environment-config.js?release=20261107-tech-team';
const providers = new Map();
export const DEFAULT_LAB_ENVIRONMENT = 'simulated-desktop';

export function registerLabEnvironment(provider) {
  if (!provider || typeof provider.id !== 'string' || typeof provider.render !== 'function' || typeof provider.mount !== 'function') throw new TypeError('A lab environment needs an id, render and mount.');
  providers.set(provider.id, provider);
  return provider;
}

export const listLabEnvironments = () => [...providers.values()].map(provider => ({id:provider.id, label:provider.label || provider.id}));

/** The provider for a lab: the requested or configured one when it supports the lab, otherwise the default. */
export function preferredLabEnvironment(preferred, scenario = null) {
  const requested = typeof preferred === 'string' && preferred ? preferred : (globalThis.COLE_LAB_ENVIRONMENT ?? globalThis.document?.documentElement?.dataset?.labEnvironment ?? LAB_ENVIRONMENT_CONFIG.environment ?? '');
  const candidate = providers.get(requested);
  if (candidate && (typeof candidate.supports !== 'function' || !scenario || candidate.supports(scenario))) return candidate;
  return providers.get(DEFAULT_LAB_ENVIRONMENT) || null;
}
