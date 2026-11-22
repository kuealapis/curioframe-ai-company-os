let createClient;
try {
  ({ createClient } = await import("https://esm.sh/@supabase/supabase-js@2.119.2"));
} catch (primaryImportError) {
  try {
    ({ createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.2/+esm"));
  } catch (fallbackImportError) {
    const detail = fallbackImportError?.message || primaryImportError?.message || "Supabase client could not be downloaded";
    const message = document.getElementById("auth-message");
    if (message) message.textContent = "CurioFrame could not load its secure sign-in library: " + detail + ". Check your internet connection and refresh.";
    throw new Error("Supabase client import failed: " + detail);
  }
}

const SUPABASE_URL = "https://bqdshgftkzsyihlfhqak.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Lv5AbrHDcABBhcztbouegQ_sVYK8r7s";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const employeeSeed = [
  {name:"AI CEO / Orchestrator",role_key:"ai_ceo",department:"Executive Office",responsibilities:"Coordinates company goals, delegates work, and escalates consequential decisions."},
  {name:"Chief of Staff",role_key:"chief_of_staff",department:"Executive Office",responsibilities:"Coordinates Founder priorities, filters company reports, prepares decision briefs, and tracks cross-department commitments. Cannot approve strategic decisions or release content for the Founder."},
  {name:"Research Officer",role_key:"research",department:"Research",responsibilities:"Finds promising topics, verifies facts, and prepares research briefs."},
  {name:"Content Officer",role_key:"content",department:"Content Studio",responsibilities:"Turns approved research into English scripts and production assets."},
  {name:"Development Engineer",role_key:"developer",department:"Engineering",responsibilities:"Turns approved technical plans into implementation deliverables and fixes defects. Does not approve own work."},
  {name:"Marketing Officer",role_key:"marketing",department:"Digital Marketing",responsibilities:"Plans packaging, distribution, audience growth, and customer acquisition."},
  {name:"Quality Manager",role_key:"quality",department:"Quality Assurance",responsibilities:"Coordinates quality policy and escalations."},
  {name:"QC Officer",role_key:"qc",department:"Quality Control",responsibilities:"Independently checks factual accuracy, source traceability, language, timing, and production quality."},
  {name:"QA Officer",role_key:"qa",department:"Quality Assurance",responsibilities:"Audits SOP compliance, Owner instructions, revision history, evidence, and workflow quality gates."},
  {name:"Finance Officer",role_key:"finance",department:"Finance",responsibilities:"Tracks income, expenses, budgets, and reinvestment proposals."},
  {name:"Operations Officer",role_key:"operations",department:"Operations",responsibilities:"Maintains workflows, schedules, records, and operational handoffs."},
  {name:"Distribution Officer",role_key:"distribution",department:"Distribution & Channel Operations",responsibilities:"Maintains official channel registry, profile readiness, publishing calendar and queue, publication status, and analytics handoffs. Never stores platform passwords or bypasses Founder approval."}
];

let currentUser=null, company=null, operatingPolicy=null, departments=[], employees=[], tasks=[], approvals=[], allApprovals=[], contentAssets=[], agentMessages=[], qualityReviews=[], taskEvents=[], recoverySnapshots=[], workflowRuns=[], workflowSteps=[], distributionAccounts=[], distributionPublications=[], capabilityTestRuns=[], workSampleAssignments=[], hqChannel=null, selectedHQEmployeeId=null;
let aiProviderPreflightPassed=false;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function safeStorageGet(key){try{return window.localStorage.getItem(key)||""}catch(error){console.warn("Local storage unavailable:",error);return ""}}
function safeStorageSet(key,value){try{window.localStorage.setItem(key,value)}catch(error){console.warn("Could not save local preference:",error)}}
function safeStorageRemove(key){try{window.localStorage.removeItem(key)}catch(error){console.warn("Could not clear local preference:",error)}}
function setMessage(message){$("#auth-message").textContent=message}
function showAuth(){ $("#auth-screen").hidden=false; $("#app-shell").hidden=true }
function showApp(){ $("#auth-screen").hidden=true; $("#app-shell").hidden=false }
function setSystem(text){$("#system-status").innerHTML="<b></b> "+escapeHtml(text)}
function statusClass(s){return s==="in_progress"?"blue":s==="completed"||s==="published"?"green":s==="review"||s==="pending"?"amber":"gray"}
function prettyStatus(s){return String(s||"queued").replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}
function showError(error){console.error(error);alert(error.message||"Something went wrong. Please try again.")}

async function ensureCompany(){
  const {data:existing,error:readError}=await supabase.from("companies").select("*").eq("owner_id",currentUser.id).order("created_at",{ascending:true}).limit(1).maybeSingle();
  if(readError)throw readError;
  if(existing){company=existing}
  else{
    const {data:created,error:createError}=await supabase.from("companies").insert({owner_id:currentUser.id,name:"CurioFrame AI",operating_mode:"approval_based"}).select("*").single();
    if(createError)throw createError;
    company=created;
    await supabase.from("task_events").insert({company_id:company.id,event_type:"workspace_created",message:"CurioFrame AI owner workspace initialized."});
  }
  const {error:employeeError}=await supabase.from("ai_employees").upsert(employeeSeed.map(e=>({...e,company_id:company.id,status:"planned"})),{onConflict:"company_id,role_key",ignoreDuplicates:true});
  if(employeeError)throw employeeError;
}

async function loadData(){
  const [departmentRes,policyRes,employeeRes,taskRes,approvalRes,assetRes,messageRes,qualityRes,eventRes,snapshotRes,workflowRes,workflowStepRes,distributionAccountRes,distributionPublicationRes,capabilityTestRes,workSampleRes]=await Promise.all([
    supabase.from("company_departments").select("*").eq("company_id",company.id).order("priority"),
    supabase.from("company_operating_policies").select("*").eq("company_id",company.id).maybeSingle(),
    supabase.from("ai_employees").select("*").eq("company_id",company.id).order("created_at"),
    supabase.from("tasks").select("*, ai_employees(name,department)").eq("company_id",company.id).order("created_at",{ascending:false}),
    supabase.from("approvals").select("*").eq("company_id",company.id).order("created_at",{ascending:false}),
    supabase.from("content_assets").select("*").eq("company_id",company.id),
    supabase.from("agent_messages").select("*, from_employee:ai_employees!agent_messages_from_employee_id_fkey(name), to_employee:ai_employees!agent_messages_to_employee_id_fkey(name)").eq("company_id",company.id).order("created_at",{ascending:false}).limit(40),
    supabase.from("quality_reviews").select("*, ai_employees(name)").eq("company_id",company.id).order("created_at",{ascending:false}).limit(40),
    supabase.from("task_events").select("*").eq("company_id",company.id).order("created_at",{ascending:false}).limit(150),
    supabase.from("recovery_snapshots").select("*").eq("company_id",company.id).order("created_at",{ascending:false}).limit(100),
    supabase.from("workflow_runs").select("*").eq("company_id",company.id).order("created_at",{ascending:false}).limit(20),
    supabase.from("workflow_steps").select("*").eq("company_id",company.id).order("sort_order"),
    supabase.from("distribution_accounts").select("*").eq("company_id",company.id).order("platform"),
    supabase.from("distribution_publications").select("*").eq("company_id",company.id).order("created_at",{ascending:false}).limit(100),
    supabase.from("agent_capability_test_runs").select("*").eq("company_id",company.id).order("created_at",{ascending:false}).limit(500),
    supabase.from("agent_work_sample_assignments").select("*").eq("company_id",company.id).order("assigned_at")
  ]);
  for(const result of [departmentRes,policyRes,employeeRes,taskRes,approvalRes,assetRes,messageRes,qualityRes,eventRes,snapshotRes,workflowRes,workflowStepRes,distributionAccountRes,distributionPublicationRes,capabilityTestRes,workSampleRes])if(result.error)throw result.error;
  departments=departmentRes.data||[];operatingPolicy=policyRes.data||null;employees=employeeRes.data||[];tasks=taskRes.data||[];allApprovals=approvalRes.data||[];approvals=allApprovals.filter(a=>a.status==="pending");contentAssets=(assetRes.data||[]).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  agentMessages=messageRes.data||[];qualityReviews=qualityRes.data||[];taskEvents=eventRes.data||[];recoverySnapshots=snapshotRes.data||[];workflowRuns=workflowRes.data||[];workflowSteps=workflowStepRes.data||[];distributionAccounts=distributionAccountRes.data||[];distributionPublications=distributionPublicationRes.data||[];capabilityTestRuns=capabilityTestRes.data||[];workSampleAssignments=workSampleRes.data||[];
  renderAll();
}



function slugifyRole(value){
  return String(value||"").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,48);
}
function renderOrganization(){
  const deptHost=$("#org-departments"),agentHost=$("#org-agents"),deptSelect=$("#org-agent-department");
  if(!deptHost||!agentHost||!deptSelect)return;
  $("#org-department-count").textContent=String(departments.length).padStart(2,"0");
  $("#org-agent-count").textContent=String(employees.length).padStart(2,"0");
  $("#org-active-count").textContent=String(employees.filter(e=>e.status==="ready"||e.status==="working").length).padStart(2,"0");
  const policy=operatingPolicy||{};
  const policyStatus=$("#org-policy-status");if(policyStatus)policyStatus.textContent=policy.approval_mode==="spending_only"&&Number(policy.max_automatic_spend)===0?"ENFORCED POLICY":"POLICY NOT CONFIGURED";
  const policyBody=$("#org-policy-details");if(policyBody)policyBody.innerHTML="<div><strong>Founder approval:</strong> Spending and financial commitments only</div><div><strong>Automatic spending limit:</strong> Rp0</div><div><strong>Free-tier services:</strong> "+(policy.allow_free_tier_services?"Allowed":"Disabled")+"</div><div><strong>Paid services / APIs / ads:</strong> "+(policy.allow_paid_services||policy.allow_paid_api_usage||policy.allow_paid_advertising?"Not allowed without authorization":"Blocked by zero-cost policy")+"</div><div><strong>Routine operations:</strong> Autonomous; no routine Founder approval</div><div><strong>Provider verification:</strong> Human verification remains required when a platform requires it</div>";
  deptHost.innerHTML=departments.map(d=>{
    const roster=employees.filter(e=>e.department===d.name);
    const active=roster.filter(e=>e.status==="ready"||e.status==="working").length;
    return '<article class="org-department-card"><div class="org-department-top"><span class="org-department-icon">▦</span><span class="pill '+(d.status==="active"?"green":d.status==="testing"?"blue":"amber")+'">'+escapeHtml(prettyStatus(d.status))+'</span></div><h3>'+escapeHtml(d.name)+'</h3><p>'+escapeHtml(d.description)+'</p><div class="org-department-mandate">'+escapeHtml(d.mandate)+'</div><footer><strong>'+roster.length+' agents</strong><span>'+active+' operational</span></footer></article>';
  }).join("")||'<p class="muted">No departments registered.</p>';
  agentHost.innerHTML=departments.map(d=>{
    const roster=employees.filter(e=>e.department===d.name);
    if(!roster.length)return "";
    return '<section class="org-agent-group"><div class="org-agent-group-head"><strong>'+escapeHtml(d.name)+'</strong><span>'+roster.length+' roles</span></div><div class="org-agent-grid">'+roster.map(e=>'<article class="org-agent-card"><div><strong>'+escapeHtml(e.name)+'</strong><span class="pill '+(e.status==="ready"||e.status==="working"?"green":"amber")+'">'+escapeHtml(prettyStatus(e.status))+'</span></div><p>'+escapeHtml(e.responsibilities)+'</p><div class="org-agent-meta"><span>Capability: '+escapeHtml(prettyStatus(e.capability_status||"planned"))+'</span><small>ROLE KEY · '+escapeHtml(e.role_key)+'</small></div></article>').join("")+'</div></section>';
  }).join("")||'<p class="muted">No agents registered.</p>';
  const selected=deptSelect.value;
  deptSelect.innerHTML='<option value="">Choose department</option>'+departments.map(d=>'<option value="'+escapeHtml(d.name)+'">'+escapeHtml(d.name)+'</option>').join("");
  if(departments.some(d=>d.name===selected))deptSelect.value=selected;
}
async function addOrganizationDepartment(event){
  event.preventDefault();
  const button=event.submitter;button.disabled=true;
  const name=$("#org-department-name").value.trim(),description=$("#org-department-description").value.trim(),mandate=$("#org-department-mandate").value.trim();
  const slug=slugifyRole(name);
  try{
    if(!slug)throw new Error("Department name is required.");
    const {error}=await supabase.from("company_departments").insert({company_id:company.id,slug,name,description,mandate,status:"planned",priority:(departments.reduce((m,d)=>Math.max(m,Number(d.priority)||0),0)+10)});
    if(error)throw error;
    $("#organization-department-form").reset();$("#org-department-message").textContent="Department registered as PLANNED.";
    await loadData();
  }catch(error){$("#org-department-message").textContent=error.message||"Could not register department."}
  finally{button.disabled=false}
}
async function addOrganizationAgent(event){
  event.preventDefault();
  const button=event.submitter;button.disabled=true;
  const name=$("#org-agent-name").value.trim(),department=$("#org-agent-department").value,responsibilities=$("#org-agent-responsibilities").value.trim();
  const role_key=slugifyRole(name);
  try{
    if(!role_key||!department||!responsibilities)throw new Error("Complete all agent fields.");
    const {error}=await supabase.from("ai_employees").insert({company_id:company.id,name,role_key,department,responsibilities,status:"planned",capability_status:"planned",capability_profile:{source:"founder_registered",qa_required:true}});
    if(error)throw error;
    $("#organization-agent-form").reset();$("#org-agent-message").textContent="AI Agent registered as PLANNED. It will not execute work until its capability is implemented and tested.";
    await loadData();
  }catch(error){$("#org-agent-message").textContent=error.message||"Could not register agent."}
  finally{button.disabled=false}
}

function renderDistribution(){
  const accountsHost=$("#distribution-accounts"),queueHost=$("#distribution-queue-list");
  if(!accountsHost||!queueHost)return;
  const platformNames={youtube:"YouTube",tiktok:"TikTok",instagram:"Instagram",facebook:"Facebook"};
  const checks=[
    ["account_created","Account created by Founder"],
    ["email_verified","Company email verified"],
    ["two_factor_enabled","2FA / passkey enabled"],
    ["recovery_saved","Recovery method secured"],
    ["profile_complete","Brand profile and handle completed"]
  ];
  accountsHost.innerHTML=distributionAccounts.map(account=>{
    const label=platformNames[account.platform]||account.platform;
    const checklist=account.activation_checklist||{};
    const done=checks.filter(([key])=>checklist[key]===true).length;
    const verified=account.activation_status==="verified";
    const checkMarkup=checks.map(([key,text])=>'<label class="activation-check"><input type="checkbox" data-activation-check="'+key+'" data-account-id="'+account.id+'" '+(checklist[key]===true?"checked":"")+' '+(verified?"disabled":"")+'><span>'+text+'</span></label>').join("");
    return '<article class="distribution-account-card"><div class="distribution-account-head"><div><span class="eyebrow">OFFICIAL CHANNEL</span><h3>'+escapeHtml(label)+'</h3></div><span class="pill '+(verified?"green":"amber")+'">'+escapeHtml(prettyStatus(account.activation_status||"planned"))+'</span></div><label>Channel / account name<input data-account-field="account_name" data-account-id="'+account.id+'" value="'+escapeHtml(account.account_name||"CurioFrame")+'" maxlength="80"></label><label>Username / handle<input data-account-field="handle" data-account-id="'+account.id+'" value="'+escapeHtml(account.handle||"")+'" placeholder="@CurioFrame"></label><label>Profile URL<input data-account-field="profile_url" data-account-id="'+account.id+'" value="'+escapeHtml(account.profile_url||"")+'" placeholder="https://..."></label><div class="activation-panel"><div class="activation-panel-head"><strong>Account activation checklist</strong><span>'+done+'/5 complete</span></div><div class="activation-progress"><span style="width:'+(done/5*100)+'%"></span></div>'+checkMarkup+'<button class="secondary-btn activation-verify-btn" type="button" data-verify-account="'+account.id+'" '+(verified||done!==5?"disabled":"")+'>Founder verified account</button><small class="muted">Only verify after completing every item on the platform itself. This does not connect the API.</small></div><div class="distribution-account-meta"><span>Account: <strong>'+escapeHtml(prettyStatus(account.account_status))+'</strong></span><span>Connection: <strong>'+escapeHtml(prettyStatus(account.connection_status))+'</strong></span><span>Publishing: <strong>'+escapeHtml(prettyStatus(account.publishing_mode))+'</strong></span></div><div class="distribution-account-actions"><button class="secondary-btn" type="button" data-save-account="'+account.id+'">Save profile</button><span class="muted">Passwords and OTPs never belong here</span></div></article>';
  }).join("")||'<p class="muted">No platform accounts registered.</p>';
  const connected=distributionAccounts.filter(a=>a.connection_status==="connected").length;
  const queueCount=distributionPublications.filter(p=>["draft","queued","scheduled","publishing"].includes(p.status)).length;
  const count=$("#distribution-account-count"),connectedCount=$("#distribution-connected-count"),queueCountEl=$("#distribution-queue-count");
  if(count)count.textContent=String(distributionAccounts.length).padStart(2,"0");
  if(connectedCount)connectedCount.textContent=String(connected).padStart(2,"0");
  if(queueCountEl)queueCountEl.textContent=String(queueCount).padStart(2,"0");
  queueHost.innerHTML=distributionPublications.length?distributionPublications.map(item=>'<article class="distribution-queue-item"><div><strong>'+escapeHtml(item.title||"Untitled publication")+'</strong><small>'+escapeHtml(platformNames[item.platform]||item.platform)+' · '+escapeHtml(prettyStatus(item.status))+'</small><p>'+escapeHtml(item.caption||"No caption yet")+'</p></div><time>'+escapeHtml(item.scheduled_at?new Date(item.scheduled_at).toLocaleString("id-ID"):"Not scheduled")+'</time></article>').join(""):'<div class="empty-state"><strong>Publishing queue is empty</strong><p>Add a content item to prepare a manual or scheduled publication. Nothing is uploaded automatically yet.</p></div>';
}
async function saveDistributionActivationCheck(id,key,checked,input){
  const account=distributionAccounts.find(x=>x.id===id);if(!account||account.activation_status==="verified")return;
  const checklist={...(account.activation_checklist||{}),[key]:checked};
  const allKeys=["account_created","email_verified","two_factor_enabled","recovery_saved","profile_complete"];
  const status=allKeys.every(k=>checklist[k]===true)?"in_progress":(allKeys.some(k=>checklist[k]===true)?"in_progress":"planned");
  input.disabled=true;
  const {error}=await supabase.from("distribution_accounts").update({activation_checklist:checklist,activation_status:status,updated_at:new Date().toISOString()}).eq("id",id).eq("company_id",company.id);
  if(error){input.checked=!checked;input.disabled=false;showError(error);return}
  await loadData();
}
async function verifyDistributionAccount(id,button){
  const account=distributionAccounts.find(x=>x.id===id);if(!account)return;
  const checklist=account.activation_checklist||{};
  const keys=["account_created","email_verified","two_factor_enabled","recovery_saved","profile_complete"];
  if(!keys.every(k=>checklist[k]===true)){alert("Complete all activation checks first.");return}
  if(!confirm("Confirm that you personally created and verified this "+account.platform+" account, secured recovery access, and completed its profile? This records account activation only; OAuth/API remains disconnected."))return;
  button.disabled=true;
  const {error}=await supabase.from("distribution_accounts").update({activation_status:"verified",account_status:"active",activated_at:new Date().toISOString(),activation_verified_by:currentUser.id,updated_at:new Date().toISOString()}).eq("id",id).eq("company_id",company.id);
  if(error){button.disabled=false;showError(error);return}
  await loadData();alert("Account activation recorded. OAuth/API connection is still not connected.");
}
async function saveDistributionAccount(id,button){
  const account=distributionAccounts.find(x=>x.id===id);if(!account)return;
  const fields=[...document.querySelectorAll('[data-account-id="'+id+'"][data-account-field]')];
  const patch={updated_at:new Date().toISOString()};
  fields.forEach(input=>patch[input.dataset.accountField]=input.value.trim()||null);
  if(patch.account_name===null)patch.account_name="CurioFrame";
  if(patch.profile_url&&!/^https:\/\//i.test(patch.profile_url)){alert("Profile URL must start with https://");return}
  button.disabled=true;button.textContent="Saving…";
  const {error}=await supabase.from("distribution_accounts").update(patch).eq("id",id).eq("company_id",company.id);
  if(error){button.disabled=false;button.textContent="Save profile";showError(error);return}
  await loadData();alert("Channel profile details saved. Account ownership and platform connection remain unverified until Founder completes platform setup.");
}
async function createDistributionPublication(event){
  event.preventDefault();
  const form=$("#distribution-publication-form"),button=$("#distribution-publication-submit");
  const platform=$("#distribution-platform").value,title=$("#distribution-title").value.trim(),caption=$("#distribution-caption").value.trim(),dateValue=$("#distribution-scheduled-at").value;
  if(!title){alert("Enter a publication title.");return}
  const account=distributionAccounts.find(x=>x.platform===platform);
  const payload={company_id:company.id,account_id:account?.id||null,platform,title,caption,status:dateValue?"scheduled":"draft",scheduled_at:dateValue?new Date(dateValue).toISOString():null,created_by:currentUser.id};
  button.disabled=true;button.textContent="Saving…";
  const {error}=await supabase.from("distribution_publications").insert(payload);
  if(error){button.disabled=false;button.textContent="Add to queue";showError(error);return}
  form.reset();button.disabled=false;button.textContent="Add to queue";await loadData();
}

function renderOrchestrator(){
  const host=$("#orchestrator-runs");if(!host)return;
  if(!workflowRuns.length){host.innerHTML='<div class="empty-state"><strong>No active workflows yet</strong><p>Give the Orchestrator one clear goal to create its first pipeline.</p></div>';return}
  host.innerHTML=workflowRuns.map(run=>{
    const steps=workflowSteps.filter(s=>s.workflow_id===run.id).sort((a,b)=>a.sort_order-b.sort_order);
    const labels={planning:"1 · Planning & task breakdown",architecture:"2 · Architecture & UX",development:"3 · Development",qa:"3 · Independent QA",integration:"4 · Integration & release"};
    const stageOrder=["planning","architecture","development","qa","integration"];
    const progress=steps.length?Math.round(steps.filter(s=>s.status==="completed").length/steps.length*100):0;
    return '<article class="orchestrator-run"><div class="orchestrator-run-head"><div><span class="eyebrow">WORKFLOW · '+escapeHtml(run.project_type.toUpperCase())+'</span><h3>'+escapeHtml(run.goal)+'</h3></div><span class="pill '+(run.status==="release_ready"?"green":run.status==="blocked"||run.status==="failed"?"amber":"blue")+'">'+escapeHtml(run.status.replaceAll("_"," "))+'</span></div><div class="orchestrator-progress"><span style="width:'+progress+'%"></span></div><small class="muted">'+progress+'% task completion · '+steps.length+' tasks · QA retries '+run.iteration+'/3</small><div class="orchestrator-steps">'+stageOrder.map(stage=>{const rows=steps.filter(s=>s.stage===stage);if(!rows.length)return "";return '<div class="orchestrator-stage"><strong>'+labels[stage]+'</strong>'+rows.map(st=>'<div class="orchestrator-task"><span class="status-dot '+escapeHtml(st.status)+'"></span><span>'+escapeHtml(st.title)+'</span><small>'+escapeHtml(st.assigned_role_key)+' · '+escapeHtml(st.status)+'</small></div>').join("")+'</div>'}).join("")+'</div></article>';
  }).join("");
}
async function submitOrchestratorGoal(event){
  event.preventDefault();const button=$("#orchestrator-submit"),goal=$("#orchestrator-goal").value.trim(),type=$("#orchestrator-type").value;
  if(goal.length<8){$("#orchestrator-message").textContent="Write a more specific goal (at least 8 characters).";return}
  button.disabled=true;button.textContent="Planning…";$("#orchestrator-message").textContent="Orchestrator is breaking down your goal. This can take a short while.";
  try{
    const {data,error}=await supabase.functions.invoke("orchestrate-company-goal",{body:{goal,project_type:type,company_id:company.id}});
    if(error)throw error;if(data?.error)throw new Error(data.error);
    $("#orchestrator-goal").value="";$("#orchestrator-message").textContent=data.message||"Plan created.";
    await loadData();
  }catch(error){$("#orchestrator-message").textContent=error.message||"Could not create workflow."}
  finally{button.disabled=false;button.textContent="Generate pipeline →"}
}


function latestCapabilityResults(employeeId){
 const rows=capabilityTestRuns.filter(r=>r.employee_id===employeeId),latest={};
 for(const kind of ["preflight","work_sample","qa_review"])latest[kind]=rows.find(r=>r.test_kind===kind)||null;
 return latest;
}
function renderCapabilityLab(){
 const host=$("#capability-agent-list"),select=$("#capability-employee");if(!host||!select)return;
 const verified=employees.filter(e=>e.capability_status==="verified").length,preflighted=employees.filter(e=>latestCapabilityResults(e.id).preflight?.status==="passed").length;
 $("#capability-total").textContent=String(employees.length);$("#capability-preflight-total").textContent=String(preflighted);$("#capability-verified-total").textContent=String(verified);
 const selected=select.value;select.innerHTML=employees.map(e=>'<option value="'+e.id+'">'+escapeHtml(e.name)+' · '+escapeHtml(e.department)+'</option>').join("");if(employees.some(e=>e.id===selected))select.value=selected;
 host.innerHTML=employees.map(e=>{
  const latest=latestCapabilityResults(e.id),allPassed=["preflight","work_sample","qa_review"].every(k=>latest[k]?.status==="passed"),status=e.capability_status||"planned";
  const chips=["preflight","work_sample","qa_review"].map(k=>{const r=latest[k];return '<span class="capability-test-chip '+(r?.status==="passed"?"passed":r?.status==="failed"?"failed":r?.status==="blocked"?"blocked":"pending")+'">'+k.replaceAll("_"," ")+' · '+(r?r.status:"not run")+'</span>'}).join("");
  return '<article class="capability-agent-card"><div class="capability-agent-head"><div><strong>'+escapeHtml(e.name)+'</strong><small>'+escapeHtml(e.department)+' · '+escapeHtml(e.role_key)+'</small></div><span class="pill '+(status==="verified"?"green":status==="blocked"?"amber":"gray")+'">'+escapeHtml(prettyStatus(status))+'</span></div><div class="capability-test-chips">'+chips+'</div><div class="capability-actions"><button class="secondary-btn" type="button" data-capability-preflight="'+e.id+'">Run structural preflight</button><button class="primary-btn" type="button" data-capability-verify="'+e.id+'" '+(!allPassed||status==="verified"?"disabled":"")+'>Verify capability</button></div><p class="muted">'+(allPassed?"All three test gates have passing evidence. Founder can verify.":"Requires structural preflight, a real work sample, and independent QA evidence.")+'</p></article>';
 }).join("")||'<p class="muted">No agents registered.</p>';
 const history=$("#capability-test-history");if(history)history.innerHTML=capabilityTestRuns.slice(0,30).map(r=>{const emp=employees.find(e=>e.id===r.employee_id);return '<article class="activity-item"><div><strong>'+escapeHtml(emp?.name||"Unknown agent")+' · '+escapeHtml(r.test_kind.replaceAll("_"," "))+'</strong><small>'+escapeHtml(new Date(r.created_at).toLocaleString("id-ID"))+' · '+escapeHtml(r.status)+'</small><p>'+escapeHtml(r.evidence_summary||"No evidence summary")+'</p></div><span class="pill '+(r.status==="passed"?"green":r.status==="failed"?"amber":"gray")+'">'+escapeHtml(r.status)+'</span></article>'}).join("")||'<p class="muted">No capability tests recorded yet.</p>';
}
function renderWorkSampleAssignments(){
 const host=$("#work-sample-assignment-list");if(!host)return;
 const queued=workSampleAssignments.filter(a=>a.status==="queued").length,active=workSampleAssignments.filter(a=>a.status==="in_progress").length,submitted=workSampleAssignments.filter(a=>["submitted","qa_passed","qa_failed"].includes(a.status)).length;
 const q=$("#work-sample-queued-count"),a=$("#work-sample-active-count"),s=$("#work-sample-submitted-count");
 if(q)q.textContent=String(queued);if(a)a.textContent=String(active);if(s)s.textContent=String(submitted);
 host.innerHTML=workSampleAssignments.map(item=>{const agent=employees.find(e=>e.id===item.employee_id);return '<article class="capability-agent-card"><div class="capability-agent-head"><div><strong>'+escapeHtml(agent?.name||"Unknown agent")+'</strong><small>'+escapeHtml(agent?.department||"")+' · '+escapeHtml(agent?.role_key||"")+'</small></div><span class="pill '+(item.status==="qa_passed"?"green":item.status==="qa_failed"||item.status==="blocked"?"amber":"gray")+'">'+escapeHtml(prettyStatus(item.status))+'</span></div><h3>'+escapeHtml(item.assignment_title)+'</h3><p>'+escapeHtml(item.task_brief)+'</p><div class="capability-actions">'+(["queued","in_progress"].includes(item.status)?'<button class="primary-btn" type="button" data-work-sample-run="'+item.id+'">Run this Agent</button>':'')+'</div>'+(item.submission_summary?'<p class="muted">Submission: '+escapeHtml(item.submission_summary)+'</p>':'')+(item.qa_notes?'<p class="muted">QA: '+escapeHtml(item.qa_notes)+'</p>':'')+'</article>'}).join("")||'<p class="muted">No work sample assignments found.</p>';
}
async function checkAIProviderPreflight(button){
 const confirmBox=$("#pilot-zero-cost-confirm"),status=$("#work-sample-batch-status"),pilotButton=$("#run-one-work-sample");
 if(!confirmBox?.checked){if(status)status.textContent="Provider preflight locked: first confirm the verified zero-cost condition.";return}
 aiProviderPreflightPassed=false;if(pilotButton)pilotButton.disabled=true;
 button.disabled=true;if(status)status.textContent="Checking server configuration only. No Gemini API request will be made…";
 try{
  const {data,error}=await supabase.functions.invoke("run-agent-work-sample-batch",{body:{company_id:company.id,confirmed_zero_cost:true,preflight_only:true}});
  if(error)throw error;
  if(data?.provider_configured&&data?.zero_cost_policy){
   aiProviderPreflightPassed=true;
   if(status)status.textContent="PREFLIGHT PASSED · Gemini key is present and company policy blocks paid usage. No Gemini call was made. IMPORTANT: Google AI Studio billing/free-tier status cannot be verified by this server; the Founder must confirm it before starting the pilot.";
   if(pilotButton)pilotButton.disabled=false;
  }else{
   if(status)status.textContent="PREFLIGHT BLOCKED · "+(data?.message||"Gemini key or zero-cost policy is not ready.")+". No AI request was made.";
  }
 }catch(error){
  if(status)status.textContent="PREFLIGHT ERROR · "+(error?.message||"Could not check server configuration.")+". No Gemini request was made.";
 }finally{button.disabled=false}
}

async function runWorkSampleAssignment(assignmentId,button){
 const confirmBox=$("#pilot-zero-cost-confirm"),status=$("#work-sample-batch-status");
 if(!confirmBox?.checked||!aiProviderPreflightPassed){if(status)status.textContent="Pilot locked: confirm the zero-cost condition and complete the no-cost provider preflight first.";return}
 const target=workSampleAssignments.find(x=>x.id===assignmentId&&["queued","in_progress"].includes(x.status));
 if(!target){if(status)status.textContent="This assignment is no longer eligible. Refresh the records before retrying.";return}
 const agent=employees.find(e=>e.id===target.employee_id),agentName=agent?.name||"the selected Agent";
 if(!confirm("Run exactly ONE real work sample for "+agentName+"? This calls the configured Gemini API. No other Agent will be started. The deliverable remains unapproved until independent QA."))return;
 const runButton=button||$("#run-one-work-sample");if(runButton)runButton.disabled=true;
 if(status)status.textContent="Running one real work sample: "+agentName+". Waiting for the deliverable…";
 try{
  const {data,error}=await supabase.functions.invoke("run-agent-work-sample-batch",{body:{company_id:company.id,assignment_id:target.id,confirmed_zero_cost:true}});
  if(error)throw error;
  await loadData();
  if(data?.done){if(status)status.textContent="The executor did not find an eligible assignment. Refresh and inspect the queue.";return}
  if(data?.ok&&data.status==="submitted"){
   if(status)status.textContent="PILOT SUBMITTED · "+(data.employee||agentName)+". Task: "+(data.task_id||"saved")+". Inspect the saved task and deliverable; independent QA is still required.";
  }else{
   if(status)status.textContent="PILOT STOPPED · "+(data?.employee||agentName)+": "+(data?.error||data?.detail||"Execution did not complete.")+". Inspect the assignment and task before retrying.";
  }
 }catch(error){
  if(status)status.textContent="PILOT ERROR · "+(error?.message||"The executor could not be reached.")+". No second Agent was started.";
  console.error("One-agent work sample failed:",error);
  try{await loadData()}catch(refreshError){console.error("Could not refresh after pilot error:",refreshError)}
 }finally{
  if(runButton)runButton.disabled=false;
  const globalButton=$("#run-one-work-sample");if(globalButton)globalButton.disabled=!confirmBox?.checked;
 }
}
async function runOneWorkSample(){
 const eligible=workSampleAssignments.filter(x=>["queued","in_progress"].includes(x.status));
 if(!eligible.length){const status=$("#work-sample-batch-status");if(status)status.textContent="No queued or in-progress work sample remains.";return}
 return runWorkSampleAssignment(eligible[0].id,$("#run-one-work-sample"));
}

function runDispatcherQADryRun(){
 const host=$("#safe-simulation-results");if(!host)return;
 const queue=workSampleAssignments.filter(x=>["queued","in_progress"].includes(x.status));
 if(!queue.length){host.innerHTML='<p class="muted">No eligible assignments for dry-run routing.</p>';return}
 const routed=queue.map((item,index)=>{
  const agent=employees.find(e=>e.id===item.employee_id);
  const checks={
   agent_exists:!!agent,
   role_registered:!!agent?.role_key,
   department_registered:!!agent?.department&&departments.some(d=>d.name===agent.department),
   assignment_title:!!String(item.assignment_title||"").trim(),
   task_brief: String(item.task_brief||"").trim().length>=20,
   expected_artifact:!!String(item.expected_artifacts||"").trim()
  };
  const passed=Object.values(checks).every(Boolean);
  return {index:index+1,item,agent,checks,passed};
 });
 const ready=routed.filter(x=>x.passed).length,blocked=routed.length-ready;
 const esc=escapeHtml;
 host.innerHTML='<div class="notice" style="margin:12px 0"><span>ⓘ</span><div><strong>DISPATCHER + QA DRY RUN · SIMULATION ONLY</strong><p>'+routed.length+' routing decision(s) evaluated in browser memory. No tasks were dispatched, no assignments changed, no QA verdict was recorded, and no API/provider was called.</p></div></div><div class="distribution-summary-grid"><article class="stat-card"><div class="stat-label">ROUTES CHECKED</div><div class="stat-value">'+routed.length+'</div></article><article class="stat-card"><div class="stat-label">STRUCTURALLY READY</div><div class="stat-value">'+ready+'</div></article><article class="stat-card"><div class="stat-label">BLOCKED BY CHECKS</div><div class="stat-value">'+blocked+'</div></article></div>'+routed.map(r=>{
  const checkHtml=Object.entries(r.checks).map(([k,v])=>'<li>'+esc(k.replaceAll("_"," "))+' · <strong>'+(v?'PASS':'FAIL')+'</strong></li>').join("");
  return '<article class="capability-agent-card"><div class="capability-agent-head"><div><strong>'+esc(r.index+'. '+(r.agent?.name||"Unassigned agent"))+'</strong><small>'+esc(r.agent?.role_key||"no role")+' · '+esc(r.agent?.department||"no department")+'</small></div><span class="pill '+(r.passed?'green':'amber')+'">'+(r.passed?'ROUTE CHECK PASSED':'ROUTE BLOCKED')+'</span></div><h3>'+esc(r.item.assignment_title||"Untitled assignment")+'</h3><p>'+esc(r.item.task_brief||"No task brief")+'</p><p><strong>Dispatcher target:</strong> '+esc(r.agent?.name||"None")+' / '+esc(r.agent?.role_key||"unassigned")+'</p><p><strong>QA structural checklist:</strong></p><ul>'+checkHtml+'</ul><p class="muted">QA verdict: NOT PERFORMED. Passing these structural checks only means the route is eligible for a real work sample; output quality and factual correctness remain untested.</p></article>'
 }).join("");
 const status=$("#work-sample-batch-status");if(status)status.textContent="Dispatcher/QA dry run: "+ready+" structurally ready · "+blocked+" blocked · "+routed.length+" checked · 0 tasks created · 0 API calls.";
}


async function submitResearchEvidencePack(event){
 event.preventDefault();
 const button=$("#research-evidence-submit"),status=$("#work-sample-batch-status"),host=$("#safe-simulation-results");
 const topic=$("#research-evidence-topic").value.trim();
 const question=$("#research-evidence-question").value.trim();
 const rows=$("#research-evidence-claims").value.split("\n").map(x=>x.trim()).filter(Boolean);
 if(!company?.id||!currentUser?.id){if(host)host.innerHTML='<p class="notice">Sign in to the company workspace first.</p>';return}
 const researcher=employees.find(e=>String(e.role_key||"").toLowerCase()==="research");
 const policy=operatingPolicy;
 if(!researcher){if(host)host.innerHTML='<p class="notice">BLOCKED: Research Officer is not registered.</p>';return}
 if(!policy||policy.approval_mode!=="spending_only"||Number(policy.max_automatic_spend)!==0||policy.allow_paid_services!==false||policy.allow_paid_api_usage!==false){if(host)host.innerHTML='<p class="notice">BLOCKED: zero-spend policy could not be positively verified. Nothing was saved.</p>';return}
 if(topic.length<5||question.length<10||rows.length<2){if(host)host.innerHTML='<p class="notice">Add a clear topic, research question, and at least two claim-evidence-source rows.</p>';return}
 const parsed=[];
 for(let i=0;i<rows.length;i++){
  const parts=rows[i].split("|").map(x=>x.trim());
  if(parts.length<3||!parts[0]||!parts[1]||!parts[2]){if(host)host.innerHTML='<p class="notice">Row '+(i+1)+' must use: Claim | Supporting evidence note | Source URL</p>';return}
  let url;try{url=new URL(parts.slice(2).join("|"))}catch{if(host)host.innerHTML='<p class="notice">Row '+(i+1)+' has an invalid source URL.</p>';return}
  if(!["http:","https:"].includes(url.protocol)){if(host)host.innerHTML='<p class="notice">Only HTTP(S) source URLs are accepted.</p>';return}
  parsed.push({claim:parts[0],evidence_note:parts[1],source_url:url.href,domain:url.hostname.toLowerCase().replace(/^www\./,"")});
 }
 const domains=[...new Set(parsed.map(x=>x.domain))];
 if(domains.length<2){if(host)host.innerHTML='<p class="notice">Use at least two distinct source domains. This checks domain diversity only, not source credibility.</p>';return}
 if(button){button.disabled=true;button.textContent="Saving evidence packet…"}
 let taskId=null,assetId=null;
 try{
  const taskResult=await supabase.from("tasks").insert({
   company_id:company.id,title:"Research evidence validation · "+topic.slice(0,90),
   objective:"RESEARCH EVIDENCE REVIEW — Founder-submitted draft. Topic: "+topic+". Question: "+question+". Inspect each claim, open and verify every cited source, confirm the evidence directly supports the claim, identify publication dates/primary sources, flag contradictions, and produce an independently checked research brief. Do not mark approved until source content has actually been reviewed. No AI provider/API calls are authorized by this task.",
   assigned_employee_id:researcher.id,status:"queued",priority:"normal",created_by:currentUser.id
  }).select("id").single();
  if(taskResult.error)throw taskResult.error;
  taskId=taskResult.data.id;
  const body=[
   "FOUNDER-SUBMITTED RESEARCH EVIDENCE DRAFT — NOT VERIFIED",
   "This is a structured evidence intake packet, not a completed or approved research report.",
   "Topic: "+topic,
   "Research question: "+question,
   "Claims and submitted evidence:",
   ...parsed.map((x,i)=>[
    (i+1)+". Claim: "+x.claim,
    "Evidence note (user supplied; not independently checked): "+x.evidence_note,
    "Source URL (not fetched or verified by this workflow): "+x.source_url,
    "Source domain: "+x.domain
   ].join("\n")),
   "Distinct source domains submitted: "+domains.join(", "),
   "Required next step: Research Officer must inspect each source, verify publication details and claim support, add source-backed findings, note uncertainty/contradictions, and route for independent QA.",
   "Verification status: NOT VERIFIED. No source pages were fetched by this workflow.",
   "Publication status: BLOCKED pending source verification and independent QA.",
   "Provider/API calls: 0."
  ].join("\n\n");
  const assetResult=await supabase.from("content_assets").insert({company_id:company.id,task_id:taskId,title:"Research Evidence Draft · "+topic.slice(0,100)+" · NOT VERIFIED",asset_type:"research_brief",status:"review",body}).select("id").single();
  if(assetResult.error)throw assetResult.error;
  assetId=assetResult.data.id;
  const event=await supabase.from("task_events").insert({company_id:company.id,task_id:taskId,employee_id:researcher.id,event_type:"research_evidence_packet_submitted",message:"Founder-submitted claim/evidence/source packet queued for Research Officer verification. It remains NOT VERIFIED.",metadata:{source_asset_id:assetId,claims_count:parsed.length,distinct_source_domains:domains.length,source_urls_submitted:parsed.length,source_pages_fetched:false,provider_called:false,verification_status:"not_verified"}}).select("id").single();
  if(event.error)throw event.error;
  await loadData();
  if(host)host.innerHTML='<div class="notice" style="margin:12px 0"><strong>RESEARCH EVIDENCE PACK SAVED · NOT VERIFIED</strong><p>Founder-submitted evidence has been routed to the Research Officer for source inspection. URL format and domain diversity were checked; source content and claim accuracy were not.</p></div><article class="capability-agent-card"><ul><li>Research asset: <code>'+escapeHtml(assetId)+'</code> · review</li><li>Research task: <code>'+escapeHtml(taskId)+'</code> · queued</li><li>Claim/source rows: <strong>'+parsed.length+'</strong></li><li>Distinct source domains: <strong>'+domains.length+'</strong></li><li>Submission event: <strong>SAVED</strong> · <code>'+escapeHtml(event.data.id)+'</code></li><li>Source pages fetched: <strong>NO</strong></li><li>Provider/API calls: <strong>0</strong></li></ul><p>Content intake must remain blocked until the Research Officer has actually verified the sources and independent QA has reviewed the resulting brief.</p></article>';
  if(status)status.textContent="Research evidence draft saved and assigned to Research Officer. Not verified; zero provider/API calls.";
  $("#research-evidence-form").reset();
 }catch(error){
  if(taskId&&!assetId)await supabase.from("tasks").delete().eq("id",taskId).eq("company_id",company.id);
  if(host)host.innerHTML='<p class="notice">EVIDENCE PACK SAVE FAILED: '+escapeHtml(error?.message||"Unknown database error")+'. Check database records before retrying.</p>';
  if(status)status.textContent="Research evidence pack failed to save. No AI provider was called.";
 }finally{if(button){button.disabled=false;button.textContent="Save & Queue Research Verification"}}
}
async function runResearchSourceVerification(){
 const button=$("#run-source-verification"),host=$("#source-verification-results"),status=$("#work-sample-batch-status");
 if(!company?.id||!currentUser?.id){if(host)host.innerHTML='<p class="notice">Sign in to the company workspace first.</p>';return}
 const policy=operatingPolicy;
 if(!policy||policy.approval_mode!=="spending_only"||Number(policy.max_automatic_spend)!==0||policy.allow_paid_services!==false||policy.allow_paid_api_usage!==false){if(host)host.innerHTML='<p class="notice">BLOCKED: zero-spend policy could not be positively verified.</p>';return}
 if(button){button.disabled=true;button.textContent="Retrieving public source pages…"}
 if(host)host.innerHTML='<p class="muted">Loading the latest Research Evidence Draft…</p>';
 try{
  const {data:asset,error}=await supabase.from("content_assets").select("id,title,body,task_id,status").eq("company_id",company.id).eq("asset_type","research_brief").like("title","Research Evidence Draft%").order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(error)throw error;
  if(!asset?.id||!asset.task_id)throw new Error("No Research Evidence Draft found. Submit a Research Evidence Pack first.");
  const matches=[...String(asset.body||"").matchAll(/Source URL \(not fetched or verified by this workflow\): (https:\/\/\S+)/g)];
  const urls=[...new Set(matches.map(m=>m[1]))];
  if(!urls.length)throw new Error("No source URLs were found in the latest evidence asset.");
  if(urls.length>5)throw new Error("This safe retrieval run is limited to 5 URLs.");
  const {data,error:invokeError}=await supabase.functions.invoke("verify-research-sources",{body:{source_urls:urls}});
  if(invokeError)throw invokeError;
  if(data?.error)throw new Error(data.error);
  const results=Array.isArray(data?.results)?data.results:[];
  const event=await supabase.from("task_events").insert({
   company_id:company.id,task_id:asset.task_id,event_type:"research_source_retrieval_completed",
   message:"Public source page retrieval completed. Results remain pending human source and claim review; no factual verification or approval was performed.",
   metadata:{source_asset_id:asset.id,engine:data?.engine||"CurioFrame Source Retrieval v1",provider_called:false,source_pages_requested:urls.length,source_pages_fetched:results.filter(x=>x.fetched).length,verification_status:"retrieved_pending_human_review",results}
  }).select("id").single();
  if(event.error)throw event.error;
  const fetched=results.filter(x=>x.fetched).length;
  const cards=results.map(r=>'<article class="capability-agent-card" style="margin:10px 0"><strong>'+escapeHtml(r.status||"unknown")+'</strong><p><a href="'+escapeHtml(r.url||"#")+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(r.url||"")+'</a></p><ul><li>HTTP: '+escapeHtml(String(r.http_status??"—"))+'</li><li>Page title: '+escapeHtml(r.title||"Not detected")+'</li><li>Published date: '+escapeHtml(r.published_date||"Not detected")+'</li><li>Description: '+escapeHtml(r.description||"Not detected")+'</li></ul><p>'+escapeHtml(r.reason||r.notice||"")+'</p><p><strong>Retrieved excerpt:</strong> '+escapeHtml(r.excerpt||"No readable text extracted.")+'</p></article>').join("");
  if(host)host.innerHTML='<div class="notice" style="margin:12px 0"><strong>SOURCE PAGES RETRIEVED · HUMAN REVIEW REQUIRED</strong><p>'+fetched+' of '+results.length+' pages retrieved. This is metadata/text retrieval only—not a source credibility check, fact-check, claim-support verdict, or approval.</p><p>Asset: <code>'+escapeHtml(asset.id)+'</code> · Task remains queued. Event: <code>'+escapeHtml(event.data.id)+'</code>. Provider/API calls: 0.</p></div>'+cards;
  if(status)status.textContent="Source retrieval completed: "+fetched+"/"+results.length+" pages fetched. Human review still required; no provider/API calls.";
  await loadData();
 }catch(error){
  if(host)host.innerHTML='<p class="notice">SOURCE RETRIEVAL FAILED: '+escapeHtml(error?.message||"Unknown error")+'. The research asset remains unapproved.</p>';
  if(status)status.textContent="Source retrieval failed. No AI provider was called.";
 }finally{if(button){button.disabled=false;button.textContent="↻ Run Source Verification (public page retrieval)"}}
}
async function runResearchContentRealHandoff(){
 const host=$("#safe-simulation-results"),status=$("#work-sample-batch-status");
 if(!host)return;
 const research=employees.find(e=>String(e.role_key||"").toLowerCase()==="research");
 const content=employees.find(e=>String(e.role_key||"").toLowerCase()==="content");
 const policy=operatingPolicy;
 if(!company?.id||!currentUser?.id){host.innerHTML='<p class="notice">Sign in to the company workspace before running this handoff.</p>';return}
 if(!research||!content){host.innerHTML='<p class="notice">BLOCKED: Research Officer or Content Officer is not registered.</p>';return}
 if(!policy||policy.approval_mode!=="spending_only"||Number(policy.max_automatic_spend)!==0||policy.allow_paid_services!==false||policy.allow_paid_api_usage!==false){
  host.innerHTML='<p class="notice">BLOCKED: zero-spend policy could not be positively verified. No records were written.</p>';return;
 }
 const button=$("#run-research-content-handoff");if(button){button.disabled=true;button.textContent="Creating handoff…"}
 const packetTitle="Research → Content Handoff Test Packet (NOT VERIFIED)";
 const packetBody=[
  "HANDOFF TEST FIXTURE — NOT VERIFIED RESEARCH",
  "This record exists only to test persistent inter-department data transfer.",
  "It was not researched, fact-checked, or authored by an executing AI agent.",
  "Topic: [TEST TOPIC — replace with a real research brief after agent execution is safely enabled].",
  "Claims: [NO FACTUAL CLAIMS PROVIDED].",
  "Source references: [NONE].",
  "Required Content Officer action: confirm receipt, inspect source status, and do not draft factual narration until a real, independently reviewed research brief is available.",
  "Publication status: BLOCKED / NOT APPROVED.",
  "Cost/provider status: no AI provider or external API was called."
 ].join("\n");
 let assetId=null,taskId=null;
 try{
  const assetResult=await supabase.from("content_assets").insert({company_id:company.id,title:packetTitle,asset_type:"research_brief",status:"review",body:packetBody}).select("id").single();
  if(assetResult.error)throw assetResult.error;
  assetId=assetResult.data.id;
  const objective="RECEIVE RESEARCH HANDOFF — source asset "+assetId+".\n\n"+packetBody+"\n\nDo not call any AI provider. This queued task is a persistent routing test only; await a genuine Owner-reviewed research asset before producing factual content.";
  const taskResult=await supabase.from("tasks").insert({company_id:company.id,title:"Receive Research Handoff · "+new Date().toISOString().slice(0,10),objective,assigned_employee_id:content.id,status:"queued",priority:"normal",created_by:currentUser.id}).select("id").single();
  if(taskResult.error)throw taskResult.error;
  taskId=taskResult.data.id;
  const eventResult=await supabase.from("task_events").insert([
   {company_id:company.id,task_id:taskId,employee_id:research.id,event_type:"department_handoff_sent",message:"Research → Content handoff packet created as an explicitly unverified test fixture.",metadata:{from_role:"research",to_role:"content",source_asset_id:assetId,fixture:true,source_status:"review",provider_called:false}},
   {company_id:company.id,task_id:taskId,employee_id:content.id,event_type:"department_handoff_received",message:"Content Officer queue received the Research handoff and source asset reference.",metadata:{from_role:"research",to_role:"content",source_asset_id:assetId,fixture:true,task_status:"queued",provider_called:false}}
  ]);
  if(eventResult.error)throw eventResult.error;
  await loadData();
  host.innerHTML='<div class="notice" style="margin:12px 0"><span>✓</span><div><strong>REAL HANDOFF RECORDS CREATED · 2/2 EVENTS SAVED</strong><p>Research packet persisted and routed into the Content Officer task queue. This is a real database handoff using a clearly labelled test fixture, not a claim that an AI agent performed research.</p></div></div><article class="capability-agent-card"><div class="capability-agent-head"><div><strong>Research → Content</strong><small>Persistent source-to-task transfer</small></div><span class="pill green">HANDOFF RECORDED</span></div><ul><li>Source asset: <code>'+escapeHtml(assetId)+'</code> · status <strong>review</strong></li><li>Receiving task: <code>'+escapeHtml(taskId)+'</code> · status <strong>queued</strong></li><li>Research event: <strong>SAVED</strong></li><li>Content receipt event: <strong>SAVED</strong></li><li>Provider/API calls: <strong>0</strong></li><li>Agent capability status changes: <strong>0</strong></li></ul><p class="muted">The Content task is intentionally not executed. The source packet is NOT VERIFIED and is not Owner-approved; existing content execution gates must not be bypassed.</p></article>';
  if(status)status.textContent="Real Research → Content handoff recorded. 1 source asset, 1 queued Content task, 2 persisted events, 0 provider calls, 0 capability changes.";
 }catch(error){
  if(assetId&&!taskId)await supabase.from("content_assets").delete().eq("id",assetId).eq("company_id",company.id);
  host.innerHTML='<p class="notice">HANDOFF FAILED: '+escapeHtml(error?.message||"Unknown database error")+'. Check the database before retrying; duplicate records may need inspection.</p>';
  if(status)status.textContent="Research → Content handoff failed. No AI provider was called.";
 }finally{if(button){button.disabled=false;button.textContent="⇢ Run Research → Content Real Handoff"}}
}
async function runContentIntakeSourceValidation(){
 const host=$("#safe-simulation-results"),status=$("#work-sample-batch-status");
 const button=$("#run-content-intake-validation");
 if(!host)return;
 if(!company?.id||!currentUser?.id){host.innerHTML='<p class="notice">Sign in to the company workspace before validating intake.</p>';return}
 const content=employees.find(e=>String(e.role_key||"").toLowerCase()==="content");
 const policy=operatingPolicy;
 if(!content){host.innerHTML='<p class="notice">BLOCKED: Content Officer is not registered.</p>';return}
 if(!policy||policy.approval_mode!=="spending_only"||Number(policy.max_automatic_spend)!==0||policy.allow_paid_services!==false||policy.allow_paid_api_usage!==false){
  host.innerHTML='<p class="notice">BLOCKED: zero-spend policy could not be positively verified. No records were written.</p>';return;
 }
 if(button){button.disabled=true;button.textContent="Validating source…"}
 try{
  const assetResult=await supabase.from("content_assets").select("id,title,asset_type,status,body,created_at").eq("company_id",company.id).eq("title","Research → Content Handoff Test Packet (NOT VERIFIED)").order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(assetResult.error)throw assetResult.error;
  const asset=assetResult.data;
  if(!asset)throw new Error("No Research handoff packet found. Run the Research → Content Real Handoff first.");
  const taskResult=await supabase.from("tasks").select("id,title,status,assigned_employee_id,objective").eq("company_id",company.id).eq("assigned_employee_id",content.id).ilike("objective","%"+asset.id+"%").order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(taskResult.error)throw taskResult.error;
  const task=taskResult.data;
  if(!task)throw new Error("Receiving Content task linked to this source asset was not found.");
  const body=String(asset.body||"");
  const checks=[
   {key:"source_asset_exists",label:"Source asset exists in company workspace",pass:Boolean(asset.id)},
   {key:"source_type",label:"Asset type is research_brief",pass:asset.asset_type==="research_brief"},
   {key:"source_status",label:"Source has approved status",pass:asset.status==="approved"},
   {key:"verification_marker",label:"Source is not marked NOT VERIFIED",pass:!(/NOT VERIFIED|NOT VERIFIED RESEARCH/i.test(body+" "+asset.title))},
   {key:"claims_present",label:"Research claims are present",pass:!(/NO FACTUAL CLAIMS PROVIDED|Claims:\s*\[NO FACTUAL CLAIMS/i.test(body))},
   {key:"source_references",label:"Source references are present",pass:!(/Source references:\s*\[NONE\]/i.test(body))},
   {key:"content_task_link",label:"Receiving task is assigned to Content Officer",pass:task.assigned_employee_id===content.id&&task.objective.includes(asset.id)}
  ];
  const passed=checks.filter(x=>x.pass).length,blocked=checks.length-passed;
  const reasons=checks.filter(x=>!x.pass).map(x=>x.key);
  const eventResult=await supabase.from("task_events").insert({
   company_id:company.id,task_id:task.id,employee_id:content.id,
   event_type:"content_intake_source_validation_blocked",
   message:"Content intake validation completed. Source failed evidence checks; no factual content was generated and the task was blocked.",
   metadata:{source_asset_id:asset.id,source_status:asset.status,validation_passed:passed,validation_total:checks.length,failed_checks:reasons,decision:"BLOCKED_NOT_VERIFIED",agent_execution:false,provider_called:false,fixture:true}
  }).select("id").single();
  if(eventResult.error)throw eventResult.error;
  const update=await supabase.from("tasks").update({status:"blocked"}).eq("id",task.id).eq("company_id",company.id).eq("status","queued").select("id,status").maybeSingle();
  if(update.error)throw update.error;
  const taskStatus=update.data?.status||task.status;
  const list=checks.map(x=>'<li><strong>'+(x.pass?'PASS':'BLOCK')+'</strong> · '+escapeHtml(x.label)+'</li>').join("");
  host.innerHTML='<div class="notice" style="margin:12px 0"><strong>CONTENT INTAKE VALIDATION RECORDED · '+passed+'/'+checks.length+' CHECKS PASSED</strong><p>Decision: <strong>BLOCKED — SOURCE NOT VERIFIED</strong>. This is a deterministic intake-gate test, not an autonomous agent execution.</p></div><article class="capability-agent-card"><div class="capability-agent-head"><div><strong>Content Officer · Source Intake</strong><small>Persisted validation event</small></div><span class="pill">'+(blocked?'BLOCKED':'REVIEW')+'</span></div><ul>'+list+'</ul><p>Source asset: <code>'+escapeHtml(asset.id)+'</code> · '+escapeHtml(asset.status)+'</p><p>Receiving task: <code>'+escapeHtml(task.id)+'</code> · '+escapeHtml(taskStatus)+'</p><p>Validation event: <code>'+escapeHtml(eventResult.data.id)+'</code> · SAVED</p><p>Factual draft generated: <strong>NO</strong> · Provider/API calls: <strong>0</strong> · Capability changes: <strong>0</strong></p></article>';
  if(status)status.textContent="Content intake validation recorded. "+passed+"/"+checks.length+" checks passed; source blocked; no factual draft or provider call.";
  await loadData();
 }catch(error){
  host.innerHTML='<p class="notice">INTAKE VALIDATION FAILED: '+escapeHtml(error?.message||"Unknown database error")+'. No AI provider was called.</p>';
  if(status)status.textContent="Content intake validation failed. Inspect records before retrying.";
 }finally{if(button){button.disabled=false;button.textContent="✓ Run Content Intake & Source Validation"}}
}
function runDepartmentIntegrationDryRun(){
 const host=$("#safe-simulation-results");if(!host)return;
 const flows=[
  {name:"Research → Content",roles:["research","content"],purpose:"Transfer sourced research into a content brief."},
  {name:"Content → Quality",roles:["content","quality"],purpose:"Submit a content draft for independent review."},
  {name:"Quality → Distribution",roles:["quality","distribution"],purpose:"Allow only QA-approved content to enter the publishing queue.",gate:"quality"},
  {name:"Marketing → Distribution",roles:["marketing","distribution"],purpose:"Coordinate campaign assets and distribution handoff."},
  {name:"Finance → Operations",roles:["finance","operations"],purpose:"Share budget and resource-control information."},
  {name:"AI CEO → Chief of Staff → Dispatcher",roles:["ai_ceo","chief_of_staff","operations"],purpose:"Translate executive direction into coordinated operational work."}
 ];
 const results=flows.map(flow=>{
  const agents=flow.roles.map(role=>employees.find(e=>String(e.role_key||"").toLowerCase()===role));
  const roleChecks=flow.roles.map((role,i)=>({label:role+" agent exists",ok:!!agents[i]}));
  const deptChecks=agents.map((agent,i)=>({label:flow.roles[i]+" department registered",ok:!!agent?.department&&departments.some(d=>d.name===agent.department)}));
  const checks=[...roleChecks,...deptChecks];
  if(flow.gate)checks.push({label:"QA gate owner present (not an actual QA verdict)",ok:!!employees.find(e=>String(e.role_key||"").toLowerCase()===flow.gate)});
  return {...flow,checks,passed:checks.every(c=>c.ok)};
 });
 const passed=results.filter(x=>x.passed).length,blocked=results.length-passed,esc=escapeHtml;
 host.innerHTML='<div class="notice" style="margin:12px 0"><span>ⓘ</span><div><strong>DEPARTMENT INTEGRATION DRY RUN · SIMULATION ONLY</strong><p>'+results.length+' inter-department handoffs checked against registered agents and departments in browser memory. No tasks/messages were sent, no records changed, and no external API/provider was called.</p></div></div><div class="distribution-summary-grid"><article class="stat-card"><div class="stat-label">HANDOFFS CHECKED</div><div class="stat-value">'+results.length+'</div></article><article class="stat-card"><div class="stat-label">STRUCTURALLY CONNECTED</div><div class="stat-value">'+passed+'</div></article><article class="stat-card"><div class="stat-label">BLOCKED</div><div class="stat-value">'+blocked+'</div></article></div>'+results.map(flow=>'<article class="capability-agent-card"><div class="capability-agent-head"><div><strong>'+esc(flow.name)+'</strong><small>'+esc(flow.purpose)+'</small></div><span class="pill '+(flow.passed?'green':'amber')+'">'+(flow.passed?'HANDOFF STRUCTURE PASSED':'HANDOFF BLOCKED')+'</span></div><p><strong>Route:</strong> '+esc(flow.roles.join(' → '))+'</p><ul>'+flow.checks.map(c=>'<li>'+esc(c.label)+' · <strong>'+(c.ok?'PASS':'FAIL')+'</strong></li>').join('')+'</ul>'+(flow.gate?'<p class="muted">QA approval is NOT evaluated by this dry run. This check only confirms a QA role exists; publishing must still be held until a real independent QA pass is recorded.</p>':'')+'</article>').join('');
 const status=$("#work-sample-batch-status");if(status)status.textContent="Department integration dry run: "+passed+" structurally connected · "+blocked+" blocked · "+results.length+" handoffs · 0 messages/tasks · 0 API calls.";
}

function runSafeWorkSampleSimulation(){
 const host=$("#safe-simulation-results");if(!host)return;
 const queue=workSampleAssignments.filter(x=>["queued","in_progress"].includes(x.status));
 if(!queue.length){host.innerHTML='<p class="muted">No queued or in-progress assignments to simulate.</p>';return}
 host.innerHTML='<p class="muted">Running local-only simulation…</p>';
 const rows=queue.map((item,index)=>{
  const agent=employees.find(e=>e.id===item.employee_id);
  const role=agent?.role_key||"unassigned";
  const checks=["Role and responsibility mapped","Assignment brief loaded","Expected artifact checklist generated","QA handoff prepared","No external provider called"];
  const expected=item.expected_artifacts;
  const expectedText=Array.isArray(expected)
   ? expected.map(entry=>{
      if(typeof entry==="string")return entry;
      if(entry&&typeof entry==="object")return Object.entries(entry).map(([key,value])=>key.replace(/_/g," ")+": "+(Array.isArray(value)?value.join(", "):(value&&typeof value==="object"?JSON.stringify(value):String(value)))).join(" · ");
      return String(entry);
     }).join("; ")
   : expected&&typeof expected==="object"
    ? Object.entries(expected).map(([key,value])=>key.replace(/_/g," ")+": "+(Array.isArray(value)?value.join(", "):(value&&typeof value==="object"?JSON.stringify(value):String(value)))).join("; ")
    : String(expected||"Role-specific deliverable requirements not supplied");
  const artifact="SIMULATED CHECKLIST — "+expectedText;
  return {index:index+1,name:agent?.name||"Unknown agent",role,title:item.assignment_title,brief:item.task_brief,checks,artifact};
 });
 host.innerHTML='<div class="notice" style="margin:12px 0"><span>ⓘ</span><div><strong>SIMULATION ONLY · NOT REAL AGENT EXECUTION</strong><p>'+rows.length+' assignment(s) were processed locally in this browser. No Supabase records were changed, no Gemini/API request was made, and no capability gate was passed.</p></div></div>'+rows.map(r=>'<article class="capability-agent-card"><div class="capability-agent-head"><div><strong>'+escapeHtml(r.index+'. '+r.name)+'</strong><small>'+escapeHtml(r.role)+' · SIMULATED</small></div><span class="pill amber">NOT VERIFIED</span></div><h3>'+escapeHtml(r.title)+'</h3><p>'+escapeHtml(r.brief)+'</p><p><strong>Expected artifact checklist (simulation only):</strong> '+escapeHtml(r.artifact)+'</p><ul>'+r.checks.map(c=>'<li>'+escapeHtml(c)+'</li>').join("")+'</ul><p class="muted">QA status: NOT PERFORMED · Human/independent QA evidence required.</p></article>').join("");
 const status=$("#work-sample-batch-status");if(status)status.textContent="Safe simulation completed: "+rows.length+" assignments · local only · 0 API calls · 0 database writes.";
}

async function runCapabilityPreflight(id,button){
 const agent=employees.find(e=>e.id===id);if(!agent)return;
 const checks={identity:!!agent.name&&!!agent.role_key,responsibilities:!!String(agent.responsibilities||"").trim(),department_registered:departments.some(d=>d.name===agent.department),role_key_unique:employees.filter(e=>e.role_key===agent.role_key).length===1,zero_cost_policy:operatingPolicy?.approval_mode==="spending_only"&&Number(operatingPolicy?.max_automatic_spend)===0&&operatingPolicy?.allow_paid_services===false&&operatingPolicy?.allow_paid_api_usage===false&&operatingPolicy?.allow_paid_advertising===false};
 const passed=Object.values(checks).every(Boolean);button.disabled=true;
 try{const {error}=await supabase.from("agent_capability_test_runs").insert({company_id:company.id,employee_id:id,test_kind:"preflight",status:passed?"passed":"blocked",evidence_summary:"Structural preflight only. "+Object.entries(checks).map(([k,v])=>k+": "+(v?"PASS":"FAIL")).join("; ")+". This does not test task execution.",test_payload:{checks,scope:"structural_only"},tested_by:currentUser.id});if(error)throw error;await loadData()}catch(error){showError(error)}finally{button.disabled=false}
}
async function recordCapabilityTest(event){
 event.preventDefault();
 const form=$("#capability-test-form"),button=$("#capability-test-submit"),id=$("#capability-employee").value,kind=$("#capability-test-kind").value,status=$("#capability-test-status").value,evidence=$("#capability-evidence").value.trim(),reference=$("#capability-reference").value.trim();
 if(evidence.length<20){alert("Evidence summary must contain at least 20 characters.");return}
 if(!reference){alert("Enter the exact Task ID or Asset ID from a real submitted work sample.");return}
 const assignment=workSampleAssignments.find(x=>x.employee_id===id&&x.status==="submitted");
 if(!assignment){alert("A real Agent submission must exist before work-sample evidence or QA can be recorded.");return}
 const taskId=assignment.submission?.task_id,assetId=assignment.submission?.asset_id;
 if(!taskId||![taskId,assetId].includes(reference)){alert("The evidence reference must match this Agent's actual submitted Task ID or Asset ID.");return}
 button.disabled=true;
 try{
  const {data:task,error:taskError}=await supabase.from("tasks").select("id,status").eq("id",taskId).eq("company_id",company.id).maybeSingle();
  if(taskError)throw taskError;
  if(!task||task.status!=="completed")throw new Error("The linked task is not completed. A plan or in-progress task is not a deliverable.");
  const {data:asset,error:assetError}=await supabase.from("content_assets").select("id,status,body").eq("id",assetId).eq("company_id",company.id).maybeSingle();
  if(assetError)throw assetError;
  if(!asset||!String(asset.body||"").trim())throw new Error("The linked deliverable asset is missing or empty. Capability evidence cannot be recorded.");
  const {data:inserted,error}=await supabase.from("agent_capability_test_runs").insert({
   company_id:company.id,employee_id:id,test_kind:kind,status,evidence_summary:evidence,evidence_reference:reference,
   test_payload:{recorded_as:"founder_evaluated_evidence",assignment_id:assignment.id,task_id:taskId,asset_id:assetId,task_completed:true,deliverable_nonempty:true},
   tested_by:currentUser.id
  }).select("id").single();
  if(error)throw error;
  if(kind==="work_sample"){
   const {error:updateError}=await supabase.from("agent_work_sample_assignments").update({capability_test_run_id:inserted.id,updated_at:new Date().toISOString()}).eq("id",assignment.id).eq("company_id",company.id);
   if(updateError)throw updateError;
  }else{
   const {error:updateError}=await supabase.from("agent_work_sample_assignments").update({status:status==="passed"?"qa_passed":status==="failed"?"qa_failed":"blocked",qa_notes:evidence,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",assignment.id).eq("company_id",company.id);
   if(updateError)throw updateError;
  }
  if(status!=="passed"){
   const {error:updateError}=await supabase.from("ai_employees").update({capability_status:status==="blocked"?"blocked":"testing",capability_verified_at:null,capability_verified_by:null}).eq("id",id).eq("company_id",company.id);
   if(updateError)throw updateError;
  }
  form.reset();await loadData();
 }catch(error){showError(error)}finally{button.disabled=false}
}
async function verifyCapabilityAgent(id,button){
 const agent=employees.find(e=>e.id===id);if(!agent)return;const latest=latestCapabilityResults(id);
 if(!["preflight","work_sample","qa_review"].every(k=>latest[k]?.status==="passed")){alert("All three latest test gates must pass.");return}
 if(!confirm("Verify "+agent.name+"? Confirm the work sample was genuinely completed and QA was independently performed. This does not automatically set READY."))return;
 button.disabled=true;try{const {error}=await supabase.from("ai_employees").update({capability_status:"verified",capability_verified_at:new Date().toISOString(),capability_verified_by:currentUser.id}).eq("id",id).eq("company_id",company.id);if(error)throw error;await loadData()}catch(error){showError(error)}finally{button.disabled=false}
}


function renderResearchQAPanel(){
 const host=$("#research-qa-panel");if(!host)return;
 const asset=contentAssets.find(x=>x.id==="31aa29f6-9555-4e06-955c-223d6517f90b");
 const qaTask=tasks.find(x=>x.id==="7a282666-a15f-41d1-b9a5-5394e0aedd9f");
 if(!asset||!qaTask){host.innerHTML='<p class="muted">Research QA assignment or asset not found. Refresh the workspace.</p>';return}
 const prior=qualityReviews.find(x=>x.task_id===qaTask.id&&x.review_stage==="qa");
 if(prior){
  host.innerHTML='<div class="notice"><strong>HUMAN QA REVIEW RECORDED · '+escapeHtml(prettyStatus(prior.status))+'</strong><p>'+escapeHtml((prior.findings||[]).join(" · ")||prior.evidence||"Review record saved.")+'</p><p class="muted">This is a human-entered QA record, not an AI QA-agent execution. Research asset remains '+escapeHtml(asset.status)+'.</p></div>';
  return;
 }
 host.innerHTML='<div class="notice"><strong>Independent review is awaiting a human reviewer</strong><p>QA Officer is still PLANNED. This form records a human review by the signed-in Owner/reviewer; it does not claim that the QA Officer executed the task or verify agent capability.</p></div><form id="research-qa-review-form" class="distribution-form"><input type="hidden" id="research-qa-task-id" value="'+escapeHtml(qaTask.id)+'"><label>Review verdict<select id="research-qa-verdict"><option value="needs_owner">Needs more evidence / escalation</option><option value="passed">PASS — all checks verified</option><option value="failed">FAIL — correction required</option></select></label><div class="activation-panel"><strong>Research brief QA checklist</strong><label class="activation-check"><input type="checkbox" data-research-qa-check="claim1"><span>Claim 1 definition and chemical-reaction explanation match the retrieved NOAA excerpt</span></label><label class="activation-check"><input type="checkbox" data-research-qa-check="chemistry"><span>Luciferin and luciferase / photoprotein detail matches the National Geographic Education excerpt</span></label><label class="activation-check"><input type="checkbox" data-research-qa-check="claim2"><span>Claim 2 is limited to luring/detecting prey, warning/evading predators, and communication</span></label><label class="activation-check"><input type="checkbox" data-research-qa-check="unsupported"><span>“Attract mates” is not presented as a supported fact</span></label><label class="activation-check"><input type="checkbox" data-research-qa-check="limitations"><span>Missing publication dates and limits of excerpt-level review are disclosed</span></label><label class="activation-check"><input type="checkbox" data-research-qa-check="traceability"><span>Every factual statement has traceable source support; no unsupported details were added</span></label></div><label>Findings / required corrections<textarea id="research-qa-findings" rows="3" placeholder="List any failed checks, uncertainty, or corrections required. For PASS, write “No outstanding findings”." required minlength="10"></textarea></label><label>Reviewer evidence summary<textarea id="research-qa-evidence" rows="4" minlength="50" required placeholder="Describe what you personally compared in the revised brief against the retrieved NOAA and National Geographic Education excerpts."></textarea></label><label class="activation-check"><input type="checkbox" id="research-qa-human-confirm" required><span>I personally reviewed the revised brief and the retrieved source excerpts; this is my human review, not an AI agent verdict.</span></label><button class="primary-btn" id="research-qa-submit" type="submit">Save Human QA Review</button><p class="form-note">A PASS completes this QA task only. It does not approve the research asset, authorize Content production, verify the QA Officer’s capability, or call an AI provider.</p></form>';
}
async function submitResearchQAReview(event){
 event.preventDefault();
 const form=$("#research-qa-review-form"),button=$("#research-qa-submit"),verdict=$("#research-qa-verdict").value,findings=$("#research-qa-findings").value.trim(),evidence=$("#research-qa-evidence").value.trim();
 const taskId=$("#research-qa-task-id").value;
 let task=null,asset=null;
 try{
  const [taskResult,assetResult]=await Promise.all([
   supabase.from("tasks").select("id,status,company_id").eq("id",taskId).eq("company_id",company.id).maybeSingle(),
   supabase.from("content_assets").select("id,status,company_id").eq("id","31aa29f6-9555-4e06-955c-223d6517f90b").eq("company_id",company.id).maybeSingle()
  ]);
  if(taskResult.error)throw taskResult.error;
  if(assetResult.error)throw assetResult.error;
  task=taskResult.data;asset=assetResult.data;
 }catch(error){showError(error);return}
 const checks=[...document.querySelectorAll("[data-research-qa-check]")].map(x=>({key:x.dataset.researchQaCheck,checked:x.checked}));
 if(!task||!asset){alert("QA task or research asset was not found in the current workspace. No review was submitted.");return}
 if(task.status!=="queued"||asset.status!=="review"){alert("Latest database state: QA task = "+String(task.status).toUpperCase()+"; research asset = "+String(asset.status).toUpperCase()+". No review was submitted. Refresh the panel and inspect the latest records.");await loadData();return}
 if(evidence.length<50||findings.length<10){alert("Add a detailed evidence summary and findings (at least 50 and 10 characters).");return}
 if(!$("#research-qa-human-confirm").checked){alert("Confirm that you personally reviewed the brief and retrieved excerpts.");return}
 if(verdict==="passed"&&checks.some(x=>!x.checked)){alert("A PASS requires all six QA checklist items to be checked.");return}
 if(verdict!=="passed"&&checks.every(x=>x.checked)){alert("If every checklist item passes, select PASS. Otherwise record the unresolved checks.");return}
 button.disabled=true;
 try{
  const missing=checks.filter(x=>!x.checked).map(x=>x.key);
  const reviewStatus=verdict==="passed"?"passed":verdict==="failed"?"failed":"needs_owner";
  const review=await supabase.from("quality_reviews").insert({company_id:company.id,task_id:task.id,reviewer_employee_id:null,review_stage:"qa",iteration:1,status:reviewStatus,findings:missing.concat(findings),evidence:evidence}).select("id").single();
  if(review.error)throw review.error;
  const nextTaskStatus=reviewStatus==="passed"?"completed":reviewStatus==="failed"?"blocked":"review";
  const update=await supabase.from("tasks").update({status:nextTaskStatus,updated_at:new Date().toISOString()}).eq("id",task.id).eq("company_id",company.id).eq("status","queued").select("id,status").maybeSingle();
  if(update.error)throw update.error;
  if(!update.data)throw new Error("QA record saved, but task status was not updated. Refresh and inspect the review record.");
  const event=await supabase.from("task_events").insert({company_id:company.id,task_id:task.id,employee_id:null,event_type:"research_brief_human_qa_recorded",message:"Human QA review recorded for revised bioluminescence research brief. This is not an AI QA-agent execution and does not approve the asset.",metadata:{source_asset_id:asset.id,quality_review_id:review.data.id,review_verdict:reviewStatus,checklist:checks,missing_checks:missing,reviewer_user_id:currentUser.id,reviewer_type:"human_owner",qa_agent_executed:false,asset_approved:false,provider_called:false,capability_status_changed:false}}).select("id").single();
  if(event.error)throw event.error;
  form.reset();
  await loadData();
  const host=$("#research-qa-panel");if(host)host.innerHTML='<div class="notice"><strong>HUMAN QA REVIEW SAVED · '+escapeHtml(reviewStatus.toUpperCase())+'</strong><p>Quality review: <code>'+escapeHtml(review.data.id)+'</code></p><p>Audit event: <code>'+escapeHtml(event.data.id)+'</code></p><p>QA task: '+escapeHtml(nextTaskStatus.toUpperCase())+' · Research asset remains REVIEW · Not approved for Content · Provider/API calls: 0.</p></div>';
 }catch(error){showError(error)}
 finally{if(button)button.disabled=false}
}

function renderAll(){
  $("#employee-total").textContent=String(employees.length).padStart(2,"0");
  $("#open-task-total").textContent=String(tasks.filter(t=>!["completed","cancelled"].includes(t.status)).length).padStart(2,"0");
  $("#approval-total").textContent=String(approvals.length).padStart(2,"0");
  $("#published-total").textContent=String(contentAssets.filter(a=>a.status==="published").length).padStart(2,"0");
  $("#approval-nav-count").textContent=approvals.length;
  $("#approval-nav-count").hidden=approvals.length===0;
  $("#task-table").innerHTML=tasks.length?tasks.slice(0,5).map(taskRow).join(""):'<tr><td class="empty-row" colspan="4">No tasks yet. Create the first company task.</td></tr>';
  $("#all-task-table").innerHTML=tasks.length?tasks.map(t=>taskRow(t,true)).join(""):'<tr><td class="empty-row" colspan="6">No tasks have been created.</td></tr>';
  $("#employee-list").innerHTML=employees.slice(0,5).map(e=>employeeRow(e)).join("")||'<p class="muted">No roles configured.</p>';
  $("#employee-grid").innerHTML=employees.map(e=>'<article class="employee-card"><div class="employee-icon">✦</div><h3>'+escapeHtml(e.name)+'</h3><div class="role">'+escapeHtml(e.department)+'</div><p>'+escapeHtml(e.responsibilities)+'</p><div class="card-foot">ROLE REGISTERED · '+escapeHtml(e.status.toUpperCase())+' · WORKFLOW MANAGED BY AI CEO</div></article>').join("");
  const sortedApprovals=[...approvals].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  const pendingMarkup=sortedApprovals.length?sortedApprovals.map((a,index)=>{
    const createdAt=a.created_at?new Date(a.created_at):null;
    const timeLabel=createdAt&&!Number.isNaN(createdAt.getTime())?new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(createdAt)+" WIB":"Waktu tidak tersedia";
    const latestLabel=index===0?'<span class="approval-new-badge">TERBARU</span>':'<span class="approval-older-badge">SEBELUMNYA</span>';
    return '<button class="approval-item approval-open" type="button" data-open-approval="'+escapeHtml(a.id)+'"><span class="approval-icon">✓</span><span class="approval-copy"><strong>'+escapeHtml(a.title)+' '+latestLabel+'</strong><small>'+escapeHtml(a.description)+'</small><small class="approval-time">🕒 TERBIT: '+escapeHtml(timeLabel)+'</small></span><span class="pill amber">Pending · Review</span></button>';
  }).join(""):'<p class="muted">No pending approvals.</p>';
  $("#overview-approvals").innerHTML=pendingMarkup;
  $("#approval-page-list").innerHTML=pendingMarkup;
  $("#pipeline-overview").innerHTML=["research","content","review","scheduled","published"].map((stage,i)=>{const count=contentAssets.filter(a=>a.status===stage||(stage==="research"&&a.asset_type==="research")).length;return '<div class="pipe-row"><span>'+["Research","Content","Quality","Scheduled","Published"][i]+'</span><div class="pipe-track"><div class="pipe-fill" style="width:'+Math.min(count*25,100)+'%"></div></div><span class="pipe-count">'+count+'</span></div>'}).join("");
  $("#pipeline-board").innerHTML=["draft","review","approved","scheduled","published"].map(stage=>{const items=contentAssets.filter(a=>a.status===stage);return '<section class="pipeline-column"><h3>'+prettyStatus(stage)+'<span class="count">'+items.length+'</span></h3>'+ (items.length?items.map(a=>'<div class="pipeline-card">'+escapeHtml(a.title)+'<small>'+escapeHtml(a.asset_type)+'</small></div>').join(""):'<p class="muted">No items in this stage.</p>')+'</section>'}).join("");
  renderOrchestrator();
  renderDistribution();
  renderOrganization();
  renderCapabilityLab();
  renderResearchQAPanel();
  renderWorkSampleAssignments();
  renderVirtualHQ();
  const activity=$("#activity-feed");
  if(activity)activity.innerHTML=agentMessages.length?agentMessages.map(m=>'<article class="activity-item"><div><strong>'+escapeHtml(m.subject)+'</strong><small>'+escapeHtml(m.from_employee?.name||"Company OS")+' → '+escapeHtml(m.to_employee?.name||"System")+' · '+escapeHtml(prettyStatus(m.message_type))+'</small><p>'+escapeHtml(m.body)+'</p></div><time>'+escapeHtml(new Date(m.created_at).toLocaleString("id-ID"))+'</time></article>').join(""):'<p class="muted">No inter-agent messages yet. Messages will appear when the autonomous workflow runs.</p>';
  renderHistoryRecovery();
  const quality=$("#quality-feed");
  if(quality)quality.innerHTML=qualityReviews.length?qualityReviews.map(q=>'<article class="activity-item"><div><strong>'+escapeHtml(q.review_stage.toUpperCase())+' · '+escapeHtml(q.ai_employees?.name||"AI Reviewer")+'</strong><small>Iteration '+q.iteration+' · '+escapeHtml(q.status.toUpperCase())+'</small><p>'+escapeHtml(q.evidence||"Review recorded.")+'</p></div><span class="pill '+(q.status==="passed"?"green":q.status==="failed"?"amber":"gray")+'">'+escapeHtml(q.status)+'</span></article>').join(""):'<p class="muted">No QC/QA reviews recorded yet.</p>';
  $("#today-label").textContent=new Intl.DateTimeFormat("en",{weekday:"long",month:"long",day:"numeric",year:"numeric"}).format(new Date()).toUpperCase();
  $("#owner-email").textContent=currentUser.email||"OWNER";
}

function historyCode(prefix,item){
  const d=new Date(item.created_at||item.time||Date.now());
  const date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("");
  const suffix=String(item.id||"record").replaceAll("-","").slice(-6).toUpperCase();
  return prefix+"-"+date+"-"+suffix;
}
function renderHistoryRecovery(){
  const timeline=$("#history-timeline"),recover=$("#recovery-list");
  const eventItems=taskEvents.map(e=>({id:e.id,time:e.created_at,title:String(e.event_type||"event").replaceAll("_"," "),detail:e.message,taskId:e.task_id,source:"event"}));
  const decisionItems=allApprovals.filter(a=>a.status!=="pending").map(a=>({id:a.id,time:a.decided_at||a.created_at,title:"Approval "+a.status,detail:a.title+" · "+(a.decision_note||"No decision note"),taskId:a.task_id,source:"decision"}));
  const qualityItems=qualityReviews.map(q=>({id:q.id,time:q.created_at,title:String(q.review_stage).toUpperCase()+" "+String(q.status).toUpperCase(),detail:"Iteration "+q.iteration+" · "+(q.evidence||"Quality review recorded"),taskId:q.task_id,source:"quality"}));
  const snapshotItems=recoverySnapshots.map(s=>({id:s.id,time:s.created_at,title:"Recovery snapshot · "+s.action,detail:"Previous "+s.entity_type+" state preserved",taskId:s.task_id,source:"snapshot"}));
  const versionItems=contentAssets.map(a=>({id:a.id,time:a.created_at,title:"Deliverable version · "+a.status,detail:a.title+" ("+a.asset_type+")",taskId:a.task_id,source:"version"}));
  const merged=[...eventItems,...decisionItems,...qualityItems,...snapshotItems,...versionItems].sort((a,b)=>new Date(b.time||0)-new Date(a.time||0)).slice(0,150);
  const historyTone=x=>{
    const t=String(x.title||"").toLowerCase(),d=String(x.detail||"").toLowerCase();
    if(/reject|failed|error/.test(t+" "+d))return "history-rejected";
    if(/approved|passed|complete|restored|recovery/.test(t+" "+d))return "history-success";
    if(/handoff|transfer|queued|started/.test(t+" "+d))return "history-transfer";
    return "history-neutral";
  };
  if(timeline)timeline.innerHTML=merged.length?merged.map(x=>'<article class="history-entry '+historyTone(x)+'"><div class="history-entry-top"><strong>'+escapeHtml(historyCode("ACT",{id:x.id,created_at:x.time}))+' · '+escapeHtml(x.title)+'</strong><time>'+escapeHtml(x.time?new Date(x.time).toLocaleString("id-ID"):"Time unavailable")+'</time></div><p>'+escapeHtml(x.detail)+'</p>'+(x.taskId?'<small>Task: '+escapeHtml(tasks.find(t=>t.id===x.taskId)?.title||x.taskId)+'</small>':'')+'</article>').join(""):'<p class="muted">No company activity has been recorded yet.</p>';

  const transfers=agentMessages.filter(m=>["handoff","quality_handoff"].includes(String(m.message_type||"").toLowerCase())).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const deletions=taskEvents.filter(e=>/delete|deleted|remove|removed|trash|purge/i.test(String(e.event_type||"")+" "+String(e.message||""))).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const latestTransferByTask=new Map();
  transfers.forEach(m=>{if(m.task_id&&!latestTransferByTask.has(m.task_id))latestTransferByTask.set(m.task_id,m.id)});

  const transferPanel=$("#transferred-history"),deletedPanel=$("#deleted-history");
  if(transferPanel)transferPanel.innerHTML=transfers.length?transfers.map(m=>'<article class="history-entry"><div class="history-entry-top"><strong>'+escapeHtml(historyCode("TRF",m))+' · '+escapeHtml(m.subject||"Task handoff")+'</strong><time>'+escapeHtml(new Date(m.created_at).toLocaleString("id-ID"))+'</time></div><p>'+escapeHtml((m.from_employee?.name||"AI Employee")+" → "+(m.to_employee?.name||"AI Employee"))+'</p><p>'+escapeHtml(m.body||"Task transferred to another AI Employee.")+'</p>'+(m.task_id?'<small>Task: '+escapeHtml(tasks.find(t=>t.id===m.task_id)?.title||m.task_id)+'</small>':'')+(m.task_id&&latestTransferByTask.get(m.task_id)===m.id?'<button class="secondary-btn" type="button" data-restore-transfer="'+escapeHtml(m.id)+'">Restore to previous AI Employee</button>':'')+'</article>').join(""):'<p class="muted">No task handoffs have been recorded yet.</p>';
  if(deletedPanel)deletedPanel.innerHTML=deletions.length?deletions.map(e=>'<article class="history-entry"><div class="history-entry-top"><strong>'+escapeHtml(historyCode("DEL",e))+' · '+escapeHtml(e.event_type)+'</strong><time>'+escapeHtml(new Date(e.created_at).toLocaleString("id-ID"))+'</time></div><p>'+escapeHtml(e.message||"Deletion event recorded.")+'</p>'+(e.task_id?'<small>Task: '+escapeHtml(tasks.find(t=>t.id===e.task_id)?.title||e.task_id)+'</small>':'')+'</article>').join(""):'<p class="muted">No deletion events are recorded. Deleted data will appear here only when a deletion is explicitly logged; nothing is inferred or fabricated.</p>';

  const rejected=allApprovals.filter(a=>a.status==="rejected").sort((a,b)=>new Date(b.decided_at||b.created_at)-new Date(a.decided_at||a.created_at));
  const latestQualityByStage=new Map();
  [...qualityReviews].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).forEach(q=>{const key=q.task_id+":"+q.review_stage;if(!latestQualityByStage.has(key))latestQualityByStage.set(key,q)});
  const failedQuality=[...latestQualityByStage.values()].filter(q=>q.status==="failed").sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const recoveryCards=[
    ...rejected.map(a=>'<article class="recovery-entry recovery-rejected"><div><strong>'+escapeHtml(a.title)+'</strong><p>OWNER REJECTED · '+escapeHtml(a.decided_at?new Date(a.decided_at).toLocaleString("id-ID"):"date unavailable")+'</p><small>'+escapeHtml(a.decision_note||"No decision note")+'</small></div><button class="secondary-btn" type="button" data-reopen-approval="'+escapeHtml(a.id)+'">Reopen for Owner Review</button></article>'),
    ...failedQuality.map(q=>'<article class="recovery-entry recovery-rejected"><div><strong>'+escapeHtml(tasks.find(t=>t.id===q.task_id)?.title||"Task")+'</strong><p>'+escapeHtml(String(q.review_stage).toUpperCase())+' REJECTED · Iteration '+escapeHtml(q.iteration)+' · '+escapeHtml(new Date(q.created_at).toLocaleString("id-ID"))+'</p><small>'+escapeHtml(q.evidence||"Quality review failed. Return task to its assigned AI Employee for correction.")+'</small></div><button class="secondary-btn" type="button" data-restore-quality="'+escapeHtml(q.id)+'">Return to Previous AI Employee</button></article>')
  ];
  if(recover)recover.innerHTML=recoveryCards.length?recoveryCards.join(""):'<p class="muted">No rejected items need recovery.</p>';
  const count=$("#recovery-snapshot-count");if(count)count.textContent=String(recoverySnapshots.length);
  const rejectedCount=$("#rejected-approval-count");if(rejectedCount)rejectedCount.textContent=String(rejected.length+failedQuality.length);
}
async function restoreQualityRejectedTask(reviewId,button){
  if(!confirm("Return this task to its assigned AI Employee for correction after the failed QC/QA review? The previous task state will be preserved."))return;
  button.disabled=true;button.textContent="Returning…";
  try{
    const {data,error}=await supabase.rpc("restore_failed_quality_task",{p_quality_review_id:reviewId});
    if(error)throw error;
    if(data?.success!==true)throw new Error("Quality recovery was not confirmed.");
    await loadData();
    alert("Task returned to "+(data.returned_to_employee||"its assigned AI Employee")+" for correction.");
  }catch(error){button.disabled=false;button.textContent="Return to Previous AI Employee";showError(error);}
}

async function restoreTransferredTask(messageId,button){
  if(!confirm("Return this task to the AI Employee who owned it before the latest handoff? The current assignment will be preserved in Recovery History."))return;
  button.disabled=true;button.textContent="Restoring…";
  try{
    const {data,error}=await supabase.rpc("restore_task_to_previous_employee",{p_message_id:messageId});
    if(error)throw error;
    if(data?.success!==true)throw new Error("Task restoration was not confirmed.");
    await loadData();
    alert(data.already_restored?"This task is already assigned to its previous AI Employee.":"Task returned to "+(data.restored_to_name||"its previous AI Employee")+".");
  }catch(error){button.disabled=false;button.textContent="Restore to previous AI Employee";showError(error);}
}

async function reopenApprovalForReview(id,button){
  if(!confirm("Reopen this rejected approval for Owner review? Previous states will be preserved in Recovery History."))return;
  button.disabled=true;button.textContent="Recovering…";
  try{
    const {data,error}=await supabase.rpc("restore_approval_for_review",{p_approval_id:id});
    if(error)throw error;
    if(data?.success!==true)throw new Error("Recovery was not confirmed.");
    await loadData();
    alert("Approval restored to Pending Owner review.");
  }catch(error){
    button.disabled=false;button.textContent="Reopen for review";
    showError(error);
  }
}

const hqWorlds=new Map();
const hqBuilds=new WeakMap();
let hqRefreshTimer=null;
const hqColors={ai_ceo:0x8bb7ff,research:0x67d6d0,content:0xffb86b,marketing:0xd69bff,quality:0x82a8ff,qc:0x66c7ff,qa:0x76d6a5,finance:0xf2ce70,operations:0xb1bdcf};
function hqStatus(e){const a=tasks.filter(t=>t.assigned_employee_id===e.id&&!["completed","cancelled"].includes(t.status));if(a.some(t=>["review","pending"].includes(t.status)))return{key:"review",label:"AWAITING REVIEW",count:a.length};if(a.some(t=>t.status==="in_progress"))return{key:"working",label:"IN PROGRESS",count:a.length};if(a.some(t=>t.status==="blocked"))return{key:"blocked",label:"BLOCKED",count:a.length};if(a.some(t=>t.status==="queued"))return{key:"queued",label:"QUEUED",count:a.length};return{key:"idle",label:e.status==="planned"?"READY TO ACTIVATE":"IDLE",count:a.length}}
function hqTextSprite(THREE,text,accent="#70d9e8"){
  const canvas=document.createElement("canvas");canvas.width=640;canvas.height=160;
  const ctx=canvas.getContext("2d");ctx.clearRect(0,0,640,160);
  ctx.shadowColor=accent;ctx.shadowBlur=16;ctx.fillStyle="rgba(5,15,29,.94)";
  ctx.beginPath();ctx.roundRect(8,10,624,140,28);ctx.fill();ctx.shadowBlur=0;
  ctx.strokeStyle=accent;ctx.globalAlpha=.8;ctx.lineWidth=3;ctx.stroke();ctx.globalAlpha=1;
  ctx.fillStyle="#f1f8ff";ctx.font="700 38px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText(text,320,80,570);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
  sprite.scale.set(3.5,.88,1);return sprite;
}
async function buildHQ3D(el){
  if(!el||!el.clientWidth)return;
  let THREE;
  try {
    THREE=await import("https://esm.sh/three@0.170.0");
  } catch(primaryImportError) {
    try {
      THREE=await import("https://cdn.jsdelivr.net/npm/three@0.170.0/+esm");
    } catch(fallbackImportError) {
      throw new Error("Three.js could not load from either CDN. Primary: "+(primaryImportError?.message||"unknown")+"; fallback: "+(fallbackImportError?.message||"unknown"));
    }
  }
  const old=hqWorlds.get(el);if(old)old.dispose();
  el.innerHTML="";
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x081525);
  scene.fog=new THREE.FogExp2(0x081525,.012);
  const camera=new THREE.PerspectiveCamera(42,el.clientWidth/el.clientHeight,.1,120);
  camera.position.set(29,22,34);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"});
  const isSmallScreen=window.matchMedia?.("(max-width:700px)").matches||false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,isSmallScreen?1.2:1.65));
  renderer.setSize(el.clientWidth,el.clientHeight);
  renderer.shadowMap.enabled=!isSmallScreen;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  el.appendChild(renderer.domElement);
  // Native pointer camera controller: avoids external OrbitControls touch quirks on mobile browsers.
  const target=new THREE.Vector3(0,1.15,0),spherical=new THREE.Spherical();
  const offset=new THREE.Vector3().subVectors(camera.position,target);spherical.setFromVector3(offset);
  const pointers=new Map();let previousPinch=0,previousMid=null;let gameMode=false,walkYaw=0,walkPitch=-.12;let joystickMoveX=0,joystickMoveY=0;const movementKeys=new Set();
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const syncCamera=()=>{spherical.radius=clamp(spherical.radius,15,58);spherical.phi=clamp(spherical.phi,.18,Math.PI*.48);camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(spherical));camera.lookAt(target)};
  const controls={
    target,
    update(){if(!gameMode)syncCamera()},
    dispose(){renderer.domElement.removeEventListener("pointerdown",cameraPointerDown);renderer.domElement.removeEventListener("pointermove",cameraPointerMove);renderer.domElement.removeEventListener("pointerup",cameraPointerEnd);renderer.domElement.removeEventListener("pointercancel",cameraPointerEnd);renderer.domElement.removeEventListener("wheel",cameraWheel);window.removeEventListener("keydown",onWalkKeyDown);window.removeEventListener("keyup",onWalkKeyUp)}
  };
  function cameraPointerDown(ev){if(ev.pointerType==="mouse"&&ev.button!==0)return;ev.preventDefault?.();try{renderer.domElement.setPointerCapture?.(ev.pointerId)}catch{}pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});if(pointers.size===2){const pts=[...pointers.values()];previousPinch=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);previousMid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2}}}
  function cameraPointerMove(ev){if(!pointers.has(ev.pointerId))return;ev.preventDefault?.();const prev=pointers.get(ev.pointerId),dx=ev.clientX-prev.x,dy=ev.clientY-prev.y;pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});if(pointers.size===1){if(gameMode){walkYaw-=dx*.006;walkPitch=clamp(walkPitch-dy*.005,-.72,.48);camera.rotation.order="YXZ";camera.rotation.set(walkPitch,walkYaw,0)}else{spherical.theta-=dx*.008;spherical.phi-=dy*.008;syncCamera()}}else if(pointers.size>=2&&!gameMode){const pts=[...pointers.values()],dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};if(previousPinch>0)spherical.radius*=previousPinch/Math.max(1,dist);if(previousMid){const scale=spherical.radius*.0018;const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);target.addScaledVector(right,-(mid.x-previousMid.x)*scale).addScaledVector(up,(mid.y-previousMid.y)*scale)}previousPinch=dist;previousMid=mid;syncCamera()}}
  function cameraPointerEnd(ev){pointers.delete(ev.pointerId);if(pointers.size<2){previousPinch=0;previousMid=null}}
  function cameraWheel(ev){ev.preventDefault();if(gameMode)return;spherical.radius*=Math.exp(ev.deltaY*.001);syncCamera()}
  renderer.domElement.addEventListener("pointerdown",cameraPointerDown);renderer.domElement.addEventListener("pointermove",cameraPointerMove);renderer.domElement.addEventListener("pointerup",cameraPointerEnd);renderer.domElement.addEventListener("pointercancel",cameraPointerEnd);renderer.domElement.addEventListener("wheel",cameraWheel,{passive:false});
  syncCamera();
  const hemi=new THREE.HemisphereLight(0xd9edff,0x1a2a3c,2.1);scene.add(hemi);
  const key=new THREE.DirectionalLight(0xffe5c4,3.1);key.position.set(-9,18,11);key.castShadow=true;
  key.shadow.mapSize.set(1536,1536);key.shadow.camera.left=-18;key.shadow.camera.right=18;key.shadow.camera.top=18;key.shadow.camera.bottom=-18;scene.add(key);
  const fill=new THREE.DirectionalLight(0x68baff,1.35);fill.position.set(12,9,-10);scene.add(fill);
  const glow=new THREE.PointLight(0x42cbe7,55,28);glow.position.set(0,6,0);scene.add(glow);
  const mat=(color,metalness=.05,roughness=.58)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
  const basic=color=>new THREE.MeshBasicMaterial({color});
  const addBox=(parent,w,h,d,material,x,y,z,cast=false,receive=false)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);
    mesh.castShadow=cast;mesh.receiveShadow=receive;parent.add(mesh);return mesh;
  };
  const addSphere=(parent,r,material,x,y,z,scale=null)=>{
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,24,18),material);mesh.position.set(x,y,z);
    if(scale)mesh.scale.set(...scale);mesh.castShadow=true;parent.add(mesh);return mesh;
  };
  const floor=addBox(scene,36,.5,26,mat(0x263b52,.18,.38),0,-.28,0,false,true);
  const floorInset=addBox(scene,34,.035,24,mat(0x304b65,.12,.5),0,-.005,0,false,true);
  for(let x=-16;x<=16;x+=2){const line=addBox(scene,.018,.012,23,mat(0x54718a,.25,.5),x,.02,0);line.material.transparent=true;line.material.opacity=.35}
  for(let z=-11;z<=11;z+=2){const line=addBox(scene,34,.012,.018,mat(0x54718a,.25,.5),0,.021,z);line.material.transparent=true;line.material.opacity=.35}
  // Glass perimeter and architectural frame
  addBox(scene,36,5.4,.22,mat(0x29445e,.35,.3),0,2.45,-12.75);
  addBox(scene,.22,5.4,26,mat(0x29445e,.35,.3),-17.9,2.45,0);
  addBox(scene,36,.2,.22,mat(0x6a8ba6,.55,.3),0,5.15,-12.6);
  const glass=new THREE.MeshPhysicalMaterial({color:0x6db8d7,transparent:true,opacity:.13,metalness:.15,roughness:.12,side:THREE.DoubleSide});
  for(let i=0;i<7;i++){
    const x=-15+i*5;addBox(scene,4.55,3.25,.035,glass,x,2.8,-12.59);
    addBox(scene,.055,3.35,.08,mat(0x6b91ac,.65,.28),x-2.3,2.8,-12.52);
  }
  for(let z=-10;z<=10;z+=3.5)addBox(scene,.06,3.6,.08,mat(0x6b91ac,.65,.28),-17.77,2.8,z);
  // Ceiling beams and warm linear fixtures
  for(let x=-12;x<=12;x+=6){
    addBox(scene,.12,.18,24,mat(0x415b73,.45,.35),x,5.05,0);
    const lamp=addBox(scene,2.7,.045,.22,mat(0xbfeaff,.15,.25),x,4.91,0);
    const light=new THREE.PointLight(0x9bdcff,8,9);light.position.set(x,4.55,0);scene.add(light);
  }
  // Reception / command core
  const core=new THREE.Group();scene.add(core);
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.75,.48,48),mat(0x173e5b,.5,.28));plinth.position.y=.25;plinth.castShadow=true;core.add(plinth);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.62,.055,12,80),new THREE.MeshBasicMaterial({color:0x55d8ee}));ring.rotation.x=Math.PI/2;ring.position.y=.52;core.add(ring);
  const coreTop=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.15,.18,48),mat(0x286487,.55,.24));coreTop.position.y=.57;core.add(coreTop);
  const logo=hqTextSprite(THREE,"CURIOFRAME  /  COMMAND","#55d8ee");logo.position.set(0,2.15,0);logo.scale.set(4.5,1.05,1);scene.add(logo);
  const plant=(x,z)=>{
    const pot=new THREE.Mesh(new THREE.CylinderGeometry(.22,.28,.38,18),mat(0x536b82));pot.position.set(x,.2,z);scene.add(pot);
    for(let i=0;i<5;i++){const leaf=addSphere(scene,.22,mat(0x3f9c83),x+Math.sin(i*1.25)*.16,.58+(i%2)*.12,z+Math.cos(i*1.25)*.15,[.45,1.35,.45]);leaf.rotation.z=(i-2)*.22}
  };
  plant(-15,-10.5);plant(15,-10.5);plant(-15,10.5);plant(15,10.5);
  const figures=[];
  const departmentNames=[...new Set(employees.map(e=>e.department||"General"))];
  const departmentSpots=departmentNames.map((name,index)=>({name,x:-13.5+(index%4)*9,z:-8.1+Math.floor(index/4)*8.1}));
  const departmentCounts=new Map();
  const coords=employees.map(employee=>{const department=employee.department||"General",spot=departmentSpots.find(d=>d.name===department)||departmentSpots[0],n=departmentCounts.get(department)||0;departmentCounts.set(department,n+1);const offsets=[[0,0],[-1.55,0],[1.55,0],[-1.55,1.65],[1.55,1.65],[0,-1.65]];const offset=offsets[n%offsets.length];return[spot.x+offset[0],spot.z+offset[1]]});
  const employeePositionMap=new Map(employees.map((employee,index)=>[employee.id,coords[index]]));
  departmentSpots.forEach(spot=>{const zone=addBox(scene,7.9,.025,6.8,mat(0x34536d,.12,.72),spot.x,.045,spot.z,false);zone.material.transparent=true;zone.material.opacity=.42;const marker=hqTextSprite(THREE,spot.name.toUpperCase().slice(0,24),"#72cfe3");marker.position.set(spot.x,4.05,spot.z-2.75);marker.scale.set(3.4,.72,1);scene.add(marker)});
  const statusColor=key=>key==="working"?0x39d9a5:key==="review"?0xf2bd65:key==="blocked"?0xf17d8a:key==="queued"?0x78a9ff:0x6687a6;
  employees.forEach((employee,index)=>{
    const [x,z]=coords[index];const accent=hqColors[employee.role_key]||0x79b8ef;
    const station=new THREE.Group();station.position.set(x,0,z);scene.add(station);
    // desk, pedestal, ergonomic chair, display and accessories
    addBox(station,2.65,.16,1.28,mat(0x805b43,.22,.35),0,1.08,0,true);
    addBox(station,2.25,.07,1.02,mat(0xc49a70,.12,.4),0,1.19,0);
    for(const dx of [-1,1])for(const dz of [-.43,.43])addBox(station,.12,1,.12,mat(0x526b80,.55,.3),dx, .55,dz,true);
    addBox(station,.72,.13,.58,mat(0x27394d,.3,.4),-.72,.16,0);
    const chair=new THREE.Group();chair.position.set(0,0,1.55);station.add(chair);
    addBox(chair,.72,.15,.68,mat(0x263e58,.2,.4),0,.68,0,true);
    addBox(chair,.72,.9,.16,mat(0x314d68,.2,.4),0,1.13,.3,true);
    addBox(chair,.1,.65,.1,mat(0x607b91,.6,.3),0,.31,0);
    for(const dx of [-.38,.38])addBox(chair,.08,.08,.75,mat(0x607b91,.6,.3),dx,.05,0);
    const monitor=addBox(station,.92,.64,.09,mat(0x111f31,.55,.24),0,1.62,-.43,true);
    addBox(station,.79,.48,.025,mat(accent,.25,.25),0,1.63,-.375);
    addBox(station,.13,.34,.12,mat(0x728da5,.65,.3),0,1.27,-.43);
    addBox(station,.55,.055,.38,mat(0x33495f,.35,.4),0,1.26,-.02);
    // glowing UI lines on the display
    for(let j=0;j<3;j++){const bar=addBox(station,.48-j*.08,.025,.018,basic(j===0?0xc7f3ff:accent),-.05,1.75-j*.105,-.355);bar.material.toneMapped=false}
    const mug=new THREE.Mesh(new THREE.CylinderGeometry(.09,.1,.16,16),mat(0xd5e1ed,.08,.28));mug.position.set(.91,1.34,.1);station.add(mug);
    const deskLamp=new THREE.Group();deskLamp.position.set(-.95,1.28,.08);station.add(deskLamp);
    addBox(deskLamp,.34,.055,.12,mat(0x718ca4,.6,.28),0,0,0);
    const lampArm=addBox(deskLamp,.045,.38,.045,mat(0x718ca4,.6,.28),0,.2,0);lampArm.rotation.z=-.25;
    const lampHead=addSphere(deskLamp,.13,mat(0x9edfff,.25,.25),-.09,.4,0,[1,.45,1]);
    // premium animated character with distinct hair, face, outfit and accessories
    const avatar=new THREE.Group();avatar.userData.employeeId=employee.id;avatar.position.set(x,0,z+2.35);scene.add(avatar);
    const skin=mat([0xf0c5a3,0xd99f7e,0xe8b99a,0xc98d70,0xf1c9a7,0xd8a181,0xe7b99a,0xc99072,0xe9bd9c][index%9],0,.72);
    const hairColors=[0x33251f,0x3c2b25,0x493126,0x241f20,0x5a4030,0x29252a,0x473328,0x302b28,0x3a2922];
    const hair=mat(hairColors[index%hairColors.length],0,.86),shirt=mat(accent,.12,.46),pants=mat(index%2?0x263b56:0x34475c,.05,.66),shoe=mat(0x17263a,.12,.5),white=mat(0xf4f5f0,0,.45),eye=mat(0x26313e,0,.5);
    const capsule=(parent,radius,length,material,xp,yp,zp,radial=16)=>{
      const m=new THREE.Mesh(new THREE.CapsuleGeometry(radius,length,5,radial),material);m.position.set(xp,yp,zp);m.castShadow=true;parent.add(m);return m;
    };
    // legs and shoes
    capsule(avatar,.16,.42,pants,-.19,.55,0);capsule(avatar,.16,.42,pants,.19,.55,0);
    addSphere(avatar,.19,shoe,-.19,.16,.1,[1.25,.62,1.7]);addSphere(avatar,.19,shoe,.19,.16,.1,[1.25,.62,1.7]);
    // torso and neck
    capsule(avatar,.34,.48,shirt,0,1.25,0);
    addSphere(avatar,.13,skin,0,1.66,0,[.9,1,.9]);
    // jacket lapels and department-specific detail
    const lapel=addBox(avatar,.13,.42,.045,white,-.105,1.32,.3);lapel.rotation.z=-.16;
    const lapel2=addBox(avatar,.13,.42,.045,white,.105,1.32,.3);lapel2.rotation.z=.16;
    addBox(avatar,.075,.38,.04,mat(0x25384d),0,1.31,.325);
    for(let b=0;b<3;b++)addSphere(avatar,.025,mat(0xe6c77f,.65,.25),0,1.19+b*.12,.36);
    // arms, sleeves, hands
    const armL=capsule(avatar,.105,.43,shirt,-.43,1.22,0),armR=capsule(avatar,.105,.43,shirt,.43,1.22,0);
    armL.rotation.z=-.24;armR.rotation.z=.24;
    addSphere(avatar,.12,skin,-.48,.88,.04);addSphere(avatar,.12,skin,.48,.88,.04);
    // oversized friendly stylized head
    const head=new THREE.Group();head.position.set(0,2.02,0);avatar.add(head);
    addSphere(head,.47,skin,0,0,0,[.92,1.05,.86]);
    // ears
    addSphere(head,.105,skin,-.45,-.02,0);addSphere(head,.105,skin,.45,-.02,0);
    // hairstyle variations
    addSphere(head,.46,hair,0,.29,-.025,[1,.55,.92]);
    if(index%3===0){addSphere(head,.23,hair,-.24,.31,.22,[1,.55,.8]);addSphere(head,.2,hair,.18,.35,.22,[1,.55,.8])}
    else if(index%3===1){addSphere(head,.2,hair,.31,.24,.06,[.8,1,.9]);addSphere(head,.17,hair,-.35,.17,.08,[.7,1,.8])}
    else{const fringe=addSphere(head,.28,hair,0,.17,.35,[1,.55,.5]);fringe.rotation.z=.12}
    // eyes, brows, nose, smile
    for(const ex of [-.17,.17]){
      addSphere(head,.058,white,ex,.035,.392,[1,1,.42]);
      addSphere(head,.028,eye,ex,.03,.42,[1,1,.55]);
      addBox(head,.13,.025,.025,hair,ex,.15,.39);
    }
    addSphere(head,.055,skin,0,-.07,.43,[.75,.8,.7]);
    const smile=new THREE.Mesh(new THREE.TorusGeometry(.09,.014,6,18,Math.PI),mat(0x9c5b52));smile.position.set(0,-.17,.398);smile.rotation.z=Math.PI;head.add(smile);
    // neck lanyard and ID card
    addBox(avatar,.035,.33,.035,mat(0xf2c66d),0,1.48,.37);
    addBox(avatar,.2,.25,.045,white,0,1.27,.39);
    addBox(avatar,.13,.035,.012,basic(accent),0,1.31,.418);
    // selected halo + live status ring
    const halo=new THREE.Mesh(new THREE.TorusGeometry(.78,.045,10,48),new THREE.MeshBasicMaterial({color:statusColor(hqStatus(employee).key)}));
    halo.rotation.x=Math.PI/2;halo.position.y=.07;avatar.add(halo);
    const selection=new THREE.Mesh(new THREE.TorusGeometry(.94,.035,8,48),new THREE.MeshBasicMaterial({color:0x8bdcff,transparent:true,opacity:0}));selection.rotation.x=Math.PI/2;selection.position.y=.035;avatar.add(selection);
    const label=hqTextSprite(THREE,(employee.name+" / "+employee.department).toUpperCase().slice(0,30),"#"+new THREE.Color(accent).getHexString());
    label.position.set(0,3.2,0);avatar.add(label);
    avatar.userData={employeeId:employee.id,status:hqStatus(employee).key,armL,armR,halo,selection,phase:index*.67,accent};
    figures.push(avatar);
  });
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
  renderer.domElement.addEventListener("pointerdown",ev=>{down={x:ev.clientX,y:ev.clientY}});
  renderer.domElement.addEventListener("pointerup",ev=>{
    if(!down||Math.hypot(ev.clientX-down.x,ev.clientY-down.y)>7){down=null;return}
    down=null;const rect=renderer.domElement.getBoundingClientRect();
    pointer.x=(ev.clientX-rect.left)/rect.width*2-1;pointer.y=-(ev.clientY-rect.top)/rect.height*2+1;
    ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(figures,true)[0];if(!hit)return;
    let node=hit.object;while(node&&!node.userData.employeeId)node=node.parent;
    if(node)selectHQEmployee(node.userData.employeeId);
  });
  renderer.domElement.addEventListener("pointermove",ev=>{
    if(down)return;const rect=renderer.domElement.getBoundingClientRect();
    pointer.x=(ev.clientX-rect.left)/rect.width*2-1;pointer.y=-(ev.clientY-rect.top)/rect.height*2+1;
    ray.setFromCamera(pointer,camera);renderer.domElement.style.cursor=ray.intersectObjects(figures,true).length?"pointer":"grab";
  });
  const resize=new ResizeObserver(()=>{
    const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);
  });resize.observe(el);
  let raf=0,alive=true,isVisible=true;
  const visibilityObserver=typeof IntersectionObserver!=="undefined"?new IntersectionObserver(entries=>{
    isVisible=entries.some(entry=>entry.isIntersecting);
    if(isVisible&&alive&&!raf)animate();
  },{threshold:.01}):null;
  if(visibilityObserver){isVisible=false;visibilityObserver.observe(el)}
  function onWalkKeyDown(ev){if(!gameMode)return;const tag=ev.target?.tagName;if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT")return;const key=ev.key.toLowerCase();if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(key)){movementKeys.add(key);ev.preventDefault()}}
  function onWalkKeyUp(ev){movementKeys.delete(ev.key.toLowerCase())}
  window.addEventListener("keydown",onWalkKeyDown);window.addEventListener("keyup",onWalkKeyUp);
  const animate=()=>{
    if(!alive||!isVisible){raf=0;return}raf=requestAnimationFrame(animate);const t=performance.now()/1000;
    if(gameMode&&(movementKeys.size||Math.abs(joystickMoveX)>.015||Math.abs(joystickMoveY)>.015)){const forward=new THREE.Vector3(-Math.sin(walkYaw),0,-Math.cos(walkYaw));const right=new THREE.Vector3(Math.cos(walkYaw),0,-Math.sin(walkYaw));const move=new THREE.Vector3();if(movementKeys.has("w")||movementKeys.has("arrowup"))move.add(forward);if(movementKeys.has("s")||movementKeys.has("arrowdown"))move.sub(forward);if(movementKeys.has("d")||movementKeys.has("arrowright"))move.add(right);if(movementKeys.has("a")||movementKeys.has("arrowleft"))move.sub(right);if(Math.abs(joystickMoveX)>.015)move.addScaledVector(right,joystickMoveX);if(Math.abs(joystickMoveY)>.015)move.addScaledVector(forward,-joystickMoveY);const strength=Math.min(1,move.length());if(strength>0)move.normalize().multiplyScalar(.105*strength);camera.position.add(move);camera.position.x=THREE.MathUtils.clamp(camera.position.x,-16.5,16.5);camera.position.z=THREE.MathUtils.clamp(camera.position.z,-11.5,11.5);camera.position.y=1.72;camera.rotation.order="YXZ";camera.rotation.set(walkPitch,walkYaw,0)}
    figures.forEach(figure=>{
      const data=figure.userData;
      figure.position.y=Math.sin(t*1.3+data.phase)*.018;
      if(data.status==="working"){data.armL.rotation.z=-.24+Math.sin(t*4.5+data.phase)*.13;data.armR.rotation.z=.24-Math.sin(t*4.5+data.phase)*.13}
      data.selection.material.opacity=selectedHQEmployeeId===data.employeeId?.85:0;
      data.halo.material.color.setHex(statusColor(data.status));
    });
    ring.rotation.z=t*.13;controls.update();renderer.render(scene,camera);
  };animate();
  const world={
    figures,controls,camera,employeeIds:employees.map(e=>e.id),
    refresh(){
      figures.forEach(figure=>{
        const employee=employees.find(e=>e.id===figure.userData.employeeId);if(!employee)return;
        const status=hqStatus(employee);figure.userData.status=status.key;
        figure.userData.halo.material.color.setHex(statusColor(status.key));
      });
    },
    select(id){figures.forEach(f=>f.userData.selection.material.opacity=f.userData.employeeId===id?.85:0)},
    reset(){gameMode=false;target.set(0,1.15,0);camera.position.set(29,22,34);spherical.setFromVector3(new THREE.Vector3().subVectors(camera.position,target));controls.update()},
    zoom(factor){if(gameMode){camera.position.add(new THREE.Vector3(-Math.sin(walkYaw),0,-Math.cos(walkYaw)).multiplyScalar(factor<1?1.2:-1.2));camera.position.x=THREE.MathUtils.clamp(camera.position.x,-16.5,16.5);camera.position.z=THREE.MathUtils.clamp(camera.position.z,-11.5,11.5)}else{spherical.radius*=factor;controls.update()}},
    setGameMode(enabled){gameMode=!!enabled;movementKeys.clear();joystickMoveX=0;joystickMoveY=0;if(gameMode){camera.position.set(0,1.72,10);walkYaw=0;walkPitch=-.12;camera.rotation.order="YXZ";camera.rotation.set(walkPitch,walkYaw,0)}else{target.set(0,1.15,0);camera.position.set(29,22,34);spherical.setFromVector3(new THREE.Vector3().subVectors(camera.position,target));controls.update()}return gameMode},
    focusEmployee(id){const pos=employeePositionMap.get(id);if(!pos)return;const [x,z]=pos;if(gameMode){camera.position.set(x,1.72,z+4.8);walkYaw=0;walkPitch=-.12;camera.rotation.set(walkPitch,walkYaw,0)}else{target.set(x,1.2,z);spherical.radius=10;controls.update()}},
    setJoystickMovement(x,y){if(!gameMode){joystickMoveX=0;joystickMoveY=0;return}joystickMoveX=clamp(Number(x)||0,-1,1);joystickMoveY=clamp(Number(y)||0,-1,1)},
    move(direction){if(!gameMode)return;const v=new THREE.Vector3(-Math.sin(walkYaw),0,-Math.cos(walkYaw)),r=new THREE.Vector3(Math.cos(walkYaw),0,-Math.sin(walkYaw));const delta=direction==="forward"?v:direction==="back"?v.clone().negate():direction==="left"?r.clone().negate():r;camera.position.add(delta.multiplyScalar(1.25));camera.position.x=THREE.MathUtils.clamp(camera.position.x,-16.5,16.5);camera.position.z=THREE.MathUtils.clamp(camera.position.z,-11.5,11.5)},
    dispose(){alive=false;cancelAnimationFrame(raf);resize.disconnect();visibilityObserver?.disconnect();controls.dispose();renderer.dispose();scene.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material){const materials=Array.isArray(obj.material)?obj.material:[obj.material];materials.forEach(m=>{if(m.map)m.map.dispose();m.dispose()})}});el.innerHTML=""}
  };
  hqWorlds.set(el,world);world.select(selectedHQEmployeeId);world.refresh();
}
function launchHQ3D(el){
  if(!el||hqWorlds.has(el))return Promise.resolve(hqWorlds.get(el));
  if(hqBuilds.has(el))return hqBuilds.get(el);
  const build=buildHQ3D(el).catch(err=>{console.error("3D HQ unavailable:",err);if(el)el.innerHTML='<div class="hq-3d-loading">3D view unavailable. Your company workspace and sign-in remain available. Please refresh to retry.</div>'}).finally(()=>hqBuilds.delete(el));
  hqBuilds.set(el,build);return build;
}
function renderVirtualHQ(){
  const icons={ai_ceo:"🧭",research:"🔎",content:"✍️",marketing:"📣",quality:"🛡️",qc:"✓",qa:"◈",finance:"💹",operations:"⚙️"};
  ["#virtual-hq-scene","#virtual-hq-full-scene"].forEach(sel=>{
    const el=$(sel);if(!el)return;
    el.classList.add("hq-3d-stage");
    // Never create WebGL renderers for hidden pages or while the app shell is still hidden.
    const visible=el.getClientRects().length>0&&el.clientWidth>0&&el.clientHeight>0;
    if(!visible){
      if(!hqWorlds.has(el))el.innerHTML='<div class="hq-3d-loading">3D HEADQUARTERS READY · OPEN VIRTUAL HQ TO ENTER</div>';
      return;
    }
    if(!hqWorlds.has(el)){
      if(!el.querySelector(".hq-3d-loading"))el.innerHTML='<div class="hq-3d-loading">BUILDING LIVE 3D HEADQUARTERS…</div>';
      requestAnimationFrame(()=>{if(el.getClientRects().length>0&&el.clientWidth>0&&el.clientHeight>0)launchHQ3D(el)});
    }else{
      const world=hqWorlds.get(el);
      const currentIds=(world.employeeIds||[]).join("|"),latestIds=employees.map(e=>e.id).join("|");
      if(currentIds!==latestIds){world.dispose();hqWorlds.delete(el);el.innerHTML='<div class="hq-3d-loading">UPDATING COMPANY FLOOR…</div>';requestAnimationFrame(()=>{if(el.getClientRects().length>0&&el.clientWidth>0&&el.clientHeight>0)launchHQ3D(el)});}
      else world.refresh();
    }
  });
  const grid=$("#hq-department-grid");
  const agentTotal=$("#hq-agent-total"),agentActive=$("#hq-agent-active"),deptTotal=$("#hq-department-total");if(agentTotal)agentTotal.textContent=employees.length+" AI AGENTS";if(agentActive)agentActive.textContent=employees.filter(e=>hqStatus(e).count>0).length+" WITH OPEN WORK";if(deptTotal)deptTotal.textContent=[...new Set(employees.map(e=>e.department).filter(Boolean))].length+" DEPARTMENTS";
  if(grid)grid.innerHTML=employees.map(e=>{
    const st=hqStatus(e);
    return '<article class="hq-dept-card '+(selectedHQEmployeeId===e.id?'selected':'')+'" data-hq-employee="'+escapeHtml(e.id)+'" role="button" tabindex="0"><div class="hq-dept-icon">'+(icons[e.role_key]||"🤖")+'</div><div><strong>'+escapeHtml(e.name)+'</strong><span>'+escapeHtml(e.department)+'</span><small>'+escapeHtml(e.responsibilities)+'</small></div><b class="hq-status '+st.key+'">'+st.label+'</b><footer>'+st.count+' open task'+(st.count===1?'':'s')+'</footer></article>'
  }).join("");
  const deptSelect=$("#hq-department-select");if(deptSelect){const depts=[...new Set(employees.map(e=>e.department).filter(Boolean))].sort();const selected=deptSelect.value;deptSelect.innerHTML='<option value="">Jump to department…</option>'+depts.map(d=>'<option value="'+escapeHtml(d)+'">'+escapeHtml(d)+'</option>').join("");if(depts.includes(selected))deptSelect.value=selected}
  if(selectedHQEmployeeId&&!employees.some(e=>e.id===selectedHQEmployeeId))selectedHQEmployeeId=null;
  hqWorlds.forEach(world=>world.select(selectedHQEmployeeId));
  renderHQDetail(selectedHQEmployeeId);
}
function renderHQDetail(employeeId){
  const targets=["#hq-selected-detail-overview","#hq-selected-detail-full"].map($).filter(Boolean);
  if(!employeeId){targets.forEach(el=>{el.hidden=true;el.innerHTML=""});return}
  const employee=employees.find(e=>e.id===employeeId);
  if(!employee){targets.forEach(el=>{el.hidden=true;el.innerHTML=""});return}
  const assigned=tasks.filter(t=>t.assigned_employee_id===employee.id);
  const active=assigned.filter(t=>!["completed","cancelled"].includes(t.status));
  const taskMarkup=active.length?active.map(t=>'<li><span>'+escapeHtml(t.title)+'</span><b class="hq-task-status '+escapeHtml(t.status)+'">'+escapeHtml(prettyStatus(t.status))+'</b></li>').join(""):'<li class="hq-no-task">No active tasks assigned to this department.</li>';
  const markup='<div class="hq-detail-head"><div><small>DEPARTMENT INSPECTOR</small><strong>'+escapeHtml(employee.name)+'</strong><span>'+escapeHtml(employee.department)+'</span></div><button type="button" class="hq-detail-close" data-hq-close aria-label="Close department details">×</button></div><p>'+escapeHtml(employee.responsibilities)+'</p><div class="hq-detail-summary"><span>'+active.length+' active task'+(active.length===1?'':'s')+'</span><span>'+assigned.filter(t=>t.status==="completed").length+' completed</span></div><ul>'+taskMarkup+'</ul>';
  targets.forEach(el=>{el.innerHTML=markup;el.hidden=false});
}
function selectHQEmployee(employeeId){
  selectedHQEmployeeId=employeeId;
  $$(".hq-dept-card").forEach(card=>card.classList.toggle("selected",card.dataset.hqEmployee===employeeId));
  hqWorlds.forEach(world=>{world.select(employeeId);world.focusEmployee?.(employeeId)});
  renderHQDetail(employeeId);
}
let hqLastEventAt=null,hqEventCount=0;
function updateHQLiveIndicator(state,message){
  const live=$("#hq-live-indicator");if(!live)return;
  live.dataset.state=state;
  const stamp=hqLastEventAt?new Date(hqLastEventAt).toLocaleTimeString():"no events yet";
  const count=hqEventCount+" database event"+(hqEventCount===1?"":"s");
  live.textContent=state==="event"?"● REALTIME ACTIVE · "+count+" · LAST EVENT "+stamp:state==="connected"?"● CHANNEL CONNECTED · 0 DATABASE EVENTS · WAITING FOR CHANGE":state==="offline"?"● REALTIME DISCONNECTED · "+(message||"check connection"):"● CONNECTING TO DATABASE EVENTS";
}
function onHQDatabaseEvent(payload){
  hqEventCount++;hqLastEventAt=new Date().toISOString();
  updateHQLiveIndicator("event");scheduleHQRefresh();
  const last=$("#hq-live-last-event");if(last){const table=payload?.table||"database";const event=payload?.eventType||"UPDATE";last.textContent="Last change: "+table+" · "+event+" · "+new Date(hqLastEventAt).toLocaleTimeString();}
}
function scheduleHQRefresh(){
  if(hqRefreshTimer)clearTimeout(hqRefreshTimer);
  hqRefreshTimer=setTimeout(()=>{hqRefreshTimer=null;loadData().catch(error=>console.error("Live HQ refresh failed:",error))},240);
}
function setupHQRealtime(){
  if(hqChannel){supabase.removeChannel(hqChannel);hqChannel=null}
  if(!company)return;
  hqEventCount=0;hqLastEventAt=null;
  updateHQLiveIndicator("connecting");
  const channel=supabase.channel("hq-live-"+company.id);
  const tables=["tasks","ai_employees","company_departments","company_operating_policies","approvals","content_assets","research_sources","agent_messages","quality_reviews","task_events","agent_work_sample_assignments","agent_capability_test_runs","workflow_runs","workflow_steps","distribution_accounts","distribution_publications","finance_entries","recovery_snapshots","revision_history"];
  tables.forEach(table=>channel.on("postgres_changes",{event:"*",schema:"public",table,filter:"company_id=eq."+company.id},onHQDatabaseEvent));
  hqChannel=channel.subscribe(status=>{
    if(status==="SUBSCRIBED")updateHQLiveIndicator("connected");
    else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED")updateHQLiveIndicator("offline",status);
    else updateHQLiveIndicator("connecting",status);
  });
}
function taskRow(t,all=false){
  const owner=t.ai_employees?.name||employees.find(e=>e.id===t.assigned_employee_id)?.name||"Unassigned";
  const action=all?(t.status==="queued"&&t.assigned_employee_id?'<button class="run-task-btn" type="button" data-run-task="'+escapeHtml(t.id)+'">▶ Run AI</button>':'<span class="muted task-action-note">'+(t.status==="review"?"Owner review":"—")+'</span>'):"";
  return '<tr><td><span class="task-name">'+escapeHtml(t.title)+'</span><span class="task-id">'+escapeHtml(t.id.slice(0,8))+'</span></td><td>'+escapeHtml(owner)+'</td>'+(all?'<td>'+escapeHtml(t.ai_employees?.department||"—")+'</td>':"")+'<td><span class="pill '+statusClass(t.status)+'">'+prettyStatus(t.status)+'</span></td><td><span class="priority '+escapeHtml(t.priority)+'">'+prettyStatus(t.priority)+'</span></td>'+(all?'<td>'+action+'</td>':"")+'</tr>';
}
function employeeRow(e){return '<div class="employee-row"><div class="employee-icon">✦</div><div><strong>'+escapeHtml(e.name)+'</strong><small>'+escapeHtml(e.department)+'</small></div><span class="employee-state">'+escapeHtml(prettyStatus(e.status))+'</span></div>'}

