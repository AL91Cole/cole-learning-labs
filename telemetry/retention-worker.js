import {cleanupTelemetry} from './storage.js';
export default {
  async scheduled(_controller,env){if(!await cleanupTelemetry(env?.LAB_TELEMETRY))throw new Error('Telemetry retention unavailable');},
  fetch(){return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});}
};
