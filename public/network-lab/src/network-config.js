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
  {id:'tun',name:'TUN + sing-box 代理',base:'tun',focus:'看清“虚拟网卡透明代理”怎么把一段请求拆成 3 段独立的 TCP 连接：浏览器以为自己在直连网站，其实包被虚拟网卡 utun 拦下，由本机代理换乘加密隧道发给日本代理，再由日本代理去连真网站。',tryIt:'动手试试：点「编辑网络 → 我的电脑」，删掉 203.0.113.10/32 这条直连例外路由后重跑，看看代理自己发出的包为什么又掉回 TUN 里死循环。',expected:'SUCCESS'},
  {id:'system',name:'系统 HTTP 代理',base:'system',focus:'看清“系统代理”和 TUN 的区别：浏览器明知道有代理，主动连本机的 127.0.0.1:7890 并喊一句 HTTP CONNECT 告诉代理“帮我连 www.google.com:443”，根本不需要查本地 DNS 也不用虚拟网卡。',tryIt:'动手试试：打开右下角「请求与配置」，取消勾选「此应用遵从系统代理」后重跑，看看不听系统代理话的软件是怎么直接查 DNS 走物理网卡出去的。',expected:'SUCCESS'},
  {id:'direct',name:'无代理直连',base:'direct',focus:'最基础的上网全过程：先问 DNS 拿到网站 IP，再按路由表发给家庭网关；网关用 NAT 把你的内网 IP 换成公网 IP 发上互联网，回包时再按登记表换回你的内网 IP。',tryIt:'动手试试：单步走到「家庭网关」，看下方看板里发件人怎么从 192.168.1.10 变成 198.51.100.25，以及网站回信时网关怎么认出这是给你的包。',expected:'SUCCESS'},
  {id:'tail',name:'WireGuard + SSH',base:'tail',focus:'对比 VPN 和代理的最大不同：WireGuard VPN 不会拆开你的 TCP 连接重发，而是把你原来的整个 IP 包像“套娃”一样塞进外层 UDP 包里加密寄出，到了对端拆开外壳还是原来那个包。',tryIt:'动手试试：点上方「全部报文」找到带内层信封的包，看看外层 UDP 包里面怎么原封不动包着同一个内层 packet ID。',expected:'SUCCESS'},
  {id:'home-wifi',name:'家庭 Wi-Fi：浏览网页',base:'direct',focus:'还原你在家里连 Wi-Fi 打开网页的真实路径：家用电脑（内网 IP）→ 家用 Wi-Fi 路由器（做 NAT 地址转换）→ 运营商路由 → 目标网站。',tryIt:'动手试试：点「编辑网络 → 家用 Wi-Fi 路由器」，把「出口启用 NAT」关掉再重跑，体验一下如果路由器不帮你换公网地址会发生什么。',expected:'SUCCESS'},
  {id:'office-proxy',name:'公司网络：HTTP 代理上网',base:'system',focus:'还原公司内网上网：办公电脑不直接连外网，而是先连公司代理服务器，由公司代理审核规则后再代你访问外部网站。',tryIt:'动手试试：打开「请求与配置」，把代理规则里的动作从「代理」改成「拒绝 (reject)」重跑，看看公司代理是怎么拦截特定网站的。',expected:'SUCCESS'},
  {id:'home-nas',name:'家庭局域网：访问 NAS',base:'direct',focus:'访问家里的局域网设备（家中 NAS，192.168.1.50）：虽然查域名可能还会问外部 DNS，但真正传网页数据时只在家里路由器内网口之间转发，绝不跑去公网，也不会触发 NAT。',tryIt:'动手试试：点阶段栏跳到「应用层传输」，看下方看板确认 TCP 收发全程都是 192.168.1.10 ⇄ 192.168.1.50，没有经过公网 NAT。',expected:'SUCCESS'},
  {id:'remote-office',name:'异地办公：VPN 连接 SSH',base:'tail',focus:'异地办公连回公司内网电脑（100.64.0.2）：两台电脑靠虚拟组网 IP 直接 SSH 通信，底层全部靠公网 UDP 加密隧道搬运完整内层包。',tryIt:'动手试试：打开「请求与配置」，取消勾选「VPN 密钥有效」后重跑，看看密钥对不上时 WireGuard 握手在哪一步被对方直接拒之门外。',expected:'SUCCESS'},
  {id:'double-nat',name:'光猫 + 路由器：双重 NAT',base:'direct',focus:'家里光猫拨号、自己又接了一台路由器时常见的“双重 NAT”：包出去时被连换两次发件人地址，回包时必须像剥洋葱一样连查两张 NAT 表才能回到你的电脑。',tryIt:'动手试试：单步观察发包经过「家庭网关」和「光猫 / 上级 NAT」时源 IP 的两次变化，再点「连接与状态」查看两台设备各自的 NAT 登记表。',expected:'SUCCESS'},
  {id:'wifi-loss',name:'无线丢包：SYN 重传恢复',base:'direct',focus:'Wi-Fi 信号不好丢包了怎么办？第一个握手包（SYN）在半路丢了，电脑等不到回音，超时后用一模一样的 TCP 序号重新发一份 SYN，最终顺利连上。',tryIt:'动手试试：点「全部报文」对比第一个丢掉的 SYN 和后来重传的 SYN：虽然是两个不同的网络包（packet ID 不同），但 TCP 序号 seq 完全一样。',expected:'SUCCESS'},
  {id:'long-distance',name:'跨地域访问：高延迟链路',base:'direct',focus:'跨国访问网站为什么慢？每段网线单程延迟从 12 ms 涨到 60 ms 后，每一次来回握手（RTT）的时间都被成倍拉长。',tryIt:'动手试试：跑完后看总耗时毫秒数，跟「无代理直连」对比一下：同样的数据量，光是因为网线距离远、来回确认慢，总时间就翻了好几倍。',expected:'SUCCESS'},
  {id:'dns-outage',name:'域名打不开：DNS 停服',base:'direct',focus:'明明网线是通的，为什么网页就是打不开？因为负责把域名翻译成 IP 的 DNS 服务器停机了，电脑连网站住哪儿都查不到，根本发不出后面的网页连接。',tryIt:'动手试试：点「编辑网络 → DNS 解析器」，把 53 端口的 dns 服务勾上启用，保存后再点「重新发起」，网页立刻就能打开了。',expected:'DNS_TIMEOUT'},
  {id:'proxy-offline',name:'代理失效：服务端口关闭',base:'system',focus:'代理节点挂了是什么现象？网线能通到代理服务器，但上面的代理程序没开（端口没监听），对方内核直接回一个冷酷的 RST（重置拒绝包）。',tryIt:'动手试试：单步看日本代理收到 SYN 后立刻打回 RST,ACK；再去「编辑网络 → 日本代理」把 443 端口服务勾上启用，就能修好代理。',expected:'CONNECTION_REFUSED'},
  {id:'tun-loop',name:'TUN 故障：漏配例外路由',base:'tun',focus:'配置透明代理最经典的踩坑：所有流量都走虚拟网卡 TUN，结果代理程序自己发往远端代理服务器的包也被 TUN 抓了回来，自己抓自己陷入死循环。',tryIt:'动手试试：点「编辑网络 → 我的电脑」，新增一条路由：目的前缀填 203.0.113.10/32、接口填 en0、下一跳选「家庭网关」、metric 填 10，保存后重跑就能给代理留出物理出口。',expected:'TUN_LOOP'},
  {id:'routing-loop',name:'路由故障：两台路由器互指',base:'direct',focus:'两台路由器互相甩锅（家庭网关指给互联网路由，互联网路由又指回家庭网关）：网络包在它俩之间来回踢皮球，直到包头里的寿命（TTL）扣光归零，路由器发回一封 ICMP 超时退信。',tryIt:'动手试试：看下方看板里 TTL 一跳跳减到 0 并收到路由器退信；再去「编辑网络 → 互联网路由」，把 142.250.72.0/24 的下一跳改回「目标网站」即可修好。',expected:'TTL_EXCEEDED'},
  {id:'small-mtu',name:'能握手但打不开：路径 MTU 小',base:'direct',focus:'网络排查中最诡异的现象：能 ping 通、TCP 握手也能成功，但一发网页数据就卡死！因为中间某段网线限高（MTU 只有 300 字节），40 字节的小握手包能过，552 字节的大数据包被卡住并打回 ICMP 报错。',tryIt:'动手试试：先看网关打回的 ICMP 报错包，然后打开右下角「请求与配置」，把「TCP MSS」（单次最大数据段）从 512 调小到 128 后重跑，数据包变瘦后就能顺利通过了！',expected:'MTU_EXCEEDED'},
  {id:'remote-dns',name:'代理解析：域名交给远端',base:'tun',focus:'为什么要开启“远端 DNS 解析”？如果在本机直接查 www.google.com，本地网络就能看到你想去哪且可能返回假地址；改成远端解析后，本机先把域名塞进加密隧道，由日本代理在海外查出真 IP。',tryIt:'动手试试：看阶段栏，第一步不是查 DNS，而是先建好「本机 ↔ 代理」隧道，接着由「日本代理」发出 DNS 查询。',expected:'SUCCESS'},
  {id:'fake-ip',name:'透明代理：fake-IP 映射',base:'tun',focus:'代理软件常用的 Fake-IP 黑科技：浏览器查域名时，本机代理秒回一个假内网地址 198.18.0.1 哄着浏览器先发包，同时在代理内存里记下“198.18.0.1 就是 www.google.com”，等收到包再换回真域名发给远端代理。',tryIt:'动手试试：看下方连接看板，浏览器的第 1 段连接连的居然是假地址 198.18.0.1，到了第 2 段代理隧道里又变回了 www.google.com！',expected:'SUCCESS'}
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
