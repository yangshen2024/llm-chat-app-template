import { readReply } from './stream.js';
const $ = id => document.getElementById(id);
const KEY = 'llm-chat-workspace-v1';
let saved; try { saved = JSON.parse(localStorage.getItem(KEY)); } catch {}
const validMessage = m => m && ['user','assistant'].includes(m.role) && typeof m.content === 'string';
let chats = Array.isArray(saved?.chats) ? saved.chats.filter(c => typeof c.id === 'string' && typeof c.title === 'string' && Array.isArray(c.messages) && c.messages.every(validMessage)) : [];
let activeId = null, task = null;
let theme = saved?.theme === 'dark' ? 'dark' : 'light';
$('model').value = saved?.model === 'demo' ? 'demo' : '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const prompts = [['✧','帮我梳理一个想法'],['⌘','解释一段代码'],['✎','润色一封工作邮件'],['◎','制定一周学习计划'],['◇','准备产品经理面试'],['↗','分析一个商业案例']];
function persist() { try { localStorage.setItem(KEY, JSON.stringify({chats,theme,model:$('model').value})); } catch { $('status').textContent = '浏览器存储不可用，当前记录仅保留在本次页面中。'; } }
function button(text, callback, className='') { const b = document.createElement('button'); b.type='button'; b.textContent=text; b.className=className; b.onclick=callback; return b; }
function current() { return chats.find(c=>c.id===activeId); }
function sidebar(open) { document.body.classList.toggle('sidebar-hidden', !open); }
function applyTheme() { document.body.classList.toggle('dark',theme==='dark'); $('theme').setAttribute('aria-label',theme==='dark'?'切换到浅色主题':'切换到深色主题'); }
function renderHistory() {
  $('history').replaceChildren();
  if (!chats.length) { const p=document.createElement('p');p.className='empty-history';p.textContent='开始一次对话，你的灵感会保存在这里。';$('history').append(p); }
  for(const c of chats) { const row=document.createElement('div');row.className='history-row'+(c.id===activeId?' active':'');const title=button(c.title,()=>selectChat(c.id),'title');title.title=c.title;const del=button('×',()=>{ if(!confirm('删除这段对话？此操作无法撤销。'))return;if(task?.chatId===c.id)cancel();chats=chats.filter(x=>x.id!==c.id);if(activeId===c.id)activeId=null;persist();render();},'delete');del.setAttribute('aria-label','删除对话：'+c.title);row.append(title,del);$('history').append(row); }
}
function renderMessages() {
  const c=current();$('welcome').hidden=!!c?.messages.length;$('chat-messages').replaceChildren();
  for(const [i,m] of (c?.messages||[]).entries()) { const el=document.createElement('article');el.className='message '+m.role;
    if(m.role==='assistant'){const label=document.createElement('div');label.className='message-label';label.textContent=m.model==='demo'?'Chat · 离线演示':'Chat · Llama 3.3';el.append(label);}
    const p=document.createElement('p');p.textContent=m.content || (m.state==='pending'?'正在思考…':'回复未完成');el.append(p);
    if(m.state==='error'||m.state==='stopped'){const note=document.createElement('div');note.className='message-note';note.textContent=m.state==='error'?'回复失败，可以重试。':'已停止生成';el.append(note);}
    if(m.role==='assistant'&&m.state!=='pending'){const actions=document.createElement('div');actions.className='message-actions';actions.append(button('复制',async()=>{try{await navigator.clipboard.writeText(m.content);$('status').textContent='已复制';}catch{$('status').textContent='无法访问剪贴板，请选择文字复制。';}}));if(i===c.messages.length-1)actions.append(button('重新生成',()=>{if(task)return;c.messages.pop();run(c);}));el.append(actions);}
    $('chat-messages').append(el);
  }
}
function controls() { const busy=!!task;$('send-button').hidden=busy;$('stop-button').hidden=!busy;$('send-button').disabled=!$('user-input').value.trim();$('model').disabled=busy; }
function render(){renderHistory();renderMessages();controls();}
function cancel(){if(task){task.controller.abort();task=null;controls();}}
function selectChat(id){cancel();activeId=id;$('status').textContent='';render();if(innerWidth<=700)sidebar(false);}
function newChat(){selectChat(null);$('user-input').value='';resize();controls();$('user-input').focus();}
function resize(){$('user-input').style.height='auto';$('user-input').style.height=Math.min($('user-input').scrollHeight,180)+'px';}
function scrollDown(){const el=$('conversation');el.scrollTop=el.scrollHeight;}
async function run(c) {
  if(task)return;
  const model=$('model').value;
  const context=c.messages.filter(m=>m.content&&(!m.state||m.state==='done')).map(({role,content})=>({role,content}));
  const reply={role:'assistant',content:'',model,state:'pending'};c.messages.push(reply);
  const local={chatId:c.id,controller:new AbortController()};task=local;render();$('status').textContent='正在连接…';
  function append(text){reply.content+=text;if(activeId===c.id){const nearBottom=$('conversation').scrollHeight-$('conversation').scrollTop-$('conversation').clientHeight<140;renderMessages();$('status').textContent='正在生成…';if(nearBottom)scrollDown();}}
  try {
    if(model==='demo'){
      const text='这是离线交互演示，不是真实模型回答。\n\n你刚刚问到：“'+context.at(-1).content+'”\n\n你可以继续测试新建对话、搜索历史、主题切换、复制回复与停止生成。要获取真实回答，请在顶部选择 Llama 3.3，并配置 Cloudflare Workers AI。';
      for(const chunk of text.match(/.{1,4}|\n/g)||[]){await new Promise(r=>setTimeout(r,24));if(local.controller.signal.aborted)throw new DOMException('Stopped','AbortError');append(chunk);}
    }else{const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:context,model}),signal:local.controller.signal});await readReply(response,append);}
    reply.state='done';if(task===local)$('status').textContent='';
  }catch(e){reply.state=e.name==='AbortError'?'stopped':'error';if(task===local)$('status').textContent=e.name==='AbortError'?'已停止生成':(e.message||'连接失败，请重试。');}
  finally{persist();if(task===local){task=null;render();}else if(activeId===c.id){render();}}
}
function send(){const text=$('user-input').value.trim();if(!text||task)return;let c=current();if(!c){c={id:crypto.randomUUID(),title:text.slice(0,28),messages:[]};chats.unshift(c);activeId=c.id;}c.messages.push({role:'user',content:text});$('user-input').value='';resize();persist();run(c);scrollDown();}
function panel(title){$('panel-title').textContent=title;$('panel-body').replaceChildren();$('panel').showModal();}
function prompt(text){$('panel').close();$('user-input').value=text;resize();controls();$('user-input').focus();}
$('composer').onsubmit=e=>{e.preventDefault();send();};$('user-input').oninput=()=>{resize();controls();};$('user-input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send();}};
$('stop-button').onclick=()=>{task?.controller.abort();};$('new-chat').onclick=newChat;$('collapse').onclick=()=>sidebar(false);$('expand').onclick=()=>sidebar(true);$('backdrop').onclick=()=>sidebar(false);
$('theme').onclick=()=>{theme=theme==='light'?'dark':'light';applyTheme();persist();};
function modelChanged(){$('mode-badge').textContent=$('model').value==='demo'?'离线演示':'Workers AI';$('composer-mode').textContent=$('model').value==='demo'?'离线交互演示':'与 Llama 3.3 对话';persist();}
$('model').onchange=modelChanged;
$('search-chat').onclick=()=>{panel('搜索对话');const input=document.createElement('input');input.className='search-input';input.placeholder='搜索标题和消息内容';input.setAttribute('aria-label','搜索历史对话');const results=document.createElement('div');function search(){results.replaceChildren();const q=input.value.toLowerCase();const matches=chats.filter(c=>(c.title+' '+c.messages.map(m=>m.content).join(' ')).toLowerCase().includes(q));for(const c of matches)results.append(button(c.title,()=>{$('panel').close();selectChat(c.id);},'panel-item'));if(!matches.length)results.textContent='没有找到匹配的对话';}input.oninput=search;$('panel-body').append(input,results);search();input.focus();};
$('explore').onclick=()=>{panel('探索灵感');for(const [icon,text] of prompts)$('panel-body').append(button(icon+'  '+text,()=>prompt(text),'panel-item'));};
$('settings').onclick=()=>{panel('设置');const p=document.createElement('p');p.className='panel-copy';p.textContent='对话仅保存在此浏览器中，尚未接入登录和云端同步。真实模型请求通过现有 Cloudflare Worker 发送。';const row=document.createElement('div');row.className='setting-row';row.append('外观',button(theme==='dark'?'切换浅色':'切换深色',()=>{$('theme').click();$('panel').close();}));const clear=button('清除所有本地对话',()=>{if(confirm('确定清除所有本地对话？')){cancel();chats=[];activeId=null;persist();render();$('panel').close();}});$('panel-body').append(p,row,clear);};
$('close-panel').onclick=()=>$('panel').close();$('panel').onclick=e=>{if(e.target===$('panel')){const r=$('panel').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('panel').close();}};
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();if($('panel').open)$('panel').close();newChat();}});
for(const [icon,text] of prompts.slice(0,4))$('suggestions').append(button(icon+'  '+text,()=>prompt(text)));
for(const c of chats)for(const m of c.messages)if(m.state==='pending')m.state='stopped';
applyTheme();sidebar(innerWidth>700);modelChanged();render();
