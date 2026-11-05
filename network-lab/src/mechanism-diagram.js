import {routeLink,roundedPath} from './network-diagram.js';

// This is a presentation of the computed model. Physical edges come only from config.links.
export function mechanismScene(config){
  const source=config.hosts.find(h=>h.id===config.request.source),hasTun=config.proxy.tun||config.vpn.enabled||source.routes.some(r=>r.enabled&&r.iface==='utun'),hasAgent=hasTun||config.proxy.system;
  const sourceWidth=hasAgent?550:310,networkX=sourceWidth+50;
  const transit=config.hosts.filter(h=>h.id!==source.id&&(h.forwarding||h.type==='router'));
  const services=config.hosts.filter(h=>h.id!==source.id&&!transit.includes(h));
  const targetIP=config.dns.records[config.request.destination]||config.request.destination;
  const target=config.hosts.find(h=>h.interfaces.some(f=>f.address.split('/')[0]===targetIP));
  const priority=[config.proxy.host,config.dns.host,config.vpn.peer,target?.id];
  services.sort((a,b)=>{const ia=priority.indexOf(a.id),ib=priority.indexOf(b.id);return (ia<0?99:ia)-(ib<0?99:ib);});
  const remoteX=networkX+270,remoteWidth=services.length>1?520:280;
  const height=Math.max(550,180+(Math.max(transit.length,Math.ceil(services.length/2))-1)*230+135);
  const nodes=[],edges=[],hosts=new Map(),groups=[
    {x:20,y:45,w:sourceWidth,h:height-70,title:source.name,subtitle:'用户态进程 · 内核协议栈 · 网络接口',source:true},
    {x:networkX,y:45,w:240,h:height-70,title:'实体网络',subtitle:'网关 · 路由 · NAT'},
    {x:remoteX,y:45,w:remoteWidth,h:height-70,title:'服务端与远端设备',subtitle:config.vpn.enabled?'VPN 对端 · 目标服务':'代理服务 · DNS · 目标服务'}
  ];
  const appX=hasAgent?150:175,agentX=sourceWidth-100;
  const add=(id,label,sub,host,unit,x,y,icon,tone='')=>{const node={id,label,sub,host,unit,x,y,w:210,h:92,icon,tone};nodes.push(node);return node;};
  add('app',config.request.kind==='ssh'?'SSH 客户端':['http','https'].includes(config.request.kind)?'浏览器 / 应用':'发起应用',config.request.kind.toUpperCase()+' · Socket API',source.id,'app',appX,185,'app');
  add('kernel','本机网络栈','Socket · TCP / IP',source.id,'kernel',appX,415,'os');hosts.set(source.id,'kernel');
  if(hasTun)add('tun','TUN 接口',source.interfaces.some(f=>f.id==='utun')?'虚拟接口 · utun':'路由指向 TUN',source.id,'tun',agentX,415,'tun');
  if(hasAgent)add('agent',config.vpn.enabled?'VPN 程序':'本机代理程序',config.vpn.enabled?'WireGuard · 用户态':'用户态网络栈 / 字节流',source.id,'agent',agentX,185,'sb','proxy');
  for(const [i,h] of transit.entries()){
    add('host:'+h.id,h.name,(h.nat?'NAT · ':'')+(h.interfaces.find(f=>f.enabled)?.address.split('/')[0]||''),h.id,'kernel',networkX+120,185+i*230,'net');hosts.set(h.id,'host:'+h.id);
  }
  for(const [i,h] of services.entries()){
    const activeProxy=h.id===config.proxy.host&&(config.proxy.tun||config.proxy.system);
    const role=activeProxy?'代理进程 · ':h.id===config.vpn.peer&&config.vpn.enabled?'WireGuard / SSH · ':h.type==='dns'?'DNS · ':h.id===target?.id?config.request.kind.toUpperCase()+' · ':'';
    const node=add('host:'+h.id,h.name,role+(h.interfaces.find(f=>f.enabled&&f.id!=='utun')||h.interfaces[0]).address.split('/')[0],h.id,h.type==='proxy'||h.type==='vpn'?'agent':'app',remoteX+130+(i%2)*260,185+Math.floor(i/2)*230,h.type==='dns'?'dns':h.type==='proxy'||h.type==='vpn'?'proxy':'google',activeProxy?'proxy':h.id===target?.id?'target':'');
    hosts.set(h.id,node.id);
  }
  const byId=new Map(nodes.map(n=>[n.id,n]));
  const edge=(id,from,to,points,label='',lx=0,ly=0,link=null)=>edges.push({id,from,to,points,d:roundedPath(points),label,lx,ly,link});
  edge('app-kernel','app','kernel',[[appX,231],[appX,369]],'Socket API',appX-55,300);
  if(hasTun){
    edge('kernel-tun','kernel','tun',[[appX+105,415],[agentX-105,415]],'路由 → TUN',(appX+agentX)/2,459);
    edge('tun-agent','tun','agent',[[agentX,369],[agentX,231]],'读取 / 回注 IP',agentX+65,305);
  }
  if(hasAgent)edge('agent-kernel','agent','kernel',[[agentX,231],[agentX,278],[appX,278],[appX,369]],'进程 ↔ 内核 Socket',(appX+agentX)/2,265);
  const rectangles=nodes.map(n=>({id:n.id,cx:n.x,cy:n.y,left:n.x-n.w/2,right:n.x+n.w/2,top:n.y-n.h/2,bottom:n.y+n.h/2,local:n.id==='kernel'}));
  for(const l of config.links){
    const from=hosts.get(l.a),to=hosts.get(l.b);if(!from||!to||from===to)continue;
    const points=routeLink(rectangles.find(n=>n.id===from),rectangles.find(n=>n.id===to),rectangles);
    edge('wire:'+l.id,from,to,points,'',0,0,l.id);
  }
  return {nodes,edges,byId,hosts,groups,source:source.id,hasAgent,hasTun,width:remoteX+remoteWidth+20,height};
}

