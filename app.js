import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://bqdshgftkzsyihlfhqak.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Lv5AbrHDcABBhcztbouegQ_sVYK8r7s";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const employeeSeed = [
  {name:"AI CEO / Orchestrator",role_key:"ai_ceo",department:"Executive Office",responsibilities:"Coordinates company goals, delegates work, and escalates consequential decisions."},
  {name:"Research Officer",role_key:"research",department:"Research",responsibilities:"Finds promising topics, verifies facts, and prepares research briefs."},
  {name:"Content Officer",role_key:"content",department:"Content Studio",responsibilities:"Turns approved research into English scripts and production assets."},
  {name:"Marketing Officer",role_key:"marketing",department:"Digital Marketing",responsibilities:"Plans packaging, distribution, audience growth, and customer acquisition."},
  {name:"Quality Manager",role_key:"quality",department:"Quality Assurance",responsibilities:"Checks accuracy, language, originality, and brand fit."},
  {name:"Finance Officer",role_key:"finance",department:"Finance",responsibilities:"Tracks income, expenses, budgets, and reinvestment proposals."},
  {name:"Operations Officer",role_key:"operations",department:"Operations",responsibilities:"Maintains workflows, schedules, records, and operational handoffs."}
];

let currentUser=null, company=null, employees=[], tasks=[], approvals=[], contentAssets=[];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function setMessage(message){$("#auth-message").textContent=message}
function showAuth(){ $("#auth-screen").hidden=false; $("#app-shell").hidden=true }
function showApp(){ $("#auth-screen").hidden=true; $("#app-shell").hidden=false }
function setSystem(text){$("#system-status").innerHTML="<b></b> "+escapeHtml(text)}
function statusClass(s){return s==="in_progress"?"blue":s==="completed"||s==="published"?"green":s==="review"||s==="pending"?"amber":"gray"}
function prettyStatus(s){return String(s||"queued").replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}
function showError(error){console.error(error);alert(error.message||"Something went wrong. Please try again.")}

async function ensureCompany(){
  const {data:existing,error:readError}=await supabase.from("companies").select("*").limit(1).maybeSingle();
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
  const [employeeRes,taskRes,approvalRes,assetRes]=await Promise.all([
    supabase.from("ai_employees").select("*").eq("company_id",company.id).order("created_at"),
    supabase.from("tasks").select("*, ai_employees(name,department)").eq("company_id",company.id).order("created_at",{ascending:false}),
    supabase.from("approvals").select("*").eq("company_id",company.id).eq("status","pending").order("created_at",{ascending:false}),
    supabase.from("content_assets").select("*").eq("company_id",company.id)
  ]);
  for(const result of [employeeRes,taskRes,approvalRes,assetRes])if(result.error)throw result.error;
  employees=employeeRes.data||[];tasks=taskRes.data||[];approvals=approvalRes.data||[];contentAssets=assetRes.data||[];
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
  $("#employee-grid").innerHTML=employees.map(e=>'<article class="employee-card"><div class="employee-icon">✦</div><h3>'+escapeHtml(e.name)+'</h3><div class="role">'+escapeHtml(e.department)+'</div><p>'+escapeHtml(e.responsibilities)+'</p><div class="card-foot">ROLE REGISTERED · '+escapeHtml(e.status.toUpperCase())+' · AGENT EXECUTION NOT CONNECTED</div></article>').join("");
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
  $("#today-label").textContent=new Intl.DateTimeFormat("en",{weekday:"long",month:"long",day:"numeric",year:"numeric"}).format(new Date()).toUpperCase();
  $("#owner-email").textContent=currentUser.email||"OWNER";
}

