import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,collection,doc,addDoc,setDoc,updateDoc,deleteDoc,onSnapshot} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';

const fapp=initializeApp(firebaseConfig);
const auth=getAuth(fapp);
const fdb=initializeFirestore(fapp,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});
// Pequena camada que mantém a API usada pela app (collection/doc/add/set/update/delete/onSnapshot)
const shim={
  collection:p=>({add:d=>addDoc(collection(fdb,p),d),onSnapshot:(n,e)=>onSnapshot(collection(fdb,p),n,e)}),
  doc:p=>({set:d=>setDoc(doc(fdb,p),d),update:d=>updateDoc(doc(fdb,p),d),delete:()=>deleteDoc(doc(fdb,p)),onSnapshot:(n,e)=>onSnapshot(doc(fdb,p),n,e)})
};


const $=s=>document.querySelector(s);
const eur=n=>(n||0).toLocaleString('pt-PT',{style:'currency',currency:'EUR'});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DEF=['Habitação','Supermercado','Energia e água','Transportes','Saúde','Lazer','Outros'];
let CATS=[...DEF],catBase=[...DEF],catsBy={},editCats=false;
const today=()=>new Date().toLocaleDateString('sv-SE');
const selDate=()=>M===today().slice(0,7)?today():M+'-01';
const curBud=()=>{if(buds[M])return buds[M];const k=Object.keys(buds).filter(x=>x<M).sort().pop();return k?buds[k]:bud};
let M=today().slice(0,7),tx=[],bud={},buds={},goals=[],type='out',db=null;

function err(e){const b=$('#err');b.hidden=false;b.textContent='Erro: '+(e&&e.message||e)+(e&&e.code==='permission-denied'?' (este email não tem acesso; confirma o firestore.rules)':'')}
async function w(p){try{await p}catch(e){err(e)}}

function shift(d){const[y,m]=M.split('-').map(Number);const t=new Date(y,m-1+d,1);M=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0');$('#dt').value=selDate();renderMonth()}
$('#pv').onclick=()=>shift(-1);$('#nx').onclick=()=>shift(1);
const fillCats=()=>{const v=$('#cat').value;$('#cat').innerHTML=CATS.map(c=>`<option>${esc(c)}</option>`).join('');if(CATS.includes(v))$('#cat').value=v};fillCats();
$('#dt').value=selDate();

function setType(t){type=t;$('#tOut').className=t==='out'?'on':'';$('#tIn').className=t==='in'?'on':'';$('#tSv').className=t==='sv'?'on':'';$('#cat').style.display=t==='out'?'':'none'}
$('#tOut').onclick=()=>setType('out');$('#tIn').onclick=()=>setType('in');$('#tSv').onclick=()=>setType('sv');

$('#add').onclick=()=>{
  const a=parseFloat($('#amt').value);if(!db||!(a>0))return;
  w(db.collection('tx').add({type,amount:a,cat:type==='out'?$('#cat').value:type==='sv'?'Poupança':'Receita',note:$('#note').value.trim(),date:$('#dt').value||today(),ts:Date.now()}));
  $('#amt').value='';$('#note').value='';
};

function renderMonth(){
  const nc=catsFor(M);if(nc.join('|')!==CATS.join('|')){CATS=nc;fillCats()}
  const[y,m]=M.split('-').map(Number);
  $('#ml').textContent=new Date(y,m-1,1).toLocaleDateString('pt-PT',{month:'long',year:'numeric'});
  const cur=tx.filter(t=>(t.date||'').startsWith(M)).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.ts-a.ts);
  const inc=cur.filter(t=>t.type==='in').reduce((s,t)=>s+t.amount,0);
  const out=cur.filter(t=>t.type==='out'||t.type==='gs').reduce((s,t)=>s+t.amount,0);
  const upto=tx.filter(t=>(t.date||'').slice(0,7)<=M);
  const S=(a,ty)=>a.filter(t=>t.type===ty).reduce((s,t)=>s+t.amount,0);
  const sv=S(upto,'sv')-S(upto,'gs');
  const bal=S(upto,'in')-S(upto,'out')-S(upto,'sv');
  $('#sum').innerHTML=`<div><div class="k">Receitas</div><div class="v pos">${eur(inc)}</div></div>
  <div><div class="k">Despesas</div><div class="v neg">${eur(out)}</div></div>
  <div><div class="k">Poupado acumulado</div><div class="v">${eur(sv)}</div></div>
  <div><div class="k">Saldo acumulado</div><div class="v ${bal<0?'neg':'pos'}">${eur(bal)}</div></div>`;
  const B=curBud();
  $('#bud').innerHTML=CATS.map(c=>{
    const sp=cur.filter(t=>t.type==='out'&&t.cat===c).reduce((s,t)=>s+t.amount,0),b=B[c]||0;
    const pct=b?Math.min(100,sp/b*100):0;
    return `<div class="b"><div class="row sp"><span>${esc(c)}</span><span class="row"><span class="${b&&sp>b?'neg':''}">${eur(sp)}</span> / <input data-c="${esc(c)}" type="number" inputmode="decimal" value="${b||''}" placeholder="€"></span></div><div class="bar"><i class="${b&&sp>b?'o':''}" style="width:${pct}%"></i></div></div>`}).join('');
  document.querySelectorAll('#bud input').forEach(i=>i.onchange=()=>{if(db)w(db.doc('bud/'+M).set({...curBud(),[i.dataset.c]:parseFloat(i.value)||0}))});
  if(editCats)renderEdit();
  $('#list').innerHTML=cur.length?cur.map(t=>`<div class="t row sp"><div><div>${esc(t.note||t.cat)}</div><div class="k">${esc(t.date)} · ${esc(t.cat)}</div></div><div class="row"><b class="${t.type==='in'?'pos':''}">${t.type==='in'?'+':'−'}${eur(t.amount)}</b><button class="x" data-d="${t.id}">✕</button></div></div>`).join(''):'<div class="k">Sem movimentos neste mês.</div>';
  document.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>db&&w(db.doc('tx/'+b.dataset.d).delete()));
  renderBal();
}

