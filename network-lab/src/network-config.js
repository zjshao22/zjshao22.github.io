export const clone = value => structuredClone(value);
export const TYPES = {client:'电脑',router:'路由器',server:'服务器',proxy:'代理服务器',dns:'DNS 服务器',vpn:'VPN 对端'};
export const isIPv4 = value => typeof value==='string' && /^(\d{1,3}\.){3}\d{1,3}$/.test(value) && value.split('.').every(n=>+n<=255);
export const ipNumber = ip => ip.split('.').reduce((n,p)=>(n*256+Number(p))>>>0,0);
export function parseCIDR(value) {
  if(typeof value!=='string')return null;
  const [ip,bits,...rest]=value.split('/');
  if(!isIPv4(ip)||!/^\d{1,2}$/.test(bits)||+bits>32||rest.length)return null;
  const prefix=+bits,mask=prefix===0?0:(0xffffffff<<(32-prefix))>>>0;
  return {ip,prefix,network:(ipNumber(ip)&mask)>>>0,mask};
}
export function longestMatch(routes,ip) {
  const n=ipNumber(ip);
  return routes.filter(r=>r.enabled!==false && ((n&r.parsed.mask)>>>0)===r.parsed.network)
    .sort((a,b)=>b.parsed.prefix-a.parsed.prefix || a.metric-b.metric)[0]||null;
}
const route=(prefix,iface,via='',metric=100)=>({prefix,iface,via,metric,enabled:true});
const service=(kind,port,protocol='TCP')=>({kind,port,protocol,enabled:true});
const iface=(id,address)=>({id,address,enabled:true});
export const PRESETS = [
  {id:'tun',name:'TUN + sing-box 代理',base:'tun',focus:'观察原始连接、代理连接和目标连接的独立四元组。',tryIt:'动手验证：点「编辑网络 → 我的电脑」，删除 203.0.113.10/32 例外路由后重跑，观察代理出站如何再次进入 TUN 触发回环。',expected:'SUCCESS'},
  {id:'system',name:'系统 HTTP 代理',base:'system',focus:'观察本机 CONNECT 入口，以及远端如何获知域名。',tryIt:'动手验证：打开「请求与配置」，取消勾选「此应用遵从系统代理」后重跑，对比应用为何不再连 127.0.0.1:7890 而是直接查询 DNS。',expected:'SUCCESS'},
  {id:'direct',name:'无代理直连',base:'direct',focus:'观察 DNS、路由、家庭 NAT 和端到端 HTTPS。',tryIt:'动手验证：单步经过「家庭网关」，对比转换前后的源 IP（192.168.1.10 → 198.51.100.25）及回程时 NAT 会话表如何恢复内网地址。',expected:'SUCCESS'},
  {id:'tail',name:'WireGuard + SSH',base:'tail',focus:'比较 UDP 外层与被完整保留的内层 IP 包。',tryIt:'动手验证：点「全部报文」展开 WireGuard 外层包，对比它保留同一个内层 packet ID 的方式与普通 TCP 代理新建连接的差异。',expected:'SUCCESS'},
  {id:'home-wifi',name:'家庭 Wi-Fi：浏览网页',base:'direct',focus:'普通家用网络：电脑 → Wi-Fi 路由器 → 互联网 → 网站，查看 NAT 回程。',tryIt:'动手验证：点「编辑网络 → 家用 Wi-Fi 路由器」，若关闭「出口启用 NAT」或「允许转发」，观察外网回包或转发在何处中断。',expected:'SUCCESS'},
  {id:'office-proxy',name:'公司网络：HTTP 代理上网',base:'system',focus:'办公电脑遵从公司 HTTP 代理设置；浏览器通过 CONNECT 告知目标。',tryIt:'动手验证：打开「请求与配置」，在代理规则首行将 www.google.com 设为 reject 或 direct，观察分流规则如何改变连接路径。',expected:'SUCCESS'},
  {id:'home-nas',name:'家庭局域网：访问 NAS',base:'direct',focus:'访问同一家庭 LAN 的 NAS。网页 TCP 不应经过公网，也不应被 NAT。DNS 查询仍可能访问外部解析器。',tryIt:'动手验证：跳转到「目标连接」阶段，确认网页 TCP 只在家庭网关内网转发、未产生 TCP NAT 映射。',expected:'SUCCESS'},
  {id:'remote-office',name:'异地办公：VPN 连接 SSH',base:'tail',focus:'通过 WireGuard 访问异地设备的 Tailnet SSH 地址，检查完整内层包恢复。',tryIt:'动手验证：打开「请求与配置」，取消勾选「VPN 密钥有效」后重跑，观察握手阶段如何因身份校验失败而终止。',expected:'SUCCESS'},
  {id:'double-nat',name:'光猫 + 路由器：双重 NAT',base:'direct',focus:'经过两级地址端口转换，回程需要依次恢复两张 NAT 会话表。',tryIt:'动手验证：观察去程连续两次 NAT 改写源地址，并在「连接与状态」中核对两台网关各自的 NAT 会话表。',expected:'SUCCESS'},
  {id:'wifi-loss',name:'无线丢包：SYN 重传恢复',base:'direct',focus:'可重复地丢弃第一个 SYN；等待超时后，以相同序号重传并恢复。',tryIt:'动手验证：点「全部报文」对比首次丢弃的 SYN 与重传的 SYN：二者 packet ID 不同，但 TCP 序号（seq）与 segment ID 完全相同。',expected:'SUCCESS'},
  {id:'long-distance',name:'跨地域访问：高延迟链路',base:'direct',focus:'单向链路延迟提高到 60 ms；比较握手和整次请求的虚拟耗时。',tryIt:'动手验证：对比右上角步骤毫秒耗时与「无代理直连」（12 ms 链路）的差距，体会每次 RTT 往返对总耗时的放大。',expected:'SUCCESS'},
  {id:'dns-outage',name:'域名打不开：DNS 停服',base:'direct',focus:'DNS 解析器关闭监听。查询发出但没有回答，连接尚未进入网站 TCP 阶段。',tryIt:'动手验证：点「编辑网络 → DNS 解析器」，勾选启用 53 端口 dns 服务并保存，重新发起即可恢复正常解析。',expected:'DNS_TIMEOUT'},
  {id:'proxy-offline',name:'代理失效：服务端口关闭',base:'system',focus:'网络可达，远端代理端口未监听。观察 TCP RST 与拒绝连接。',tryIt:'动手验证：观察远端代理收到 SYN 后立即回传 TCP RST,ACK；再去「编辑网络 → 日本代理」开启 443 服务即可修复。',expected:'CONNECTION_REFUSED'},
  {id:'tun-loop',name:'TUN 故障：漏配例外路由',base:'tun',focus:'缺少代理地址的 /32 例外，代理自己的出站又进入 TUN。补回例外路由可修复。',tryIt:'动手验证：点「编辑网络 → 我的电脑」，新增路由 203.0.113.10/32 → 接口 en0 → 下一跳 家庭网关（metric 10），保存后重跑即可消除回环。',expected:'TUN_LOOP'},
  {id:'routing-loop',name:'路由故障：两台路由器互指',base:'direct',focus:'目标站路由错误地指回家庭网关，报文循环转发，最终 TTL 耗尽。',tryIt:'动手验证：观察 TTL 逐跳递减至 0 后路由器发回 ICMP Time Exceeded 差错包；将互联网路由的 142.250.72.0/24 下一跳改回「目标网站」即可修复。',expected:'TTL_EXCEEDED'},
  {id:'small-mtu',name:'能握手但打不开：路径 MTU 小',base:'direct',focus:'链路 MTU 为 300，较大的数据段被 DF/MTU 约束拒绝。降低 MSS 后重试；模型不自动执行 PMTUD。',tryIt:'动手验证：观察 40 字节握手能过、552 字节数据段触发网关发回 ICMP Fragmentation Needed；在「请求与配置」将 TCP MSS 调为 128 重跑即可通过。',expected:'MTU_EXCEEDED'},
  {id:'remote-dns',name:'代理解析：域名交给远端',base:'tun',focus:'先建立代理通道，DNS 在代理侧执行，再把解析结果交给应用。比较查询的来源位置。',tryIt:'动手验证：观察第 1 阶段先建立本机到日本代理的加密通道，DNS 查询从「日本代理」发出而非本机发出，避免本地 DNS 泄漏。',expected:'SUCCESS'},
  {id:'fake-ip',name:'透明代理：fake-IP 映射',base:'tun',focus:'应用先获得本地占位地址 198.18.0.1；代理仍按原域名在远端解析真实 IP。',tryIt:'动手验证：观察原始 TCP 连接目的 IP 为 198.18.0.1，本机代理反查 fake-IP 映射表还原出 www.google.com 后再由远端解析真实 IP。',expected:'SUCCESS'}
];
export function preset(name='tun') {
  const item=PRESETS.find(p=>p.id===name)||PRESETS[0];
  if(!['tun','system','direct','tail'].includes(name)) {
    const c=preset(item.base),host=id=>c.hosts.find(h=>h.id===id);
    c.name=item.name;c.presetId=item.id;c.lesson={focus:item.focus,tryIt:item.tryIt,expected:item.expected};
    if(name==='home-wifi'){host('gateway').name='家用 Wi-Fi 路由器';host('client').name='家用电脑';}
    if(name==='office-proxy'){host('client').name='办公电脑';host('gateway').name='公司网关';host('proxy').name='公司代理服务';}
    if(name==='remote-office'){host('client').name='异地办公电脑';host('peer').name='办公室 SSH 设备';}
    if(name==='home-nas') {
      host('server').name='家中 NAS';host('server').interfaces[0].address='192.168.1.50/24';host('server').routes=[route('0.0.0.0/0','eth0','gateway')];
      host('gateway').routes.unshift(route('192.168.1.50/32','lan','server',10));
      c.links=c.links.filter(l=>!((l.a==='isp'&&l.b==='server')||(l.b==='isp'&&l.a==='server')));
      c.links.push({id:'nas-link',a:'gateway',b:'server',latency:2,loss:0,mtu:1500,enabled:true});
      host('server').x=600;host('server').y=650;host('dns').x=1100;host('dns').y=600;c.request.destination='nas.home';c.dns.records['nas.home']='192.168.1.50';
    }
    if(name==='double-nat'){host('isp').name='光猫 / 上级 NAT';host('isp').nat=true;}
    if(name==='wifi-loss')c.faults.dropFirst=true;
    if(name==='long-distance')c.links.forEach(l=>l.latency=60);
    if(name==='dns-outage')host('dns').services[0].enabled=false;
    if(name==='proxy-offline')host('proxy').services[0].enabled=false;
    if(name==='tun-loop')host('client').routes=host('client').routes.filter(r=>r.prefix!=='203.0.113.10/32');
    if(name==='routing-loop'){c.request.destination='142.250.72.14';host('isp').routes.find(r=>r.prefix==='142.250.72.0/24').via='gateway';}
    if(name==='small-mtu'){c.request.destination='142.250.72.14';c.links.find(l=>l.a==='gateway'&&l.b==='isp').mtu=300;}
    if(name==='remote-dns')c.dns.mode='remote';
    if(name==='fake-ip')c.dns.mode='fake';
    const used=new Set(['client','gateway','isp']);
    if(item.base==='tail')used.add('peer');
    else {used.add('server');used.add('dns');if(item.base!=='direct')used.add('proxy');}
    c.hosts=c.hosts.filter(h=>used.has(h.id));c.links=c.links.filter(l=>used.has(l.a)&&used.has(l.b));
    for(const h of c.hosts)h.routes=h.routes.filter(r=>!r.via||used.has(r.via));
    if(item.base==='direct')host('client').interfaces=host('client').interfaces.filter(f=>f.id!=='utun');
    return c;
  }
  const hosts=[
    {id:'client',name:'我的电脑',type:'client',x:180,y:320,forwarding:false,nat:false,natInterface:'en0',interfaces:[iface('en0','192.168.1.10/24'),iface('utun','100.64.0.1/10')],routes:[route('203.0.113.10/32','en0','gateway',10),route('192.168.1.0/24','en0','gateway'),route('0.0.0.0/0','en0','gateway',200)],services:[service('http-proxy',7890)]},
    {id:'gateway',name:'家庭网关',type:'router',x:600,y:320,forwarding:true,nat:true,natInterface:'wan',interfaces:[iface('lan','192.168.1.1/24'),iface('wan','198.51.100.25/24')],routes:[route('192.168.1.0/24','lan','client'),route('0.0.0.0/0','wan','isp')],services:[]},
    {id:'isp',name:'互联网路由',type:'router',x:960,y:320,forwarding:true,nat:false,natInterface:'eth0',interfaces:[iface('eth0','198.51.100.1/24')],routes:[route('198.51.100.25/32','eth0','gateway'),route('203.0.113.10/32','eth0','proxy'),route('203.0.113.20/32','eth0','peer'),route('142.250.72.0/24','eth0','server'),route('192.0.2.53/32','eth0','dns')],services:[]},
    {id:'proxy',name:'日本代理',type:'proxy',x:1240,y:90,forwarding:false,nat:false,natInterface:'eth0',interfaces:[iface('eth0','203.0.113.10/24')],routes:[route('0.0.0.0/0','eth0','isp')],services:[service('proxy',443)]},
    {id:'server',name:'目标网站',type:'server',x:1500,y:320,forwarding:false,nat:false,natInterface:'eth0',interfaces:[iface('eth0','142.250.72.14/24')],routes:[route('0.0.0.0/0','eth0','isp')],services:[service('https',443),service('http',80),service('echo',5000,'UDP')]},
    {id:'dns',name:'DNS 解析器',type:'dns',x:800,y:570,forwarding:false,nat:false,natInterface:'eth0',interfaces:[iface('eth0','192.0.2.53/24')],routes:[route('0.0.0.0/0','eth0','isp')],services:[service('dns',53,'UDP')]},
    {id:'peer',name:'Tailnet 对端',type:'vpn',x:1320,y:570,forwarding:false,nat:false,natInterface:'eth0',interfaces:[iface('eth0','203.0.113.20/24'),iface('utun','100.64.0.2/10')],routes:[route('100.64.0.0/10','utun'),route('0.0.0.0/0','eth0','isp')],services:[service('wireguard',41641,'UDP'),service('ssh',22)]}
  ];
  const links=[['client','gateway'],['gateway','isp'],['isp','proxy'],['isp','server'],['isp','dns'],['isp','peer']].map(([a,b],i)=>({id:'link'+(i+1),a,b,latency:12,loss:0,mtu:1500,enabled:true}));
  const config={version:1,name:{tun:'TUN + TCP 代理',system:'系统 HTTP 代理',direct:'无代理直连',tail:'WireGuard + SSH'}[name]||'自由实验',hosts,links,
    request:{source:'client',destination:name==='tail'?'100.64.0.2':'www.google.com',kind:name==='tail'?'ssh':'https',port:name==='tail'?22:443,bytes:1024,responseBytes:1536,usesSystemProxy:true},
    dns:{host:'dns',mode:'local',ttl:60,records:{'www.google.com':'142.250.72.14','tailnet.example':'100.64.0.2'}},
    proxy:{tun:name==='tun',system:name==='system',host:'proxy',port:443,localPort:7890,transportTls:true,clientAuth:'lab-key',serverAuth:'lab-key',rules:[{pattern:'*',action:'proxy'}]},
    vpn:{enabled:name==='tail',peer:'peer',port:41641,keyValid:true},
    transport:{ttl:16,mss:512,window:2048,rto:500,retries:3,seed:7},
    faults:{dns:false,proxyAuth:false,certificate:false,targetBlocked:false,dropFirst:false}
  };
  if(name==='tun')hosts[0].routes.unshift(route('192.0.2.53/32','en0','gateway',10),route('0.0.0.0/1','utun'),route('128.0.0.0/1','utun'));
  if(name==='tail')hosts[0].routes.unshift(route('100.64.0.0/10','utun'));
  config.presetId=name;config.lesson={focus:item.focus,tryIt:item.tryIt,expected:item.expected};
  return config;
}