function renderVirtualHQ(){
  const icons={ai_ceo:"🧭",research:"🔎",content:"✍️",marketing:"📣",quality:"🛡️",finance:"💹",operations:"⚙️"};
  const short={ai_ceo:"COMMAND",research:"RESEARCH",content:"CONTENT STUDIO",marketing:"GROWTH & SALES",quality:"QUALITY LAB",finance:"FINANCE",operations:"OPERATIONS"};
  const assigned=employee=>tasks.filter(t=>t.assigned_employee_id===employee.id&&!["completed","cancelled"].includes(t.status));
  const state=employee=>{
    const open=assigned(employee);
    if(open.some(t=>["review","pending"].includes(t.status)))return {key:"review",label:"REVIEW"};
    if(open.length)return {key:"working",label:"TASK ASSIGNED"};
    return {key:"idle",label:employee.status==="planned"?"READY TO ACTIVATE":"IDLE"};
  };
  const cards=employees.map((e,i)=>{
    const s=state(e),open=assigned(e).length;
    return '<article class="hq-station station-'+(i+1)+' '+s.key+'"><div class="hq-desk-top"></div><div class="hq-bot"><span class="bot-face">'+(icons[e.role_key]||"🤖")+'</span><span class="bot-body"></span></div><div class="hq-monitor"><i></i><i></i><i></i></div><div class="hq-station-copy"><strong>'+escapeHtml(short[e.role_key]||e.department.toUpperCase())+'</strong><span>'+escapeHtml(e.name)+'</span><small><b class="state-dot"></b>'+s.label+(open?' · '+open+' TASK'+(open>1?'S':''):'')+'</small></div></article>';
  }).join("");
  const scene='<div class="hq-backdrop"><div class="hq-world-map">✧ &nbsp; GLOBAL OPERATIONS &nbsp; ✧</div><div class="hq-floor"><div class="hq-grid-lines"></div><div class="hq-center"><div class="hq-orbit"></div><div class="hq-core"><span>CF</span><strong>AI COMMAND</strong><small>OWNER CONTROL</small></div></div>'+cards+'</div><div class="hq-caption"><span>CURIOFRAME AI</span><b>HEADQUARTERS / 01</b><span>7 DEPARTMENTS</span></div></div>';
  ["#virtual-hq-scene","#virtual-hq-full-scene"].forEach(selector=>{const el=$(selector);if(el)el.innerHTML=scene;});
  const grid=$("#hq-department-grid");
  if(grid)grid.innerHTML=employees.map(e=>{const s=state(e),open=assigned(e);return '<article class="hq-dept-card"><div class="hq-dept-icon">'+(icons[e.role_key]||"🤖")+'</div><div><strong>'+escapeHtml(e.name)+'</strong><span>'+escapeHtml(e.department)+'</span><small>'+escapeHtml(e.responsibilities)+'</small></div><b class="hq-status '+s.key+'">'+s.label+'</b><footer>'+open.length+' open task'+(open.length===1?'':'s')+'</footer></article>'}).join("");
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
  const asset=contentAssets.find(a=>a.task_id===approval.task_id);
  $("#approval-detail-title").textContent=approval.title;
  $("#approval-detail-description").textContent=approval.description||"Owner review requested.";
  $("#approval-detail-body").textContent=asset?.body||"No deliverable body was attached to this approval.";
  $("#approval-detail-note").value="";
  $("#approval-detail-dialog").dataset.approvalId=approval.id;
  $("#approval-detail-dialog").showModal();
}
async function copyApprovalDeliverable(){
  const title=$("#approval-detail-title").textContent||"";
  const description=$("#approval-detail-description").textContent||"";
  const body=$("#approval-detail-body").textContent||"";
  const text=[title,description,body].filter(Boolean).join("\\n\\n");
  const button=$("#approval-copy-btn");
  try{
    if(navigator.clipboard&&window.isSecureContext){
      await navigator.clipboard.writeText(text);
    }else{
      const field=document.createElement("textarea");
      field.value=text;field.setAttribute("readonly","");
      field.style.position="fixed";field.style.opacity="0";
      document.body.appendChild(field);field.select();
      const copied=document.execCommand("copy");field.remove();
      if(!copied)throw new Error("Copy is not supported by this browser.");
    }
    button.textContent="✓ Copied";
    button.disabled=true;
    setTimeout(()=>{button.textContent="⧉ Copy deliverable";button.disabled=false},1800);
  }catch(error){
    alert("Could not copy automatically. Please select and copy the deliverable text.");
  }
}
async function decideApproval(decision){
  const dialog=$("#approval-detail-dialog"),approvalId=dialog.dataset.approvalId;
  const approval=approvals.find(a=>a.id===approvalId);
  if(!approval)return;
  const note=$("#approval-detail-note").value.trim();
  const buttons=[$("#approval-approve-btn"),$("#approval-reject-btn")];
  buttons.forEach(b=>b.disabled=true);
  try{
    const {error:approvalError}=await supabase.from("approvals").update({
      status:decision,decided_by:currentUser.id,decided_at:new Date().toISOString(),decision_note:note||null
    }).eq("id",approvalId).eq("status","pending");
    if(approvalError)throw approvalError;
    if(approval.task_id){
      const asset=contentAssets.find(a=>a.task_id===approval.task_id);
      if(asset){
        const {error:assetError}=await supabase.from("content_assets").update({
          status:decision==="approved"?"approved":"draft",updated_at:new Date().toISOString()
        }).eq("id",asset.id);
        if(assetError)throw assetError;
      }
      const {error:taskError}=await supabase.from("tasks").update({
        status:decision==="approved"?"completed":"blocked",updated_at:new Date().toISOString()
      }).eq("id",approval.task_id);
      if(taskError)throw taskError;
      await supabase.from("task_events").insert({
        company_id:company.id,task_id:approval.task_id,event_type:"owner_"+decision,
        message:"Owner "+decision+" deliverable: "+approval.title,
        metadata:{decision_note:note||null}
      });
    }
    dialog.close();
    alert(decision==="approved"?"Deliverable approved.":"Deliverable rejected and returned for revision.");
    await loadData();
  }catch(error){
    showError(error);
    buttons.forEach(b=>b.disabled=false);
  }
}