let bm='m';
const tab=b=>{$('#vD').hidden=b;$('#vB').hidden=!b;$('#nD').className=b?'':'on';$('#nB').className=b?'on':'';if(b)renderBal()};
$('#nD').onclick=()=>tab(false);$('#nB').onclick=()=>tab(true);
$('#bM').onclick=()=>{bm='m';renderBal()};$('#bY').onclick=()=>{bm='y';renderBal()};
function renderBal(){
  const el=$('#bal');if(!el)return;
  $('#bM').className=bm==='m'?'on':'';$('#bY').className=bm==='y'?'on':'';
  const S=(a,ty)=>a.filter(t=>t.type===ty).reduce((s,t)=>s+t.amount,0);
  const pct=(a,b)=>b>0?Math.round(a/b*100)+'%':'—';
  const card=(k,v,c)=>`<div><div class='k'>${k}</div><div class='v ${c||''}'>${v}</div></div>`;
  const y=M.slice(0,4);
  $('#bt').textContent=bm==='m'?$('#ml').textContent:y;
  if(bm==='m'){
    const a=tx.filter(t=>(t.date||'').startsWith(M)),B=curBud();
    const inc=S(a,'in'),out=S(a,'out'),gs=S(a,'gs'),sv=S(a,'sv'),sd=inc-out-sv,tb=CATS.reduce((s,c)=>s+(B[c]||0),0);
    const rows=CATS.map(c=>{const sp=a.filter(t=>t.type==='out'&&t.cat===c).reduce((s,t)=>s+t.amount,0),b=B[c]||0;return `<div class='t row sp'><span>${esc(c)}</span><span class='${b&&sp>b?'neg':''}'>${eur(sp)} / ${eur(b)}</span></div>`}).join('');
    el.innerHTML=`<div class='grid' style='margin-bottom:14px'>${card('Receitas',eur(inc),'pos')}${card('Despesas',eur(out+gs),'neg')}${card('Poupado no mês',eur(sv))}${card('Saldo do mês',eur(sd),sd<0?'neg':'pos')}${card('Taxa de poupança',pct(sv,inc))}${card('Orçamento usado',pct(out,tb))}</div><h2>Por categoria (real / orçamento)</h2>${rows}${gs?`<div class='t row sp'><span>Objetivos pagos da poupança</span><span>${eur(gs)}</span></div>`:''}`;
  }else{
    const a=tx.filter(t=>(t.date||'').startsWith(y));
    const inc=S(a,'in'),out=S(a,'out'),gs=S(a,'gs'),sv=S(a,'sv'),sd=inc-out-sv;
    const up=tx.filter(t=>(t.date||'').slice(0,4)<=y),cum=S(up,'sv')-S(up,'gs');
    let rows='';
    for(let m=1;m<=12;m++){const k=y+'-'+String(m).padStart(2,'0'),b=a.filter(t=>(t.date||'').startsWith(k)),i=S(b,'in'),o=S(b,'out')+S(b,'gs'),s=S(b,'sv'),d=i-S(b,'out')-s;
      rows+=`<tr><td>${new Date(y,m-1,1).toLocaleDateString('pt-PT',{month:'short'})}</td><td>${eur(i)}</td><td>${eur(o)}</td><td>${eur(s)}</td><td class='${d<0?'neg':'pos'}'>${eur(d)}</td></tr>`}
    const cr=[...new Set(a.filter(t=>t.type==='out').map(t=>t.cat))].map(c=>[c,a.filter(t=>t.type==='out'&&t.cat===c).reduce((s,t)=>s+t.amount,0)]).sort((p,q)=>q[1]-p[1]);
    el.innerHTML=`<div class='grid' style='margin-bottom:14px'>${card('Receitas',eur(inc),'pos')}${card('Despesas',eur(out+gs),'neg')}${card('Poupado no ano',eur(sv))}${card('Saldo do ano',eur(sd),sd<0?'neg':'pos')}${card('Taxa de poupança',pct(sv,inc))}${card('Poupança acumulada',eur(cum))}</div><div style='overflow-x:auto'><table><tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Poupança</th><th>Saldo</th></tr>${rows}<tr><th>Total</th><th>${eur(inc)}</th><th>${eur(out+gs)}</th><th>${eur(sv)}</th><th>${eur(sd)}</th></tr></table></div><h2 style='margin-top:14px'>Despesas por categoria</h2>${cr.length?cr.map(([c,v])=>`<div class='t row sp'><span>${esc(c)}</span><span>${eur(v)} · ${pct(v,out)}</span></div>`).join(''):`<div class='k'>Sem despesas.</div>`}`;
  }
}
$('#ga').onclick=()=>{const n=$('#gn').value.trim(),t=parseFloat($('#gt').value);if(!db||!n||!(t>0))return;w(db.collection('goals').add({name:n,target:t,saved:0,ts:Date.now()}));$('#gn').value='';$('#gt').value=''};
const warn=id=>{const m=document.querySelector('[data-m="'+id+'"]');if(m){m.textContent='⚠️ Valor superior à poupança disponível ('+eur(avail())+'). Regista primeiro uma poupança.';m.hidden=false}};
const avail=()=>tx.reduce((s,t)=>s+(t.type==='sv'?t.amount:t.type==='gs'?-t.amount:0),0)-goals.reduce((s,g)=>s+g.saved,0);
function renderGoals(){const av=avail();$('#av').textContent=eur(av);$('#av').className=av<0?'neg':'pos';
  $('#goals').innerHTML=goals.length?goals.map(g=>{const p=Math.min(100,g.saved/g.target*100);
  return `<div class="t"><div class="row sp"><b>${esc(g.name)}</b><span>${eur(g.saved)} / ${eur(g.target)}</span></div><div class="bar"><i style="width:${p}%"></i></div>${g.saved>=g.target?`<button class="p" data-u="${g.id}" style="width:100%;margin-bottom:8px">✅ Objetivo atingido — registar como gasto (${eur(g.saved)})</button>`:''}<div class="row"><input data-g="${g.id}" class="f" type="number" inputmode="decimal" placeholder="Depositar €"><button data-s="${g.id}">Depositar</button><button class="x" data-r="${g.id}">✕</button></div><div class="neg" data-m="${g.id}" style="font-size:13px;margin-top:6px" hidden></div></div>`}).join(''):'<div class="k">Ainda sem objetivos.</div>';
  document.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{const id=b.dataset.s,v=parseFloat(document.querySelector(`[data-g="${id}"]`).value),g=goals.find(x=>x.id===id);if(db&&g&&v){if(v>avail()){warn(id);return}w(db.doc('goals/'+id).update({saved:Math.max(0,g.saved+v)}))}});
  document.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>db&&w(db.doc('goals/'+b.dataset.r).delete()));
  document.querySelectorAll('[data-u]').forEach(b=>b.onclick=async()=>{const g=goals.find(x=>x.id===b.dataset.u);if(!db||!g)return;b.disabled=true;try{await db.collection('tx').add({type:'gs',amount:g.saved,cat:'Objetivo',note:g.name+' (pago da poupança)',date:selDate(),ts:Date.now()});await db.doc('goals/'+g.id).delete()}catch(e){err(e);b.disabled=false}});
  document.querySelectorAll('[data-g]').forEach(i=>i.oninput=()=>{const m=document.querySelector('[data-m="'+i.dataset.g+'"]');if(parseFloat(i.value)>avail())warn(i.dataset.g);else if(m)m.hidden=true});
}

