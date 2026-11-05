import {gsap} from 'gsap';
import {preset,clone,TYPES,PRESETS,validateConfig,newHost,parseCIDR} from './network-config.js';
import {simulate} from './network-engine.js';
import {mechanismScene,mechanismEvent} from './mechanism-diagram.js';
import {ICONS} from './diagram-icons.js';
import {routeLink,roundedPath} from './network-diagram.js';
import {parseCapture,exportPcap,encodePacket,hexDump} from './capture.js';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options=(items,value)=>items.map(([id,label])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(label)}</option>`).join('');
const field=(label,name,value,type='text',attrs='')=>`<label class="form-field">${esc(label)}<input name="${name}" type="${type}" ${type==='checkbox'?(value?'checked':''):`value="${esc(value)}"`} ${attrs}></label>`;
const select=(label,name,items,value)=>`<label class="form-field">${esc(label)}<select name="${name}">${options(items,value)}</select></label>`;
const check=(label,name,value)=>`<label class="check-field"><input type="checkbox" name="${name}" ${value?'checked':''}>${esc(label)}</label>`;
const rows=data=>`<table class="fields-table"><tbody>${Object.entries(data).map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(typeof v==='object'?JSON.stringify(v):v)}</td></tr>`).join('')}</tbody></table>`;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const view={x:0,y:0,scale:1,stretchY:1};
let diagramMode='mechanism',sceneConfig=null,scene=null,modeViews={};
function currentScene(){if(sceneConfig!==config){sceneConfig=config;scene=mechanismScene(config);}return scene;}
const nodeBaseScale=.68,hostSize=h=>[h.id===config.request.source?260:176,h.id===config.request.source?238:100];let config=preset(),run=null,index=-1,playing=false,timer,packetTween,visible=[],inspectTab='packet',capture=null,capturePage=0,editing=null;
$('preset').innerHTML='<optgroup label="基础机制">'+options(PRESETS.slice(0,4).map(p=>[p.id,p.name]),config.presetId)+'</optgroup><optgroup label="常见网络情境">'+options(PRESETS.slice(4).map(p=>[p.id,p.name]),config.presetId)+'</optgroup>';
const keyEvents=e=>!['ip.deliver','ip.ttl','link.receive','l2.decapsulate','tcp.ack'].includes(e.type);
const current=()=>run?.events[index];
const snapshot=()=>current()?.snapshot||run?.initial;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,4200);}
function store(){localStorage.setItem('network-lab-config-v1',JSON.stringify(config));$('save-status').textContent='配置已保存在本机';}
try {const saved=localStorage.getItem('network-lab-config-v1');if(saved){const parsed=JSON.parse(saved);if(!validateConfig(parsed).length)config=parsed;}}catch{$('save-status').textContent='本机存储不可用，可导出实验文件保存';}
if(PRESETS.some(p=>p.id===config.presetId))$('preset').value=config.presetId;
// Adopt the clearer preset arrangement only when every device still has its original position.
const originalPositions={client:[180,250],gateway:[450,250],isp:[690,250],proxy:[970,110],server:[1250,250],dns:[940,410],peer:[1250,440]};
const stackedPositions={client:[140,300],gateway:[460,300],isp:[780,300],proxy:[1100,75],server:[1100,225],dns:[1100,375],peer:[1100,525]};
if([originalPositions,stackedPositions].some(positions=>config.hosts.every(h=>positions[h.id]?.[0]===h.x&&positions[h.id]?.[1]===h.y))){const arranged=preset(config.presetId);for(const h of config.hosts){const position=arranged.hosts.find(n=>n.id===h.id);h.x=position.x;h.y=position.y;}}
function persist(){try{store();}catch{$('save-status').textContent='本机存储不可用，请导出实验文件';}}
function pause(){playing=false;clearTimeout(timer);$('play').textContent='播放';packetTween?.pause();}
function invalidate(){modeViews={};pause();run=null;index=-1;visible=[];render();if($('inspector').open&&inspectTab==='mechanism')$('inspector').close();else if($('inspector').open&&inspectTab!=='capture')renderInspector();persist();}
function hostsOptions(){return config.hosts.map(h=>[h.id,h.name]);}
function unit(e){return e?.unit||(/^(tcp|ip|route|link|nat)\./.test(e?.type||'')?'kernel':e?.type.startsWith('proxy.')?'agent':e?.type.startsWith('dns.')?'app':e?.type.startsWith('vpn.')?'agent':'');}
function transform(){
  const scaleY=view.scale*view.stretchY;
  $('network-world').setAttribute('transform',`translate(${view.x} ${view.y}) scale(${view.scale} ${scaleY})`);
  // The whole map fits first; only the user's zoom changes the drawing's reading scale.
  $('network-world').querySelectorAll('[data-host-frame]').forEach(frame=>{
    const h=config.hosts.find(h=>h.id===frame.dataset.hostFrame),[w,height]=hostSize(h);
    frame.setAttribute('x',h.x-w/2/nodeBaseScale);frame.setAttribute('y',h.y-height/2/nodeBaseScale);
    frame.setAttribute('width',w/nodeBaseScale);frame.setAttribute('height',height/nodeBaseScale);
    Object.assign(frame.firstElementChild.style,{width:w+'px',height:height+'px',transform:`scale(${1/nodeBaseScale})`,transformOrigin:'0 0'});
  });
  $('network-world').querySelectorAll('[data-link-label]').forEach(label=>{
    const l=config.links.find(l=>l.id===label.dataset.linkLabel),a=config.hosts.find(h=>h.id===l.a),b=config.hosts.find(h=>h.id===l.b);
    const horizontal=Math.abs(a.y-b.y)<40,short=Math.abs(a.x-b.x)<400;
    const shift=horizontal?(short?-(a.type==='client'||b.type==='client'?102:84):28):-22;
    label.setAttribute('x',0);label.setAttribute('y',0);
    label.setAttribute('transform',`translate(${(a.x+b.x)/2} ${(a.y+b.y)/2+shift/scaleY}) scale(${1/view.scale} ${1/scaleY})`);
    label.style.fontSize='16px';label.style.display=view.scale<1.1?'none':'';
  });
  const minimap=$('network-minimap'),w=$('network-canvas').clientWidth,h=$('network-canvas').clientHeight;
  const mechanism=diagramMode==='mechanism'?currentScene():null;
  const mapHosts=config.hosts.map(host=>{const node=mechanism?.byId.get(mechanism.hosts.get(host.id));return node?{...host,x:node.x,y:node.y}:host;});
  const maxX=mechanism?.width||Math.max(...config.hosts.map(n=>n.x))+150,maxY=mechanism?.height||Math.max(...config.hosts.map(n=>n.y))+100;
  minimap.setAttribute('viewBox',`0 0 ${maxX} ${maxY}`);
  $('overview-hosts').innerHTML=config.hosts.map(n=>`<button data-focus-host="${esc(n.id)}">${esc(n.name)}</button>`).join('');
  minimap.innerHTML=config.links.map(l=>{const a=mapHosts.find(n=>n.id===l.a),b=mapHosts.find(n=>n.id===l.b);return `<path d="M${a.x},${a.y}L${b.x},${b.y}" class="mini-link"/>`;}).join('')+mapHosts.map(n=>`<g data-focus-host="${esc(n.id)}" role="button" tabindex="0" aria-label="定位${esc(n.name)}"><title>${esc(n.name)}</title><circle cx="${n.x}" cy="${n.y}" r="80" class="mini-hit"/><circle cx="${n.x}" cy="${n.y}" r="${n.id===current()?.host?28:22}" class="mini-node ${n.id===current()?.host?'active':''}"/></g>`).join('')+`<rect x="${-view.x/view.scale}" y="${-view.y/scaleY}" width="${w/view.scale}" height="${h/scaleY}" class="mini-viewport"/>`;

}
function fit(){
  const b=$('network-canvas').getBoundingClientRect();
  if(diagramMode==='mechanism'){const s=currentScene();view.scale=Math.max(.05,Math.min((b.width-32)/s.width,(b.height-32)/s.height,1.4));view.stretchY=1;view.x=(b.width-s.width*view.scale)/2;view.y=(b.height-s.height*view.scale)/2;transform();return;}
  const left=Math.min(...config.hosts.map(h=>h.x-hostSize(h)[0]/2/nodeBaseScale)),right=Math.max(...config.hosts.map(h=>h.x+hostSize(h)[0]/2/nodeBaseScale));
  const top=Math.min(...config.hosts.map(h=>h.y-hostSize(h)[1]/2/nodeBaseScale)),bottom=Math.max(...config.hosts.map(h=>h.y+hostSize(h)[1]/2/nodeBaseScale));
  view.scale=Math.max(.05,Math.min((b.width-48)/(right-left),(b.height-64)/(bottom-top),1));view.stretchY=1;
  view.x=(b.width-(right+left)*view.scale)/2;view.y=(b.height-(bottom+top)*view.scale)/2;
  transform();
}
function focusHost(id){
  const s=diagramMode==='mechanism'?currentScene():null,h=s?s.byId.get(s.hosts.get(id)):config.hosts.find(h=>h.id===id);view.scale=Math.max(.85,view.scale);
  view.x=$('network-canvas').clientWidth/2-h.x*view.scale;view.y=$('network-canvas').clientHeight/2-h.y*view.scale*view.stretchY;transform();
}
function zoom(amount,x=$('network-canvas').clientWidth/2,y=$('network-canvas').clientHeight/2){const next=Math.max(.05,Math.min(2.5,view.scale*amount)),ratio=next/view.scale;view.x=x-(x-view.x)*ratio;view.y=y-(y-view.y)*ratio;view.scale=next;transform();}
const symbols={client:'▣',router:'⌁',server:'▤',proxy:'◇',dns:'⌕',vpn:'⬡'};
function drawGraph(){
  if(!$('packet-atlas').hidden){renderAtlas();return;}
  if(diagramMode==='mechanism'){drawMechanism();return;}
  packetTween?.kill();const e=current(),active=e?.host,world=$('network-world');
  const history=[...(e?.packet?.path||[])];
  if(!e?.link&&e?.host&&history.length&&history.at(-1)!==e.host&&config.links.some(l=>[l.a,l.b].includes(history.at(-1))&&[l.a,l.b].includes(e.host)))history.push(e.host);
  const travelled=new Map();for(let i=1;i<history.length;i++){const l=config.links.find(l=>[l.a,l.b].includes(history[i-1])&&[l.a,l.b].includes(history[i]));if(l)travelled.set(l.id,[history[i-1],history[i]]);}
  const rectangles=config.hosts.map(h=>{const [w,height]=hostSize(h);return {id:h.id,local:h.id===config.request.source,cx:h.x,cy:h.y,left:h.x-w/2/nodeBaseScale,right:h.x+w/2/nodeBaseScale,top:h.y-height/2/nodeBaseScale,bottom:h.y+height/2/nodeBaseScale};});
  const linkHTML=config.links.map(l=>{
    const selected=e?.link===l.id,dropped=selected&&e.type==='link.drop',passed=travelled.get(l.id);
    const a=rectangles.find(h=>h.id===(selected&&e.from?e.from:passed?passed[0]:l.a)),b=rectangles.find(h=>h.id===(selected&&e.to?e.to:passed?passed[1]:l.b));
    const path=roundedPath(routeLink(a,b,rectangles));
    return `<g class="network-link ${l.enabled?'':'disabled'} ${dropped?'dropped':''}"><path d="${path}" class="link-hit" data-link="${esc(l.id)}"/><path d="${path}" data-wire="${esc(l.id)}" class="link-line ${selected?'selected':passed?'traversed':''}"/><text data-link-label="${esc(l.id)}" text-anchor="middle">${l.latency} ms${l.loss?' / '+l.loss+'% 丢包':''}${l.enabled?'':' / 已断开'}</text></g>`;
  }).join('');
  const connection=snapshot()?.connections.find(c=>c.id===e?.connection);
  const hostHTML=config.hosts.map(h=>{
    const local=h.id===config.request.source,hasTun=config.proxy.tun||config.vpn.enabled,hasAgent=hasTun||config.proxy.system;
    const units=[['app','应用'],['kernel','内核'],...(hasTun?[['tun','TUN']]:[]),...(hasAgent?[['agent',config.vpn.enabled?'VPN':'代理']]:[])];
    const socket=local&&h.id===active&&connection?.role==='proxy'&&unit(e)==='kernel';
    const outbound=e?.packet&&h.interfaces.some(f=>f.address.split('/')[0]===e.packet.src);
    const localHTML=local?`<span class="host-units local-units"><svg viewBox="0 0 230 122" aria-hidden="true"><defs><marker id="local-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1L8 5L1 9" fill="none" stroke="#ffdc96" stroke-width="1.8"/></marker></defs>
      <path class="local-wire" d="M53 29V134"/>
      ${hasTun?'<path class="local-wire" d="M53 94H177V29"/>':''}
      ${hasAgent?'<path class="local-wire socket-wire" d="M177 49V62H53V76"/><text class="socket-label" x="111" y="58" text-anchor="middle">Socket</text>':''}
      ${h.id===active&&e?.type?.startsWith('link.')?'<path data-local-path="physical-interface" class="local-wire local-active" d="M53 94V134"/>':''}
      ${h.id===active&&e?.type==='tun.read'?'<path data-local-path="tun-read" class="local-wire local-active" d="M104 94H177V49"/>':''}
      ${h.id===active&&e?.type==='tun.inject'?'<path data-local-path="tun-inject" class="local-wire local-active" d="M177 49V94H104"/>':''}
      ${socket?`<path data-local-path="socket-${outbound?'out':'in'}" class="local-wire local-active" d="${outbound?'M177 49V62H53V76':'M53 76V62H177V49'}"/>`:''}
      </svg>${units.map(([id,label])=>`<span data-unit="${id}" class="${h.id===active&&unit(e)===id?'selected':''}">${label}</span>`).join('')}</span>`:'';
    return `<foreignObject data-host-frame="${esc(h.id)}"><button xmlns="http://www.w3.org/1999/xhtml" class="host-node type-${h.type} ${h.id===active?'active':''} ${e?.link&&h.id===e.from?'is-sender':''} ${e?.link&&h.id===e.to?(e.type==='link.drop'?'is-dropped':'is-receiver'):''}" data-host="${esc(h.id)}" aria-label="编辑${esc(h.name)}"><span class="host-top"><i>${symbols[h.type]}</i><span><strong title="${esc(h.name)}">${esc(h.name)}${h.nat?'<em class="nat-badge">NAT</em>':''}</strong><small>${esc((h.interfaces.find(f=>f.enabled&&f.id!=='utun')||h.interfaces[0]).address.split('/')[0])}</small></span></span>${localHTML}</button></foreignObject>`;
  }).join('');
  world.innerHTML=`<rect x="0" y="0" width="4000" height="2500" fill="url(#grid)" opacity=".6"/><text class="domain-label" x="65" y="42">我的实验网络</text>${linkHTML}${hostHTML}<g id="travelling-packet" class="${e?.type==='link.drop'?'dropped':''}" hidden><circle r="28" class="packet-glow"/><rect x="-12" y="-9" width="24" height="18" rx="4"/>${e?.type==='link.drop'?'<text text-anchor="middle" y="7">×</text>':''}</g>`;
  transform();
  if(e?.link&&e.from&&e.to){
    const wire=[...world.querySelectorAll('[data-wire]')].find(path=>path.dataset.wire===e.link),length=wire.getTotalLength(),dot=$('travelling-packet'),d={t:0};dot.removeAttribute('hidden');
    const update=()=>{const point=wire.getPointAtLength(length*d.t);dot.setAttribute('transform',`translate(${point.x} ${point.y})`);};
    packetTween=gsap.to(d,{t:e.type==='link.drop'?.5:.82,duration:reduced.matches?0:.8,onUpdate:update,ease:'power1.inOut'});update();
  }
  $('network-count').textContent=`${config.hosts.length} 台设备 · ${config.links.length} 条链路`;
}
function render(){
  const e=current(),s=snapshot(),q=config.request,position=visible.indexOf(index);
  $('preset').title=config.lesson?.focus||'';
  $('experiment-summary').textContent=`${config.hosts.find(h=>h.id===q.source).name} → ${q.destination}:${q.port} · ${q.kind.toUpperCase()} · ${q.bytes} 字节请求`;
  $('event-type').textContent=e?`${e.type.startsWith('dns.')?'域名解析':e.type.startsWith('tun.')?'本机接口交接':e.type.startsWith('link.')?'物理网络传送':e.type.startsWith('nat.')?'地址转换':e.type.startsWith('route.')?'选择出口':'连接与应用处理'} · ${e.time} ms`:'准备就绪';
  $('event-title').textContent=e?.title.replace(/\boriginal\b/g,'应用原始连接').replace(/\bproxy\b/g,'代理通道连接').replace(/\btarget\b/g,'目标服务连接')||(run?'请求已发起，接下来逐步观察。':'发起一次请求，观察数据如何送达。');
  $('event-description').textContent=e?.why||(e?.link&&e.from&&e.to?`报文从${config.hosts.find(h=>h.id===e.from).name}传向${config.hosts.find(h=>h.id===e.to).name}。这是相邻设备间的一跳；报文中的目的 IP ${e.packet.dst} 表示网络层的目的地址。`:e?.record?`应用取得域名对应的地址 ${e.record.ip}，接下来的路由与连接由当前实验配置决定。`:e?.type==='request.start'?`应用准备访问 ${q.destination}。随后逐步观察域名解析、连接建立和数据传输。`:s?.result&&e===run.events.at(-1)?s.result.message:e?.packet?`${e.packet.id} · ${e.packet.protocol} ${e.packet.flags||''}。全图高亮本步的处理位置；点击「报文分层」可查看具体字段。`:e?`本步更新设备或连接的本地状态。点击「查看本步」或「连接与状态」检查变化。`:run?`已生成 ${visible.length} 个观察步骤，可单步前进或播放。`:'直接发起请求，或先修改实验条件。');
  const p=e?.packet;
  $('packet-summary').textContent=p?`${p.id} · ${p.protocol}${p.flags?' '+p.flags:''} · ${p.length} 字节${e.type==='link.drop'?' · 本包丢弃':e?.unit?' · '+({app:'应用程序',kernel:'网络内核',tun:'TUN 接口',agent:'用户态程序'}[e.unit]||e.unit):''}`:'全图视角 · 播放时画面保持固定';
  const connection=s?.connections.find(c=>c.id===e?.connection),role={original:'应用原始连接',proxy:'本机 ↔ 代理连接',target:'代理 ↔ 目标连接'}[connection?.role];
  if(role)$('packet-summary').textContent=role+' · '+(p?$('packet-summary').textContent:`${connection.id} · ${connection.aState} / ${connection.bState}`);else if(e&&!p)$('packet-summary').textContent=e.title;
  const path=[...(p?.path||[])];if(e?.link&&e.to)path.push(e.to);else if(path.length&&e?.host&&path.at(-1)!==e.host)path.push(e.host);
  $('packet-route').textContent=e?.type==='tun.read'?'本机内部：网络内核 → TUN → 用户态程序':e?.type==='tun.inject'?'本机内部：用户态程序 → TUN → 网络内核':path.length?'物理转发：'+path.map(id=>config.hosts.find(h=>h.id===id).name).join(' → '):e?.host?'当前在'+config.hosts.find(h=>h.id===e.host).name+'内部处理':'主图按职责分区 · 编辑网络可修改设备与链路';
  if(e?.type==='link.drop')$('packet-route').textContent+='（途中丢弃）';
  $('packet-summary').title=p?`${p.src}:${p.sport||0} → ${p.dst}:${p.dport||0}`:'';
  $('packet-ribbon').classList.toggle('dropped',e?.type==='link.drop');
  $('event-count').textContent=`${Math.max(0,position+1)} / ${visible.length}`;
  $('run').textContent=run?'↗ 重新发起':'↗ 发起请求';
  $('back').disabled=index<0;$('next').disabled=!run||index===run.events.length-1;$('play').disabled=!run;$('end').disabled=!run;
  $('inspect-packet').hidden=!$('packet-atlas').hidden||!e?.packet;$('inspect-event').disabled=!e;
  $('run-result').textContent=s?.result?.message||(run?`运行回放 · ${s?.metrics.sent||0} 个发送报文 · ${s?.metrics.retransmissions||0} 次重传`:'准备就绪');$('run-result').className=s?.status==='failed'?'failure':s?.status==='success'?'success':'';
  drawGraph();
}
function go(next){index=Math.max(-1,Math.min(run.events.length-1,next));if(index>=0&&!visible.includes(index)){visible.push(index);visible.sort((a,b)=>a-b);}render();if($('inspector').open&&['packet','diff','state','visibility'].includes(inspectTab))renderInspector();}
function nextIndex(){return visible.find(i=>i>index)??run.events.length-1;}
function advance(){
  if(!run)return;const next=nextIndex(),e=run.events[next];
  if($('prediction').checked&&e.type==='route.lookup'){
    pause();openInspector('predict');$('inspector-body').innerHTML=`<p>在 ${esc(config.hosts.find(h=>h.id===e.host).name)}，目标为 <code>${esc(e.packet.dst)}</code>。预测最长前缀匹配会选择哪个出口。</p><div class="prediction-options">${[...new Set(config.hosts.find(h=>h.id===e.host).interfaces.map(f=>f.id)),'无路由'].map(x=>`<button data-predict="${esc(x)}">${esc(x)}</button>`).join('')}</div><p id="prediction-answer"></p>`;
    $('inspector-body').querySelectorAll('[data-predict]').forEach(b=>b.onclick=()=>{const actual=e.route?.iface||'无路由';$('prediction-answer').textContent=(actual===b.dataset.predict?'预测正确。':'这次命中 '+actual+'。')+(e.route?'规则为 '+e.route.prefix:'没有匹配规则');go(next);});return;
  }
  go(next);
}
function startRun(){pause();const errors=validateConfig(config);if(errors.length){toast(errors.join('；'));return;}run=simulate(config);index=-1;visible=run.events.map((e,i)=>keyEvents(e)?i:-1).filter(i=>i>=0);render();}
function play(){if(playing){pause();return;}if(index===run.events.length-1)index=-1;playing=true;$('play').textContent='暂停';const tick=()=>{if(!playing)return;advance();if(index===run.events.length-1)pause();else timer=setTimeout(tick,+$('speed').value);};tick();}
function download(data,name,type='application/json'){const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function openDialog(id){pause();FloatingWindows.open($(id));}
function openInspector(tab='packet'){inspectTab=tab;renderInspector();if(!$('inspector').open)openDialog('inspector');}
function layerHTML(layers,event){return layers.map((layer,i)=>`<section class="packet-layer"><h3>${esc(layer.name)}</h3><table class="fields-table"><tbody>${Object.entries(layer.fields).map(([key,value])=>`<tr><th><button class="field-name" data-field="${esc(key)}" data-layer="${i}">${esc(key)} ⓘ</button></th><td>${esc(value)}</td></tr>`).join('')}</tbody></table></section>`).join('')+'<div id="field-help"></div>';}
function packetHistory(id){return run.events.map((e,i)=>e.packet?.id===id?{e,i}:null).filter(Boolean);}
function renderInspector(){
  const e=current(),s=snapshot();$('inspector-kicker').textContent='INSPECT / '+(e?.id||'NETWORK');
  const tabs=[['packet','报文'],['diff','处理前后'],['state','连接与状态'],['visibility','可见性'],['timeline','全部事件']];
  $('inspector-tabs').innerHTML=tabs.map(([id,label])=>`<button data-tab="${id}" aria-pressed="${inspectTab===id}">${label}</button>`).join('');
  $('inspector-title').textContent={packet:'具体报文与字段',diff:'这一步改变了什么',state:'当前网络状态',visibility:'谁能看见什么',timeline:'完整事件与报文',help:'使用这个实验台',predict:'先预测路由'}[inspectTab];
  let html='';
  if(inspectTab==='packet'){
    const p=e?.packet;
    html=p?`<p class="step-explanation">${esc(e.why||e.title)}</p><div class="id-strip"><b>${esc(p.id)}</b><span>${esc(p.connection||'独立数据报')}</span><span>${esc(p.meta.streamId||'')}</span></div><div class="packet-layer-stack">${p.layers.map(l=>`<span>${esc(l.type.toUpperCase())}</span>`).join('')}</div>${p.inner?`<div class="notice">加密载荷关联内层 ${esc(p.inner.id)}；下方结构仅供端点教学检视，链路观察者不能读取内层。</div><details><summary>展开完整内层包 ${esc(p.inner.id)}</summary>${p.inner.layers?p.inner.layers.map(l=>`<h3>${esc(l.name)}</h3>${rows(l.fields)}`).join(''):rows({源:p.inner.src,目的:p.inner.dst,协议:p.inner.protocol,序号:p.inner.seq})}</details>`:''}${layerHTML(p.layers,e)}<details><summary>报文经过的边界</summary><div class="packet-history">${packetHistory(p.id).map(({e,i})=>`<button data-event="${i}">${e.time} ms · ${esc(e.type)} · ${esc(e.title)}</button>`).join('')}</div></details><details><summary>模型编码的 IPv4 / ${esc(p.protocol)} 首部与占位载荷</summary><p>首部按字段编码并计算校验和；载荷用零字节占位，不是可用的 TLS、VLESS 或 WireGuard 密文。</p><pre>${esc(hexDump(encodePacket(p)))}</pre></details>`:`<h3>${esc(e?.title||'当前步骤')}</h3><p>${esc(e?.why||'当前动作没有具体网络包。可以单步到生成报文或链路发送事件。')}</p><p>主画面「全部报文」能展开整次运行的每一个包。</p>`;
  } else if(inspectTab==='diff') {
    const p=e?.packet,before=e?.before|| (p?packetHistory(p.id).filter(x=>x.i<index).at(-1)?.e.packet:null);
    if(!p)html='<p>当前动作改变连接或协议状态，可以在「连接与状态」检查。</p>';
    else if(!before)html='<p>这是该报文首次出现；它由当前连接或封装动作创建。</p>'+rows({包:p.id,连接:p.connection||'—',源:p.src,目的:p.dst});
    else {const keys=['id','src','dst','sport','dport','ttl','protocol','seq','ack','flags','length'];html=`<p>${before.id===p.id?'同一个包在这个边界上的变化。':'此动作创建外层包或恢复内层包；包标识可区分封装关系。'}</p><table class="diff-table"><thead><tr><th>字段</th><th>处理前</th><th>处理后</th></tr></thead><tbody>${keys.map(k=>`<tr class="${before[k]!==p[k]?'changed':''}"><th>${k}</th><td>${esc(before[k])}</td><td>${esc(p[k])}</td></tr>`).join('')}</tbody></table><p class="notice">${esc(e.why||'字段变化由本次状态转换计算。')}</p>`;}
  } else if(inspectTab==='state') {
    if(!s)html='<p>先发起一次请求，随后可随每一步检查状态。</p>';
    else html=`<div class="metrics"><span><b>${s.metrics.sent}</b>发送报文</span><span><b>${s.metrics.retransmissions}</b>重传</span><span><b>${s.metrics.dropped}</b>丢弃</span></div><h3>TCP 连接与状态</h3>${s.connections.map(c=>`<div class="state-item"><b>${esc(c.id)} / ${esc(c.role)}</b><p>${esc(c.a.ip)}:${c.a.port} ⇄ ${esc(c.b.ip)}:${c.b.port}</p>${rows({发起端状态:c.aState,接收端状态:c.bState,已确认字节:c.bytesAcked,下一发送序号:c.aNext,对端下一发送序号:c.bNext})}</div>`).join('')||'<p>尚未创建连接。</p>'}<h3>NAT 会话映射</h3>${s.nat.map(n=>rows({设备:n.host,协议:n.protocol,内网:`${n.privateIP}:${n.privatePort}`,公网:`${n.publicIP}:${n.publicPort}`,远端:`${n.remoteIP}:${n.remotePort}`})).join('')||'<p>尚无 NAT 映射。</p>'}<h3>DNS 与缓存</h3>${s.dnsRecords.map(r=>rows({名称:r.name,地址:r.ip,解析位置:r.host,到期毫秒:r.expires,类型:r.fake?'fake-IP':'A 记录'})).join('')||'<p>尚无 DNS 记录。</p>'}<h3>TLS / VPN 会话</h3>${[...s.tls,...s.tunnels].map(r=>rows(r)).join('')||'<p>尚无加密会话。</p>'}<h3>应用字节流关联</h3>${s.streams.map(r=>`<p><code>${esc(r.id)}</code> · ${r.bytes} 字节 · ${esc(r.connections.join(' → '))}</p>`).join('')}`;
  } else if(inspectTab==='visibility') {
    html=e?.packet?rows(e.visibility||{链路:`${e.packet.src}:${e.packet.sport} → ${e.packet.dst}:${e.packet.dport}`,内容:e.packet.meta.encrypted||e.packet.meta.outerTls?'逻辑加密；不可据此读取明文':'当前未声明加密',范围:'这是教学模型的可见性判断，不是对真实设备流量的检测'})+'<h3>加密关系</h3><p>正常 HTTPS 的应用内容由浏览器与目标站处理；代理通常能知道目标地址，但不能读取端到端 HTTPS 明文。WireGuard 的中间链路只能观察外层 UDP，内层完整 IP 包需要对端解密。</p>':'<p>选择一个具体报文，查看该边界能看到的首部和载荷。</p>';
  } else if(inspectTab==='timeline') {
    html=run?`<p>${run.events.length} 个模型事件。选择具体事件可回到当时状态；编号与报文标识在同一次运行中保持稳定。</p><label class="check-field"><input id="timeline-all" type="checkbox">显示收包、TTL 与 ACK 等底层事件</label><label class="form-field">按包、连接或事件筛选<input id="event-filter" type="search" placeholder="如 packet-12、connection-2、NAT"></label><div id="timeline-list"></div>`:'<p>先发起一次请求生成事件。</p>';
  } else if(inspectTab==='help') {
    $('inspector-tabs').innerHTML='';html=`<p>选择一个预设，发起请求后单步或播放。主图按程序、内核、网络与服务端分区，点击节点理解职责。点击「编辑网络」可布置设备，修改接口、路由、服务、链路延迟、丢包率与 MTU；「返回流转」继续查看同一次运行。修改配置后重新发起，结果由模型重新计算。</p><h3>可以探索</h3><ul><li>删除代理地址的 /32 例外路由，观察 TUN 回环。</li><li>关闭 TUN 并启用系统代理，保留或关闭本地代理监听服务。</li><li>改变 DNS、规则、接口或链路，追踪失败发生的边界。</li><li>丢弃第一个 SYN，查看超时、重传与序号。</li><li>用 VPN 观察完整内层 IP 包如何恢复；用普通代理比较跨连接的字节流。</li></ul><h3>模型范围</h3><p>实现 IPv4 最长前缀路由、TTL、链路延迟与丢包、NAT、简化 TCP 状态机、分段、窗口、累计 ACK、乱序缓存、超时重传与关闭。DNS 使用可编辑固定数据。TLS / SSH / WireGuard 仅建模协议阶段和封装关系，不实施真实密码运算。</p><p>不实现拥塞控制、IP 分片、动态路由协议、ARP、IPv6 仿真、QUIC 或完整操作系统网络栈。抓包导入可读取 IPv6 首部，与仿真分开展示。</p><h3>保存与导出</h3><p>配置自动保存在当前浏览器，也可导出 JSON；运行记录包含事件和状态差异，模拟 pcap 包含模型编码的首部与零字节载荷。真实抓包文件仅在本机读取，不上传。</p><h3>协议依据</h3><p><a href="https://www.rfc-editor.org/rfc/rfc9293.html" target="_blank" rel="noreferrer">TCP · RFC 9293</a> / <a href="https://www.rfc-editor.org/rfc/rfc1812.html" target="_blank" rel="noreferrer">路由 · RFC 1812</a> / <a href="https://www.rfc-editor.org/rfc/rfc3022.html" target="_blank" rel="noreferrer">NAT · RFC 3022</a> / <a href="https://www.wireguard.com/protocol/" target="_blank" rel="noreferrer">WireGuard 协议</a></p>`;
  }
  $('inspector-body').innerHTML=html;
  $('inspector-tabs').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{inspectTab=b.dataset.tab;renderInspector();});
  bindEventButtons();
  $('inspector-body').querySelectorAll('[data-field]').forEach(b=>b.onclick=()=>{const p=current().packet,layer=p.layers[+b.dataset.layer],ip=layer.type==='ip',tcp=layer.type==='tcp';$('field-help').innerHTML=`<h3>${esc(b.dataset.field)} · 字段来源</h3>${rows({谁设置:ip?'发包主机的 IP 层；NAT 或路由器可修改其中部分字段':tcp?'这条 TCP 连接的发送端状态机':'对应的应用或隧道协议端点',何时设置:ip?'生成 IP 包时；经过路由器时更新 TTL，NAT 时改写地址':tcp?'发送该段时，根据连接的序号、接收进度和窗口计算':'封装或会话协商时',何时移除:ip||tcp?'在接收该连接的协议端点处理首部；普通代理仅把字节写入下一条连接':'在持有对应会话状态的端点解除封装',谁能看见:p.meta.outerTls&& !ip&&!tcp?'代理 TLS 两端；链路观察者不可读内部字段':p.meta.kind==='wireguard'&&!ip&&layer.type!=='udp'?'VPN 两端；中间链路只见外层':'当前链路可见的外层首部；加密载荷需由协议端点读取'})}`;$('field-help').scrollIntoView({block:'nearest',behavior:reduced.matches?'instant':'smooth'});});
  if(inspectTab==='timeline'&&run){const update=()=>{const query=$('event-filter').value.toLowerCase(),all=$('timeline-all').checked;const filtered=run.events.map((e,i)=>({e,i})).filter(({e})=>(all||keyEvents(e))&&(!query||`${e.title} ${e.type} ${e.packet?.id||''} ${e.connection||''}`.toLowerCase().includes(query)));$('timeline-list').innerHTML=filtered.map(({e,i})=>`<button class="timeline-event ${i===index?'current':''}" data-event="${i}"><span>${e.time} ms</span><strong>${esc(e.title)}</strong><small>${esc(e.packet?.id||e.connection||e.type)}</small></button>`).join('');bindEventButtons();};$('event-filter').oninput=update;$('timeline-all').onchange=update;update();}
}
function bindEventButtons(){$('inspector-body').querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>{pause();go(+b.dataset.event);if(inspectTab==='timeline')$('inspector').close();else renderInspector();});}

