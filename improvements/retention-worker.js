import {cleanupImprovementCounts} from './storage.js';

// Provisioning a cron or binding cannot authorize collection or retention work.
const IMPROVEMENT_RETENTION_REVIEW_APPROVED=false;

export async function runImprovementRetention(env,{privacyApproved=false}={}){
  if(privacyApproved!==true)return false;
  // Stopping new collection must not stop expiry of previously accepted data.
  return cleanupImprovementCounts(env?.LAB_IMPROVEMENTS);
}

export default {
  async scheduled(_controller,env){
    if(!IMPROVEMENT_RETENTION_REVIEW_APPROVED)return;
    await runImprovementRetention(env,{privacyApproved:IMPROVEMENT_RETENTION_REVIEW_APPROVED});
  },
  fetch(){return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});}
};