// ---- categorias editáveis
$('#ec').onclick=()=>{editCats=!editCats;$('#ec').textContent=editCats?'Concluir':'Editar categorias';renderMonth()};
$('#ac').onclick=()=>{
  const n=$('#nc').value.trim();
  if(!db||!n||CATS.some(c=>c.toLowerCase()===n.toLowerCase()))return;
  w(db.doc('cat/'+M).set({list:[...CATS.filter(c=>c!=='Outros'),n,'Outros']}));
  $('#nc').value='';
};
function renderEdit(){
  $('#bud').innerHTML=CATS.map(c=>`<div class="row" style="margin-bottom:8px"><input class="f" data-o="${esc(c)}" value="${esc(c)}" ${c==='Outros'?'disabled':''}>${c==='Outros'?'':`<button class="x" data-del="${esc(c)}">✕</button>`}</div>`).join('')+'<div class="k">As alterações valem só para este mês. Muda o nome e sai do campo para guardar. "Outros" não se altera.</div>';
  document.querySelectorAll('#bud [data-o]').forEach(i=>i.onchange=()=>renameCat(i.dataset.o,i.value.trim()));
  document.querySelectorAll('#bud [data-del]').forEach(b=>b.onclick=()=>delCat(b.dataset.del));
}
function catsFor(m){
  const k=Object.keys(catsBy).filter(x=>x<=m).sort().pop();
  const l=[...(k?catsBy[k]:catBase)];
  if(!l.includes('Outros'))l.push('Outros');
  return l;
}
async function renameCat(old,nw){
  if(!db||!nw||nw===old){renderMonth();return}
  if(CATS.some(c=>c.toLowerCase()===nw.toLowerCase())){err({message:'Já existe uma categoria com esse nome.'});renderMonth();return}
  const mm=M,B=curBud(),l=tx.filter(t=>t.type==='out'&&(t.date||'').startsWith(mm)&&t.cat===old);
  try{
    await db.doc('cat/'+mm).set({list:CATS.map(c=>c===old?nw:c)});
    if(old in B){const{[old]:val,...r}=B;await db.doc('bud/'+mm).set({...r,[nw]:val})}
    for(const t of l)await db.doc('tx/'+t.id).update({cat:nw});
  }catch(e){err(e)}
}
async function delCat(c){
  if(!db||c==='Outros')return;
  const mm=M,l=tx.filter(t=>t.type==='out'&&(t.date||'').startsWith(mm)&&t.cat===c);
  if(l.length&&!confirm('Há '+l.length+' despesa(s) em "'+c+'" neste mês. Passam para "Outros". Continuar?'))return;
  try{
    await db.doc('cat/'+mm).set({list:CATS.filter(x=>x!==c)});
    for(const t of l)await db.doc('tx/'+t.id).update({cat:'Outros'});
  }catch(e){err(e)}
}