function openApproval(approvalId){
  const approval=approvals.find(a=>a.id===approvalId);
  if(!approval)return;
  const asset=contentAssets.filter(a=>a.task_id===approval.task_id).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))[0];
  $("#approval-detail-title").textContent=approval.title;
  $("#approval-detail-description").textContent=approval.description||"Owner review requested.";
  $("#approval-detail-body").textContent=asset?.body||"No deliverable body was attached to this approval.";
  $("#approval-detail-note").value="";
  $("#approval-detail-dialog").dataset.approvalId=approval.id;
  [$("#approval-approve-btn"),$("#approval-revision-btn"),$("#approval-reject-btn")].forEach(button=>{button.disabled=false;});
  $("#approval-copy-btn").disabled=false;
  $("#approval-copy-btn").textContent="⧉ Copy deliverable";
  $("#approval-detail-dialog").showModal();
}
async function copyApprovalDeliverable(){
  const dialog=$("#approval-detail-dialog");
  const approval=approvals.find(a=>a.id===dialog.dataset.approvalId);
  if(!approval){alert("Approval record not found. Close and reopen this deliverable.");return;}
  const asset=contentAssets.filter(a=>a.task_id===approval.task_id).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))[0];
  const body=typeof asset?.body==="string"?asset.body:"";
  const text=body||[approval.title,approval.description||""].filter(Boolean).join("\n\n");
  if(!text.trim()){alert("No deliverable content is available to copy.");return;}
  const button=$("#approval-copy-btn");
  button.disabled=true;
  try{
    if(navigator.clipboard&&window.isSecureContext){
      await navigator.clipboard.writeText(text);
    }else{
      const field=document.createElement("textarea");
      field.value=text;field.setAttribute("readonly","");
      field.style.position="fixed";field.style.left="-9999px";field.style.top="0";
      document.body.appendChild(field);field.focus();field.select();field.setSelectionRange(0,field.value.length);
      const copied=document.execCommand("copy");field.remove();
      if(!copied)throw new Error("Copy is not supported by this browser.");
    }
    button.textContent="✓ Copied full deliverable";
    setTimeout(()=>{button.textContent="⧉ Copy deliverable";button.disabled=false},1800);
  }catch(error){
    button.disabled=false;
    alert("Could not copy automatically. Try opening the app in your browser and allow clipboard access.");
  }
}
async function decideApproval(decision){
  const dialog=$("#approval-detail-dialog"),approvalId=dialog.dataset.approvalId;
  const approval=approvals.find(a=>a.id===approvalId);
  if(!approval)return;
  const note=$("#approval-detail-note").value.trim();
  if(decision==="revision_requested"&&!note){alert("Please add a revision note so the AI employee knows what to change.");$("#approval-detail-note").focus();return;}
  const buttons=[$("#approval-approve-btn"),$("#approval-revision-btn"),$("#approval-reject-btn")];
  buttons.forEach(b=>b.disabled=true);
  try{
    const assetBefore=contentAssets.filter(a=>a.task_id===approval.task_id).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))[0];
    const taskBefore=tasks.find(t=>t.id===approval.task_id);
    const {error:snapshotError}=await supabase.from("recovery_snapshots").insert({company_id:company.id,task_id:approval.task_id,entity_type:"approval",entity_id:approval.id,action:"before_owner_"+decision,created_by:currentUser.id,snapshot:{approval,task:taskBefore||null,asset:assetBefore||null}});
    if(snapshotError)throw snapshotError;
    const {error:approvalError}=await supabase.from("approvals").update({
      status:decision,decided_by:currentUser.id,decided_at:new Date().toISOString(),decision_note:note||null
    }).eq("id",approvalId).eq("status","pending");
    if(approvalError)throw approvalError;
    if(approval.task_id){
      const asset=assetBefore;
      if(asset){
        const assetStatus=decision==="approved"?"approved":decision==="rejected"?"rejected":"draft";
        const {error:assetError}=await supabase.from("content_assets").update({status:assetStatus,updated_at:new Date().toISOString()}).eq("id",asset.id);
        if(assetError)throw assetError;
      }
      const taskStatus=decision==="approved"?"completed":decision==="rejected"?"blocked":"queued";
      const {error:taskError}=await supabase.from("tasks").update({status:taskStatus,updated_at:new Date().toISOString()}).eq("id",approval.task_id);
      if(taskError)throw taskError;
      await supabase.from("task_events").insert({
        company_id:company.id,task_id:approval.task_id,event_type:decision==="revision_requested"?"owner_revision_requested":"owner_"+decision,
        message:decision==="revision_requested"?"Owner requested revisions: "+approval.title:"Owner "+decision+" deliverable: "+approval.title,
        metadata:{decision_note:note||null}
      });
    }
    dialog.close();
    if(decision==="revision_requested"){
      try{
        const {data,error:runError}=await supabase.functions.invoke("execute-company-task",{body:{task_id:approval.task_id,company_id:company.id}});
        if(runError)throw runError;
        if(data?.error)throw new Error(data.error);
        alert("Revision dispatched automatically. Content Officer will revise, then QC and QA will run before the next Owner review.");
      }catch(runError){
        alert("Revision saved, but automatic execution did not start: "+(runError.message||"Check the AI provider connection.")+". The task remains queued.");
      }
    }else{
      alert(decision==="approved"?"Deliverable approved.": "Deliverable rejected. The task is blocked.");
    }
    await loadData();
  }catch(error){
    showError(error);
    buttons.forEach(b=>b.disabled=false);
  }
}