function interfaceRow(f={id:'eth1',address:'10.0.0.1/24',enabled:true}){return `<tr data-interface><td><input data-key="id" value="${esc(f.id)}" required></td><td><input data-key="address" value="${esc(f.address)}" required></td><td><input data-key="enabled" type="checkbox" ${f.enabled?'checked':''}></td><td><button type="button" data-remove>×</button></td></tr>`;}
function routeRow(r={prefix:'0.0.0.0/0',iface:'en0',via:'',metric:100,enabled:true}){return `<tr data-route><td><input data-key="prefix" value="${esc(r.prefix)}" required></td><td><input data-key="iface" value="${esc(r.iface)}" required></td><td><select data-key="via">${options([['','直达 / TUN'],...hostsOptions()],r.via)}</select></td><td><input data-key="metric" type="number" value="${r.metric}" min="0" max="9999"></td><td><input data-key="enabled" type="checkbox" ${r.enabled?'checked':''}></td><td><button type="button" data-remove>×</button></td></tr>`;}
function serviceRow(s={kind:'https',port:443,protocol:'TCP',enabled:true}){return `<tr data-service><td><input data-key="kind" value="${esc(s.kind)}" required></td><td><input data-key="port" type="number" value="${s.port}" min="1" max="65535"></td><td><select data-key="protocol">${options([['TCP','TCP'],['UDP','UDP']],s.protocol)}</select></td><td><input data-key="enabled" type="checkbox" ${s.enabled?'checked':''}></td><td><button type="button" data-remove>×</button></td></tr>`;}
function ruleRow(r={pattern:'*',action:'proxy'}){return `<tr data-rule><td><input data-key="pattern" value="${esc(r.pattern)}" required></td><td><select data-key="action">${options([['proxy','代理'],['direct','直连'],['reject','拒绝']],r.action)}</select></td><td><button type="button" data-remove>×</button></td></tr>`;}
function editor(title,body,save,deleteId){editing={save,deleteId};$('editor-title').textContent=title;$('editor-body').innerHTML=body;$('editor-error').textContent='';$('delete-host').hidden=!deleteId;openDialog('editor');}
function hostEditor(id){const h=clone(config.hosts.find(h=>h.id===id));editor('配置 '+h.name,`<div class="form-grid">${field('设备名称','host-name',h.name)}${select('设备类型','host-type',Object.entries(TYPES),h.type)}${check('允许转发经过此设备的 IP 包','forwarding',h.forwarding)}${check('出口启用 NAT','nat',h.nat)}${field('NAT 出口接口','nat-interface',h.natInterface)}</div><h3>网络接口</h3><div class="table-scroll"><table class="edit-table"><thead><tr><th>接口</th><th>IPv4 / 前缀</th><th>启用</th><th></th></tr></thead><tbody id="interface-rows">${h.interfaces.map(interfaceRow).join('')}</tbody></table></div><button type="button" data-add="interface">＋ 接口</button><h3>路由表</h3><p>最长前缀优先；同前缀 metric 较小者优先。下一跳须有可用链路，接口名须存在。</p><div class="table-scroll"><table class="edit-table"><thead><tr><th>目的前缀</th><th>接口</th><th>下一跳设备</th><th>metric</th><th>启用</th><th></th></tr></thead><tbody id="route-rows">${h.routes.map(routeRow).join('')}</tbody></table></div><button type="button" data-add="route">＋ 路由</button><h3>监听服务</h3><p>内置类型：https、http、ssh、proxy、http-proxy、dns、wireguard、echo。</p><div class="table-scroll"><table class="edit-table"><thead><tr><th>类型</th><th>端口</th><th>协议</th><th>启用</th><th></th></tr></thead><tbody id="service-rows">${h.services.map(serviceRow).join('')}</tbody></table></div><button type="button" data-add="service">＋ 服务</button>`,form=>{const c=clone(config),host=c.hosts.find(x=>x.id===id);host.name=form.get('host-name');host.type=form.get('host-type');host.forwarding=form.has('forwarding');host.nat=form.has('nat');host.natInterface=form.get('nat-interface');host.interfaces=readRows('interface');host.routes=readRows('route');host.services=readRows('service');return c;},id);}
function readRows(type){return [...$('editor-body').querySelectorAll('[data-'+type+']')].map(row=>Object.fromEntries([...row.querySelectorAll('[data-key]')].map(f=>[f.dataset.key,f.type==='checkbox'?f.checked:f.type==='number'?+f.value:f.value])));}
function settings(){const c=config;editor('请求、代理与实验条件',`<h3>发起请求</h3><div class="form-grid">${select('发起设备','source',hostsOptions(),c.request.source)}${field('目标域名或 IPv4','destination',c.request.destination)}${select('应用协议','kind',[['https','HTTPS'],['http','HTTP'],['ssh','SSH'],['ping','ICMP Ping'],['udp','UDP Echo']],c.request.kind)}${field('目标端口','port',c.request.port,'number','min="1" max="65535"')}${field('请求字节数','bytes',c.request.bytes,'number','min="1" max="8192"')}${field('响应字节数','responseBytes',c.request.responseBytes,'number','min="1" max="8192"')}</div>${check('此应用遵从系统代理（HTTP / HTTPS）','usesSystemProxy',c.request.usesSystemProxy)}<h3>代理与 VPN</h3><div class="form-grid">${check('启用 TUN 代理处理','tun',c.proxy.tun)}${check('启用系统 HTTP 代理','system',c.proxy.system)}${check('代理传输使用 TLS','transportTls',c.proxy.transportTls)}${check('启用 WireGuard VPN','vpn',c.vpn.enabled)}${select('远端代理设备','proxyHost',hostsOptions(),c.proxy.host)}${field('远端代理端口','proxyPort',c.proxy.port,'number')}${field('本地 HTTP 代理端口','localPort',c.proxy.localPort,'number')}${select('VPN 对端','peer',hostsOptions(),c.vpn.peer)}${field('WireGuard UDP 端口','vpnPort',c.vpn.port,'number')}${check('VPN 密钥有效（逻辑校验）','vpnKey',c.vpn.keyValid)}${field('客户端认证值（实验数据）','clientAuth',c.proxy.clientAuth)}${field('服务端期望认证值','serverAuth',c.proxy.serverAuth)}</div><p class="notice">TUN / VPN 开关决定用户态处理程序是否工作；路由仍由设备路由表决定。开关不会自动替你添加或删除路由。</p><h3>代理规则（按表中顺序）</h3><p>支持域名、*.域名后缀、IPv4 CIDR 和 *。</p><table class="edit-table"><thead><tr><th>目标匹配</th><th>动作</th><th></th></tr></thead><tbody id="rule-rows">${c.proxy.rules.map(ruleRow).join('')}</tbody></table><button type="button" data-add="rule">＋ 规则</button><h3>DNS</h3><div class="form-grid">${select('解析器设备','dnsHost',hostsOptions(),c.dns.host)}${select('解析方式','dnsMode',[['local','本地 DNS'],['remote','代理远端解析'],['fake','fake-IP 映射']],c.dns.mode)}${field('缓存 TTL（秒）','dnsTTL',c.dns.ttl,'number')}</div><label class="form-field">固定域名记录，每行“域名 IPv4”<textarea name="records" rows="4">${esc(Object.entries(c.dns.records).map(([k,v])=>k+' '+v).join('\n'))}</textarea></label><h3>传输参数</h3><div class="form-grid">${[['ttl','IP 初始 TTL',1,64],['mss','TCP MSS',64,1400],['window','TCP 接收窗口',64,16384],['rto','初始重传超时 ms',100,10000],['retries','最多重传次数',0,5],['seed','可重复随机种子',1,2147483647]].map(([key,label,min,max])=>field(label,key,c.transport[key],'number',`min="${min}" max="${max}"`)).join('')}</div><h3>故障注入</h3><div class="form-grid">${[['dns','DNS 不响应'],['proxyAuth','代理认证失败'],['certificate','TLS 证书策略失败'],['targetBlocked','目标不响应 TCP SYN'],['dropFirst','丢弃第一个 TCP SYN']].map(([id,label])=>check(label,'fault-'+id,c.faults[id])).join('')}</div>`,form=>{
  const c=clone(config);for(const k of ['source','destination','kind'])c.request[k]=form.get(k);for(const k of ['port','bytes','responseBytes'])c.request[k]=+form.get(k);c.request.usesSystemProxy=form.has('usesSystemProxy');
  for(const k of ['tun','system','transportTls'])c.proxy[k]=form.has(k);c.proxy.host=form.get('proxyHost');c.proxy.port=+form.get('proxyPort');c.proxy.localPort=+form.get('localPort');c.proxy.clientAuth=form.get('clientAuth');c.proxy.serverAuth=form.get('serverAuth');c.proxy.rules=readRows('rule');c.vpn.enabled=form.has('vpn');c.vpn.peer=form.get('peer');c.vpn.port=+form.get('vpnPort');c.vpn.keyValid=form.has('vpnKey');c.dns.host=form.get('dnsHost');c.dns.mode=form.get('dnsMode');c.dns.ttl=+form.get('dnsTTL');
  c.dns.records=Object.fromEntries(form.get('records').trim().split('\n').filter(Boolean).map(line=>line.trim().split(/\s+/)));
  for(const k of ['ttl','mss','window','rto','retries','seed'])c.transport[k]=+form.get(k);for(const k of Object.keys(c.faults))c.faults[k]=form.has('fault-'+k);return c;
 });}