// Validate once where edited/imported configuration enters the engine.
export function validateConfig(input) {
  const errors=[];
  if(!input||typeof input!=='object'||Array.isArray(input))return ['实验文件必须是配置对象'];
  const c=input,number=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
  const integer=(v,min,max)=>Number.isInteger(v)&&number(v,min,max);
  if(c.version!==1)errors.push('不支持的实验文件版本');
  if(!Array.isArray(c.hosts)||c.hosts.length<2||c.hosts.length>30)return ['设备数量应为 2–30'];
  if(!Array.isArray(c.links)||c.links.length>80)return ['链路数量应为 0–80'];
  const ids=new Set(),addresses=new Set();
  for(const h of c.hosts) {
    if(!h||typeof h!=='object'){errors.push('设备格式无效');continue;}
    if(typeof h.id!=='string'||!/^[a-zA-Z][\w-]{0,31}$/.test(h.id)||ids.has(h.id))errors.push('设备标识无效或重复');
    ids.add(h.id);
    if(!TYPES[h.type]||typeof h.name!=='string'||h.name.length<1||h.name.length>40)errors.push('设备类型或名称无效');
    if(!number(h.x,0,4000)||!number(h.y,0,2500))errors.push(`${h.name}: 设备坐标超出范围`);
    if(typeof h.forwarding!=='boolean'||typeof h.nat!=='boolean')errors.push(`${h.name}: 转发与 NAT 必须为开关`);
    if(!Array.isArray(h.interfaces)||!h.interfaces.length||h.interfaces.length>8||!Array.isArray(h.routes)||h.routes.length>64||!Array.isArray(h.services)||h.services.length>16){errors.push(`${h.name}: 接口、路由或服务数量无效`);continue;}
    const interfaces=new Set();
    for(const f of h.interfaces) {
      const parsed=f&&parseCIDR(f.address);
      if(!f||typeof f.id!=='string'||!/^[\w-]{1,20}$/.test(f.id)||interfaces.has(f.id)||!parsed||typeof f.enabled!=='boolean'){errors.push(`${h.name}: 接口名称、地址或开关无效`);continue;}
      interfaces.add(f.id);
      if(addresses.has(parsed.ip))errors.push(`IP 地址重复：${parsed.ip}`);
      addresses.add(parsed.ip);
    }
    if(h.nat&&!interfaces.has(h.natInterface))errors.push(`${h.name}: NAT 出口接口不存在`);
    for(const r of h.routes)if(!r||!parseCIDR(r.prefix)||!interfaces.has(r.iface)||typeof r.via!=='string'||!integer(r.metric,0,9999)||typeof r.enabled!=='boolean')errors.push(`${h.name}: 路由前缀、接口、下一跳或优先级无效`);
    for(const s of h.services)if(!s||!['TCP','UDP'].includes(s.protocol)||!integer(s.port,1,65535)||typeof s.kind!=='string'||s.kind.length>30||typeof s.enabled!=='boolean')errors.push(`${h.name}: 服务监听配置无效`);
  }
  const linkIds=new Set();
  for(const l of c.links) {
    if(!l||typeof l.id!=='string'||linkIds.has(l.id)||!ids.has(l.a)||!ids.has(l.b)||l.a===l.b||!number(l.latency,1,2000)||!number(l.loss,0,100)||!integer(l.mtu,68,9000)||typeof l.enabled!=='boolean')errors.push('链路的端点、时延、丢包率或 MTU 无效');
    if(l)linkIds.add(l.id);
  }
  for(const h of c.hosts)for(const r of Array.isArray(h?.routes)?h.routes:[])if(r?.via&&!ids.has(r.via))errors.push(`${h.name}: 路由下一跳不存在`);
  const q=c.request,d=c.dns,p=c.proxy,v=c.vpn,t=c.transport;
  if(!q||!ids.has(q.source)||typeof q.destination!=='string'||!q.destination.length||q.destination.length>253||!['https','http','ssh','ping','udp'].includes(q.kind)||!integer(q.port,1,65535)||!integer(q.bytes,1,8192)||!integer(q.responseBytes,1,8192)||typeof q.usesSystemProxy!=='boolean')errors.push('请求的来源、目标、协议、端口或数据量无效');
  if(!d||typeof d.host!=='string'||(!isIPv4(q?.destination)&&!ids.has(d.host))||!['local','remote','fake'].includes(d.mode)||!integer(d.ttl,0,86400)||!d.records||typeof d.records!=='object'||Array.isArray(d.records)||Object.keys(d.records).length>100||Object.entries(d.records).some(([k,v])=>!k.length||k.length>253||!isIPv4(v)))errors.push('DNS 配置无效');
  if(!p||typeof p.host!=='string'||((p.tun||p.system)&&!ids.has(p.host))||typeof p.tun!=='boolean'||typeof p.system!=='boolean'||typeof p.transportTls!=='boolean'||!integer(p.port,1,65535)||!integer(p.localPort,1,65535)||typeof p.clientAuth!=='string'||typeof p.serverAuth!=='string'||p.clientAuth.length>128||p.serverAuth.length>128||!Array.isArray(p.rules)||!p.rules.length||p.rules.length>30||p.rules.some(r=>!r||typeof r.pattern!=='string'||!r.pattern.length||r.pattern.length>253||!['proxy','direct','reject'].includes(r.action)))errors.push('代理与规则配置无效');
  if(!v||typeof v.peer!=='string'||(v.enabled&&!ids.has(v.peer))||typeof v.enabled!=='boolean'||typeof v.keyValid!=='boolean'||!integer(v.port,1,65535))errors.push('VPN 配置无效');
  if(!t||!integer(t.ttl,1,64)||!integer(t.mss,64,1400)||!integer(t.window,64,16384)||!integer(t.rto,100,10000)||!integer(t.retries,0,5)||!integer(t.seed,1,2147483647))errors.push('传输参数无效');
  if(!c.faults||['dns','proxyAuth','certificate','targetBlocked','dropFirst'].some(k=>typeof c.faults[k]!=='boolean'))errors.push('故障开关无效');
  return [...new Set(errors)];
}
export function newHost(type,index) {
  return {id:'host'+index,name:TYPES[type]+' '+index,type,x:300+index%4*230,y:90+index%3*180,forwarding:type==='router',nat:false,natInterface:'eth0',interfaces:[iface('eth0',`10.0.${index%250}.1/24`)],routes:[],services:type==='server'?[service('https',443),service('http',80)]:type==='dns'?[service('dns',53,'UDP')]:type==='proxy'?[service('proxy',443)]:type==='vpn'?[service('wireguard',41641,'UDP'),service('ssh',22)]:[]};
}
