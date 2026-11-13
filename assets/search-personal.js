(() => {
  'use strict';
  const A=window.LTW, esc=A.escape, $=s=>document.querySelector(s), params=new URLSearchParams(location.search);
  let catalog=null,page=1,results=[],totalPages=1;
  const size=25;
  const ids=['query','competitor','section','sort','from','to'];
  const norm=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/[\s_-]/g,'');
  function rank(e,q){
    const tokens=q.trim().toLowerCase().split(/\s+/).filter(Boolean);let score=0;
    for(const token of tokens){
      const n=norm(token), group=catalog.competitors.find(c=>[c.name,...c.aliases].some(a=>norm(a)===n));
      const variants=group?[group.name,...group.aliases].map(norm):[n];
      const title=norm(e.title),summary=norm(e.summary),names=e.competitors.map(id=>catalog.competitors.find(c=>c.id===id)?.name||id).map(norm);
      if(!variants.some(v=>title.includes(v)||summary.includes(v)||names.some(a=>a.includes(v)))&&!(group&&e.competitors.includes(group.id)))return -1;
      score+=variants.some(v=>title.includes(v))?8:group&&e.competitors.includes(group.id)?5:2;
    }
    return score;
  }
  function render(){
    if(!catalog)return;
    const v=Object.fromEntries(ids.map(id=>[id,$('#retrieval-'+id).value]));
    if(v.from&&v.to&&v.from>v.to){$('#retrieval-count').textContent='起始日期不能晚于截止日期';$('#retrieval-results').replaceChildren();$('.retrieval-pager').hidden=true;$('#retrieval-empty').hidden=true;return;}
    $('.retrieval-pager').hidden=false;
    results=catalog.entries.filter(e=>(!v.competitor||e.competitors.includes(v.competitor))&&(!v.section||e.sectionId===v.section)&&(!v.from||e.issueDate>=v.from)&&(!v.to||e.issueDate<=v.to)).map(e=>({e,score:rank(e,v.query)})).filter(i=>i.score>=0)
      .sort((a,b)=>(v.sort==='relevance'?b.score-a.score:0)||(v.sort==='oldest'?a.e.issueDate.localeCompare(b.e.issueDate):b.e.issueDate.localeCompare(a.e.issueDate))||a.e.title.localeCompare(b.e.title,'zh'));
    totalPages=Math.max(1,Math.ceil(results.length/size));page=Math.max(1,Math.min(page,totalPages));
    $('#retrieval-count').textContent=`找到 ${results.length} 条资讯 · 覆盖 ${new Set(results.map(i=>i.e.issueId)).size} 期周报`;
    $('#retrieval-results').innerHTML=results.slice((page-1)*size,page*size).map(({e})=>`<article class="saved-item personal-card"><div class="saved-item-meta"><span>${esc(e.section)}</span><span>${esc(e.period)}</span><span>${esc(e.competitors.map(id=>catalog.competitors.find(c=>c.id===id)?.name||id).join(' · '))}</span></div><div class="saved-item-body"><h3>${A.controls(e)}<a href="${esc(A.url(e.href))}">${esc(e.title)}</a></h3><p class="personal-excerpt">${esc(e.summary)}</p><a class="text-link" href="${esc(A.url(e.href))}">定位原周报 ↗</a></div></article>`).join('');
    $('#retrieval-empty').hidden=results.length>0;
    $('#retrieval-page').textContent=`${page} / ${totalPages}`;$('#retrieval-prev').disabled=page===1;$('#retrieval-next').disabled=page===totalPages;
    const p=new URLSearchParams();for(const [k,value]of Object.entries(v))if(value&&(k!=='sort'||value!=='relevance'))p.set(k,value);if(page>1)p.set('page',page);
    history.replaceState(null,'',location.pathname+(p.size?'?'+p:''));
  }
  function init(data){
    if(!data){$('#retrieval-count').textContent='资讯加载失败，请重新加载';$('#retrieval-retry').hidden=false;return;}
    catalog=data;$('#retrieval-retry').hidden=true;
    $('#retrieval-competitor').innerHTML='<option value="">全部竞品</option>'+data.competitors.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    const sections=new Map(data.entries.map(e=>[e.sectionId,e.section]));
    $('#retrieval-section').innerHTML='<option value="">全部栏目</option>'+[...sections].map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('');
    for(const id of ids)if(params.has(id))$('#retrieval-'+id).value=params.get(id);
    if(!$('#retrieval-sort').value)$('#retrieval-sort').value='relevance';
    page=Math.max(1,Number(params.get('page'))||1);render();
  }
  $('#retrieval-form').onsubmit=e=>{e.preventDefault();page=1;render();};
  for(const id of ids.filter(id=>id!=='query'))$('#retrieval-'+id).onchange=()=>{page=1;render();};
  $('#retrieval-clear').onclick=()=>{for(const id of ids)$('#retrieval-'+id).value=id==='sort'?'relevance':'';page=1;render();};
  $('#retrieval-prev').onclick=()=>{page--;render();$('#retrieval-form').scrollIntoView({block:'start'});};
  $('#retrieval-next').onclick=()=>{page++;render();$('#retrieval-form').scrollIntoView({block:'start'});};
  $('#retrieval-retry').onclick=async()=>{try{init(await A.load(true));}catch(e){window.ltwNotice(e.message);}};
  window.ltwReady.then(init);
})();