async function startWorkspace(user){
  currentUser=user;setSystem("SYNCING");
  $("#owner-email").textContent=user.email||"OWNER";
  setMessage("Sign-in successful. Loading your CurioFrame workspace…");
  try{
    await ensureCompany();
    await loadData();
    setupHQRealtime();
    setSystem("DATABASE CONNECTED");
    showApp();
    requestAnimationFrame(()=>renderVirtualHQ());
    const requestedPage=location.hash.replace(/^#/, "");
    if(requestedPage && document.getElementById("page-"+requestedPage)) navigate(requestedPage);
    setMessage("");
  }catch(error){
    console.error("Workspace initialization failed:",error);
    showAuth();
    setSystem("WORKSPACE LOAD ERROR");
    setMessage("Your account is signed in, but CurioFrame could not load its workspace. Your account and data are safe. Details: "+(error.message||"Unknown database error"));
    throw error;
  }
}
async function handleAuth(event){
  event.preventDefault();const button=$("#auth-submit");button.disabled=true;setMessage(authMode==="recovery"?"Updating your password…":"Connecting to secure sign-in…");
  const email=$("#auth-email").value.trim(),password=$("#auth-password").value;
  try{
    if(authMode==="recovery"){
      const {error}=await supabase.auth.updateUser({password});if(error)throw error;
      authMode="signin";$("#auth-password").value="";setAuthModeUI();setMessage("Password updated successfully. Sign in with your new password.");
    }else if(authMode==="signup"){
      const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:location.href.split("#")[0]}});
      if(error)throw error;
      if(data.session){await startWorkspace(data.user);setMessage("")}
      else setMessage("Account created. Check your email to confirm, then return here and sign in.");
    }else{
      if($("#remember-email").checked)safeStorageSet("curioframe_owner_email",email);
      else safeStorageRemove("curioframe_owner_email");
      const {data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error)throw error;await startWorkspace(data.user);setMessage("");
    }
  }catch(error){
    console.error("Authentication failed:",error);
    showAuth();setSystem(authMode==="recovery"?"PASSWORD RESET ERROR":"SIGN-IN ERROR");
    setMessage(error.message||"Unable to continue. Check your details and try again.");
  }finally{button.disabled=false}
}
let authMode="signin";
function setAuthModeUI(){
  const recovery=authMode==="recovery",signup=authMode==="signup";
  $("#auth-title").textContent=recovery?"Choose a new password":signup?"Create owner account":"Owner sign in";
  $("#auth-copy").textContent=recovery?"Enter a new password for your CurioFrame Owner account.":signup?"Create the secure owner login for CurioFrame AI.":"Sign in to open your private company workspace.";
  $("#auth-submit").textContent=recovery?"Update password":signup?"Create account":"Sign in";
  $("#auth-switch").hidden=recovery;$("#auth-forgot-password").hidden=signup||recovery;$("#auth-options").hidden=recovery||signup;
  $("#auth-password-label").textContent=recovery?"New password":signup?"Create password":"Password";
  $("#auth-email-label").hidden=recovery;$("#auth-email").required=!recovery;
  $("#auth-password").autocomplete=signup||recovery?"new-password":"current-password";
  $("#auth-password").value="";
}
function toggleAuth(){
  authMode=authMode==="signin"?"signup":"signin";setAuthModeUI();
  $("#auth-switch").textContent=authMode==="signup"?"Already registered? Sign in":"New here? Create your owner account";setMessage("");
}
async function requestPasswordReset(){
  const email=$("#auth-email").value.trim();
  if(!email){setMessage("Enter your account email first, then tap Forgot password.");$("#auth-email").focus();return}
  const button=$("#auth-forgot-password");button.disabled=true;setMessage("Sending password recovery email…");
  try{
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.href.split("#")[0]});
    if(error)throw error;
    setMessage("If this email belongs to an account, a password reset link has been sent. Check your inbox and spam folder.");
  }catch(error){setMessage(error.message||"Could not send the recovery email. Please try again.");}
  finally{button.disabled=false}
}