function linkEditor(id){const l=id?config.links.find(x=>x.id===id):{id:'link-'+Date.now(),a:config.hosts[0].id,b:config.hosts[1].id,latency:12,loss:0,mtu:1500,enabled:true};editor(id?'编辑链路':'连接两台设备',`<div class="form-grid">${select('设备 A','a',hostsOptions(),l.a)}${select('设备 B','b',hostsOptions(),l.b)}${field('单向时延 ms','latency',l.latency,'number','min="1" max="2000"')}${field('丢包率 %','loss',l.loss,'number','min="0" max="100" step="0.1"')}${field('链路 MTU','mtu',l.mtu,'number','min="68" max="9000"')}${check('链路连通','enabled',l.enabled)}</div>${!id?check('同时为两个端点添加对方接口地址的 /32 直达路由','autoRoutes',true):''}<p>链路为双向点对点抽象；中间设备须开启 IP 转发。拖动设备可改变布局。</p>${id?'<button type="button" class="danger" id="remove-link">删除这条链路</button>':''}`,form=>{const c=clone(config),link={...l,a:form.get('a'),b:form.get('b'),latency:+form.get('latency'),loss:+form.get('loss'),mtu:+form.get('mtu'),enabled:form.has('enabled')};if(id)c.links[c.links.findIndex(x=>x.id===id)]=link;else c.links.push(link);if(form.has('autoRoutes')&&link.a!==link.b){for(const [a,b] of [[link.a,link.b],[link.b,link.a]]){const host=c.hosts.find(h=>h.id===a),other=c.hosts.find(h=>h.id===b);for(const f of other.interfaces)host.routes.push({prefix:parseCIDR(f.address).ip+'/32',iface:host.interfaces.find(f=>f.id!=='utun')?.id||host.interfaces[0].id,via:b,metric:10,enabled:true});}}return c;});if(id)$('remove-link').onclick=()=>{config.links=config.links.filter(x=>x.id!==id);$('editor').close();invalidate();};}
function linksEditor(){editor('网络链路',`<p>点击一条链路调整延迟、丢包与连通性，或连接新设备。</p><div class="link-list">${config.links.map(l=>`<button type="button" data-edit-link="${esc(l.id)}">${esc(config.hosts.find(h=>h.id===l.a).name)} ⇄ ${esc(config.hosts.find(h=>h.id===l.b).name)}<small>${l.latency} ms · ${l.loss}% 丢包 · MTU ${l.mtu} · ${l.enabled?'连通':'断开'}</small></button>`).join('')}</div><button type="button" id="new-link">＋ 新建链路</button>`,()=>clone(config));$('editor-body').querySelectorAll('[data-edit-link]').forEach(b=>b.onclick=()=>{$('editor').close();linkEditor(b.dataset.editLink);});$('new-link').onclick=()=>{$('editor').close();linkEditor();};}
$('editor-body').addEventListener('click',e=>{const remove=e.target.closest('[data-remove]');if(remove)remove.closest('tr').remove();const add=e.target.closest('[data-add]');if(add){const type=add.dataset.add;$(type+'-rows').insertAdjacentHTML('beforeend',{interface:interfaceRow,route:routeRow,service:serviceRow,rule:ruleRow}[type]());}});
$('editor-form').onsubmit=e=>{e.preventDefault();const next=editing.save(new FormData(e.target)),errors=validateConfig(next);if(errors.length){$('editor-error').textContent=errors.join('；');return;}config=next;$('editor').close();invalidate();toast('配置已应用；发起请求即可观察变化');};
$('delete-host').onclick=()=>{const id=editing.deleteId;if([config.request.source,...((config.proxy.tun||config.proxy.system)?[config.proxy.host]:[]),...(config.vpn.enabled?[config.vpn.peer]:[]),...(!/^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(config.request.destination)?[config.dns.host]:[])].includes(id)){$('editor-error').textContent='这个设备仍被请求、代理、VPN 或 DNS 配置引用；请先更换对应设备。';return;}config.hosts=config.hosts.filter(h=>h.id!==id);config.links=config.links.filter(l=>l.a!==id&&l.b!==id);for(const h of config.hosts)h.routes=h.routes.filter(r=>r.via!==id);$('editor').close();invalidate();fit();};
$('add-host').onclick=()=>editor('添加设备',select('设备类型','newType',Object.entries(TYPES),'server'),form=>{const c=clone(config);let i=1;while(c.hosts.some(h=>h.id==='host'+i))i++;c.hosts.push(newHost(form.get('newType'),i));return c;});
$('request-settings').onclick=settings;$('edit-links').onclick=linksEditor;

