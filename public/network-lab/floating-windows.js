/* Shared modeless windows for the simulator and the mechanism guide. */
(() => {
  let z=30;
  function attach(dialog) {
    if(dialog.dataset.floatingReady)return;
    const heading=dialog.querySelector('.dialog-heading,.drawer-header');
    if(!heading)return;
    dialog.dataset.floatingReady='true';dialog.classList.add('floating-window');
    const close=heading.querySelector('[data-close],#close-inspector');
    const buttons=document.createElement('div');buttons.className='window-buttons';
    const minimize=document.createElement('button');minimize.type='button';minimize.textContent='−';minimize.setAttribute('aria-label','最小化或还原窗口');
    minimize.onclick=()=>{const minimized=dialog.classList.toggle('window-minimized');if(!minimized){const r=dialog.getBoundingClientRect();dialog.style.left=Math.max(12,Math.min(r.left,innerWidth-r.width-12))+'px';dialog.style.top=Math.max(12,Math.min(r.top,innerHeight-r.height-12))+'px';}};buttons.append(minimize);if(close)buttons.append(close);heading.append(buttons);
    let moving=null;
    heading.addEventListener('pointerdown',e=>{
      if(e.target.closest('button')||e.button>0)return;
      const r=dialog.getBoundingClientRect();moving={x:e.clientX,y:e.clientY,left:r.left,top:r.top};
      heading.setPointerCapture(e.pointerId);dialog.style.zIndex=++z;e.preventDefault();
    });
    heading.addEventListener('pointermove',e=>{
      if(!moving)return;
      dialog.style.left=Math.max(-dialog.clientWidth+100,Math.min(innerWidth-100,moving.left+e.clientX-moving.x))+'px';
      dialog.style.top=Math.max(0,Math.min(innerHeight-50,moving.top+e.clientY-moving.y))+'px';
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture'])heading.addEventListener(event,()=>moving=null);
    dialog.addEventListener('pointerdown',()=>dialog.style.zIndex=++z);
  }
  function open(dialog) {
    attach(dialog);dialog.classList.remove('window-minimized');if(!dialog.open)dialog.show();
    const rect=dialog.getBoundingClientRect();
    if(!dialog.style.left||rect.left>innerWidth-90||rect.top>innerHeight-50){dialog.style.left=Math.max(12,(innerWidth-rect.width)/2)+'px';dialog.style.top=Math.max(15,Math.min(110,innerHeight-rect.height-15))+'px';}
    dialog.style.zIndex=++z;
  }
  document.querySelectorAll('dialog').forEach(attach);
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    const top=[...document.querySelectorAll('dialog[open]')].sort((a,b)=>(+b.style.zIndex||0)-(+a.style.zIndex||0))[0];
    if(top){top.close();e.preventDefault();}
  });
  window.FloatingWindows={attach,open};
})();
window.addEventListener('resize',()=>{
  for(const dialog of document.querySelectorAll('dialog[open]')) {
    const r=dialog.getBoundingClientRect();
    if(r.right>innerWidth||r.left<0)dialog.style.left=Math.max(12,(innerWidth-r.width)/2)+'px';
    if(r.bottom>innerHeight||r.top<0)dialog.style.top=Math.max(12,innerHeight-r.height-12)+'px';
  }
});