async function refreshSession(){
  const {data,error}=await supabase.auth.getSession();if(error)throw error;
  if(authMode==="recovery"){showAuth();return}
  if(data.session)await startWorkspace(data.session.user);else showAuth();
}
function navigate(page){
  $$(".page").forEach(p=>p.classList.toggle("active-page",p.id==="page-"+page));
  $$(".nav-link").forEach(a=>a.classList.toggle("active",a.dataset.page===page));
  $("#page-crumb").textContent=page.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase());
  $("#sidebar").classList.remove("open");history.replaceState(null,"","#"+page);
  // A hidden page has zero width; initialize its WebGL canvas only after it becomes visible.
  if(page==="virtual-hq"){
    requestAnimationFrame(()=>{
      const stage=$("#virtual-hq-full-scene");
      if(stage&&!hqWorlds.has(stage)&&stage.clientWidth>0&&stage.clientHeight>0)launchHQ3D(stage);
      else if(stage&&hqWorlds.has(stage))hqWorlds.get(stage).refresh();
    });
  }
}
document.addEventListener("click",e=>{const link=e.target instanceof Element?e.target.closest("[data-page]"):null;if(!link)return;e.preventDefault();navigate(link.dataset.page)},true);
$("#menu-toggle").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#hq-refresh-btn")?.addEventListener("click",()=>loadData().catch(showError));
$("#history-refresh-btn")?.addEventListener("click",()=>loadData().catch(showError));
$("#distribution-refresh-btn")?.addEventListener("click",()=>loadData().catch(showError));
$("#auth-form").addEventListener("submit",handleAuth);$("#auth-switch").addEventListener("click",toggleAuth);$("#auth-forgot-password").addEventListener("click",requestPasswordReset);$("#auth-email").value=safeStorageGet("curioframe_owner_email");$("#remember-email").checked=!!$("#auth-email").value;
window.__curioAuthReady=true;
if(window.__curioBootTimer)clearTimeout(window.__curioBootTimer);
$("#sign-out-btn").addEventListener("click",async()=>{if(hqChannel){await supabase.removeChannel(hqChannel);hqChannel=null}await supabase.auth.signOut();company=null;selectedHQEmployeeId=null;showAuth();setMessage("You have been signed out.")});
function openTaskDialog(){
  $("#task-owner").innerHTML='<option value="">Unassigned</option>'+employees.map(e=>'<option value="'+e.id+'">'+escapeHtml(e.name)+'</option>').join("");
  $("#task-dialog").showModal();
}
$("#new-task-btn").addEventListener("click",openTaskDialog);$("#new-task-btn-2").addEventListener("click",openTaskDialog);
$("#orchestrator-form")?.addEventListener("submit",submitOrchestratorGoal);
$("#distribution-publication-form")?.addEventListener("submit",createDistributionPublication);
$("#organization-department-form")?.addEventListener("submit",addOrganizationDepartment);
$("#organization-agent-form")?.addEventListener("submit",addOrganizationAgent);
$("#capability-test-form")?.addEventListener("submit",recordCapabilityTest);
$("#research-qa-panel")?.addEventListener("submit",submitResearchQAReview);
$("#run-safe-simulation")?.addEventListener("click",runSafeWorkSampleSimulation);
$("#run-dispatcher-qa-dry-run")?.addEventListener("click",runDispatcherQADryRun);
$("#run-department-integration-dry-run")?.addEventListener("click",runDepartmentIntegrationDryRun);
$("#run-research-content-handoff")?.addEventListener("click",runResearchContentRealHandoff);
$("#run-content-intake-validation")?.addEventListener("click",runContentIntakeSourceValidation);
$("#research-evidence-form")?.addEventListener("submit",submitResearchEvidencePack);
$("#run-source-verification")?.addEventListener("click",runResearchSourceVerification);
// Real execution is limited to one explicitly confirmed zero-cost pilot.
const pilotConfirm=$("#pilot-zero-cost-confirm"),pilotButton=$("#run-one-work-sample"),preflightButton=$("#check-ai-provider");
pilotConfirm?.addEventListener("change",()=>{aiProviderPreflightPassed=false;if(preflightButton)preflightButton.disabled=!pilotConfirm.checked;if(pilotButton)pilotButton.disabled=true});
preflightButton?.addEventListener("click",()=>checkAIProviderPreflight(preflightButton));
pilotButton?.addEventListener("click",runOneWorkSample);
$("#capability-refresh-btn")?.addEventListener("click",()=>loadData().catch(showError));
$("#organization-refresh-btn")?.addEventListener("click",()=>loadData().catch(showError));
document.addEventListener("click",e=>{const button=e.target.closest("[data-save-account]");if(button)saveDistributionAccount(button.dataset.saveAccount,button)});
document.addEventListener("click",e=>{const pre=e.target.closest("[data-capability-preflight]");if(pre)runCapabilityPreflight(pre.dataset.capabilityPreflight,pre);const verify=e.target.closest("[data-capability-verify]");if(verify)verifyCapabilityAgent(verify.dataset.capabilityVerify,verify);const runSample=e.target.closest("[data-work-sample-run]");if(runSample)runWorkSampleAssignment(runSample.dataset.workSampleRun,runSample)});
document.addEventListener("change",e=>{const input=e.target.closest("[data-activation-check]");if(input)saveDistributionActivationCheck(input.dataset.accountId,input.dataset.activationCheck,input.checked,input)});
document.addEventListener("change",e=>{const select=e.target.closest("#hq-department-select");if(!select||!select.value)return;const employee=employees.find(x=>x.department===select.value);if(employee)selectHQEmployee(employee.id)});
document.addEventListener("click",e=>{const button=e.target.closest("[data-verify-account]");if(button)verifyDistributionAccount(button.dataset.verifyAccount,button)});