// Pointer gestures distinguish device dragging from background pan and touch pinch.
const pointers=new Map();let gesture=null,dragged=false;
function gestureState(){const p=[...pointers.values()];return {x:p.reduce((n,v)=>n+v.x,0)/p.length,y:p.reduce((n,v)=>n+v.y,0)/p.length,d:p.length===2?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0};}
$('network-canvas').onpointerdown=e=>{if(e.button>0||e.target.closest('#inspect-packet,#packet-atlas,#network-minimap,#mechanism-packet,[data-flow-node]'))return;const h=e.target.closest('[data-host]');pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture={...gestureState(),host:h?.dataset.host,link:e.target.closest('[data-link]')?.dataset.link,startX:e.clientX,startY:e.clientY};dragged=false;$('network-canvas').setPointerCapture(e.pointerId);};
$('network-canvas').onpointermove=e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const next=gestureState();if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>5)dragged=true;if(pointers.size===2){const b=$('network-canvas').getBoundingClientRect();if(gesture.d)zoom(next.d/gesture.d,gesture.x-b.left,gesture.y-b.top);view.x+=next.x-gesture.x;view.y+=next.y-gesture.y;transform();}else if(dragged&&gesture.host){const h=config.hosts.find(h=>h.id===gesture.host);h.x=Math.max(115,Math.min(3800,h.x+(next.x-gesture.x)/view.scale));h.y=Math.max(80,Math.min(2300,h.y+(next.y-gesture.y)/(view.scale*view.stretchY)));drawGraph();}else if(dragged){view.x+=next.x-gesture.x;view.y+=next.y-gesture.y;transform();}gesture={...gesture,...next};};
$('network-canvas').onpointerup=e=>{if(!pointers.has(e.pointerId))return;const g=gesture;pointers.delete(e.pointerId);if(pointers.size){gesture={...gesture,...gestureState(),host:null};return;}gesture=null;if(dragged){persist();return;}if(g?.host)hostEditor(g.host);else if(g?.link)linkEditor(g.link);};
$('network-canvas').onpointercancel=e=>{pointers.delete(e.pointerId);gesture=null;};
$('network-canvas').addEventListener('wheel',e=>{if(e.target.closest('#packet-atlas,#network-minimap'))return;e.preventDefault();const b=$('network-canvas').getBoundingClientRect();zoom(Math.exp(-e.deltaY*.0015),e.clientX-b.left,e.clientY-b.top);},{passive:false});
$('fit').onclick=fit;$('zoom-in').onclick=()=>zoom(1.2);$('zoom-out').onclick=()=>zoom(1/1.2);
$('run').onclick=startRun;$('play').onclick=play;$('next').onclick=()=>{pause();advance();};$('back').onclick=()=>{pause();go([...visible].reverse().find(i=>i<index)??-1);};$('end').onclick=()=>{pause();go(run.events.length-1);};
$('inspect-packet').onclick=()=>openInspector('packet');$('inspect-event').onclick=()=>openInspector('packet');$('state-button').onclick=()=>openInspector('state');$('timeline-button').onclick=()=>openInspector('timeline');$('help').onclick=()=>openInspector('help');
$('preset').onchange=e=>{config=preset(e.target.value);invalidate();fit();};$('reset-preset').onclick=()=>{config=preset($('preset').value);invalidate();fit();};
$('save-config').onclick=()=>download(JSON.stringify(config,null,2),'network-experiment.json');$('load-config').onclick=()=>$('config-file').click();
$('export-trace').onclick=()=>{if(!run){toast('先发起一次请求');return;}download(JSON.stringify({version:1,source:'simulation',config,initial:run.initial,events:run.events.map(({snapshot,...e})=>({...e,state:{time:snapshot.time,status:snapshot.status,result:snapshot.result,connections:snapshot.connections,sockets:snapshot.sockets,nat:snapshot.nat,dnsRecords:snapshot.dnsRecords,tls:snapshot.tls,tunnels:snapshot.tunnels,streams:snapshot.streams,metrics:snapshot.metrics}})),result:run.result},null,2),'network-simulation-trace.json');};
$('export-pcap').onclick=()=>{if(!run){toast('先发起一次请求');return;}download(exportPcap(run.events),'SIMULATED-network.pcap','application/vnd.tcpdump.pcap');toast('模拟 pcap 已导出：首部可解码，载荷为零字节占位');};
$('config-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>32*1024*1024)throw new Error('实验或运行记录文件上限为 32 MB');const imported=JSON.parse(await file.text()),next=imported.source==='simulation'?imported.config:imported,errors=validateConfig(next);if(errors.length)throw new Error(errors.join('；'));config=next;invalidate();fit();if(imported.source==='simulation'){startRun();go(run.events.length-1);toast('运行配置已导入，已按保存的随机种子重建完整回放');}else toast('实验配置已导入');}catch(error){toast('导入失败：'+error.message);}e.target.value='';};
function showView(which){pause();$('lab-view').hidden=which!=='lab';$('capture-view').hidden=which!=='capture';for(const id of ['lab','capture'])$(id+'-tab').toggleAttribute('aria-current',id===which);if(which==='lab'){drawGraph();fit();}}
$('lab-tab').onclick=()=>{showView('lab');history.replaceState(null,'','#lab');};$('capture-tab').onclick=()=>{showView('capture');history.replaceState(null,'','#capture');};$('import-capture').onclick=()=>$('capture-file').click();
$('capture-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>32*1024*1024)throw new Error('单次导入上限为 32 MB');capture=parseCapture(await file.arrayBuffer());capturePage=0;$('capture-name').textContent=file.name+' / '+capture.format;$('capture-note').textContent=capture.note+(capture.warnings.length?' '+capture.warnings.join(' '):'');renderCapture();toast('抓包文件已在本机解析');}catch(error){toast('抓包读取失败：'+error.message);}e.target.value='';};
function renderCapture(){const query=$('capture-filter').value.toLowerCase(),list=capture?.packets.filter(p=>!query||p.summary.toLowerCase().includes(query))||[],pages=Math.max(1,Math.ceil(list.length/100));capturePage=Math.min(capturePage,pages-1);$('capture-count').textContent=`${list.length} 个分组`;$('capture-page').textContent=`${capturePage+1} / ${pages}`;$('capture-prev').disabled=!capturePage;$('capture-next').disabled=capturePage===pages-1;$('capture-empty').hidden=!!list.length;$('capture-rows').innerHTML=list.slice(capturePage*100,capturePage*100+100).map(p=>`<tr><td><button data-capture="${p.id}">${p.id.split('-')[1]}</button></td><td>${p.relativeTime.toFixed(3)} ms</td><td><button data-capture="${p.id}">${esc(p.summary)}</button></td><td>${esc(p.application||p.protocol||'其他')}</td><td>${p.caplen}</td></tr>`).join('');$('capture-rows').querySelectorAll('[data-capture]').forEach(b=>b.onclick=()=>{const p=capture.packets.find(p=>p.id===b.dataset.capture);$('inspector-kicker').textContent='LOCAL CAPTURE / '+p.id;$('inspector-title').textContent='真实抓包中的可见字段';$('inspector-tabs').innerHTML='';$('inspector-body').innerHTML=`<div class="notice">本地抓包 · ${esc(p.summary)}。${p.encrypted?'TLS 载荷未解密。':''}</div>${p.layers.map(l=>`<h3>${esc(l.name)}</h3>${rows(l.fields)}`).join('')}<h3>原始捕获字节</h3><pre>${esc(hexDump(p.raw.slice(0,2048)))}</pre>${p.raw.length>2048?'<p>这里只展示前 2048 字节；原文件没有修改。</p>':''}`;openDialog('inspector');});}
$('capture-filter').oninput=()=>{capturePage=0;renderCapture();};$('capture-prev').onclick=()=>{capturePage--;renderCapture();};$('capture-next').onclick=()=>{capturePage++;renderCapture();};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||e.target.closest('button,a,input,select,textarea')||$('lab-view').hidden)return;if(e.key==='ArrowRight'){e.preventDefault();$('next').click();}if(e.key==='ArrowLeft'){e.preventDefault();$('back').click();}if(e.key===' '&&run){e.preventDefault();play();}});
window.addEventListener('resize',()=>{if(!$('lab-view').hidden)fit();});
render();fit();renderCapture();
// Exposed for deterministic regression inspection, not for communicating with real networks.
window.NetworkLab={get diagramMode(){return diagramMode;},get scene(){return currentScene();},get config(){return config;},get run(){return run;},get index(){return index;},simulate,startRun,go,get view(){return view;}};

