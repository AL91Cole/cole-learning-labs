import {cleanupReachCounts} from './storage.js';
export default {
  async scheduled(_controller,env){await cleanupReachCounts(env?.LAB_REACH);},
  fetch(){return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});}
};
