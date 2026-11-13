(() => {
  'use strict';
  const side=document.getElementById('appSidebar'),toggle=document.getElementById('appNavToggle'),close=document.getElementById('appNavClose'),overlay=document.getElementById('appNavOverlay'),main=document.querySelector('.signal-main');
  if(!side||!toggle)return;
  let lastFocus=null;
  function setOpen(open){
    if(open&&innerWidth>860)return;
    document.body.classList.toggle('toc-open',open);toggle.setAttribute('aria-expanded',String(open));overlay.hidden=!open;overlay.setAttribute('aria-hidden',String(!open));
    main.inert=open;
    side.inert=!open&&innerWidth<=860;
    if(open){lastFocus=document.activeElement;side.setAttribute('role','dialog');side.setAttribute('aria-modal','true');side.setAttribute('aria-label','网站导航');close.focus();}
    else{side.removeAttribute('role');side.removeAttribute('aria-modal');if(lastFocus?.isConnected)lastFocus.focus();lastFocus=null;}
  }
  toggle.onclick=()=>setOpen(!document.body.classList.contains('toc-open'));close.onclick=()=>setOpen(false);overlay.onclick=()=>setOpen(false);
  side.addEventListener('click',e=>{if(e.target.closest('a,[data-workspace-tab]'))setOpen(false);});
  document.addEventListener('keydown',e=>{
    if(!document.body.classList.contains('toc-open'))return;
    if(e.key==='Escape'){e.preventDefault();setOpen(false);}
    if(e.key==='Tab'){
      const focus=[...side.querySelectorAll('a[href],button:not(:disabled)')].filter(el=>el.getClientRects().length);
      if(!focus.length)return;
      if(e.shiftKey&&document.activeElement===focus[0]){e.preventDefault();focus.at(-1).focus();}
      else if(!e.shiftKey&&document.activeElement===focus.at(-1)){e.preventDefault();focus[0].focus();}
    }
  });
  addEventListener('resize',()=>{
    if(innerWidth>860||!document.body.classList.contains('toc-open'))setOpen(false);
  });
  side.inert=innerWidth<=860;
  // Search remains one command row on phones; optional filters are still reachable.
  const filters=document.querySelector('.retrieval-filter-disclosure');
  if(filters&&matchMedia('(max-width:700px)').matches&&!new URLSearchParams(location.search).has('from')&&!new URLSearchParams(location.search).has('competitor'))filters.open=false;
})();