function renderAtlas(){
  const atlas=$('packet-atlas'),oldFilter=atlas.querySelector('select')?.value||'all',scroll=atlas.scrollTop;
  if(!run){atlas.innerHTML='<div class="atlas-heading"><div><h2>全部报文</h2><p>先发起请求；这里会按连接画出每一个具体包，包括握手、ACK、数据段、重传、回程和 VPN 内外层。</p></div></div>';return;}
  const packets=new Map();
  run.events.forEach((e,i)=>{if(!e.packet)return;const previous=packets.get(e.packet.id);if(!previous||e.type==='link.send'||!previous.e.packet.linkFrame)packets.set(e.packet.id,{e,i});});
  const groups=[...run.final.connections.map(c=>[c.id,c.id+' / '+c.role]),['datagrams','DNS、ICMP 与 VPN 外层数据报']];
  const chosen=groups.some(([id])=>id===oldFilter)?oldFilter:'all';
  atlas.innerHTML=`<div class="atlas-heading"><div><h2>全部 ${packets.size} 个具体报文</h2><p>整次运行 · 每个方块对应一个 packet ID，按连接分组。颜色条显示当前可检视的各层；封装关系另外展开。点击报文可检查字段与路径。</p></div><select id="atlas-filter" aria-label="按连接筛选全部报文">${options([['all','全部连接与数据报'],...groups],chosen)}</select></div>${groups.filter(([id])=>chosen==='all'||chosen===id).map(([id,label])=>{const items=[...packets.values()].filter(({e})=>id==='datagrams'?!e.packet.connection:e.packet.connection===id);return items.length?`<section class="atlas-group"><h3>${esc(label)} · ${items.length} 个包</h3><div class="atlas-grid">${items.map(({e,i})=>{const p=e.packet;return `<button class="atlas-packet ${p.id===current()?.packet?.id?'selected':''} ${i>index?'future':''}" data-packet-event="${i}" aria-label="检查 ${p.id}"><span class="atlas-id"><b>${p.id}</b><span>${e.time} ms</span></span><span class="atlas-address">${esc(p.src)}${p.sport?':'+p.sport:''}<br>→ ${esc(p.dst)}${p.dport?':'+p.dport:''}</span><span class="atlas-flags">${esc(p.protocol)} ${esc(p.flags)} · ${p.length} B${p.segment?' / '+p.segment:''}</span><span class="mini-stack">${p.layers.map(l=>`<span class="mini-layer layer-${esc(l.type)}">${esc(l.name)}</span>`).join('')}</span>${p.inner?`<span class="inner-envelope"><small>加密内层 ${esc(p.inner.id)} · 端点可恢复</small><span class="mini-stack">${(p.inner.layers||[]).filter(l=>l.type!=='ethernet').map(l=>`<span class="mini-layer layer-${esc(l.type)}">${esc(l.name)}</span>`).join('')}</span></span>`:''}</button>`;}).join('')}</div></section>`:'';}).join('')}`;
  atlas.scrollTop=scroll;atlas.querySelector('select').onchange=renderAtlas;
  atlas.querySelectorAll('[data-packet-event]').forEach(b=>b.onclick=()=>{pause();go(+b.dataset.packetEvent);openInspector('packet');});
}
$('packet-atlas-toggle').onclick=()=>{pause();const show=$('packet-atlas').hidden;$('packet-atlas').hidden=!show;$('network-svg').toggleAttribute('hidden',show);$('network-minimap').toggleAttribute('hidden',show);document.querySelectorAll('.view-tools button').forEach(b=>b.disabled=show);$('network-canvas').querySelector('.canvas-instruction').hidden=show;$('network-canvas').querySelector('.path-legend').hidden=show;$('packet-atlas-toggle').setAttribute('aria-pressed',String(show));$('packet-atlas-toggle').textContent=show?'返回全图':'全部报文';$('inspect-packet').hidden=show||!current()?.packet;if(show)renderAtlas();else drawGraph();};
$('network-canvas').addEventListener('click',e=>{const node=e.target.closest('[data-flow-node]');if(node){openMechanismNode(node.dataset.flowNode);return;}const host=e.target.closest('[data-host]');if(host&&e.detail===0)hostEditor(host.dataset.host);});

