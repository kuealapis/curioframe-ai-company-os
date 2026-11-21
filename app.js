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
  {name:"Research Officer",role_key:"research",department:"Research",responsibilities:"Finds promising topics, verifies facts, and prepares research briefs."},
  {name:"Content Officer",role_key:"content",department:"Content Studio",responsibilities:"Turns approved research into English scripts and production assets."},
  {name:"Marketing Officer",role_key:"marketing",department:"Digital Marketing",responsibilities:"Plans packaging, distribution, audience growth, and customer acquisition."},
  {name:"Quality Manager",role_key:"quality",department:"Quality Assurance",responsibilities:"Coordinates quality policy and escalations."},
  {name:"QC Officer",role_key:"qc",department:"Quality Control",responsibilities:"Independently checks factual accuracy, source traceability, language, timing, and production quality."},
  {name:"QA Officer",role_key:"qa",department:"Quality Assurance",responsibilities:"Audits SOP compliance, Owner instructions, revision history, evidence, and workflow quality gates."},
  {name:"Finance Officer",role_key:"finance",department:"Finance",responsibilities:"Tracks income, expenses, budgets, and reinvestment proposals."},
  {name:"Operations Officer",role_key:"operations",department:"Operations",responsibilities:"Maintains workflows, schedules, records, and operational handoffs."}
];

