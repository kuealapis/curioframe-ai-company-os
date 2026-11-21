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
  if(existing){company=existing;return}
  const {data:created,error:createError}=await supabase.from("companies").insert({owner_id:currentUser.id,name:"CurioFrame AI",operating_mode:"approval_based"}).select("*").single();
  if(createError)throw createError;
  company=created;
  const {error:employeeError}=await supabase.from("ai_employees").insert(employeeSeed.map(e=>({...e,company_id:company.id,status:"planned"})));
  if(employeeError)throw employeeError;
  await supabase.from("task_events").insert({company_id:company.id,event_type:"workspace_created",message:"CurioFrame AI owner workspace initialized."});
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
  $("#all-task-table").innerHTML=tasks.length?tasks.map(t=>taskRow(t,true)).join(""):'<tr><td class="empty-row" colspan="5">No tasks have been created.</td></tr>';
  $("#employee-list").innerHTML=employees.slice(0,5).map(e=>employeeRow(e)).join("")||'<p class="muted">No roles configured.</p>';
  $("#employee-grid").innerHTML=employees.map(e=>'<article class="employee-card"><div class="employee-icon">✦</div><h3>'+escapeHtml(e.name)+'</h3><div class="role">'+escapeHtml(e.department)+'</div><p>'+escapeHtml(e.responsibilities)+'</p><div class="card-foot">ROLE REGISTERED · '+escapeHtml(e.status.toUpperCase())+' · AGENT EXECUTION NOT CONNECTED</div></article>').join("");
  const pendingMarkup=approvals.length?approvals.map(a=>'<div class="approval-item"><span class="approval-icon">✓</span><div><strong>'+escapeHtml(a.title)+'</strong><small>'+escapeHtml(a.description)+'</small></div><span class="pill amber">Pending</span></div>').join(""):'<p class="muted">No pending approvals.</p>';
  $("#overview-approvals").innerHTML=pendingMarkup;
  $("#pipeline-overview").innerHTML=["research","content","review","scheduled","published"].map((stage,i)=>{const count=contentAssets.filter(a=>a.status===stage||(stage==="research"&&a.asset_type==="research")).length;return '<div class="pipe-row"><span>'+["Research","Content","Quality","Scheduled","Published"][i]+'</span><div class="pipe-track"><div class="pipe-fill" style="width:'+Math.min(count*25,100)+'%"></div></div><span class="pipe-count">'+count+'</span></div>'}).join("");
  $("#pipeline-board").innerHTML=["draft","review","approved","scheduled","published"].map(stage=>{const items=contentAssets.filter(a=>a.status===stage);return '<section class="pipeline-column"><h3>'+prettyStatus(stage)+'<span class="count">'+items.length+'</span></h3>'+ (items.length?items.map(a=>'<div class="pipeline-card">'+escapeHtml(a.title)+'<small>'+escapeHtml(a.asset_type)+'</small></div>').join(""):'<p class="muted">No items in this stage.</p>')+'</section>'}).join("");
  $("#today-label").textContent=new Intl.DateTimeFormat("en",{weekday:"long",month:"long",day:"numeric",year:"numeric"}).format(new Date()).toUpperCase();
  $("#owner-email").textContent=currentUser.email||"OWNER";
}
function taskRow(t,all=false){
  const owner=t.ai_employees?.name||employees.find(e=>e.id===t.assigned_employee_id)?.name||"Unassigned";
  return '<tr><td><span class="task-name">'+escapeHtml(t.title)+'</span><span class="task-id">'+escapeHtml(t.id.slice(0,8))+'</span></td><td>'+escapeHtml(owner)+'</td>'+(all?'<td>'+escapeHtml(t.ai_employees?.department||"—")+'</td>':"")+'<td><span class="pill '+statusClass(t.status)+'">'+prettyStatus(t.status)+'</span></td><td><span class="priority '+escapeHtml(t.priority)+'">'+prettyStatus(t.priority)+'</span></td></tr>';
}
function employeeRow(e){return '<div class="employee-row"><div class="employee-icon">✦</div><div><strong>'+escapeHtml(e.name)+'</strong><small>'+escapeHtml(e.department)+'</small></div><span class="employee-state">'+escapeHtml(prettyStatus(e.status))+'</span></div>'}

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
$("#auth-form").addEventListener("submit",handleAuth);$("#auth-switch").addEventListener("click",toggleAuth);
$("#sign-out-btn").addEventListener("click",async()=>{await supabase.auth.signOut();company=null;showAuth();setMessage("You have been signed out.")});
function openTaskDialog(){
  $("#task-owner").innerHTML='<option value="">Unassigned</option>'+employees.map(e=>'<option value="'+e.id+'">'+escapeHtml(e.name)+'</option>').join("");
  $("#task-dialog").showModal();
}
$("#new-task-btn").addEventListener("click",openTaskDialog);$("#new-task-btn-2").addEventListener("click",openTaskDialog);
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