if(location.hash==='#capture')showView('capture');
window.addEventListener('hashchange',()=>showView(location.hash==='#capture'?'capture':'lab'));

$('preset-details').onclick=()=>{inspectTab='case';$('inspector-kicker').textContent='SCENARIO / 固定初始条件';$('inspector-title').textContent=config.name;$('inspector-tabs').innerHTML='';$('inspector-body').innerHTML='<p>'+esc(config.lesson?.focus||'自由编辑的网络实验')+'</p><h3>本次请求</h3>'+rows({发起设备:config.hosts.find(h=>h.id===config.request.source).name,目标:config.request.destination,应用协议:config.request.kind,端口:config.request.port,请求字节:config.request.bytes,响应字节:config.request.responseBytes,设备数量:config.hosts.length,链路数量:config.links.length})+'<h3>如何探索</h3><p>先按默认条件发起一次请求，再修改设备路由、服务、链路或传输参数重新运行。全部报文可查看每个包，点击包检查首部和处理前后变化。</p><p class="notice">这是常见网络机制的固定实验配置，使用示例地址，不代表本机真实配置或实时联网结果。</p>';openDialog('inspector');};

$('network-minimap').addEventListener('click',e=>{const node=e.target.closest('[data-focus-host]');if(node){focusHost(node.dataset.focusHost);$('overview-menu').hidePopover();}});

