(function(){
  'use strict';
  var issueId='2026-10-23',issueFile='issues/2026-10-23.html',storageKey='legal-tech-weekly:issue-favorites';
  var favorite=document.getElementById('site-favorite'),notice=document.getElementById('site-notice');
  function say(text){notice.hidden=false;notice.textContent=text;}
  function read(){try {var a=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(a)?a:[];} catch(e){return [];}}
  function sync(){var saved=read().some(function(x){return x.key==='issue::'+issueId});favorite.textContent=saved?'已收藏本期':'收藏本期';favorite.setAttribute('aria-pressed',String(saved));}
  var channel;try{if(window.BroadcastChannel){channel=new BroadcastChannel('legal-tech-weekly:favorites');channel.onmessage=sync;}}catch(e){}
  favorite.addEventListener('click',function(){var a=read(),key='issue::'+issueId,i=a.findIndex(function(x){return x.key===key});if(i>=0)a.splice(i,1);else a.push({key:key,type:'issue',issueId:issueId,issueFile:issueFile,period:'2026/10/17—2026/10/23',title:'法律科技产品竞品监控周报',summary:'MeWork合同审查与交付、AlphaGPT类案检索Pro、得理AI律师版与专业数据连接。',topic:'未分类',note:''});try{localStorage.setItem(storageKey,JSON.stringify(a));sync();if(channel)channel.postMessage({type:'favorites-updated'});}catch(e){say('当前浏览器无法保存收藏，请检查存储设置。');}});
  addEventListener('storage',sync);sync();
  document.getElementById('site-share').addEventListener('click',async function(){var url=new URL('../view.html?issue='+encodeURIComponent(issueFile),location.href).href;try{await navigator.clipboard.writeText(url);say('本期链接已复制。');}catch(e){say('本期链接：'+url);}});
  document.getElementById('discussion-jump').addEventListener('click',function(){document.getElementById('sidebar').classList.remove('open');document.getElementById('drawer-shade').classList.remove('open');var menu=document.getElementById('mobile-menu');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','打开栏目目录');});
  var query=new URLSearchParams(location.search),name=query.get('name'),action=query.get('action');
  if(name){var aliases={'Alpha AI':['alpha','icourt'],'幂律智能':['mework','meflow','幂律'],'得理法搜':['得理']},terms=aliases[name]||[name.toLowerCase()],rows=Array.from(document.querySelectorAll('.story'));var match=rows.find(function(s){return action&&s.textContent.includes(action)})||rows.find(function(s){return terms.some(function(t){return s.textContent.toLowerCase().includes(t)})});if(match)requestAnimationFrame(function(){match.scrollIntoView({block:'start',behavior:'instant'});});}
  fetch('../data/site-config.json').then(function(r){if(!r.ok)throw new Error();return r.json()}).then(function(config){
    var g=config.giscus,target=document.getElementById('giscus-container');
    if(g&&g.enabled){var load=function(){var script=document.createElement('script');script.src=g.src;script.async=true;script.crossOrigin='anonymous';Object.keys(g).forEach(function(key){if(key!=='enabled'&&key!=='src')script.setAttribute('data-'+key.replace(/[A-Z]/g,function(x){return '-'+x.toLowerCase()}),g[key]);});script.setAttribute('data-term',issueId);target.appendChild(script);};if(window.IntersectionObserver){var observer=new IntersectionObserver(function(items){if(items.some(function(x){return x.isIntersecting})){observer.disconnect();load();}},{rootMargin:'300px'});observer.observe(target);}else load();}
    if(config.views&&config.views.provider==='vercount'){var stats=document.createElement('script');stats.src=config.views.scriptUrl;stats.async=true;document.head.appendChild(stats);}
  }).catch(function(){document.getElementById('giscus-container').textContent='评论组件暂不可用，可通过上方链接打开讨论区。';});
})();
