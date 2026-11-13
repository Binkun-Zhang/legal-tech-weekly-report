(() => {
  'use strict';
  const A=window.LTW, esc=A.escape, $=s=>document.querySelector(s);
  let catalog=null, panel='favorites', view='items', albumId='', selected=new Set(), shown=[], editing=false, stateCache={};
  const filters={q:'',type:'all',competitor:'',read:'all',sort:'date'};
  const notice=(s,undo)=>window.ltwNotice(s,undo);
  function safe(fn){try{return fn();}catch(e){A.reportError(e);}}
  function name(id){return catalog?.competitors.find(c=>c.id===id)?.name||id;}
  function opts(items,value){return items.map(([k,v])=>`<option value="${esc(k)}"${k===value?' selected':''}>${esc(v)}</option>`).join('');}
  function allSaved(){
    const source=new Map((catalog?.entries||[]).map(e=>[e.id,e]));
    return [...Object.entries(stateCache).filter(([,s])=>s.favorite&&s.snapshot).map(([id,s])=>({kind:'entry',key:id,entry:source.get(id)||s.snapshot,data:s})),
      ...A.issues().map(i=>({kind:'issue',key:i.key,data:i,entry:{title:i.title,summary:i.summary,period:i.period,issueDate:i.issueId,href:i.issueFile,competitors:[],section:'整期周报'}}))];
  }
  function candidates(){
    if(panel==='subscriptions')return A.feed().map(e=>({kind:'entry',key:e.id,entry:e,data:stateCache[e.id]||{}}));
    const list=allSaved();
    if(view==='albums'){const album=A.albums().find(a=>a.id===albumId);return album?list.filter(i=>(album.itemKeys||[]).includes(i.key)):[];}
    return list;
  }
  function filtered(){
    const q=filters.q.trim().toLowerCase();
    return candidates().filter(i=>(filters.type==='all'||i.kind===filters.type)&&(!filters.competitor||i.entry.competitors.includes(filters.competitor))&&
      (filters.read==='all'||i.kind==='entry'&&!!i.data.read===(filters.read==='read'))&&
      (!q||[i.entry.title,i.entry.summary,i.data.note,...i.entry.competitors.map(name)].join(' ').toLowerCase().includes(q)))
      .sort((a,b)=>String(filters.sort==='saved'?b.data.savedAt||b.entry.issueDate:b.entry.issueDate).localeCompare(String(filters.sort==='saved'?a.data.savedAt||a.entry.issueDate:a.entry.issueDate))||a.entry.title.localeCompare(b.entry.title,'zh'));
  }
  function stats(){
    $('#favorite-count').textContent=Object.values(A.state()).filter(s=>s.favorite).length+A.issues().length;
    $('#subscription-count').textContent=A.subscriptions().filter(s=>s.enabled).length;
    $('#unread-count').textContent=catalog?A.feed().filter(e=>!A.state()[e.id]?.read).length:'—';
  }
  function card(item){
    const {entry:e,data:s,kind,key}=item, saved=kind==='issue'||s.favorite;
    const albums=A.albums(), member=albums.filter(a=>(a.itemKeys||[]).includes(key));
    return `<article class="saved-item personal-card" data-item-key="${esc(key)}" data-kind="${kind}">
      <div class="saved-item-meta"><label class="personal-select"><input type="checkbox" data-select-item="${esc(key)}"${selected.has(key)?' checked':''}><span class="sr-only">选择 ${esc(e.title)}</span><span>${esc(e.section)}</span></label><span>${esc(e.period||e.issueDate)}</span>${e.competitors.length?`<span>${esc(e.competitors.map(name).join(' · '))}</span>`:''}${panel==='subscriptions'?`<span>${s.read?'已读':'未读'}</span>`:''}</div>
      <div class="saved-item-body"><h3>${kind==='entry'?A.controls(e):''}<a href="${esc(A.url(e.href))}">${esc(e.title)}</a></h3><p class="personal-excerpt">${esc(e.summary)}</p>
        <div class="saved-item-actions"><a class="text-link" href="${esc(A.url(e.href))}">${kind==='issue'?'阅读本期':'定位原周报'} ↗</a>${kind==='issue'?`<button class="small-action" data-remove-issue="${esc(key)}">取消整期收藏</button>`:''}${panel==='subscriptions'?`<button class="small-action" data-toggle-read="${esc(key)}">${s.read?'标为未读':'标记已读'}</button>`:''}</div>
        ${saved?`<div class="personal-record-fields"><div class="item-albums">${member.map(a=>`<span class="album-tag">${esc(a.name)}<button type="button" data-unfile="${esc(a.id)}" data-key="${esc(key)}" aria-label="从${esc(a.name)}移出">×</button></span>`).join('')}${albums.length?`<label class="sr-only" for="album-for-${esc(key)}">加入收藏专辑</label><select id="album-for-${esc(key)}" data-item-album="${esc(key)}"><option value="">加入专辑…</option>${albums.filter(a=>!member.some(m=>m.id===a.id)).map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</select>`:''}</div>
          <label class="saved-note-label">私人备注<textarea class="saved-note" data-item-note="${esc(key)}" rows="2" maxlength="6000" placeholder="记录你的判断">${esc(s.note||'')}</textarea></label><span class="item-status" data-note-status aria-live="polite"></span></div>`:''}
      </div></article>`;
  }
  function renderList(){
    stateCache=A.state();shown=filtered();selected=new Set([...selected].filter(k=>shown.some(i=>i.key===k)));
    $('#personal-list').innerHTML=shown.map(card).join('');
    $('#personal-results').textContent=`${shown.length} 条${panel==='subscriptions'?'订阅动态':'收藏'}${filters.read==='unread'?' · 仅未读':''}`;
    $('#personal-empty').hidden=shown.length>0;
    $('#personal-empty strong').textContent=candidates().length?'没有匹配的记录':panel==='subscriptions'?'暂无符合订阅规则的动态':view==='albums'?'专辑里还没有收藏':'这里还没有收藏';
    $('#personal-empty p').textContent=candidates().length?'试试清空筛选。':panel==='subscriptions'?'前往竞品档案订阅，或调整下方订阅规则。':view==='albums'?'点击“从收藏中添加”，将资讯放入专辑。':'点击资讯标题前的空心星标，开始收藏。';
    updateBulk();stats();
  }
  function updateBulk(){
    $('#selection-count').textContent=`已选 ${selected.size} 条`;
    $('#select-all-items').checked=shown.length>0&&selected.size===shown.length;
    $('#select-all-items').indeterminate=selected.size>0&&selected.size<shown.length;
    document.querySelectorAll('[data-bulk]').forEach(b=>b.disabled=!selected.size);
    $('[data-bulk="read"]').disabled=!shown.some(i=>selected.has(i.key)&&i.kind==='entry');
    $('[data-bulk="album"]').disabled=!selected.size||!A.albums().length;
    $('#bulk-album').hidden=panel!=='favorites';$('[data-bulk="album"]').hidden=panel!=='favorites';
    $('#bulk-unfile').hidden=!(panel==='favorites'&&view==='albums'&&albumId);
    $('#bulk-remove').hidden=panel!=='favorites';
  }
  function renderFilters(){
    $('#personal-type').innerHTML=opts([['all','全部类型'],['entry','单条资讯'],['issue','整期周报']],filters.type);
    $('#personal-competitor').innerHTML=opts([['','全部竞品'],...(catalog?.competitors||[]).map(c=>[c.id,c.name])],filters.competitor);
    $('#personal-type').disabled=panel==='subscriptions';
    $('#bulk-album').innerHTML=opts(A.albums().length?A.albums().map(a=>[a.id,a.name]):[['','先新建收藏专辑']],$('#bulk-album').value);
  }
  function renderAlbums(){
    const albums=A.albums(), active=albums.find(a=>a.id===albumId), saved=new Set(allSaved().map(i=>i.key));
    if(!active)albumId='';
    $('#album-settings').hidden=panel!=='favorites';$('#album-browser').hidden=view!=='albums';
    document.querySelectorAll('[data-favorites-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.favoritesView===view));
    $('#album-list').innerHTML=albums.length?albums.map(a=>`<button type="button" data-album="${esc(a.id)}" aria-pressed="${a.id===albumId}"><strong>${esc(a.name)}</strong><span>${(a.itemKeys||[]).filter(k=>saved.has(k)).length} 条收藏</span></button>`).join(''):'<p class="panel-copy">新建第一个专辑，整理你关心的信息。</p>';
    $('#album-active').hidden=!active;$('#album-add-tools').hidden=!active;
    $('#album-title').textContent=active?.name||'';
    const browse=panel==='favorites'&&view==='albums'&&!active;
    for(const id of ['personal-records'])$('#'+id).hidden=browse;
  }
  function renderSubscriptions(){
    const entries=catalog?.entries||[];
    $('#subscription-rules').innerHTML=A.subscriptions().map(s=>{
      const matching=entries.filter(e=>A.subscriptionMatches(e,{...s,enabled:true}));
      return `<article class="subscription-rule"><div><strong>${esc(name(s.competitor))}</strong><span>${s.enabled?'订阅中':'已暂停'}</span><p>${s.scope==='moves'?'仅竞品动态':'全部相关栏目'} · ${s.since?esc(s.since)+' 起':'全部历史'}${s.keywords?' · '+esc(s.keywords):''}</p><p>${matching.length} 条动态 · ${matching.filter(e=>!stateCache[e.id]?.read).length} 条未读</p></div><div class="saved-item-actions"><button class="small-action" data-edit-sub="${esc(s.id)}">修改规则</button><button class="small-action" data-pause-sub="${esc(s.id)}">${s.enabled?'暂停':'恢复'}订阅</button><button class="small-action" data-delete-sub="${esc(s.id)}">取消订阅</button><a class="text-link" href="${esc(A.url('feeds/'+s.competitor+'.xml'))}" target="_blank" rel="noopener">RSS ↗</a></div></article>`;
    }).join('')||'<p class="panel-copy">暂无订阅。<a href="./#competitor-directory">前往竞品档案 →</a></p>';
    const checked=A.read(A.keys.checked,{});
    $('#subscription-check-status').textContent=checked.at&&catalog?`最近检查 ${new Date(checked.at).toLocaleString('zh-CN',{hour12:false})} · 周报截至 ${catalog.latestIssueDate}`:'尚未成功检查更新';
  }
  function fillCompetitors(){
    const chosen=new Set([...document.querySelectorAll('[name="subscribe-competitor"]:checked')].map(c=>c.value));
    $('#subscription-choices').innerHTML=(catalog?.competitors||[]).map(c=>`<label><input type="checkbox" name="subscribe-competitor" value="${esc(c.id)}"${chosen.has(c.id)?' checked':''}>${esc(c.name)}</label>`).join('');
  }
  function refresh(){stateCache=A.state();renderFilters();renderAlbums();renderSubscriptions();renderList();}
  function setPanel(next,hash=true){
    panel=next==='subscriptions'?'subscriptions':'favorites';selected.clear();
    const remembered=A.read(A.keys.views,{})[panel]||{};
    Object.assign(filters,{q:'',type:'all',competitor:'',read:panel==='subscriptions'?'unread':'all',sort:'date'},remembered);
    if(panel==='subscriptions')filters.type='all';
    for(const [id,key]of [['personal-search','q'],['personal-read-filter','read'],['personal-sort','sort']])$('#'+id).value=filters[key];
    document.querySelectorAll('[data-workspace-tab]').forEach(b=>{const on=b.dataset.workspaceTab===panel;b.classList.toggle('is-active',on);b.setAttribute('aria-current',on?'page':'false');});
    $('#subscription-settings').hidden=panel!=='subscriptions';$('#workspace-title').textContent=panel==='subscriptions'?'竞品订阅':'我的收藏';
    $('#album-picker').hidden=true;$('#album-rename-form').hidden=true;
    if(hash)history.replaceState(null,'','#'+panel);refresh();
  }
  function openPicker(){
    const album=A.albums().find(a=>a.id===albumId);if(!album)return;
    const list=allSaved().filter(i=>!album.itemKeys.includes(i.key));
    $('#album-picker-list').innerHTML=list.length?list.map(i=>`<label><input type="checkbox" data-pick-key="${esc(i.key)}"><span>${esc(i.entry.title)}</span></label>`).join(''):'<p>暂无其他可添加的收藏。</p>';
    $('#album-picker').hidden=false;
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||b.hasAttribute('data-entry-action'))return;
    if(b.dataset.workspaceTab)setPanel(b.dataset.workspaceTab);
    if(b.dataset.favoritesView){view=b.dataset.favoritesView;selected.clear();$('#album-picker').hidden=true;refresh();}
    if(b.dataset.album){albumId=b.dataset.album;selected.clear();$('#album-picker').hidden=true;$('#album-rename-form').hidden=true;refresh();}
    if(b.hasAttribute('data-clear-personal')){Object.assign(filters,{q:'',type:'all',competitor:'',read:'all',sort:'date'});$('#personal-search').value='';$('#personal-read-filter').value='all';$('#personal-sort').value='date';selected.clear();refresh();}
    if(b.hasAttribute('data-save-view'))safe(()=>{A.saveView(panel,{...filters});notice('已记住筛选条件');});
    if(b.dataset.removeIssue)safe(()=>notice('已取消整期收藏',A.removeIssue(b.dataset.removeIssue)));
    if(b.dataset.unfile)safe(()=>{A.albumItems(b.dataset.unfile,[b.dataset.key],true);notice('已移出专辑，收藏仍然保留',()=>A.albumItems(b.dataset.unfile,[b.dataset.key]));});
    if(b.dataset.toggleRead)safe(()=>{const e=catalog?.entries.find(e=>e.id===b.dataset.toggleRead);if(e)A.toggle(e,'read');});
    if(b.dataset.bulk)safe(()=>{
      const items=shown.filter(i=>selected.has(i.key)), entries=items.filter(i=>i.kind==='entry').map(i=>i.entry),keys=items.map(i=>i.key);
      if(!items.length)return;
      editing=true;const undos=[];
      try{
        if(b.dataset.bulk==='album'){if(!$('#bulk-album').value)throw new Error('请先新建收藏专辑。');A.albumItems($('#bulk-album').value,keys);notice('已加入专辑');}
        if(b.dataset.bulk==='unfile'){const id=albumId;A.albumItems(id,keys,true);notice('已移出专辑，收藏仍然保留',()=>A.albumItems(id,keys));}
        if(b.dataset.bulk==='read'){A.batchEntries(entries,{read:true});notice('已标记为已读');}
        if(b.dataset.bulk==='remove'){undos.push(A.removeItems(entries,'favorite'));for(const i of items.filter(i=>i.kind==='issue'))undos.push(A.removeIssue(i.key));notice('已取消所选收藏',()=>{editing=true;try{undos.forEach(f=>f());}finally{editing=false;refresh();}});}
      }finally{editing=false;selected.clear();refresh();}
    });
    if(b.dataset.editSub){const s=A.subscriptions().find(s=>s.id===b.dataset.editSub);if(!s)return;document.querySelectorAll('[name="subscribe-competitor"]').forEach(c=>c.checked=c.value===s.competitor);$('#subscription-scope').value=s.scope;$('#subscription-since').value=s.since||'';$('#subscription-keywords').value=s.keywords||'';$('#subscription-form').scrollIntoView({block:'start'});$('#subscription-scope').focus();}
    if(b.dataset.pauseSub)safe(()=>{const s=A.subscriptions().find(s=>s.id===b.dataset.pauseSub);if(s)A.saveSubscription({...s,enabled:!s.enabled});});
    if(b.dataset.deleteSub)safe(()=>notice('已取消订阅',A.removeSubscription(b.dataset.deleteSub)));
  });
  document.addEventListener('change',e=>{
    const el=e.target;
    if(el.dataset.selectItem){el.checked?selected.add(el.dataset.selectItem):selected.delete(el.dataset.selectItem);updateBulk();}
    if(el.id==='select-all-items'){selected=el.checked?new Set(shown.map(i=>i.key)):new Set();document.querySelectorAll('[data-select-item]').forEach(c=>c.checked=el.checked);updateBulk();}
    if(el.dataset.itemAlbum&&el.value)safe(()=>{A.albumItems(el.value,[el.dataset.itemAlbum]);notice('已加入专辑');});
    const map={'personal-type':'type','personal-competitor':'competitor','personal-read-filter':'read','personal-sort':'sort'};
    if(map[el.id]){filters[map[el.id]]=el.value;selected.clear();renderList();}
  });
  $('#personal-search').oninput=e=>{filters.q=e.target.value;selected.clear();renderList();};
  document.addEventListener('input',e=>{
    if(!e.target.hasAttribute('data-item-note'))return;
    const card=e.target.closest('[data-item-key]');editing=true;
    try{if(card.dataset.kind==='issue')A.issueUpdate(card.dataset.itemKey,{note:e.target.value});else A.updateEntry(card.dataset.itemKey,{note:e.target.value});card.querySelector('[data-note-status]').textContent='已保存';}
    catch(error){card.querySelector('[data-note-status]').textContent='保存失败';A.reportError(error);}finally{editing=false;}
  });
  $('#album-form').onsubmit=e=>{e.preventDefault();safe(()=>{albumId=A.saveAlbum($('#new-album').value);$('#new-album').value='';refresh();notice('专辑已创建');});};
  $('#rename-album').onclick=()=>{const a=A.albums().find(a=>a.id===albumId);if(!a)return;$('#rename-album-name').value=a.name;$('#album-rename-form').hidden=false;$('#rename-album-name').focus();};
  $('#cancel-rename').onclick=()=>$('#album-rename-form').hidden=true;
  $('#album-rename-form').onsubmit=e=>{e.preventDefault();safe(()=>{A.saveAlbum($('#rename-album-name').value,albumId);$('#album-rename-form').hidden=true;refresh();notice('专辑名称已更新');});};
  $('#delete-album').onclick=()=>safe(()=>{const undo=A.deleteAlbum(albumId);albumId='';$('#album-picker').hidden=true;$('#album-rename-form').hidden=true;refresh();notice('已删除专辑，原有收藏保留',undo);});
  $('#open-album-picker').onclick=openPicker;$('#close-album-picker').onclick=()=>$('#album-picker').hidden=true;
  $('#confirm-album-picker').onclick=()=>safe(()=>{const keys=[...document.querySelectorAll('[data-pick-key]:checked')].map(i=>i.dataset.pickKey);if(!keys.length){notice('请先选择收藏');return;}A.albumItems(albumId,keys);$('#album-picker').hidden=true;notice('已加入专辑');});
  $('#subscription-form').onsubmit=e=>{
    e.preventDefault();const chosen=[...document.querySelectorAll('[name="subscribe-competitor"]:checked')].map(c=>c.value);
    if(!chosen.length){notice('请选择竞品');return;}
    safe(()=>{editing=true;try{for(const competitor of chosen)A.saveSubscription({competitor,enabled:true,scope:$('#subscription-scope').value,since:$('#subscription-since').value,keywords:$('#subscription-keywords').value.trim().slice(0,240)});}finally{editing=false;refresh();}notice('订阅规则已保存');});
  };
  $('#refresh-subscriptions').onclick=async()=>{const b=$('#refresh-subscriptions');b.disabled=true;try{catalog=await A.load(true);fillCompetitors();refresh();$('#personal-load-warning').hidden=true;notice('已检查最新发布的周报');}catch(e){notice(e.message);}finally{b.disabled=false;}};
  A.onChange(()=>{if(editing)return;if(document.activeElement?.matches('[data-item-note]')){stats();return;}refresh();});
  addEventListener('hashchange',()=>setPanel(location.hash.slice(1),false));
  window.ltwReady.then(data=>{catalog=data;$('#personal-load-warning').hidden=!!data;const since=new Date((catalog?.latestIssueDate||new Date().toISOString().slice(0,10))+'T00:00:00Z');since.setUTCDate(since.getUTCDate()-30);$('#subscription-since').value=since.toISOString().slice(0,10);fillCompetitors();setPanel(location.hash.slice(1),false);});
})();