$('network-minimap').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const node=e.target.closest('[data-focus-host]');if(node){e.preventDefault();e.stopPropagation();focusHost(node.dataset.focusHost);$('overview-menu').hidePopover();}});

$('file-menu').addEventListener('click',e=>{if(e.target.closest('button'))$('file-menu').hidePopover();});
$('prediction').addEventListener('change',()=>$('file-menu').hidePopover());

$('event-count').onclick=()=>openInspector('timeline');

$('overview-hosts').onclick=e=>{const node=e.target.closest('[data-focus-host]');if(node){focusHost(node.dataset.focusHost);$('overview-menu').hidePopover();}};

function setDiagramMode(mode){
  pause();modeViews[diagramMode]={...view};diagramMode=mode;
  $('network-edit-toggle').setAttribute('aria-pressed',String(mode==='network'));$('network-edit-toggle').textContent=mode==='network'?'返回流转':'编辑网络';
  $('config-tools').hidden=mode!=='network';$('network-canvas').setAttribute('aria-label',mode==='network'?'可编辑二维拓扑，拖动设备调整位置，点击设备或链路配置':'按本机程序、内核、实体网络与服务端分区的流转图，拖动平移，手动缩放，点击节点理解职责');
  $('network-canvas').querySelector('.canvas-instruction').textContent=mode==='network'?'拖动设备布置网络 · 点击设备或链路配置':'拖动平移 · 滚轮或 ＋ 放大 · 点击节点理解职责';
  $('network-canvas').querySelector('.path-legend').innerHTML=mode==='network'?'<span class="legend-base">物理链路</span><span class="legend-trail">已走路径</span><span class="legend-current">当前一跳</span>':'<span class="legend-current">本机 / 原始连接</span><span class="legend-trail">代理传输</span><span class="legend-target">目标连接</span>';
  if(modeViews[mode])Object.assign(view,modeViews[mode]);
  drawGraph();if(modeViews[mode])transform();else fit();
}
$('network-edit-toggle').onclick=()=>setDiagramMode(diagramMode==='network'?'mechanism':'network');