async function startWorkspace(user){
  currentUser=user;showApp();setSystem("SYNCING");
  $("#owner-email").textContent=user.email||"OWNER";
  await ensureCompany();await loadData();setSystem("DATABASE CONNECTED");
}
async function handleAuth(event){
  event.preventDefault();const button=$("#auth-submit");button.disabled=true;setMessage("Please wait…");
  const email=$("#auth-email").value.trim(),password=$("#auth-password").value;
  try{
    if(authMode==="signup"){
      const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:location.href.split("#")[0]}});
      if(error)throw error;
      if(data.session){await startWorkspace(data.user);setMessage("")}
      else setMessage("Account created. Check your email to confirm, then return here and sign in.");
    }else{
      const {data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error)throw error;await startWorkspace(data.user);setMessage("");
    }
  }catch(error){setMessage(error.message||"Unable to authenticate.")}
  finally{button.disabled=false}
}
let authMode="signin";
function toggleAuth(){
  authMode=authMode==="signin"?"signup":"signin";
  $("#auth-title").textContent=authMode==="signup"?"Create owner account":"Owner sign in";
  $("#auth-copy").textContent=authMode==="signup"?"Create the secure owner login for CurioFrame AI.":"Sign in to open your private company workspace.";
  $("#auth-submit").textContent=authMode==="signup"?"Create account":"Sign in";
  $("#auth-switch").textContent=authMode==="signup"?"Already registered? Sign in":"New here? Create your owner account";
  $("#auth-password").autocomplete=authMode==="signup"?"new-password":"current-password";setMessage("");
}
async function refreshSession(){
  const {data,error}=await supabase.auth.getSession();if(error)throw error;
  if(data.session)await startWorkspace(data.session.user);else showAuth();
}
function navigate(page){
  $$(".page").forEach(p=>p.classList.toggle("active-page",p.id==="page-"+page));
  $$(".nav-link").forEach(a=>a.classList.toggle("active",a.dataset.page===page));
  $("#page-crumb").textContent=page.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase());
  $("#sidebar").classList.remove("open");history.replaceState(null,"","#"+page);
}
$$("[data-page]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();navigate(a.dataset.page)}));
$("#menu-toggle").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#hq-refresh-btn")?.addEventListener("click",()=>loadData().catch(showError));
$("#auth-form").addEventListener("submit",handleAuth);$("#auth-switch").addEventListener("click",toggleAuth);
$("#sign-out-btn").addEventListener("click",async()=>{await supabase.auth.signOut();company=null;showAuth();setMessage("You have been signed out.")});
function openTaskDialog(){
  $("#task-owner").innerHTML='<option value="">Unassigned</option>'+employees.map(e=>'<option value="'+e.id+'">'+escapeHtml(e.name)+'</option>').join("");
  $("#task-dialog").showModal();
}
$("#new-task-btn").addEventListener("click",openTaskDialog);$("#new-task-btn-2").addEventListener("click",openTaskDialog);

document.addEventListener("click",e=>{
  const trigger=e.target.closest("[data-open-approval]");
  if(trigger)openApproval(trigger.dataset.openApproval);
});
$("#approval-copy-btn").addEventListener("click",copyApprovalDeliverable);
$("#approval-approve-btn").addEventListener("click",()=>decideApproval("approved"));
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
  const {error}=await supabase.from("tasks").insert({company_id:company.id,title,objective:"",assigned_employee_id:ownerId,priority,created_by:currentUser.id});
  button.disabled=false;if(error){showError(error);return}
  await supabase.from("task_events").insert({company_id:company.id,event_type:"task_created",message:"Task created: "+title});
  $("#task-dialog").close();$("#task-form").reset();await loadData();
});
supabase.auth.onAuthStateChange((_event,session)=>{if(!session){currentUser=null;company=null;showAuth()}});
refreshSession().catch(error=>{setSystem("CONNECTION ERROR");setMessage(error.message||"Could not connect to the workspace.");showAuth()});