export function mechanismEvent(scene,config,event,snapshot){
  if(!event)return {active:[],parts:[],color:'#83e6cf'};
  const e=event,p=e.packet,connection=snapshot?.connections.find(c=>c.id===e.connection),parts=[],active=[];
  const add=(a,b)=>{
    const edge=scene.edges.find(x=>x.from===a&&x.to===b||x.from===b&&x.to===a);
    if(edge){parts.push({id:edge.id,d:roundedPath(edge.from===a?edge.points:[...edge.points].reverse())});active.push(a,b);}
  };
  const pulse=id=>{if(scene.byId.has(id))active.push(id);};
  const local=e.host===scene.source;
  const hasAgent=scene.hasAgent;
  if(local&&e.type==='failure'&&['TUN_LOOP','TUN_UNAVAILABLE'].includes(e.code)){
    add('kernel','tun');add('tun','agent');
  }else if(e.link&&e.from&&e.to){
    // The event's direction is authoritative; the configuration stores undirected cables.
    const edge=scene.edges.find(x=>x.link===e.link);
    if(edge){const a=scene.hosts.get(e.from),b=scene.hosts.get(e.to);parts.push({id:edge.id,d:roundedPath(edge.from===a?edge.points:[...edge.points].reverse())});active.push(a,b);}
  }else if(local&&e.type==='tun.read'){
    add('kernel','tun');add('tun','agent');
  }else if(local&&e.type==='tun.inject'){
    add('agent','tun');add('tun','kernel');
  }else if(local&&e.type==='ip.send'){
    const proxyReply=hasAgent&&connection?.role==='original'&&connection.b.host===scene.source&&p.src===connection.b.ip&&p.sport===connection.b.port;
    if(p.meta.inject)pulse('agent');
    else add(hasAgent&&(proxyReply||['proxy','target'].includes(connection?.role)||p.meta.kind==='wireguard')?'agent':'app','kernel');
  }else if(local&&e.type==='tcp.data'){
    const proxyReceives=hasAgent&&connection?.role==='original'&&connection.b.host===scene.source&&p.src===connection.a.ip&&p.sport===connection.a.port;
    if(proxyReceives&&config.proxy.tun){add('kernel','tun');add('tun','agent');}
    else add('kernel',proxyReceives||hasAgent&&['proxy','target'].includes(connection?.role)?'agent':'app');
  }else if(local&&e.type==='stream.relay'){
    const direction=snapshot.streams.find(stream=>stream.id===e.streamId).direction;
    if(connection.role==='original'&&direction==='a')add('app','kernel');
    else if(connection.role==='original'&&scene.hasTun&&hasAgent){add('agent','tun');add('tun','kernel');}
    else add(direction==='a'?'agent':'kernel',direction==='a'?'kernel':hasAgent?'agent':'app');
  }else if(local&&e.type==='application.response'){
    add('kernel','app');
  }else if(local&&e.type==='socket.create'){
    add(e.unit==='agent'?'agent':'app','kernel');
  }else if(local&&e.tls){
    pulse(e.tls.role==='proxy'?'agent':'app');
  }else if(local){
    const unit=e.unit||(/^proxy\.|^vpn\.|^tls\./.test(e.type)?'agent':/^tcp\.|^ip\.|^route\.|^nat\./.test(e.type)?'kernel':'app');pulse(unit);
  }else pulse(scene.hosts.get(e.host));
  if(!active.length&&e.host)pulse(scene.hosts.get(e.host));
  return {active:[...new Set(active)],parts,color:e.type==='link.drop'||e.type==='failure'||e.type==='icmp.error'||e.type==='icmp.receive'||p?.meta?.kind==='icmp-error'?'#f4a98e':connection?.role==='proxy'||e.tls?.role==='proxy'||p?.meta?.kind==='wireguard'||e.type.startsWith('vpn.')?'#eec98a':connection?.role==='target'?'#96bff7':'#83e6cf'};
}