const unsubs=[];
function start(){
  db=shim;
  unsubs.push(
    db.collection('tx').onSnapshot(s=>{tx=s.docs.map(d=>({id:d.id,...d.data()}));renderMonth();renderGoals()},err),
    db.collection('bud').onSnapshot(s=>{buds={};s.docs.forEach(d=>buds[d.id]=d.data());renderMonth()},err),
    db.doc('cfg/cats').onSnapshot(s=>{const d=s.data();const l=d&&Array.isArray(d.list)&&d.list.length?[...d.list]:[...DEF];if(!l.includes('Outros'))l.push('Outros');catBase=l;renderMonth()},err),
    db.collection('cat').onSnapshot(s=>{catsBy={};s.docs.forEach(d=>{if(Array.isArray(d.data().list))catsBy[d.id]=d.data().list});renderMonth()},err),
    db.doc('cfg/budgets').onSnapshot(s=>{bud=s.data()||{};renderMonth()},err),
    db.collection('goals').onSnapshot(s=>{goals=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.ts-b.ts);renderGoals()},err)
  );
}
function stop(){unsubs.splice(0).forEach(u=>u());db=null;CATS=[...DEF];catBase=[...DEF];catsBy={};tx=[];bud={};buds={};goals=[];renderMonth();renderGoals()}

onAuthStateChanged(auth,u=>{
  if(u){$('#login').hidden=true;$('#app').hidden=false;start()}
  else{stop();$('#app').hidden=true;$('#login').hidden=false}
});
$('#li').onclick=async()=>{
  try{await signInWithEmailAndPassword(auth,$('#em').value.trim(),$('#pw').value);$('#err').hidden=true}
  catch(e){err({message:'Email ou palavra-passe incorretos.'})}
};
$('#lo').onclick=()=>signOut(auth);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
