const employees = [
  {name:"AI CEO / Orchestrator",dept:"Executive Office",icon:"✦",desc:"Coordinates departments, prioritizes company goals, delegates work, and escalates consequential decisions.",status:"Defined"},
  {name:"Research Officer",dept:"Research",icon:"⌕",desc:"Finds high-potential topics, verifies facts against credible sources, and prepares research briefs.",status:"Defined"},
  {name:"Content Officer",dept:"Content Studio",icon:"▤",desc:"Transforms approved research into clear English scripts, hooks, and production instructions.",status:"Defined"},
  {name:"Marketing Officer",dept:"Digital Marketing",icon:"↗",desc:"Plans packaging, distribution, audience growth, channel analytics, and customer acquisition.",status:"Defined"},
  {name:"Quality Manager",dept:"Quality Assurance",icon:"✓",desc:"Checks factual accuracy, language, originality, brand fit, and delivery requirements.",status:"Defined"},
  {name:"Finance Officer",dept:"Finance",icon:"◈",desc:"Tracks income, expenses, budgets, and reinvestment proposals for owner review.",status:"Defined"},
  {name:"Operations Officer",dept:"Operations",icon:"⚙",desc:"Maintains workflows, schedules, system health, records, and operational handoffs.",status:"Defined"}
];
let tasks = [
  {id:"CF-001",title:"Map global facts-content opportunities",owner:"Research Officer",dept:"Research",status:"In progress",priority:"High"},
  {id:"CF-002",title:"Draft first content strategy brief",owner:"AI CEO / Orchestrator",dept:"Executive Office",status:"In progress",priority:"High"},
  {id:"CF-003",title:"Define CurioFrame visual identity",owner:"Content Officer",dept:"Content",status:"Queued",priority:"Normal"},
  {id:"CF-004",title:"Prepare channel launch checklist",owner:"Marketing Officer",dept:"Marketing",status:"Queued",priority:"Normal"},
  {id:"CF-005",title:"Create editorial quality checklist",owner:"Quality Manager",dept:"Quality",status:"Queued",priority:"Normal"},
  {id:"CF-006",title:"Set up company finance ledger",owner:"Finance Officer",dept:"Finance",status:"Queued",priority:"Normal"},
  {id:"CF-007",title:"Document content production workflow",owner:"Operations Officer",dept:"Operations",status:"Queued",priority:"Normal"},
  {id:"CF-008",title:"Review initial operating policies",owner:"AI CEO / Orchestrator",dept:"Executive Office",status:"In progress",priority:"Normal"}
];
const stages = [
  {name:"Research",count:2,items:["Map facts-content opportunities","Validate source shortlist"]},
  {name:"Content",count:1,items:["Draft first content strategy"]},
  {name:"Quality Review",count:0,items:[]},
  {name:"Marketing",count:1,items:["Prepare channel launch checklist"]},
  {name:"Owner Approval",count:2,items:["Approve content direction","Confirm channel checklist"]},
  {name:"Published",count:0,items:[]}
];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
function statusClass(s){return s==="In progress"?"blue":s==="Completed"?"green":s==="Pending"?"amber":"gray"}
function taskRow(t,all=false){return `<tr><td><span class="task-name">${t.title}</span><span class="task-id">${t.id}</span></td><td>${t.owner}</td>${all?`<td>${t.dept}</td>`:""}<td><span class="pill ${statusClass(t.status)}">${t.status}</span></td><td><span class="priority ${t.priority.toLowerCase()}">${t.priority}</span></td></tr>`}
function renderTasks(){
  $("#task-table").innerHTML=tasks.slice(0,5).map(t=>taskRow(t)).join("");
  $("#all-task-table").innerHTML=tasks.map(t=>taskRow(t,true)).join("");
  $("#open-task-total").textContent=String(tasks.filter(t=>t.status!=="Completed").length).padStart(2,"0");
}
function renderEmployees(){
  $("#employee-list").innerHTML=employees.slice(0,5).map(e=>`<div class="employee-row"><div class="employee-icon">${e.icon}</div><div><strong>${e.name}</strong><small>${e.dept}</small></div><span class="employee-state">● ${e.status}</span></div>`).join("");
  $("#employee-grid").innerHTML=employees.map(e=>`<article class="employee-card"><div class="employee-icon">${e.icon}</div><h3>${e.name}</h3><div class="role">${e.dept}</div><p>${e.desc}</p><div class="card-foot">ROLE DEFINED · NOT YET EXECUTING</div></article>`).join("");
}
function renderPipeline(){
  $("#pipeline-overview").innerHTML=stages.slice(0,4).map((s,i)=>`<div class="pipe-row"><span>${s.name}</span><div class="pipe-track"><div class="pipe-fill" style="width:${[62,28,0,14][i]}%"></div></div><span class="pipe-count">${s.count}</span></div>`).join("");
  $("#pipeline-board").innerHTML=stages.map(s=>`<section class="pipeline-column"><h3>${s.name}<span class="count">${s.count}</span></h3>${s.items.length?s.items.map((x,i)=>`<div class="pipeline-card">${x}<small>Illustrative workflow item · CF-${String(i+1).padStart(3,"0")}</small></div>`).join(""):'<p class="muted">No items in this stage</p>'}</section>`).join("");
}
function navigate(page){
  $$(".page").forEach(p=>p.classList.toggle("active-page",p.id==="page-"+page));
  $$(".nav-link").forEach(a=>a.classList.toggle("active",a.dataset.page===page));
  $("#page-crumb").textContent=page.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase());
  $("#sidebar").classList.remove("open");
  history.replaceState(null,"","#"+page);
}
$$("[data-page]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();navigate(a.dataset.page)}));
$("#menu-toggle").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
function openTaskDialog(){$("#task-dialog").showModal()}
$("#new-task-btn").addEventListener("click",openTaskDialog);
$("#new-task-btn-2").addEventListener("click",openTaskDialog);
$("#task-form").addEventListener("submit",e=>{
  if(e.submitter && e.submitter.value==="cancel") return;
  e.preventDefault();
  const title=$("#task-title").value.trim();
  if(!title)return;
  const owner=$("#task-owner").value;
  const emp=employees.find(x=>x.name===owner);
  tasks.unshift({id:"CF-"+String(Date.now()).slice(-5),title,owner,dept:emp?.dept||"Operations",status:"Queued",priority:$("#task-priority").value});
  renderTasks();$("#task-dialog").close();$("#task-form").reset();
});
renderTasks();renderEmployees();renderPipeline();
const initial=location.hash.replace("#","");if(initial&&$("#page-"+initial))navigate(initial);
