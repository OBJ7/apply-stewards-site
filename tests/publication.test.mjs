import test from "node:test";
import assert from "node:assert/strict";
import { publicationEligibility, canFeature } from "../shared/publication-policy.mjs";
import { normalizeExtractedDate, normalizeOpportunityInput, validateOpportunityInput, buildApplystyle } from "../shared/opportunity-utils.mjs";
import { requireAdmin } from "../netlify/lib/admin-auth.mjs";
const now = new Date("2026-10-10T14:00:00Z");
const base = {status: "published", listingType: "verified", deadline: "2026-10-10"};
test("deadline inclusive; expired at next midnight", () => {
  assert.equal(canFeature(base, now), true);
  assert.equal(canFeature(base, new Date("2026-10-11T00:00:00Z")), false);
});
test("unreviewed and member records cannot be featured", () => {
  assert.equal(canFeature({...base, status:"pending_review"}, now), false);
  assert.equal(canFeature({...base, listingType:"member_advertised"}, now), false);
});
test("unknown dates stay unknown; malformed dates do not become current", () => {
  assert.equal(publicationEligibility({...base, deadline:""}, now).reason, "deadline_unknown");
  for (const deadline of ["2026-02-30", "10 October maybe"]) assert.equal(canFeature({...base, deadline}, now), false);
  assert.equal(normalizeExtractedDate("31/02/2026"), "");
  assert.equal(normalizeExtractedDate("29/02/2024"), "2024-02-29");
});
test("automated source needs a recent, non-future check", () => {
  for (const sourceCheckedAt of ["", "2026-10-01", "2026-10-11"]) assert.equal(canFeature({...base,verificationMethod:"trusted_source_automation",sourceCheckedAt},now), false);
  assert.equal(canFeature({...base,verificationMethod:"trusted_source_automation",sourceCheckedAt:"2026-10-09"},now), true);
});
test("required fields and unsafe source schemes rejected; source survives edit", () => {
  const record=normalizeOpportunityInput({title:"Fictional fellowship",organization:"Example",category:"Fellowship",summary:"Demo",sourceUrl:"https://example.org",steps:["Read source"],tips:["Check deadline"],deadline:"2026-10-20"});
  assert.deepEqual(validateOpportunityInput(record),[]);
  assert.ok(validateOpportunityInput({...record,sourceUrl:"javascript:alert(1)"}).length);
  assert.ok(validateOpportunityInput({...record,organization:""}).length);
  const edited=normalizeOpportunityInput({...record,summary:"Edited"});
  assert.equal(edited.deadline,record.deadline);
  assert.ok(buildApplystyle(edited).includes(record.sourceUrl));
});
test("admin writes fail closed without configuration or credentials", () => {
  const prior=process.env.APPLY_ADMIN_TOKEN;
  try {
    delete process.env.APPLY_ADMIN_TOKEN;
    assert.equal(requireAdmin(new Request("https://example.org")).response.status,503);
    process.env.APPLY_ADMIN_TOKEN="fictional-test-only";
    assert.equal(requireAdmin(new Request("https://example.org")).response.status,401);
    assert.equal(requireAdmin(new Request("https://example.org",{headers:{"x-apply-admin-token":"fictional-test-only"}})).ok,true);
  } finally {if(prior===undefined) delete process.env.APPLY_ADMIN_TOKEN; else process.env.APPLY_ADMIN_TOKEN=prior;}
});