const joystick=document.querySelector("#hq-virtual-joystick"),joystickKnob=document.querySelector("#hq-joystick-knob");
let joystickPointer=null;
function updateJoystick(ev){if(!joystick||!joystickKnob)return;const rect=joystick.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,max=rect.width*.34;let dx=ev.clientX-cx,dy=ev.clientY-cy;const len=Math.hypot(dx,dy);if(len>max){dx=dx/len*max;dy=dy/len*max}joystickKnob.style.transform="translate("+dx+"px,"+dy+"px)";const dead=8,nx=Math.abs(dx)<dead?0:dx/max,ny=Math.abs(dy)<dead?0:dy/max;const stage=$("#virtual-hq-full-scene"),world=stage?hqWorlds.get(stage):null;world?.setJoystickMovement(nx,ny)}
function endJoystick(){joystickPointer=null;const stage=$("#virtual-hq-full-scene"),world=stage?hqWorlds.get(stage):null;world?.setJoystickMovement(0,0);if(joystickKnob)joystickKnob.style.transform="translate(0,0)"}
document.addEventListener("pointerdown",ev=>{if(!ev.target.closest("#hq-virtual-joystick"))return;ev.preventDefault();joystickPointer=ev.pointerId;try{joystick.setPointerCapture(ev.pointerId)}catch{}updateJoystick(ev)});
document.addEventListener("pointermove",ev=>{if(ev.pointerId===joystickPointer)updateJoystick(ev)});
document.addEventListener("pointerup",ev=>{if(ev.pointerId===joystickPointer)endJoystick()});
document.addEventListener("pointercancel",ev=>{if(ev.pointerId===joystickPointer)endJoystick()});
document.addEventListener("click",e=>{
  const hqAction=e.target.closest("[data-hq-action]");if(hqAction){const action=hqAction.dataset.hqAction;hqWorlds.forEach(world=>{if(action==="walk")world.setGameMode(true);else if(action==="orbit")world.setGameMode(false);else if(action==="reset")world.reset();else if(action==="zoom-in")world.zoom(.82);else if(action==="zoom-out")world.zoom(1.22)});$$("[data-hq-action]").forEach(b=>b.classList.toggle("active",b.dataset.hqAction===(action==="reset"?"orbit":action)&&(action==="walk"||action==="orbit"||action==="reset")));return}
  const trigger=e.target.closest("[data-open-approval]");
  if(trigger){openApproval(trigger.dataset.openApproval);return}
  const qualityRestoreTrigger=e.target.closest("[data-restore-quality]");
  if(qualityRestoreTrigger){restoreQualityRejectedTask(qualityRestoreTrigger.dataset.restoreQuality,qualityRestoreTrigger);return}
  const transferRestoreTrigger=e.target.closest("[data-restore-transfer]");
  if(transferRestoreTrigger){restoreTransferredTask(transferRestoreTrigger.dataset.restoreTransfer,transferRestoreTrigger);return}
  const recoveryTrigger=e.target.closest("[data-reopen-approval]");
  if(recoveryTrigger){reopenApprovalForReview(recoveryTrigger.dataset.reopenApproval,recoveryTrigger);return}
  const hqClose=e.target.closest("[data-hq-close]");
  if(hqClose){selectedHQEmployeeId=null;renderVirtualHQ();return}
  const hqStation=e.target.closest("[data-hq-employee]");
  if(hqStation)selectHQEmployee(hqStation.dataset.hqEmployee);
});
document.addEventListener("keydown",e=>{
  if((e.key==="Enter"||e.key===" ")&&e.target.matches("[data-hq-employee]")){e.preventDefault();selectHQEmployee(e.target.dataset.hqEmployee)}
});
$("#approval-copy-btn").addEventListener("click",copyApprovalDeliverable);
$("#approval-approve-btn").addEventListener("click",()=>decideApproval("approved"));
$("#approval-revision-btn").addEventListener("click",()=>decideApproval("revision_requested"));
$("#approval-reject-btn").addEventListener("click",()=>decideApproval("rejected"));
$("#all-task-table").addEventListener("click",async e=>{
  const button=e.target.closest("[data-run-task]");if(!button)return;
  const taskId=button.dataset.runTask;
  button.disabled=true;button.textContent="Running…";
  try{
    const {data,error}=await supabase.functions.invoke("execute-company-task",{body:{task_id:taskId}});
    if(error)throw error;
    if(data?.error)throw new Error(data.error+(data.needs_secret?" Add GEMINI_API_KEY in Supabase Edge Function Secrets first.":""));
    alert(data.message||"AI deliverable sent for review.");
    await loadData();
  }catch(error){alert(error.message||"AI task could not run.");button.disabled=false;button.textContent="▶ Run AI"}
});
$("#task-form").addEventListener("submit",async e=>{
  if(e.submitter?.value==="cancel")return;e.preventDefault();
  const title=$("#task-title").value.trim();if(!title)return;
  const ownerId=$("#task-owner").value||null;
  const priority=$("#task-priority").value.toLowerCase();
  const button=$("#save-task");button.disabled=true;
  const {data:createdTask,error}=await supabase.from("tasks").insert({company_id:company.id,title,objective:"",assigned_employee_id:ownerId,priority,created_by:currentUser.id}).select("id").single();
  if(error){button.disabled=false;showError(error);return}
  await supabase.from("task_events").insert({company_id:company.id,task_id:createdTask.id,event_type:"task_created",message:"Task created: "+title});
  $("#task-dialog").close();$("#task-form").reset();
  if(ownerId){
    try{
      const {data,error:runError}=await supabase.functions.invoke("execute-company-task",{body:{task_id:createdTask.id}});
      if(runError)throw runError;
      if(data?.error)throw new Error(data.error+(data.needs_secret?" Add GEMINI_API_KEY in Supabase Edge Function Secrets first.":""));
      alert(data.message||"Task dispatched. QC/QA checks will run automatically when applicable.");
    }catch(runError){alert("Task saved, but automatic execution did not start: "+(runError.message||"Check the AI provider connection."));}
  }else{
    alert("Task saved. Assign it to an AI employee to enable automatic execution.");
  }
  button.disabled=false;await loadData();
});
supabase.auth.onAuthStateChange((event,session)=>{if(event==="PASSWORD_RECOVERY"){authMode="recovery";setAuthModeUI();showAuth();setMessage("Recovery link verified. Choose your new password.");return}if(!session){currentUser=null;company=null;showAuth()}});
refreshSession().catch(error=>{setSystem("CONNECTION ERROR");setMessage(error.message||"Could not connect to the workspace.");showAuth()});