function drawMechanism(){
  packetTween?.kill();const s=currentScene(),e=current(),flow=mechanismEvent(s,config,e,snapshot()),world=$('network-world');
  const history=[...(e?.packet?.path||[])];
  if(!e?.link&&e?.host&&history.length&&history.at(-1)!==e.host)history.push(e.host);
  const passed=new Set();for(let i=1;i<history.length;i++){const l=config.links.find(l=>[l.a,l.b].includes(history[i-1])&&[l.a,l.b].includes(history[i]));if(l)passed.add(l.id);}
  const groups=s.groups.map(g=>`<g><rect class="mechanism-boundary ${g.source?'source-boundary':''}" x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="14"/><text class="mechanism-domain" x="${g.x+20}" y="${g.y+32}">${esc(g.title)}</text>${g.source?'':`<text class="mechanism-domain-sub" x="${g.x+20}" y="${g.y+58}">${esc(g.subtitle)}</text>`}${g.source?`<rect class="mechanism-user-lane" x="${g.x+12}" y="125" width="${g.w-24}" height="120" rx="8"/><text class="mechanism-lane-label" x="${g.x+20}" y="116">用户态程序</text><rect class="mechanism-kernel-lane" x="${g.x+12}" y="355" width="${g.w-24}" height="120" rx="8"/><text class="mechanism-lane-label" x="${g.x+20}" y="346">内核协议栈 / 虚拟接口</text>`:''}</g>`).join('');
  const wires=s.edges.map(edge=>`<path class="mechanism-edge ${edge.link?'physical-edge':''} ${passed.has(edge.link)?'passed':''} ${edge.link&&!config.links.find(l=>l.id===edge.link).enabled?'disabled':''}" data-scene-edge="${esc(edge.id)}" ${edge.link?`data-scene-link="${esc(edge.link)}"`:''} d="${edge.d}"/>${edge.label?`<text class="mechanism-link-caption" x="${edge.lx}" y="${edge.ly}">${esc(edge.label)}</text>`:''}`).join('');
  const nodes=s.nodes.map(n=>{
    const active=flow.active.includes(n.id),sub=n.id==='kernel'&&e?.host===s.source&&e?.type==='route.lookup'?(e.route?`${e.route.prefix} → ${e.route.iface}`:'没有匹配路由'):n.sub;
    return `<foreignObject x="${n.x-n.w/2}" y="${n.y-n.h/2}" width="${n.w}" height="${n.h}"><button class="mechanism-node ${n.tone} ${active?'active':''}" data-flow-node="${esc(n.id)}" aria-label="了解${esc(n.label)}"><svg viewBox="0 0 32 32" aria-hidden="true">${ICONS[n.icon]}</svg><span><strong>${esc(n.label)}</strong><small>${esc(sub)}</small></span><i class="flow-port port-left"></i><i class="flow-port port-right"></i></button></foreignObject>`;
  }).join('');
  const path=flow.parts.map(p=>p.d).join(' ');
  world.style.setProperty('--mechanism-color',flow.color);
  $('mechanism-arrow').querySelector('path').setAttribute('stroke',flow.color);
  world.innerHTML=`<rect x="0" y="0" width="${s.width}" height="${s.height}" fill="url(#grid)" opacity=".45"/>${groups}${wires}<path class="mechanism-halo" d="${path}"/><path id="mechanism-current-path" class="mechanism-active ${e?.type==='link.drop'?'dropped':''}" d="${path}"/>${nodes}<g id="mechanism-packet" ${path&&e?.packet?'':'hidden'} role="button" tabindex="0" aria-label="检查当前报文"><circle r="22" class="packet-aura"/><rect x="-10" y="-8" width="20" height="16" rx="3"/><path d="M-5-3h10M-5 2h7"/></g>`;
  transform();
  if(path&&e?.packet){const line=$('mechanism-current-path'),length=line.getTotalLength(),packet=$('mechanism-packet'),travel={t:0};const update=()=>{const point=line.getPointAtLength(travel.t*length);packet.setAttribute('transform',`translate(${point.x} ${point.y})`);};packetTween=gsap.to(travel,{t:e?.type==='link.drop'?.5:Math.max(.2,1-18/Math.max(1,length)),duration:reduced.matches?0:.85,onUpdate:update,ease:'power1.inOut'});update();packet.onclick=()=>openInspector('packet');packet.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();openInspector('packet');}};}
  $('network-count').textContent=`${config.hosts.length} 台设备 · ${config.links.length} 条链路`;
}
function openMechanismNode(id){
  const node=currentScene().byId.get(id),host=config.hosts.find(h=>h.id===node.host);pause();inspectTab='mechanism';
  const explanations={
    app:['应用发起连接','应用通过 Socket API 请求连接目标。连接开始后，协议栈处理 TCP/IP，应用读写的是字节流。'],
    kernel:['内核决定如何发出','网络栈根据路由表选择接口和下一跳，维护 TCP 状态、序号与确认号。去代理服务器的新 Socket 也需要经过这里。'],
    tun:['TUN 是虚拟三层接口','路由选中 TUN 后，用户态程序读取完整 IP 数据报；回注时，程序把 IP 包写回内核。TUN 接口自身不完成代理连接或 VPN 加密。'],
    agent:config.vpn.enabled?['VPN 保留内层 IP 包','WireGuard 把完整内层包封装到独立的 UDP 外层。到达对端后，恢复同一个内层 packet ID，再回注内核。']:['代理建立新的连接','普通 TCP 代理读取原始会话的字节，为代理通道创建独立 Socket。远端代理还会创建到目标的连接，各自拥有 TCP/IP 首部与序号。']
  };
  const [title,description]=node.id.startsWith('host:')?[host.forwarding?'设备转发实际报文':host.type==='proxy'?'远端代理接收目标信息':'服务与接收端',host.forwarding?'这台设备按自己的路由表选择下一跳。开启 NAT 时还会改写地址和端口，回程根据会话映射恢复。':host.type==='proxy'?'外层连接先到达代理服务。代理读取目标信息，再创建一条独立的目标连接。物理链路和实际经过的路由设备仍由仿真配置计算。':'报文按当前网络配置到达这台设备。监听端口、协议和服务状态决定是否接收请求。']:explanations[node.unit];
  $('inspector-kicker').textContent='连接中的职责';$('inspector-title').textContent=node.label;$('inspector-tabs').innerHTML='';
  $('inspector-body').innerHTML=`<h3>${esc(title)}</h3><p>${esc(description)}</p><h3>所在设备</h3>${rows({设备:host.name,网络接口:host.interfaces.filter(f=>f.enabled).map(f=>f.id+' · '+f.address).join(' / '),路由条数:host.routes.length,监听服务:host.services.filter(s=>s.enabled).map(s=>s.kind+' :'+s.port).join(' / ')||'无'})}<div class="notice">主图按职责分区，物理线路与当前事件使用同一次仿真的实际结果。进入「编辑网络」可修改设备和链路，再重新运行比较。</div><button id="configure-flow-host">配置这台设备</button>`;
  $('configure-flow-host').onclick=()=>{$('inspector').close();hostEditor(host.id);};openDialog('inspector');
}