let currentUser=null, company=null, employees=[], tasks=[], approvals=[], allApprovals=[], contentAssets=[], agentMessages=[], qualityReviews=[], taskEvents=[], recoverySnapshots=[], hqChannel=null, selectedHQEmployeeId=null;
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
  const [employeeRes,taskRes,approvalRes,assetRes,messageRes,qualityRes,eventRes,snapshotRes]=await Promise.all([
    supabase.from("ai_employees").select("*").eq("company_id",company.id).order("created_at"),
    supabase.from("tasks").select("*, ai_employees(name,department)").eq("company_id",company.id).order("created_at",{ascending:false}),
    supabase.from("approvals").select("*").eq("company_id",company.id).order("created_at",{ascending:false}),
    supabase.from("content_assets").select("*").eq("company_id",company.id),
    supabase.from("agent_messages").select("*, from_employee:ai_employees!agent_messages_from_employee_id_fkey(name), to_employee:ai_employees!agent_messages_to_employee_id_fkey(name)").eq("company_id",company.id).order("created_at",{ascending:false}).limit(40),
    supabase.from("quality_reviews").select("*, ai_employees(name)").eq("company_id",company.id).order("created_at",{ascending:false}).limit(40),
    supabase.from("task_events").select("*").eq("company_id",company.id).order("created_at",{ascending:false}).limit(150),
    supabase.from("recovery_snapshots").select("*").eq("company_id",company.id).order("created_at",{ascending:false}).limit(100)
  ]);
  for(const result of [employeeRes,taskRes,approvalRes,assetRes,messageRes,qualityRes,eventRes,snapshotRes])if(result.error)throw result.error;
  employees=employeeRes.data||[];tasks=taskRes.data||[];allApprovals=approvalRes.data||[];approvals=allApprovals.filter(a=>a.status==="pending");contentAssets=(assetRes.data||[]).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  agentMessages=messageRes.data||[];qualityReviews=qualityRes.data||[];taskEvents=eventRes.data||[];recoverySnapshots=snapshotRes.data||[];
  renderAll();
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
const hqColors={ai_ceo:0x8bb7ff,research:0x67d6d0,content:0xffb86b,marketing:0xd69bff,quality:0x82a8ff,qc:0x66c7ff,qa:0x76d6a5,finance:0xf2ce70,operations:0xb1bdcf};
function hqStatus(e){const a=tasks.filter(t=>t.assigned_employee_id===e.id&&!["completed","cancelled"].includes(t.status));if(a.some(t=>["review","pending"].includes(t.status)))return{key:"review",label:"AWAITING REVIEW",count:a.length};if(a.some(t=>t.status==="in_progress"))return{key:"working",label:"IN PROGRESS",count:a.length};if(a.some(t=>t.status==="blocked"))return{key:"blocked",label:"BLOCKED",count:a.length};if(a.some(t=>t.status==="queued"))return{key:"queued",label:"QUEUED",count:a.length};return{key:"idle",label:e.status==="planned"?"READY TO ACTIVATE":"IDLE",count:a.length}}
function hqTextSprite(THREE,text){const c=document.createElement("canvas");c.width=512;c.height=128;const x=c.getContext("2d");x.fillStyle="rgba(7,18,34,.9)";x.beginPath();x.roundRect(5,5,502,118,22);x.fill();x.strokeStyle="#5a819f";x.lineWidth=4;x.stroke();x.fillStyle="#e2f2ff";x.font="bold 34px system-ui";x.textAlign="center";x.textBaseline="middle";x.fillText(text,256,64,470);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));s.scale.set(3.1,.78,1);return s}
async function buildHQ3D(el){if(!el||!el.clientWidth)return;const [THREE,{OrbitControls}]=await Promise.all([import("https://esm.sh/three@0.170.0"),import("https://esm.sh/three@0.170.0/examples/jsm/controls/OrbitControls.js")]);const old=hqWorlds.get(el);if(old)old.dispose();el.innerHTML="";const scene=new THREE.Scene();scene.background=new THREE.Color(0x091426);scene.fog=new THREE.Fog(0x091426,24,48);const camera=new THREE.PerspectiveCamera(39,el.clientWidth/el.clientHeight,.1,100);camera.position.set(16,15,21);const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"low-power"});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(el.clientWidth,el.clientHeight);renderer.shadowMap.enabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;el.appendChild(renderer.domElement);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.06;controls.minDistance=8;controls.maxDistance=32;controls.maxPolarAngle=Math.PI*.48;controls.target.set(0,1,0);scene.add(new THREE.HemisphereLight(0xd9edff,0x18283d,2));const sun=new THREE.DirectionalLight(0xffffff,2.5);sun.position.set(-8,16,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);const glow=new THREE.PointLight(0x38bfe9,40,30);glow.position.set(8,7,-7);scene.add(glow);
const mat=(color,metalness=0,roughness=.7)=>new THREE.MeshStandardMaterial({color,metalness,roughness});const floor=new THREE.Mesh(new THREE.BoxGeometry(23,.5,17),mat(0x263e59));floor.position.y=-.28;floor.receiveShadow=true;scene.add(floor);const grid=new THREE.GridHelper(22,22,0x5c8bad,0x38536e);grid.position.y=-.02;scene.add(grid);const wall=new THREE.Mesh(new THREE.BoxGeometry(23,5,.22),mat(0x31516e,.2,.45));wall.position.set(0,2.2,-8.4);scene.add(wall);const side=new THREE.Mesh(new THREE.BoxGeometry(.22,5,17),mat(0x31516e,.2,.45));side.position.set(-11.4,2.2,0);scene.add(side);
const core=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.7,.7,48),mat(0x17466b,.5,.3));core.position.y=.35;core.castShadow=true;scene.add(core);const ring=new THREE.Mesh(new THREE.TorusGeometry(1.8,.05,10,64),new THREE.MeshBasicMaterial({color:0x5adcf0}));ring.rotation.x=Math.PI/2;ring.position.y=.75;scene.add(ring);const title=hqTextSprite(THREE,"CURIOFRAME · COMMAND");title.position.set(0,2,0);title.scale.set(4,.95,1);scene.add(title);
const coords=[[-7,-5],[-2,-5],[3,-5],[8,-5],[-8,3],[-3,5],[3,5],[8,3],[0,1.5]],figures=[];
employees.forEach((e,i)=>{const [x,z]=coords[i%coords.length],desk=new THREE.Group();const top=new THREE.Mesh(new THREE.BoxGeometry(2,.17,1),mat(0x98704e));top.position.y=1;desk.add(top);for(const dx of [-.8,.8])for(const dz of [-.35,.35]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.12,.95,.12),mat(0x536a80));leg.position.set(dx,.48,dz);desk.add(leg)}const monitor=new THREE.Mesh(new THREE.BoxGeometry(.8,.56,.1),mat(0x12314a,.2,.3));monitor.position.set(0,1.4,-.25);desk.add(monitor);const screen=new THREE.Mesh(new THREE.BoxGeometry(.68,.4,.02),new THREE.MeshBasicMaterial({color:0x48c9d9}));screen.position.set(0,1.4,-.19);desk.add(screen);desk.position.set(x,0,z);scene.add(desk);
const figure=new THREE.Group();figure.userData.employeeId=e.id;const skin=mat(0xf0bd91),shirt=mat(hqColors[e.role_key]||0x7aa7ff),dark=mat(0x26364d),black=mat(0x172236);const box=(w,h,d,m,px,py,pz,parent=figure)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(px,py,pz);o.castShadow=true;parent.add(o);return o};box(.76,.58,.48,shirt,0,1.02,0);box(.22,.48,.24,dark,-.18,.35,0);box(.22,.48,.24,dark,.18,.35,0);const head=new THREE.Group();head.position.y=1.52;figure.add(head);box(.66,.58,.58,skin,0,0,0,head);const stud=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.09,20),mat(0xf2ca71));stud.position.y=.34;head.add(stud);box(.1,.07,.035,black,-.15,.05,.3,head);box(.1,.07,.035,black,.15,.05,.3,head);const armL=box(.2,.58,.22,shirt,-.49,1.02,0),armR=box(.2,.58,.22,shirt,.49,1.02,0);armL.rotation.z=-.12;armR.rotation.z=.12;const label=hqTextSprite(THREE,({ai_ceo:"ALEX · CEO",research:"THEO · RESEARCH",content:"OLIVER · CONTENT",marketing:"SOPHIA · MARKETING",quality:"VICTOR · QUALITY",qc:"EMMA · QC",qa:"DANIEL · QA",finance:"GRACE · FINANCE",operations:"ETHAN · OPS"})[e.role_key]||e.name);label.position.set(0,2.55,0);figure.add(label);const st=hqStatus(e),halo=new THREE.Mesh(new THREE.TorusGeometry(.77,.035,8,40),new THREE.MeshBasicMaterial({color:st.key==="working"?0x36d6a0:st.key==="review"?0xf0bd69:st.key==="blocked"?0xef737d:0x7298bd}));halo.rotation.x=Math.PI/2;halo.position.y=.05;figure.add(halo);figure.position.set(x,0,z+1.2);figure.userData={employeeId:e.id,status:st.key,armL,armR,halo,phase:i*.7};scene.add(figure);figures.push(figure)});
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();renderer.domElement.addEventListener("pointerdown",ev=>{const r=renderer.domElement.getBoundingClientRect();pointer.x=(ev.clientX-r.left)/r.width*2-1;pointer.y=-(ev.clientY-r.top)/r.height*2+1;ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(figures,true)[0];if(hit){let p=hit.object;while(p&&!p.userData.employeeId)p=p.parent;if(p)selectHQEmployee(p.userData.employeeId)}});const resize=new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h)});resize.observe(el);let raf,alive=true;const animate=()=>{if(!alive)return;raf=requestAnimationFrame(animate);const t=performance.now()/1000;figures.forEach(f=>{const d=f.userData;f.position.y=d.status==="working"?.06+Math.sin(t*4+d.phase)*.05:Math.sin(t*1.2+d.phase)*.02;if(d.status==="working"){d.armL.rotation.z=-.35+Math.sin(t*5+d.phase)*.16;d.armR.rotation.z=.35-Math.sin(t*5+d.phase)*.16}});ring.rotation.z=t*.16;controls.update();renderer.render(scene,camera)};animate();hqWorlds.set(el,{dispose(){alive=false;cancelAnimationFrame(raf);resize.disconnect();controls.dispose();renderer.dispose();el.innerHTML=""}})}
function launchHQ3D(el){buildHQ3D(el).catch(err=>{console.error("3D HQ unavailable:",err);if(el)el.innerHTML='<div class="hq-3d-loading">3D view unavailable. Your company workspace and sign-in remain available. Please refresh to retry.</div>'})}
function renderVirtualHQ(){
  const icons={ai_ceo:"🧭",research:"🔎",content:"✍️",marketing:"📣",quality:"🛡️",qc:"✓",qa:"◈",finance:"💹",operations:"⚙️"};
  ["#virtual-hq-scene","#virtual-hq-full-scene"].forEach(sel=>{
    const el=$(sel);
    if(el){el.classList.add("hq-3d-stage");el.innerHTML='<div class="hq-3d-loading">BUILDING 3D HEADQUARTERS…</div>';requestAnimationFrame(()=>launchHQ3D(el))}
  });
  const grid=$("#hq-department-grid");
  if(grid)grid.innerHTML=employees.map(e=>{
    const st=hqStatus(e);
    return '<article class="hq-dept-card '+(selectedHQEmployeeId===e.id?'selected':'')+'" data-hq-employee="'+escapeHtml(e.id)+'" role="button" tabindex="0"><div class="hq-dept-icon">'+(icons[e.role_key]||"🤖")+'</div><div><strong>'+escapeHtml(e.name)+'</strong><span>'+escapeHtml(e.department)+'</span><small>'+escapeHtml(e.responsibilities)+'</small></div><b class="hq-status '+st.key+'">'+st.label+'</b><footer>'+st.count+' open task'+(st.count===1?'':'s')+'</footer></article>'
  }).join("");
  if(selectedHQEmployeeId&&!employees.some(e=>e.id===selectedHQEmployeeId))selectedHQEmployeeId=null;
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
  renderVirtualHQ();
}
function setupHQRealtime(){
  if(hqChannel){supabase.removeChannel(hqChannel);hqChannel=null}
  if(!company)return;
  const indicator=$("#hq-live-indicator");
  if(indicator)indicator.textContent="● CONNECTING TO LIVE DATA";
  hqChannel=supabase.channel("hq-live-"+company.id)
    .on("postgres_changes",{event:"*",schema:"public",table:"tasks",filter:"company_id=eq."+company.id},()=>loadData().catch(console.error))
    .on("postgres_changes",{event:"*",schema:"public",table:"ai_employees",filter:"company_id=eq."+company.id},()=>loadData().catch(console.error))
    .on("postgres_changes",{event:"*",schema:"public",table:"approvals",filter:"company_id=eq."+company.id},()=>loadData().catch(console.error))
    .on("postgres_changes",{event:"*",schema:"public",table:"content_assets",filter:"company_id=eq."+company.id},()=>loadData().catch(console.error))
    .on("postgres_changes",{event:"*",schema:"public",table:"agent_messages",filter:"company_id=eq."+company.id},()=>loadData().catch(console.error))
    .on("postgres_changes",{event:"*",schema:"public",table:"quality_reviews",filter:"company_id=eq."+company.id},()=>loadData().catch(console.error))
    .subscribe(status=>{
      const live=$("#hq-live-indicator");
      if(!live)return;
      if(status==="SUBSCRIBED"){live.textContent="● LIVE · DATABASE EVENTS CONNECTED";live.dataset.state="live"}
      else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"){live.textContent="● LIVE SYNC UNAVAILABLE · USE REFRESH";live.dataset.state="offline"}
      else{live.textContent="● CONNECTING TO LIVE DATA";live.dataset.state="connecting"}
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
        const {data,error:runError}=await supabase.functions.invoke("execute-company-task",{body:{task_id:approval.task_id}});
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
  if(page==="virtual-hq"){const stage=$("#virtual-hq-full-scene");requestAnimationFrame(()=>launchHQ3D(stage));}
  $$(".nav-link").forEach(a=>a.classList.toggle("active",a.dataset.page===page));
  $("#page-crumb").textContent=page.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase());
  $("#sidebar").classList.remove("open");history.replaceState(null,"","#"+page);
}
$$("[data-page]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();navigate(a.dataset.page)}));
$("#menu-toggle").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#hq-refresh-btn")?.addEventListener("click",()=>loadData().catch(showError));
$("#history-refresh-btn")?.addEventListener("click",()=>loadData().catch(showError));
$("#auth-form").addEventListener("submit",handleAuth);$("#auth-switch").addEventListener("click",toggleAuth);$("#auth-forgot-password").addEventListener("click",requestPasswordReset);$("#auth-email").value=safeStorageGet("curioframe_owner_email");$("#remember-email").checked=!!$("#auth-email").value;
window.__curioAuthReady=true;
if(window.__curioBootTimer)clearTimeout(window.__curioBootTimer);
$("#sign-out-btn").addEventListener("click",async()=>{if(hqChannel){await supabase.removeChannel(hqChannel);hqChannel=null}await supabase.auth.signOut();company=null;selectedHQEmployeeId=null;showAuth();setMessage("You have been signed out.")});
function openTaskDialog(){
  $("#task-owner").innerHTML='<option value="">Unassigned</option>'+employees.map(e=>'<option value="'+e.id+'">'+escapeHtml(e.name)+'</option>').join("");
  $("#task-dialog").showModal();
}
$("#new-task-btn").addEventListener("click",openTaskDialog);$("#new-task-btn-2").addEventListener("click",openTaskDialog);

document.addEventListener("click",e=>{
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
