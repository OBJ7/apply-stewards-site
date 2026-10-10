import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,nextResolve) {
  if(specifier==='@netlify/blobs') return {url:new URL('./mock-blobs.mjs',import.meta.url).href,shortCircuit:true};
  return nextResolve(specifier,context);
}});
const {saveOpportunity,setFeaturedOpportunity,getFeaturedOpportunity,listPublishedMemberOpportunities} = await import('../netlify/lib/opportunities.mjs');
const {normalizeOpportunityInput} = await import('../shared/opportunity-utils.mjs');
const {default:submit} = await import('../netlify/functions/submit-member-opportunity.mjs');
const {default:update} = await import('../netlify/functions/update-opportunity-status.mjs');
const make=(id,overrides={})=>({id,...normalizeOpportunityInput({title:'Fictional listing',organization:'Example',category:'Fellowship',summary:'Fictional test',sourceUrl:'https://example.org',steps:['Read'],tips:['Check'],deadline:'2999-01-01',...overrides})});
test('featured reads canonical record after edits, withdrawals and expiry',async()=>{
  let record=await saveOpportunity(make('feature'));
  await setFeaturedOpportunity(record);
  record=await saveOpportunity({...record,summary:'Edited summary'});
  assert.equal((await getFeaturedOpportunity()).opportunity.summary,'Edited summary');
  await saveOpportunity({...record,status:'draft'});
  assert.equal(await getFeaturedOpportunity(),null);
  await saveOpportunity({...record,status:'published',deadline:'2000-01-01'});
  assert.equal(await getFeaturedOpportunity(),null);
});
test('public handler overrides forged trust and publication fields',async()=>{
  const response=await submit(new Request('https://example.org',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...make('ignored'),listingType:'verified',status:'published'})}));
  assert.equal(response.status,201);
  assert.deepEqual(await listPublishedMemberOpportunities(),[]);
  const prior=process.env.APPLY_ADMIN_TOKEN;
  try {
    process.env.APPLY_ADMIN_TOKEN='fictional-test-only';
    const payload=await response.json();
    const body=JSON.stringify({opportunityId:payload.opportunityId,status:'published'});
    assert.equal((await update(new Request('https://example.org',{method:'POST',body}))).status,401);
    const approved=await update(new Request('https://example.org',{method:'POST',body,headers:{'x-apply-admin-token':'fictional-test-only'}}));
    assert.equal(approved.status,200);
    const records=await listPublishedMemberOpportunities();
    assert.equal(records.length,1);
    assert.equal(records[0].listingType,'member_advertised');
  } finally {if(prior===undefined) delete process.env.APPLY_ADMIN_TOKEN; else process.env.APPLY_ADMIN_TOKEN=prior;}
});
