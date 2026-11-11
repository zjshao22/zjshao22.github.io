import {clone,isIPv4,parseCIDR,longestMatch,validateConfig,BROADCAST_MAC,ETHERTYPE,LINK_LAYER_DEFAULTS,interfaceMac,isEthernet,sameNetwork} from './network-config.js';
import {encodePacket} from './capture.js';

export function simulate(input) {
  const errors=validateConfig(input);
  if(errors.length)throw new Error(errors.join('；'));
  return new NetworkEngine(input).run();
}

class NetworkEngine {
  constructor(input) {
    this.config=clone(input);this.hosts=Object.fromEntries(this.config.hosts.map(h=>[h.id,h]));
    for(const h of this.config.hosts)for(const r of h.routes)r.parsed=parseCIDR(r.prefix);
    this.clock=0;this.queue=[];this.order=0;this.counter={};this.events=[];this.runtime={};this.randomState=input.transport.seed;
    this.l2={...LINK_LAYER_DEFAULTS,...(input.linkLayer||{})};
    if(!Array.isArray(this.l2.silentHosts))this.l2.silentHosts=[];
    this.runtime.arpWaiters=new Map();this.runtime.arpFlights=new Map();
    this.seedArp=[];
    if(this.l2.enabled&&Array.isArray(this.l2.seedCache))for(const e of this.l2.seedCache)
      if(e&&typeof e.host==='string'&&typeof e.iface==='string'&&isIPv4(e.ip)&&typeof e.mac==='string')
        this.seedArp.push({id:this.id('arp'),host:e.host,iface:e.iface,ip:e.ip,mac:e.mac,owner:e.owner||'',ownerIface:e.ownerIface||'',learnedAt:0,expires:this.l2.arpTtl,source:'上次运行保留'});
    this.state={time:0,status:'ready',result:null,hosts:clone(input.hosts),interfaces:input.hosts.flatMap(h=>h.interfaces.map(f=>({...f,host:h.id}))),routes:input.hosts.flatMap(h=>h.routes.map(r=>({...r,host:h.id}))),sockets:[],connections:[],packets:{},dnsRecords:[],nat:[],tls:[],tunnels:[],streams:[],arp:clone(this.seedArp),arpPending:[],arpInFlight:[],metrics:{sent:0,delivered:0,dropped:0,retransmissions:0,bytes:0}};
    this.initial=clone(this.state);this.source=input.request.source;this.proxy=input.proxy.host;this.dnsHost=input.dns.host;this.done=false;
  }
  id(kind){this.counter[kind]=(this.counter[kind]||0)+1;return kind+'-'+this.counter[kind];}
  schedule(delay,fn){this.queue.push({at:this.clock+delay,order:this.order++,fn});}
  emit(type,title,detail={},changes=()=>{}) {
    changes();this.state.time=this.clock;
    const event={id:this.id('event'),time:this.clock,type,title,...detail};
    if(event.packet)this.state.packets[event.packet.id]=clone(event.packet);
    // Packet versions are replaced, never mutated; snapshots can share their unchanged values.
    const {packets,...rest}=this.state;
    this.events.push({...event,snapshot:{...clone(rest),packets:{...packets}}});
  }
  fail(code,message,detail={}) {
    if(this.done)return;
    this.done=true;this.state.status='failed';this.state.result={ok:false,code,message};
    this.emit('failure',message,{code,why:message,...detail});
  }
  random(){let x=this.randomState;x^=x<<13;x^=x>>>17;x^=x<<5;this.randomState=x>>>0;return this.randomState/4294967296;}
  ip(host,interfaceId){const h=this.hosts[host];return parseCIDR((interfaceId?h.interfaces.find(f=>f.id===interfaceId):h.interfaces.find(f=>f.enabled&&f.id!=='utun')||h.interfaces[0]).address).ip;}
  hasIP(host,ip){return ip.startsWith('127.')||this.hosts[host].interfaces.some(f=>f.enabled&&parseCIDR(f.address).ip===ip);}
  listener(host,port,protocol){return this.hosts[host].services.find(s=>s.enabled&&s.port===port&&s.protocol===protocol);}
  route(host,ip){return longestMatch(this.hosts[host].routes,ip);}
  packet(from,to,protocol,fields={},meta={}) {
    return {id:this.id('packet'),version:4,ihl:20,ttl:this.config.transport.ttl,protocol,src:from.ip,dst:to.ip,sport:from.port||0,dport:to.port||0,seq:0,ack:0,flags:'',window:this.config.transport.window,length:protocol==='TCP'?40:protocol==='UDP'?28:28,payloadLength:0,df:true,...fields,meta:clone(meta),path:[],created:this.clock};
  }
  packetLayers(p) {
    const encoded=new DataView(encodePacket(p).buffer),hex=n=>'0x'+n.toString(16).padStart(4,'0');
    const layers=[];
    if(p.linkFrame)layers.push({type:'ethernet',name:'以太网帧首部',fields:{源MAC:p.linkFrame.srcMac,目的MAC:p.linkFrame.dstMac,源接口:p.linkFrame.srcIface||'—',目的接口:p.linkFrame.dstIface||'—',EtherType:p.linkFrame.etherType||ETHERTYPE.IPv4,载荷类型:p.linkFrame.etherType===ETHERTYPE.ARP?'ARP 报文':'IPv4 数据报',说明:this.l2.enabled?'MAC 由「设备＋接口」稳定生成；目的 MAC 来自 ARP 对下一跳 IP 的解析；每经过一跳都重新封装；FCS、交换机学习与冲突域未模拟。':'按点对点链路端点生成示例 MAC；未启用 ARP，FCS 未模拟'}});
    layers.push({type:'ip',name:'IPv4 首部',fields:{版本:4,首部长度:p.ihl,DSCP:0,ECN:0,总长度:p.length,标识:encoded.getUint16(4),DF:p.df?'1':'0',MF:0,片偏移:0,TTL:p.ttl,协议:p.protocol,首部校验和:hex(encoded.getUint16(10)),源地址:p.src,目的地址:p.dst,选项:'无'}});
    if(p.protocol==='TCP')layers.push({type:'tcp',name:'TCP 首部',fields:{源端口:p.sport,目的端口:p.dport,标志:p.flags,序号:p.seq,确认号:p.ack,首部长度:20,接收窗口:p.window,校验和:hex(encoded.getUint16(36)),紧急指针:0,选项:'无；不协商窗口扩大或 SACK',载荷字节:p.payloadLength}});
    if(p.protocol==='UDP')layers.push({type:'udp',name:'UDP 首部',fields:{源端口:p.sport,目的端口:p.dport,长度:p.payloadLength+8,校验和:hex(encoded.getUint16(26))}});
    if(p.protocol==='ICMP')layers.push({type:'icmp',name:'ICMP',fields:{类型:p.icmpType??8,代码:p.icmpCode??0,标识符:p.icmpId??0,序号:p.icmpSeq??1,校验和:hex(encoded.getUint16(22)),...(p.innerError?{内嵌触发原包:`${p.innerError.id} (${p.innerError.src}:${p.innerError.sport} → ${p.innerError.dst}:${p.innerError.dport} / ${p.innerError.protocol})`}:{})}});
    if(p.meta.outerTls)layers.push({type:'tls',name:'代理 TLS（逻辑）',fields:{会话:p.meta.outerTls,明文访问者:'本机代理与远端代理',链路观察者:'不可读取内部目标与载荷'}});
    if(p.meta.kind==='wireguard')layers.push({type:'wireguard',name:'WireGuard 加密载荷（逻辑）',fields:{内层包:p.inner?.id||'握手',加密范围:'完整内层 IP 数据报',真实密码运算:'未执行'}});
    else if(p.meta.kind&&p.payloadLength)layers.push({type:p.meta.kind,name:p.meta.label||p.meta.kind,fields:{流标识:p.meta.streamId||'—',目标:p.meta.target||'—',内容:p.meta.encrypted?'密文结构示意':p.meta.text||'应用字节',说明:p.meta.note||'逻辑载荷，非真实协议密文'}});
    return layers;
  }
  emitPacket(type,title,p,detail={}) {
    p.layers=this.packetLayers(p);
    this.emit(type,title,{packet:clone(p),host:detail.host,connection:p.connection||null,streamId:p.meta.streamId||null,...detail});
  }
  sendIP(packet,origin,receive) {
    const p=clone(packet);this.state.metrics.sent++;
    const pktDesc=p.protocol==='TCP'?(p.flags==='SYN'?'发出 TCP 第 1 次握手 (SYN)':p.flags==='SYN,ACK'?'回复 TCP 第 2 次握手 (SYN,ACK)':p.flags==='ACK'&&!p.payloadLength?'发送 TCP 确认包 (ACK)':p.flags.includes('FIN')?`发出断开连接请求 (${p.flags})`:p.flags.includes('RST')?`发出拒绝连接重置包 (${p.flags})`:`发送 ${p.meta.label||'TCP 数据段'} (${p.payloadLength} 字节)`):p.protocol==='UDP'?`发送 ${p.meta.label||'UDP 数据报'}`:`发送 ${p.meta.label||'ICMP 报文'}`;
    this.emitPacket('ip.send',`${this.hosts[origin].name} ${pktDesc}`,p,{host:origin,unit:'kernel',why:`发包方为当前连接填好独立的 IP 首部（${p.src} → ${p.dst}）和 ${p.protocol} 首部，准备查路由发出。`});
    if(p.meta.inject) {
      delete p.meta.inject;this.emitPacket('tun.inject','本机代理把响应包写回虚拟网卡 TUN',p,{host:origin,unit:'tun',why:'本机代理程序在用户态构造好原始连接的回包首部，从虚拟网卡 utun 塞回内核，让浏览器以为是目标网站直接回的包。'});
      this.schedule(1,()=>this.deliver(p,origin,receive));
    } else this.forward(p,origin,receive,false);
  }
  deliver(p,host,receive) {
    this.state.metrics.delivered++;
    this.emitPacket('ip.deliver',`${this.hosts[host].name} 收下发给自己的报文`,p,{host,unit:'kernel',why:`报文的收件地址（${p.dst}）正是这台设备自己的 IP，内核拆开网络层首部，把里面的数据交给对应端口的程序。`});
    receive(clone(p),host);
  }
  forward(p,host,receive,transit) {
    if(this.done)return;
    const h=this.hosts[host];
    // Restore NAPT before local-address delivery at the public gateway.
    const mapping=p.innerError
      ?this.state.nat.find(n=>n.host===host&&n.protocol===p.innerError.protocol&&n.publicIP===p.dst&&n.publicPort===(p.innerError.protocol==='ICMP'?p.innerError.icmpId:p.innerError.sport)&&n.remoteIP===p.innerError.dst&&(p.innerError.protocol==='ICMP'||n.remotePort===p.innerError.dport))
      :this.state.nat.find(n=>n.host===host&&n.protocol===p.protocol&&n.publicIP===p.dst&&n.publicPort===(p.protocol==='ICMP'?p.icmpId:p.dport)&&n.remoteIP===p.src&&(p.protocol==='ICMP'||n.remotePort===p.sport));
    if(mapping) {
      const before=clone(p);p.dst=mapping.privateIP;
      if(p.innerError){p.innerError.src=mapping.privateIP;if(p.innerError.protocol==='ICMP')p.innerError.icmpId=mapping.privatePort;else p.innerError.sport=mapping.privatePort;}
      else if(p.protocol==='ICMP')p.icmpId=mapping.privatePort;else p.dport=mapping.privatePort;
      this.emitPacket('nat.restore',p.innerError?`${h.name} 查 NAT 表还原报错包的收件人`:`${h.name} 查 NAT 登记表，把收件人换回内网电脑`,p,{host,before,why:p.innerError?`外网路由器发来的 ICMP 报错包里夹带着刚才出错的原包首部；网关据此在 NAT 表里查出这是内网 ${mapping.privateIP} 发的包（RFC 5508），把收件地址改回内网电脑。`:`外网回信只写了网关的公网地址 ${before.dst}:${before.dport}；网关查刚才出去时记下的 NAT 登记表，把收件人还原成内网 ${p.dst}:${p.dport}。`});
    }
    if(this.hasIP(host,p.dst)) {
      if(p.inner)return this.unwrap(p,host,receive);
      return this.deliver(p,host,receive);
    }
    if(transit&&!h.forwarding) {
      this.emitPacket('ip.drop','中间设备没有开启 IP 转发，直接丢包',p,{host,why:'这台设备不是报文的收件人，又没打开路由器转发开关（IP Forwarding），所以只能丢弃。'});this.state.metrics.dropped++;return;
    }
    if(transit) {
      const before=clone(p);p.ttl--;
      this.emitPacket('ip.ttl',`${h.name} 将报文寿命 TTL 减 1（剩余 ${p.ttl}）`,p,{host,before,why:'每经过一台路由器转发，IP 包头的 TTL（存活跳数）就减 1，防止路由配错时报文在网上一辈子打转。'});
      if(p.ttl<=0){this.icmpError(p,host,11,0,'TTL_EXCEEDED','TTL 耗尽归零，报文在路由环路中被丢弃');return;}
    }
    const rule=this.route(host,p.dst);
    const nextName=rule?(rule.via?`发给下一跳「${this.hosts[rule.via]?.name||rule.via}」`:rule.iface==='utun'?'送进虚拟网卡 TUN':'同网段直达'):'无路可走';
    this.emitPacket('route.lookup',rule?`${h.name} 查路由表：命中 ${rule.prefix} → ${nextName}`:`${h.name} 查路由表：找不到去 ${p.dst} 的路`,p,{host,unit:'kernel',route:rule?{prefix:rule.prefix,iface:rule.iface,via:rule.via,metric:rule.metric}:null,
        ...(this.l2.enabled?{originalDst:p.dst,finalDst:p.dst,iface:rule?.iface||'',nextHopIP:rule?this.nextHopAddress(p,rule,rule.via,this.hosts[host].interfaces.find(f=>f.id===rule.iface)):null}:{}),why:rule?`要去的目的地址是 ${p.dst}。路由表按“谁匹配得最精确（最长前缀优先，同前缀看较小 metric）”选中 ${rule.prefix}，决定从 ${rule.iface} 接口${nextName}。`:`路由表里没有任何一条规则能匹配目的地址 ${p.dst}，这个包不知道该往哪发。`});
    if(!rule){this.icmpError(p,host,3,0,'NO_ROUTE','找不到到 '+p.dst+' 的路由');return;}
    const device=h.interfaces.find(f=>f.id===rule.iface);
    if(!device.enabled){this.emitPacket('ip.drop','选中的出口网卡已关闭，报文丢弃',p,{host});this.state.metrics.dropped++;return;}
    if(rule.iface==='utun') {
      this.emitPacket('tun.read','虚拟网卡 TUN 拦下整个 IP 包，交给本机代理/VPN 程序',p,{host,unit:'tun',why:'因为刚才路由表把出口指向了虚拟网卡 utun，这个包不会从物理网卡发出去，而是连同完整的 IP/TCP 包头一起被用户态的代理或 VPN 程序直接读走。'});
      if(this.config.vpn.enabled&&(host===this.source||host===this.config.vpn.peer))return this.wrap(p,host,receive);
      if(host===this.source&&this.config.proxy.tun) {
        if(p.connection&&this.runtime[p.connection]?.role==='original')return this.deliver(p,host,receive);
        this.fail('TUN_LOOP','死循环告警：本机代理自己发出的包又掉进了虚拟网卡 TUN！请在电脑路由表里给代理服务器 IP（203.0.113.10/32）加一条走物理网卡 en0 的例外路由（真实软件里也常用 IP_BOUND_IF 绑网卡或 SO_MARK 策略路由防环）',{host,packet:clone(p),route:clone(rule)});return;
      }
      this.fail('TUN_UNAVAILABLE','路由把包送进了虚拟网卡 TUN，但本机既没开 TUN 代理也没开 VPN 程序来接管它',{host,packet:clone(p)});return;
    }
    const next=rule.via||this.config.links.filter(l=>l.enabled&&(l.a===host||l.b===host)).map(l=>l.a===host?l.b:l.a).find(id=>this.hasIP(id,p.dst));
    const link=this.config.links.find(l=>l.enabled&&((l.a===host&&l.b===next)||(l.b===host&&l.a===next)));
    if(!link){this.emitPacket('link.unreachable','到下一跳设备的网线已断开或不存在',p,{host,route:clone(rule)});this.state.metrics.dropped++;return;}
    if(h.nat&&rule.iface===h.natInterface&&!mapping&&p.src!==this.ip(host,h.natInterface)) {
      let n=this.state.nat.find(n=>n.host===host&&n.protocol===p.protocol&&n.privateIP===p.src&&n.privatePort===(p.protocol==='ICMP'?p.icmpId:p.sport)&&n.remoteIP===p.dst&&n.remotePort===p.dport);
      const before=clone(p);
      if(!n){n={id:this.id('nat'),host,protocol:p.protocol,privateIP:p.src,privatePort:p.protocol==='ICMP'?p.icmpId:p.sport,publicIP:this.ip(host,h.natInterface),publicPort:62000+this.state.nat.length,remoteIP:p.dst,remotePort:p.dport};this.state.nat.push(n);}
      p.src=n.publicIP;if(p.protocol==='ICMP')p.icmpId=n.publicPort;else p.sport=n.publicPort;
      this.emitPacket('nat.translate',`${h.name} 做 NAT 换地址：内网 ${before.src}:${before.sport||before.icmpId} → 公网 ${p.src}:${p.sport||p.icmpId}`,p,{host,before,mapping:clone(n),why:`内网地址 ${before.src} 在公网上无法直接收信；路由器把发件人改成自己的公网口地址 ${p.src}:${p.sport||p.icmpId}，并在 NAT 表里记下一笔账，等外网回信到了再按表换回给内网电脑。`});
    }
    if(p.length>link.mtu){this.icmpError(p,host,3,4,'MTU_EXCEEDED',`数据包太胖（${p.length} 字节），超过前方网线限高 MTU ${link.mtu} 字节且禁止分片 (DF=1)`,{mtu:link.mtu});return;}
    const before=clone(p);p.path.push(host);
    if(this.l2.enabled) {
      const endpoints=this.linkEndpoints(link,host,next);
      const nextHop=this.nextHopAddress(p,rule,next,endpoints.out);
      const cached=this.arpLookup(host,endpoints.out.id,nextHop);
      const detail={host,iface:endpoints.out.id,from:host,to:next,link:link.id,
        originalDst:p.dst,finalDst:p.dst,nextHopIP:nextHop,
        outIface:endpoints.out.id,inIface:endpoints.in.id,
        srcMac:this.macOf(host,endpoints.out),etherType:ETHERTYPE.IPv4,unit:'kernel'};
      if(!cached){this.arpMiss(detail,p,before,link,endpoints,next,receive);return;}
      detail.dstMac=cached.mac;detail.waiting=false;
      this.emit('arp.cache-hit',`${h.name} ARP 缓存命中：${nextHop} → ${cached.mac}`,{...detail,arpEntry:clone(cached),
        why:`${h.name} 的 ${endpoints.out.id} 接口缓存里已有「${nextHop} → ${cached.mac}」，无需再发 ARP 广播。注意缓存是按接口分开保存的：同一个 IP 在另一个接口上仍需要重新解析。`});
      this.emitFrame(p,host,next,link,endpoints,cached.mac,before,receive,detail);
      return;
    }
    const mac=id=>'02:00:00:00:'+String(this.config.hosts.findIndex(h=>h.id===id)+1).padStart(2,'0')+':01';
    p.linkFrame={srcMac:mac(host),dstMac:mac(next)};
    this.emitPacket('link.send',`网线传输：${h.name} → ${this.hosts[next].name}`,p,{host,from:host,to:next,link:link.id,latency:link.latency,before,visibility:this.visibility(p),why:`报文正在相邻两台设备的网线上传输（单程耗时 ${link.latency} ms）。注意：单跳传输只换二层网卡 MAC，IP 包头里的收件人（${p.dst}）始终写着这一段连接的最终终点。`});
    this.propagate(p,host,next,link,receive);
  }
  propagate(p,host,next,link,receive) {
    const forced=this.config.faults.dropFirst&&!this.forcedDrop&&p.protocol==='TCP'&&p.flags==='SYN';
    if(forced)this.forcedDrop=true;
    if(forced||this.random()*100<link.loss) {
      this.schedule(link.latency,()=>{this.state.metrics.dropped++;this.emitPacket('link.drop',`半路丢包：${this.hosts[host].name} 发往 ${this.hosts[next].name} 的报文在网线上丢失`,p,{host:next,from:host,to:next,link:link.id,why:forced?'本次实验开启了「丢弃第一个 TCP SYN」，故意让第 1 次握手包在半路丢失，用来观察发送端怎么靠超时重传救回来。':'按当前网线设置的丢包率与固定随机种子计算，这个包在半路丢失了。'});});return;
    }
    const jitter=this.config.transport.jitter||0,delay=link.latency+(jitter?Math.floor(this.random()*(jitter+1)):0);
    this.schedule(delay,()=>{
      this.emitPacket('link.receive',`${this.hosts[next].name} 收到网线传来的报文`,p,{host:next,from:host,to:next,link:link.id,visibility:this.visibility(p)});
      const framed=clone(p);delete p.linkFrame;this.emitPacket('l2.decapsulate','拆掉上一跳网线的二层外壳，准备看 IP 地址',p,{host:next,before:framed,unit:'kernel',...(this.l2.enabled&&framed.linkFrame?{srcMac:framed.linkFrame.srcMac,dstMac:framed.linkFrame.dstMac,etherType:framed.linkFrame.etherType,nextHopIP:framed.linkFrame.dstNextHopIP,originalDst:p.dst,finalDst:p.dst,iface:framed.linkFrame.dstIface}:{})});
      this.forward(p,next,receive,true);
    });
  }
  macOf(hostId,f){return f?.mac||interfaceMac(hostId,f.id);}
  ethernetIfaces(hostId){return (this.hosts[hostId]?.interfaces||[]).filter(f=>f.enabled&&isEthernet(f));}
  linkEndpoints(link,from,to) {
    const a=this.ethernetIfaces(from),b=this.ethernetIfaces(to);
    for(const x of a)for(const y of b)if(sameNetwork(x,y))return {out:x,in:y};
    return {out:a[0]||this.hosts[from].interfaces[0],in:b[0]||this.hosts[to].interfaces[0]};
  }
  // A directly attached destination is resolved with its own IP; otherwise the gateway's IP is resolved.
  nextHopAddress(p,rule,nextId,outIface) {
    if(!rule?.via)return p.dst;
    const candidates=this.ethernetIfaces(nextId);
    const chosen=candidates.find(f=>sameNetwork(f,outIface))||candidates[0];
    return chosen?parseCIDR(chosen.address).ip:p.dst;
  }
  arpLookup(host,iface,ip) {
    const i=this.state.arp.findIndex(a=>a.host===host&&a.iface===iface&&a.ip===ip);
    if(i<0)return null;
    const entry=this.state.arp[i];
    if(entry.expires<=this.clock){
      this.state.arp.splice(i,1);
      this.emit('arp.expire',`${this.hosts[host].name} 的 ARP 缓存 ${ip} → ${entry.mac} 已过期`,{host,iface,nextHopIP:ip,arpEntry:clone(entry),unit:'kernel',
        why:`这条缓存已超过生存时间 ${this.l2.arpTtl} ms 并被删除。下次再往 ${ip} 发包必须重新广播 ARP Request，这就是缓存老化后的重新解析。`});
      return null;
    }
    return entry;
  }
  arpFrame(op,info) {
    const request=op==='request',dstMac=request?BROADCAST_MAC:info.targetMac;
    const fields={操作码:request?'1 (Request 请求)':'2 (Reply 应答)',硬件类型:'1 (以太网)',协议类型:'0x0800 (IPv4)',硬件地址长度:6,协议地址长度:4,
      发送端MAC:info.senderMac,发送端IP:info.senderIP,目的端MAC:request?'00:00:00:00:00:00 (未知，待应答填入)':info.targetMac,目的端IP:info.targetIP};
    const frame={id:this.id('frame'),protocol:'ARP',length:42,ttl:0,version:4,ihl:0,df:false,
      src:info.senderIP,dst:info.targetIP,sport:0,dport:0,seq:0,ack:0,flags:'',window:0,payloadLength:28,created:this.clock,
      linkFrame:{srcMac:info.senderMac,dstMac,etherType:ETHERTYPE.ARP,srcIface:info.iface,dstIface:info.inIface||'',srcIP:info.senderIP,dstNextHopIP:info.targetIP},
      arp:{op:request?1:2,senderMac:info.senderMac,senderIP:info.senderIP,targetMac:request?'00:00:00:00:00:00':info.targetMac,targetIP:info.targetIP},
      meta:{kind:'arp',label:request?'ARP Request 广播':'ARP Reply 单播'},
      finalDst:info.finalDst||info.targetIP,nextHopIP:info.targetIP,path:[],
      layers:[{type:'ethernet',name:'以太网帧首部',fields:{源MAC:info.senderMac,目的MAC:dstMac,源接口:info.iface,目的接口:info.inIface||'广播',EtherType:`${ETHERTYPE.ARP} (ARP)`,说明:request?`目的 MAC 为广播地址 ${BROADCAST_MAC}，同一链路上的设备都会收到。`:'应答按请求帧里的发送端 MAC 单播回传，不再广播。'}},
        {type:'arp',name:'ARP 报文',fields}]};
    frame.arpFields=fields;
    return frame;
  }
  arpMiss(d,p,before,link,endpoints,next,receive) {
    const key=d.host+'|'+d.iface+'|'+d.nextHopIP;
    this.state.arpPending.push({id:this.id('arp-wait'),host:d.host,iface:d.iface,nextHopIP:d.nextHopIP,packetId:p.id,finalDst:p.dst,waiting:true,since:this.clock});
    this.emit('arp.miss',`${this.hosts[d.host].name} ARP 缓存未命中：还不知道 ${d.nextHopIP} 的 MAC`,
      {...d,dstMac:BROADCAST_MAC,waiting:true,unit:'kernel',packetId:p.id,arpCache:clone(this.state.arp),
        why:`路由已经决定从 ${d.iface} 接口把包交给下一跳 ${d.nextHopIP}（最终目标仍是 ${p.dst}），但 ${d.iface} 的 ARP 缓存里没有该 IP 对应的 MAC，链路层暂时无法封装帧，IP 包 ${p.id} 进入等待队列。`});
    if(!this.runtime.arpWaiters.has(key))this.runtime.arpWaiters.set(key,[]);
    this.runtime.arpWaiters.get(key).push({packet:p,before,link,endpoints,next,receive,detail:d});
    if(this.runtime.arpFlights.has(key))return;
    const flight={key,host:d.host,iface:d.iface,targetIP:d.nextHopIP,next,link,endpoints,tries:0,satisfied:false,
      senderIP:parseCIDR(endpoints.out.address).ip,finalDst:p.dst,originalDst:p.dst};
    this.runtime.arpFlights.set(key,flight);
    this.state.arpInFlight.push({key,host:d.host,iface:d.iface,targetIP:d.nextHopIP,tries:0});
    this.arpRequest(flight);
  }
  arpRequest(flight) {
    if(this.done||flight.satisfied)return;
    flight.tries++;
    const record=this.state.arpInFlight.find(x=>x.key===flight.key);
    if(record)record.tries=flight.tries;
    const senderMac=this.macOf(flight.host,flight.endpoints.out);
    const frame=this.arpFrame('request',{host:flight.host,iface:flight.iface,inIface:flight.endpoints.in.id,
      senderMac,senderIP:flight.senderIP,targetIP:flight.targetIP,finalDst:flight.finalDst});
    this.emit('arp.request',`${this.hosts[flight.host].name} 广播 ARP Request：谁是 ${flight.targetIP}？`,
      {packet:frame,host:flight.host,from:flight.host,to:flight.next,link:flight.link.id,iface:flight.iface,
        originalDst:flight.originalDst,finalDst:flight.finalDst,nextHopIP:flight.targetIP,
        srcMac:senderMac,dstMac:BROADCAST_MAC,etherType:ETHERTYPE.ARP,arpFields:frame.arpFields,
        attempt:flight.tries,waiting:true,unit:'kernel',
        why:`${this.hosts[flight.host].name} 在 ${flight.iface} 上发出广播帧（目的 MAC ${BROADCAST_MAC}，EtherType ${ETHERTYPE.ARP}）：「谁配置了 ${flight.targetIP}？请回复 ${flight.senderIP}」。询问的是路由选出的下一跳，而不是最终目标 ${flight.finalDst}。等待解析期间，原 IP 包留在本机队列中，既没被丢弃，也没被提前发出。`});
    this.schedule(flight.link.latency,()=>this.arpDeliverRequest(flight,frame,senderMac));
    this.schedule(this.l2.arpTimeout,()=>this.arpTimeout(flight));
  }
  arpDeliverRequest(flight,frame,senderMac) {
    if(this.done||flight.satisfied)return;
    const owner=this.config.hosts.find(h=>h.id!==flight.host&&h.interfaces.some(f=>f.enabled&&isEthernet(f)&&parseCIDR(f.address).ip===flight.targetIP));
    const ownerIface=owner?.interfaces.find(f=>f.enabled&&isEthernet(f)&&parseCIDR(f.address).ip===flight.targetIP);
    const silent=this.l2.silentHosts.includes(flight.next)||(owner&&this.l2.silentHosts.includes(owner.id));
    const answered=!!owner&&!!ownerIface&&!silent;
    this.emit('arp.request-receive',`${this.hosts[flight.next].name} 收到 ARP Request（询问 ${flight.targetIP}）`,
      {host:flight.next,from:flight.host,to:flight.next,link:flight.link.id,iface:flight.endpoints.in.id,
        originalDst:flight.originalDst,finalDst:flight.finalDst,nextHopIP:flight.targetIP,
        srcMac:frame.linkFrame.srcMac,dstMac:BROADCAST_MAC,etherType:ETHERTYPE.ARP,
        arpFields:frame.arpFields,waiting:true,unit:'kernel',
        why:answered?`这台设备的 ${ownerIface.id} 接口配置的正是 ${flight.targetIP}，于是准备单播 ARP Reply，把自己的 MAC 告诉请求方。`:`本设备没有配置 ${flight.targetIP}${silent?'（当前被设置为不回应 ARP）':''}，因此不会应答；请求方只能等超时后重试。`});
    if(!answered)return;
    const replyMac=this.macOf(owner.id,ownerIface);
    const reply=this.arpFrame('reply',{host:owner.id,iface:ownerIface.id,inIface:flight.endpoints.out.id,
      senderMac:replyMac,senderIP:flight.targetIP,targetMac:senderMac,targetIP:flight.senderIP,finalDst:flight.finalDst});
    this.emit('arp.reply',`${owner.name} 单播 ARP Reply：${flight.targetIP} 的 MAC 是 ${replyMac}`,
      {packet:reply,host:owner.id,from:owner.id,to:flight.host,link:flight.link.id,iface:ownerIface.id,
        originalDst:flight.originalDst,finalDst:flight.finalDst,nextHopIP:flight.targetIP,
        srcMac:replyMac,dstMac:senderMac,etherType:ETHERTYPE.ARP,arpFields:reply.arpFields,
        waiting:true,unit:'kernel',
        why:`应答帧的目的 MAC 直接填请求方的 ${senderMac}（单播，不再广播）；ARP 报文里写明「发送端 IP ${flight.targetIP} ↔ 发送端 MAC ${replyMac}」，请求方据此建立映射。`});
    this.schedule(flight.link.latency,()=>this.arpLearn(flight,reply,replyMac,owner.id,ownerIface.id));
  }
  arpLearn(flight,reply,replyMac,ownerId,ownerIface) {
    if(this.done||flight.satisfied)return;
    flight.satisfied=true;
    const entry={id:this.id('arp'),host:flight.host,iface:flight.iface,ip:flight.targetIP,mac:replyMac,
      owner:ownerId,ownerIface,learnedAt:this.clock,expires:this.clock+this.l2.arpTtl,source:'ARP Reply'};
    this.state.arp=this.state.arp.filter(a=>!(a.host===flight.host&&a.iface===flight.iface&&a.ip===flight.targetIP));
    this.state.arp.push(entry);
    this.state.arpInFlight=this.state.arpInFlight.filter(x=>x.key!==flight.key);
    this.runtime.arpFlights.delete(flight.key);
    this.emit('arp.cache-update',`${this.hosts[flight.host].name} 写入 ARP 缓存：${flight.targetIP} → ${replyMac}`,
      {host:flight.host,iface:flight.iface,from:ownerId,to:flight.host,link:flight.link.id,
        originalDst:flight.originalDst,finalDst:flight.finalDst,nextHopIP:flight.targetIP,
        srcMac:replyMac,dstMac:reply.linkFrame.dstMac,etherType:ETHERTYPE.ARP,
        arpEntry:clone(entry),arpFields:reply.arpFields,waiting:false,unit:'kernel',
        why:`缓存按「设备 ${flight.host} ＋ 接口 ${flight.iface} ＋ 下一跳 IP ${flight.targetIP}」保存，生存期 ${this.l2.arpTtl} ms。排队的 IP 包可以取出并用 ${replyMac} 作目的 MAC 封装。写入的是下一跳 MAC，IP 包头目的地址仍是 ${flight.finalDst}。`});
    this.arpFlush(flight.key);
  }
  arpFlush(key) {
    const waiters=this.runtime.arpWaiters.get(key)||[];
    this.runtime.arpWaiters.delete(key);
    for(const w of waiters){
      this.state.arpPending=this.state.arpPending.filter(x=>!(x.packetId===w.packet.id&&x.host===w.detail.host));
      if(this.done)continue;
      const entry=this.state.arp.find(a=>a.host===w.detail.host&&a.iface===w.detail.iface&&a.ip===w.detail.nextHopIP);
      if(!entry)continue;
      this.emit('arp.dequeue',`${this.hosts[w.detail.host].name} 取出等待的 IP 包 ${w.packet.id}，继续发送`,
        {host:w.detail.host,iface:w.detail.iface,from:w.detail.host,to:w.next,link:w.link.id,
          originalDst:w.packet.dst,finalDst:w.packet.dst,nextHopIP:w.detail.nextHopIP,packetId:w.packet.id,
          srcMac:this.macOf(w.detail.host,w.endpoints.out),dstMac:entry.mac,etherType:ETHERTYPE.IPv4,
          waiting:false,unit:'kernel',
          why:`地址解析完成，原先因 ARP 未命中而暂停的 IP 包 ${w.packet.id} 重新进入发送流程。包本身没被改写：源 IP、目的 IP ${w.packet.dst} 与 TTL 都保持原样，只是现在有了可用的目的 MAC。`});
      this.emitFrame(w.packet,w.detail.host,w.next,w.link,w.endpoints,entry.mac,w.before,w.receive,w.detail);
    }
  }
  arpTimeout(flight) {
    if(this.done||flight.satisfied)return;
    if(flight.tries<=this.l2.arpRetries){
      this.emit('arp.retry',`ARP 请求第 ${flight.tries} 次超时，${this.hosts[flight.host].name} 重新广播`,
        {host:flight.host,iface:flight.iface,from:flight.host,to:flight.next,link:flight.link.id,
          nextHopIP:flight.targetIP,finalDst:flight.finalDst,originalDst:flight.originalDst,
          attempt:flight.tries,waiting:true,unit:'kernel',
          why:`等待 ${this.l2.arpTimeout} ms 仍没收到 ${flight.targetIP} 的 ARP Reply，按有限次数策略重发广播请求。原 IP 包继续留在队列里。`});
      this.arpRequest(flight);
      return;
    }
    const waiters=this.runtime.arpWaiters.get(flight.key)||[];
    this.state.metrics.dropped+=waiters.length;
    this.state.arpPending=this.state.arpPending.filter(x=>!(x.host===flight.host&&x.iface===flight.iface&&x.nextHopIP===flight.targetIP));
    this.state.arpInFlight=this.state.arpInFlight.filter(x=>x.key!==flight.key);
    this.runtime.arpFlights.delete(flight.key);
    this.runtime.arpWaiters.delete(flight.key);
    this.emit('arp.failed',`ARP 解析失败：${flight.targetIP} 一直不应答，等待中的 IP 包被丢弃`,
      {host:flight.host,iface:flight.iface,nextHopIP:flight.targetIP,finalDst:flight.finalDst,originalDst:flight.originalDst,
        dropped:waiters.length,waiting:false,unit:'kernel',
        why:`共广播 ${flight.tries} 次都无应答，队列中的 ${waiters.length} 个 IP 包无法封装成帧，只能丢弃。这是「下一跳链路层地址解析失败」，与「路由表找不到去 ${flight.finalDst} 的规则（NO_ROUTE）」是两种不同原因。`});
    this.fail('ARP_FAILURE',`ARP 解析失败：${this.hosts[flight.host].name} 的 ${flight.iface} 接口广播询问下一跳 ${flight.targetIP} 的 MAC，重试 ${flight.tries-1} 次仍无应答。这是链路层地址解析未成功，不代表路由表里没有到 ${flight.finalDst} 的路由。`,{host:flight.host,nextHopIP:flight.targetIP,finalDst:flight.finalDst});
  }
  emitFrame(p,host,next,link,endpoints,dstMac,before,receive,detail) {
    const h=this.hosts[host],srcMac=this.macOf(host,endpoints.out),inMac=this.macOf(next,endpoints.in);
    p.linkFrame={srcMac,dstMac,etherType:ETHERTYPE.IPv4,srcIface:endpoints.out.id,dstIface:endpoints.in.id,
      srcIP:parseCIDR(endpoints.out.address).ip,dstNextHopIP:detail.nextHopIP,dstInterfaceMac:inMac};
    this.emitPacket('link.send',`网线传输：${h.name} → ${this.hosts[next].name}`,p,
      {host,from:host,to:next,link:link.id,latency:link.latency,before,visibility:this.visibility(p),
        ...detail,srcMac,dstMac,etherType:ETHERTYPE.IPv4,waiting:false,
        why:`每一跳都重新封装：本帧源 MAC 是 ${h.name} 的 ${endpoints.out.id}（${srcMac}），目的 MAC 是下一跳 ${this.hosts[next].name} 的 ${endpoints.in.id}（${dstMac}）。帧内 IP 载荷的目的地址仍是最终目标 ${p.dst}，跨路由器转发不会被改写成网关地址；只有二层 MAC 随每一跳改变。`});
    this.propagate(p,host,next,link,receive);
  }
  icmpError(p,host,type,code,error,message,extra={}) {
    this.state.metrics.dropped++;
    this.emitPacket('icmp.error',`${this.hosts[host].name} 拦截报错：${message}`,p,{host,code:error,icmp:{type,code,...extra},why:'中间路由器发现这个包没法继续往前传（比如寿命归零或包太胖塞不下网线），于是把原包丢弃，并准备给发包人寄一封 ICMP 退信说明原因。'});
    if(!this.lastNetworkError)this.lastNetworkError={code:error,message};
    if(!this.icmpReturnSent&&host!==this.source&&p.protocol!=='ICMP') {
      this.icmpReturnSent=true;
      const label=type===11?'ICMP 超时退信 (TTL=0)':code===4?`ICMP 限高退信 (前方 MTU=${extra.mtu})`:'ICMP 目的不可达退信';
      const reply=this.packet({ip:this.ip(host),port:0},{ip:p.src,port:0},'ICMP',{icmpType:type,icmpCode:code,payloadLength:28,length:56,innerError:{id:p.id,src:p.src,dst:p.dst,sport:p.sport,dport:p.dport,protocol:p.protocol,icmpId:p.icmpId}},{kind:'icmp-error',label,target:p.dst,text:`${message}（附带出错原包 ${p.id} 的首部）`,note:'按照 RFC 792 / RFC 1812，路由器会把刚才出错那个包的 IP 头和前 8 字节端口信息塞进退信里寄回源端——平时我们用 traceroute 查路由经过了哪些节点，靠的就是收这种退信！'});
      this.sendIP(reply,host,(received,at)=>this.emitPacket('icmp.receive',`${this.hosts[at].name} 收到路由器寄回的 ${label}`,received,{host:at,unit:'kernel',why:`电脑收到了来自路由器（${received.src}）的退信，打开一看里面夹着刚才发的 ${p.id}，立刻明白包裹在半路出了什么问题。`}));
    }
  }
  visibility(p) {
    const encrypted=p.meta.outerTls||p.meta.encrypted||p.meta.kind==='wireguard';
    return {链路可见:`${p.src}:${p.sport} → ${p.dst}:${p.dport} / ${p.protocol} / ${p.length} 字节`,应用内容:encrypted?'加密；当前链路不能读取':'未加密的应用载荷',域名:p.meta.kind==='dns'?p.meta.target:p.meta.outerTls||p.meta.kind==='wireguard'?'未从该载荷直接披露':p.meta.target||'未提供',限制:'不据此排除 DNS、SNI、指纹或流量分析带来的其他信息'};
  }
  resolve(host,name,callback) {
    if(isIPv4(name)){callback(name);return;}
    const cached=this.state.dnsRecords.find(r=>r.host===host&&r.name===name&&r.expires>this.clock);
    if(cached){this.emit('dns.cache',`DNS 命中本机缓存：${name} = ${cached.ip}`,{host,record:clone(cached),why:`之前已经查过 ${name} 且缓存还没过期，直接拿缓存里的 IP 地址 ${cached.ip} 用，省去再发包问 DNS 服务器。`});callback(cached.ip);return;}
    const queryId=this.id('dns'),from={ip:this.ip(host),port:53053+(this.counter.dns||0)},to={ip:this.ip(this.dnsHost),port:53};let finished=false;
    const p=this.packet(from,to,'UDP',{payloadLength:32+name.length,length:60+name.length},{kind:'dns',label:'DNS 查询',target:name,text:`QNAME=${name}; QTYPE=A`,queryId});
    this.emit('dns.query',`${this.hosts[host].name} 发包询问 DNS：「${name} 的 IP 是多少？」`,{host,queryId,why:`网络发包必须写 IP 地址，不能直接写域名。${this.hosts[host].name} 先向 DNS 解析器（${to.ip}:53）发一个 UDP 查询包问清楚地址。`});
    this.sendIP(p,host,(received,at)=>{
      if(this.config.faults.dns||!this.listener(at,53,'UDP'))return;
      const answer=Object.hasOwn(this.config.dns.records,name)?this.config.dns.records[name]:undefined;
      const reply=this.packet({ip:received.dst,port:53},{ip:received.src,port:received.sport},'UDP',{payloadLength:48+name.length,length:76+name.length},{kind:'dns',label:'DNS 响应',target:name,text:answer?`${name} = ${answer}`:'NXDOMAIN',queryId});
      this.sendIP(reply,at,()=>{
        if(finished)return;finished=true;
        if(!answer){this.fail('DNS_NXDOMAIN','DNS 查无此域名（NXDOMAIN）：'+name,{host});return;}
        const record={id:queryId,host,name,ip:answer,expires:this.clock+this.config.dns.ttl*1000};this.state.dnsRecords.push(record);
        this.emit('dns.answer',`DNS 回答：${name} 的地址是 ${answer}`,{host,record:clone(record),why:`拿到域名对应的 IP 地址 ${answer} 并存进缓存，接下来就可以向这个地址发起真正的连接了。`});callback(answer);
      });
    });
    this.schedule(this.config.transport.rto*4,()=>{if(!finished){finished=true;this.fail('DNS_TIMEOUT','DNS 查询石沉大海（超时）：请检查 DNS 服务器是否开启了 53 端口服务、或者去 DNS 的路由和网线是否畅通',{host});}});
  }
  open(a,b,role,ready,virtual=false) {
    const id=this.id('connection'),index=this.counter.connection;
    const record={id,role,a:clone(a),b:clone(b),aState:'CLOSED',bState:'LISTEN',aNext:1000+index*10000,bNext:8000+index*10000,aRecv:8001+index*10000,bRecv:1001+index*10000,bytesAcked:0,virtual};
    const rt={id,role,a,b,record,pending:[],opened:false,ready,virtual,observed:{},receive:{a:record.aRecv,b:record.bRecv},buffer:{a:{},b:{}}};
    this.runtime[id]=rt;this.state.connections.push(record);
    this.state.sockets.push({id:this.id('socket'),connection:id,host:a.host,local:a.ip+':'+a.port,remote:b.ip+':'+b.port,role,state:'SYN-SENT'});
    this.state.sockets.push({id:this.id('socket'),connection:id,host:b.host,local:b.ip+':'+b.port,remote:a.ip+':'+a.port,role,state:'LISTEN'});
    this.change(rt,'a','SYN-SENT');
    const roleLabel={original:'第 1 段连接（浏览器 ↔ 本机代理入口）',proxy:'第 2 段连接（本机代理 ↔ 远端代理隧道）',target:'第 3 段连接（远端代理 ↔ 目标网站）',direct:'直连通道（本机 ↔ 目标服务器）'}[role]||role;
    this.emit('socket.create',`新建 TCP 连接：${roleLabel}`,{host:a.host,connection:id,unit:role==='original'?'app':'agent',why:`创建一条独立的 TCP 连接（${a.ip}:${a.port} ⇄ ${b.ip}:${b.port}，初始序号 ${record.aNext}）。每段 TCP 连接各管各的握手和序号；代理转发时只搬运里面的数据字节，不会把上一段连接的 TCP/IP 包头直接照搬过去。`});
    this.reliable(rt,'a','SYN',0,{kind:'tcp',label:'TCP 握手'},()=>{});
    return rt;
  }
  change(rt,side,value) {
    rt.record[side+'State']=value;
    const s=this.state.sockets.find(s=>s.connection===rt.id&&s.host===rt[side].host&&s.local===rt[side].ip+':'+rt[side].port);
    if(s)s.state=value;
  }
  reliable(rt,side,flags,size,meta,acked) {
    const start=rt.record[side+'Next'],end=start+size+(flags.includes('SYN')||flags.includes('FIN')?1:0);
    rt.record[side+'Next']=end;
    const pending={side,flags,size,meta:clone(meta),start,end,tries:0,acked,id:this.id('segment')};rt.pending.push(pending);
    const attempt=()=>{
      if(this.done||!rt.pending.includes(pending))return;
      if(pending.tries>this.config.transport.retries){const e=this.lastNetworkError;this.fail(e?.code||'TCP_TIMEOUT',e?.message||`迟迟等不到对方确认（已超时重传 ${this.config.transport.retries} 次），连接被迫放弃`,{connection:rt.id,host:rt[side].host});return;}
      if(pending.tries){this.state.metrics.retransmissions++;this.emit('tcp.retransmit',`迟迟没收到回音，触发第 ${pending.tries} 次超时重传（保持原序号 seq=${start}）`,{host:rt[side].host,connection:rt.id,segment:pending.id,seq:start,attempt:pending.tries,why:`发包方等了 ${this.config.transport.rto*2**(pending.tries-1)} ms 还没收到对方的 ACK 确认，怀疑刚才那个包在半路丢了，于是用一模一样的 TCP 序号（seq=${start}）重新发一份。`});}
      if(pending.tries&&size&&this.config.transport.congestion)this.backoff(rt,side,'timeout');
      this.segment(rt,side,flags,size,meta,start,pending.id);
      const wait=this.config.transport.rto*2**pending.tries;pending.tries++;this.schedule(wait,attempt);
    };
    attempt();
  }
  segment(rt,side,flags,size,meta,seq,segmentId) {
    const other=side==='a'?'b':'a';
    const m={...meta};
    if(size&&rt.role==='proxy'&&this.config.proxy.transportTls&&this.proxyTls?.phase==='ESTABLISHED')m.outerTls=this.proxyTls.id;
    if(rt.virtual&&side==='b')m.inject=true;
    const p=this.packet(rt[side],rt.observed[side]||rt[other],'TCP',{flags,seq:seq??rt.record[side+'Next'],ack:flags==='SYN'?0:rt.receive[side],payloadLength:size,length:40+size,connection:rt.id,segment:segmentId||this.id('segment')},m);
    this.sendIP(p,rt[side].host,(received)=>this.receiveSegment(rt,other,received));
  }
  acknowledge(rt,side,ack) {
    const list=rt.pending.filter(p=>p.side===side&&p.end<=ack);
    for(const p of list){rt.pending.splice(rt.pending.indexOf(p),1);rt.record.bytesAcked+=p.size;this.emit('tcp.ack',`收到对方确认号 ack=${ack}，确认数据已安全送达`,{connection:rt.id,host:rt[side].host,ack,segment:p.id});p.acked();}
  }
  receiveSegment(rt,side,p) {
    const other=side==='a'?'b':'a';
    rt.observed[side]={ip:p.src,port:p.sport};
    rt.record[side+'Peer']=p.src+':'+p.sport;
    const socket=this.state.sockets.find(s=>s.connection===rt.id&&s.host===rt[side].host&&s.local===rt[side].ip+':'+rt[side].port);
    if(socket)socket.remote=rt.record[side+'Peer'];
    if(p.flags.includes('RST')){this.fail('CONNECTION_REFUSED',`${this.hosts[rt[side].host].name} 收到对方的 RST 拒绝包：目标端口没有程序在监听`,{host:rt[side].host,connection:rt.id});return;}
    if(p.flags==='SYN') {
      const accept=rt.virtual||this.listener(rt.b.host,rt.b.port,'TCP');
      if(!accept) {this.segment(rt,'b','RST,ACK',0,{kind:'tcp',label:'端口未监听'},0);return;}
      if(this.config.faults.targetBlocked&&['target','direct'].includes(rt.role))return;
      if(rt.record.bState==='LISTEN') {
        rt.receive.b=p.seq+1;rt.record.bRecv=rt.receive.b;this.change(rt,'b','SYN-RECEIVED');
        this.emit('tcp.state',`${this.hosts[rt.b.host].name} 收到第 1 次握手 (SYN)，准备回信 (SYN-ACK)`,{host:rt.b.host,connection:rt.id,why:`接收方记下对方的起始序号 ${p.seq}，把期望收到的下一个序号设为 ${p.seq+1}，并回发 SYN,ACK。`});
        this.reliable(rt,'b','SYN,ACK',0,{kind:'tcp',label:'SYN-ACK'},()=>{});
      } else this.segment(rt,'b','SYN,ACK',0,{kind:'tcp',label:'重发 SYN-ACK'},rt.record.bNext-1);
      return;
    }
    if(p.flags==='SYN,ACK') {
      rt.receive.a=p.seq+1;rt.record.aRecv=rt.receive.a;this.acknowledge(rt,'a',p.ack);this.change(rt,'a','ESTABLISHED');
      this.segment(rt,'a','ACK',0,{kind:'tcp',label:'握手 ACK'});
      return;
    }
    // Commit the server's handshake state before ACK callbacks can emit application data.
    if(side==='b'&&rt.record.bState==='SYN-RECEIVED'&&p.flags.includes('ACK')) {
      this.change(rt,'b','ESTABLISHED');this.acknowledge(rt,'b',p.ack);
      const roleLabel={original:'第 1 段连接（浏览器 ↔ 本机代理）',proxy:'第 2 段连接（本机 ↔ 远端代理隧道）',target:'第 3 段连接（远端代理 ↔ 目标网站）',direct:'直连通道（本机 ↔ 目标服务器）'}[rt.role]||rt.role;
      if(!rt.opened){rt.opened=true;this.emit('tcp.established','三次握手完成：'+roleLabel+' 已连通',{host:rt.b.host,connection:rt.id,why:'三次握手（SYN → SYN,ACK → ACK）全部确认完毕，双方核对好起始序号，这条连接现在可以正式传数据了。'});rt.ready(rt);}
    } else if(p.flags.includes('ACK'))this.acknowledge(rt,side,p.ack);
    if(this.config.transport.congestion&&p.flags==='ACK'&&!p.payloadLength)this.dupAck(rt,side,p.ack);
    if(p.payloadLength) {
      const expected=rt.receive[side];
      if(p.seq===expected) {
        rt.receive[side]+=p.payloadLength;
        while(rt.buffer[side][rt.receive[side]]){const size=rt.buffer[side][rt.receive[side]];delete rt.buffer[side][rt.receive[side]];rt.receive[side]+=size;}
        rt.record[side+'Recv']=rt.receive[side];
        this.state.metrics.bytes+=p.payloadLength;
        this.emitPacket('tcp.data',`${this.hosts[rt[side].host].name} 按序收下 ${p.payloadLength} 字节数据（${p.meta.label||'应用数据'}）`,p,{host:rt[side].host,why:`收到的数据段序号（seq=${p.seq}）正好接上期望序号，内核剥去 IP/TCP 首部把里面的 ${p.payloadLength} 字节交给上层程序，并准备回发确认号 ack=${rt.receive[side]}。`});
      } else {
        if(p.seq>expected)rt.buffer[side][p.seq]=p.payloadLength;
        this.emitPacket(p.seq<expected?'tcp.duplicate':'tcp.out-of-order',p.seq<expected?'收到重复的数据段：丢弃重复内容并重发 ACK':'收到乱序数据段：先暂存起来，等前面的缺口补齐',p,{host:rt[side].host});
      }
      this.segment(rt,side,'ACK',0,{kind:'tcp',label:'累计 ACK'});
    }
    if(p.flags.includes('FIN')) {
      rt.receive[side]=Math.max(rt.receive[side],p.seq+1);
      this.change(rt,side,rt.record[side+'State']==='FIN-WAIT-2'?'TIME-WAIT':'CLOSE-WAIT');
      this.segment(rt,side,'ACK',0,{kind:'tcp',label:'FIN ACK'});
    }
  }
  data(rt,side,length,meta,complete) {
    const chunk=Math.min(this.config.transport.mss,this.config.transport.window),window=this.config.transport.window,congestion=this.config.transport.congestion;
    let cursor=0,acked=0,inFlight=0,finished=false;
    const pump=()=>{
      if(finished||this.done)return;
      const limit=()=>congestion?Math.min(window,this.ccState(rt,side).cwnd):window;
      while(cursor<length&&inFlight<limit()) {
        const size=Math.min(chunk,length-cursor,limit()-inFlight);
        if(congestion&&size<Math.min(chunk,length-cursor))break;
        cursor+=size;inFlight+=size;
        this.reliable(rt,side,'PSH,ACK',size,meta,()=>{inFlight-=size;acked+=size;if(congestion)this.grow(rt,side,size);if(acked===length){finished=true;complete();}else pump();});
      }
    };
    pump();
  }
  ccState(rt,side) {
    rt.cc=rt.cc||{};
    const chunk=Math.min(this.config.transport.mss,this.config.transport.window);
    if(!rt.cc[side]){rt.cc[side]={cwnd:chunk,ssthresh:this.config.transport.window,dup:0,lastAck:null,chunk};this.publishCwnd(rt,side);}
    return rt.cc[side];
  }
  publishCwnd(rt,side) {const c=rt.cc[side];rt.record[side+'Cwnd']=c.cwnd;rt.record[side+'Ssthresh']=c.ssthresh;}
  grow(rt,side,size) {
    const c=this.ccState(rt,side),window=this.config.transport.window,before=c.cwnd,slow=c.cwnd<c.ssthresh;
    c.cwnd=Math.min(window,slow?c.cwnd+Math.min(size,c.chunk):c.cwnd+Math.max(1,Math.floor(c.chunk*c.chunk/c.cwnd)));
    if(c.cwnd===before)return;
    this.emit('tcp.cwnd',`拥塞窗口 cwnd：${before} → ${c.cwnd} 字节（${slow?'慢启动：每个 ACK 增加一个确认量':'拥塞避免：每轮往返只增加约 1 个 MSS'}）`,{host:rt[side].host,connection:rt.id,cwnd:c.cwnd,ssthresh:c.ssthresh,why:slow?`cwnd（${before}）小于慢启动门限 ssthresh（${c.ssthresh}），处于慢启动：每确认一段数据，cwnd 就加上被确认的字节数，一轮往返后窗口大约翻倍。同时发送量还受接收窗口 ${window} 限制。`:`cwnd 已到达门限 ${c.ssthresh}，进入拥塞避免：每个 ACK 只加 MSS²/cwnd，一轮往返总共约增加 1 个 MSS，增长转为线性。`},()=>this.publishCwnd(rt,side));
  }
  backoff(rt,side,reason) {
    const c=this.ccState(rt,side),beforeWindow=c.cwnd,beforeThreshold=c.ssthresh;
    c.ssthresh=Math.max(Math.floor(c.cwnd/2),2*c.chunk);c.cwnd=reason==='timeout'?c.chunk:c.ssthresh;c.dup=0;
    this.emit('tcp.cwnd',reason==='timeout'?`超时重传：ssthresh ${beforeThreshold} → ${c.ssthresh}，cwnd ${beforeWindow} → ${c.cwnd}（塌缩回 1 个 MSS，重新慢启动）`:`快速恢复：ssthresh ${beforeThreshold} → ${c.ssthresh}，cwnd ${beforeWindow} → ${c.cwnd}（减半后直接进入拥塞避免）`,{host:rt[side].host,connection:rt.id,cwnd:c.cwnd,ssthresh:c.ssthresh,why:reason==='timeout'?'超时说明网络可能严重拥塞：门限减为原 cwnd 的一半，cwnd 回到 1 个 MSS，从头慢启动。':'三个重复 ACK 说明后面的段还在到达、网络没有完全堵死：只把窗口减半，不必回到 1 个 MSS。'},()=>this.publishCwnd(rt,side));
  }
  dupAck(rt,side,ack) {
    const c=this.ccState(rt,side),outstanding=rt.pending.filter(x=>x.side===side&&x.size>0);
    if(ack!==c.lastAck){c.lastAck=ack;c.dup=0;return;}
    if(!outstanding.length)return;
    if(++c.dup!==3)return;
    const lost=outstanding[0];
    this.state.metrics.retransmissions++;
    this.emit('tcp.fast-retransmit',`收到 3 个重复 ACK（ack=${ack}）：不等超时，立刻快速重传 seq=${lost.start}`,{host:rt[side].host,connection:rt.id,segment:lost.id,seq:lost.start,ack,why:`接收方一直在索要 seq=${ack}，说明这一段丢了而后面的段已经到达。发送方收到连续 3 个相同确认号就判断该段丢失，立即用原序号重发，而不是等 RTO 超时。`});
    this.backoff(rt,side,'fast');
    this.segment(rt,side,lost.flags,lost.size,lost.meta,lost.start,lost.id);
  }
  close(rt,complete) {
    const roleLabel={original:'浏览器 ↔ 本机代理',proxy:'本机 ↔ 远端代理隧道',target:'远端代理 ↔ 目标网站',direct:'本机 ↔ 目标服务器'}[rt.role]||rt.role;
    this.change(rt,'a','FIN-WAIT-1');this.emit('tcp.close',`数据传完，开始断开连接（${roleLabel} 四次挥手）`,{host:rt.a.host,connection:rt.id,why:'任务完成，双方各自发送 FIN 包并确认（四次挥手），有条不紊地释放这条 TCP 连接。'});
    this.reliable(rt,'a','FIN,ACK',0,{kind:'tcp',label:'FIN'},()=>{
      this.change(rt,'a','FIN-WAIT-2');this.change(rt,'b','LAST-ACK');
      this.reliable(rt,'b','FIN,ACK',0,{kind:'tcp',label:'FIN'},()=>{
        this.change(rt,'b','CLOSED');this.change(rt,'a','TIME-WAIT');
        this.emit('tcp.time-wait',`连接已断开：${roleLabel} 进入 TIME-WAIT 收尾状态`,{host:rt.a.host,connection:rt.id,why:'主动关闭方进入 TIME-WAIT 状态（防止最后一个 ACK 丢包导致对端重发 FIN），被动方彻底关闭（CLOSED）。'});complete();
      });
    });
  }
  tls(send,label,participants,complete,isProxy=false) {
    const session={id:this.id('tls'),label,role:isProxy?'proxy':'application',participants,phase:'CLIENT_HELLO',logical:true};this.state.tls.push(session);if(isProxy)this.proxyTls=session;
    this.emit('tls.client-hello',`${label}：发起加密握手 (ClientHello)`,{host:participants[0],tls:clone(session),why:isProxy?'本机代理与远端代理先做一层外层 TLS 加密握手，把后面的代理指令和转发数据统统锁进加密管道。':'浏览器与目标网站直接进行端到端 TLS 加密握手（即使中间经过了代理，代理也只负责传密文，拿不到网站私钥，看不懂里面的网页内容）。'});
    send('a',128,{kind:'tls-handshake',label:label+' ClientHello',target:this.config.request.destination,encrypted:false},()=>{
      session.phase='SERVER_HELLO';this.emit('tls.server-hello',`${label}：对方发回证书与密钥参数 (ServerHello)`,{host:participants[1],tls:clone(session),why:'服务端发回数字证书和协商好的加密参数，供客户端核验身份。'});
      send('b',256,{kind:'tls-handshake',label:label+' ServerHello + 加密握手',encrypted:true},()=>{
        if(this.config.faults.certificate){session.phase='FAILED';this.fail('TLS_CERTIFICATE','TLS 证书校验不通过！客户端发现证书不可信，立即中止连接以防被中间人窃听',{tls:clone(session),host:participants[0]});return;}
        session.phase='CERTIFICATE_ACCEPTED';this.emit('tls.certificate',`${label}：证书核验通过，确认对方身份可信`,{host:participants[0],tls:clone(session)});
        send('a',64,{kind:'tls-handshake',label:label+' Finished',encrypted:true},()=>{session.phase='ESTABLISHED';this.emit('tls.established',`🔒 ${label} 加密通道已建立，后续传输全部加密`,{host:participants[0],tls:clone(session)});complete(session);});
      });
    });
  }
  proxyRule(target,ip) {
    return this.config.proxy.rules.find(r=>r.pattern==='*'||r.pattern===target||(r.pattern.startsWith('*.')&&target.endsWith(r.pattern.slice(1)))||(parseCIDR(r.pattern)&&((ipNumberLocal(ip)&parseCIDR(r.pattern).mask)>>>0)===parseCIDR(r.pattern).network))?.action||'direct';
  }
  start() {
    this.state.status='running';const q=this.config.request;
    this.emit('request.start',`准备访问：${q.destination}:${q.port}（${q.kind.toUpperCase()}）`,{host:this.source,unit:'app',why:`应用程序准备向 ${q.destination} 发送 ${q.bytes} 字节请求。接下来一步步看它怎么查域名、选路线、建连接并拿回响应。`});
    const system=this.config.proxy.system&&q.usesSystemProxy&&['https','http'].includes(q.kind);
    if(system) {
      this.emit('proxy.system',`应用遵从系统代理设置，直接连本机代理入口 127.0.0.1:${this.config.proxy.localPort}`,{host:this.source,unit:'app',why:'因为开启了系统 HTTP 代理且应用听从系统设置，浏览器不再自己去查 DNS，而是直接连本机代理端口，把域名写在 HTTP CONNECT 请求里交给代理去处理。'});
      this.originalIP=isIPv4(q.destination)?q.destination:null;this.buildProxy(true);return;
    }
    const resolved=ip=>{
      this.originalIP=ip;const r=this.route(this.source,ip);
      if(this.config.proxy.tun&&r?.iface==='utun'&&!this.config.vpn.enabled)this.buildProxy(false);
      else this.buildDirect(ip);
    };
    if(this.config.dns.mode==='fake'&&!isIPv4(q.destination)) {
      this.originalName=q.destination;const record={id:this.id('dns'),host:this.source,name:q.destination,ip:'198.18.0.1',expires:this.clock+60000,fake:true};this.state.dnsRecords.push(record);
      this.emit('dns.fake',`Fake-IP 秒回假地址：先给浏览器发个占位 IP 198.18.0.1`,{host:this.source,record:clone(record),why:`本机代理开启了 Fake-IP 模式：不等去远端真查 DNS，立刻秒回一个保留地址 198.18.0.1 让浏览器赶紧发包，同时在代理内存里记下「198.18.0.1 其实就是 ${q.destination}」。`});resolved('198.18.0.1');
    } else if(this.config.dns.mode==='remote'&&!isIPv4(q.destination)&&this.config.proxy.tun) {
      this.ensureOuter(()=>this.resolve(this.proxy,q.destination,ip=>{this.resolvedIP=ip;this.emit('dns.relay',`远端代理查完 DNS，把结果 ${ip} 经加密隧道传回本机`,{host:this.source,why:'域名查询全程在海外代理节点完成，本地网络和运营商看不到你查了什么域名。'});resolved(ip);}));
    } else this.resolve(this.source,q.destination,resolved);
  }
  endpoint(host,ip,port){return {host,ip,port};}
  sourceIP(host,target) {if(target.startsWith('127.'))return '127.0.0.1';const r=this.route(host,target);return this.ip(host,r?.iface);}
  buildDirect(ip) {
    const q=this.config.request;
    if(q.kind==='udp'&&(q.count||1)>1){this.udpStream(ip);return;}
    if(q.kind==='ping'||q.kind==='udp'){this.datagram(ip);return;}
    const dest=ip.startsWith('127.')?this.hosts[this.source]:this.config.hosts.find(h=>this.hasIP(h.id,ip));
    const destination=dest?.id||this.id('unknown');
    if(!dest){this.fail('UNKNOWN_TARGET','目标地址不属于当前实验拓扑中的任何设备');return;}
    const a=this.endpoint(this.source,this.sourceIP(this.source,ip),51234),b=this.endpoint(destination,ip,q.port);
    this.open(a,b,'direct',rt=>this.application([rt],destination));
  }
  ensureOuter(complete) {
    if(this.outer){complete(this.outer);return;}
    const ip=this.ip(this.proxy),a=this.endpoint(this.source,this.sourceIP(this.source,ip),53000),b=this.endpoint(this.proxy,ip,this.config.proxy.port);
    this.open(a,b,'proxy',rt=>{
      this.outer=rt;
      if(this.config.proxy.transportTls)this.tls((side,size,meta,cb)=>this.data(rt,side,size,meta,cb),'代理隧道 TLS',[this.source,this.proxy],()=>complete(rt),true);
      else complete(rt);
    });
  }
  buildProxy(system) {
    const q=this.config.request;
    if(!['https','http','ssh'].includes(q.kind)){this.fail('PROXY_PROTOCOL','普通代理目前只支持转发 TCP 流量；如果要测 UDP 或 Ping，请切换到直连或 WireGuard VPN');return;}
    const a=this.endpoint(this.source,system?'127.0.0.1':this.sourceIP(this.source,this.originalIP),51234);
    const b=this.endpoint(this.source,system?'127.0.0.1':this.originalIP,system?this.config.proxy.localPort:q.port);
    this.open(a,b,'original',original=>{
      const begin=()=>{
      if(system)this.emit('http.connect',`浏览器发送 HTTP CONNECT：拜托本机代理帮忙连 ${q.destination}:${q.port}`,{host:this.source,connection:original.id,target:q.destination+':'+q.port,why:`因为浏览器走的是系统代理，它直接在报文里明文写上「CONNECT ${q.destination}:${q.port}」，所以本机代理不用猜就知道它想去哪个域名。`});
      const known=Object.hasOwn(this.config.dns.records,q.destination)?this.config.dns.records[q.destination]:'0.0.0.0';
      const action=this.proxyRule(q.destination,this.originalIP||known);
      const fakeMapped=this.config.dns.mode==='fake'&&this.originalIP==='198.18.0.1';
      const actionCN={proxy:'走代理隧道转发 (proxy)',direct:'绕过代理直接连接 (direct)',reject:'按规则拦截拒绝 (reject)'}[action]||action;
      this.emit('proxy.rule',`本机代理查分流规则：${q.destination} → ${actionCN}`,{host:this.source,action,why:fakeMapped?`注意：TCP/IP 包头里只有假地址 198.18.0.1，没有域名！本机代理全靠翻查刚才自己内存里记下的 Fake-IP 账本（198.18.0.1 → ${q.destination}），才认出真正要去的是 ${q.destination}，并命中「${actionCN}」规则。`:`本机代理从上往下核对分流规则表（按域名、后缀或 IP 段），决定这次请求是「${actionCN}」。`});
      if(action==='reject'){this.fail('POLICY_REJECT','分流规则命中 reject（拒绝访问），本机代理直接拦下了这次请求');return;}
      const connectTarget=(ip,remote)=>{
        this.resolvedIP=ip;const host=this.config.hosts.find(h=>this.hasIP(h.id,ip));
        if(!host){this.fail('UNKNOWN_TARGET','代理想要连接的目标地址不在当前实验拓扑里');return;}
        const from=remote?this.proxy:this.source;
        this.open(this.endpoint(from,this.sourceIP(from,ip),48720),this.endpoint(host.id,ip,q.port),'target',target=>{
          const ready=()=>this.application(remote?[original,this.outer,target]:[original,target],host.id);
          if(system)this.data(original,'b',39,{kind:'http',label:'HTTP CONNECT 200',text:'HTTP/1.1 200 Connection Established'},ready);else ready();
        });
      };
      if(action==='direct') {this.resolve(this.source,q.destination,ip=>connectTarget(ip,false));return;}
      this.ensureOuter(outer=>{
        const meta={kind:'proxy',label:'VLESS 代理指令与封装数据',target:q.destination+':'+q.port,text:fakeMapped?`反查 Fake-IP 还原真域名 (${q.destination}:${q.port}) + 代理密钥鉴权`:`告诉远端代理「请帮我连 ${q.destination}:${q.port}」+ 密钥鉴权`,encrypted:this.config.proxy.transportTls,note:'外层看只是发给代理服务器的加密包，不含原始 TCP/IP 包头'};
        this.data(outer,'a',64,meta,()=>{
          if(this.config.faults.proxyAuth||this.config.proxy.clientAuth!==this.config.proxy.serverAuth){this.fail('PROXY_AUTH','远端代理核对密钥失败（密码/UUID 不对），拒绝帮你转发连接',{host:this.proxy});return;}
          this.emit('proxy.target',`${this.hosts[this.proxy].name} 解密读取目标「${q.destination}:${q.port}」，准备代你连接目标网站`,{host:this.proxy,target:q.destination+':'+q.port,why:`中间的路由器只能看见你连了代理服务器（${this.ip(this.proxy)}）；直到包裹进了代理服务器内部解密后，代理才知道你真正想访问的是 ${q.destination}:${q.port}。`});
          if(this.resolvedIP)connectTarget(this.resolvedIP,true);else this.resolve(this.proxy,q.destination,ip=>connectTarget(ip,true));
        });
      });
      };
      if(system)this.data(original,'a',64,{kind:'http',label:'HTTP CONNECT 请求',target:q.destination+':'+q.port,text:'CONNECT '+q.destination+':'+q.port+' HTTP/1.1'},begin);else begin();
    },!system);
  }
  chain(connections,side,size,meta,complete) {
    const list=side==='a'?connections:[...connections].reverse();let index=0;
    const stream={id:this.id('stream'),direction:side,bytes:size,kind:meta.kind,connections:list.map(c=>c.id),delivered:[]};this.state.streams.push(stream);
    const next=()=>{
      if(index===list.length){complete();return;}
      const rt=list[index++];
      const relayTitle=rt.role==='proxy'?`本机代理换乘：把数据装进代理隧道 (${rt.id})`:rt.role==='target'?`远端代理换乘：把数据转发给目标网站 (${rt.id})`:rt.role==='original'&&side==='b'?`本机代理回传：把收到的响应写回浏览器连接 (${rt.id})`:`发送端把数据写入连接 (${rt.id})`;
      this.emit('stream.relay',relayTitle,{host:rt[side].host,connection:rt.id,streamId:stream.id,why:'注意看连接看板：代理转发并不是把原来的网络包直接踢过去，而是像“换乘高铁”一样——把上一段连接收到的字节流拆出来，重新用下一段连接的 IP、端口和序号打包发送。'});
      this.data(rt,side,size,{...meta,streamId:stream.id},()=>{stream.delivered.push(rt.id);next();});
    };
    next();
  }
  application(connections,destination) {
    const q=this.config.request;
    if(!this.hosts[destination].services.some(s=>s.enabled&&s.protocol==='TCP'&&s.port===q.port&&s.kind===q.kind)){this.fail('APPLICATION_PROTOCOL','目标服务器虽然连上了，但上面跑的服务类型跟你的请求协议对不上',{host:destination});return;}
    const exchange=()=>{
      const encrypted=q.kind==='https'||q.kind==='ssh';
      this.chain(connections,'a',q.bytes,{kind:q.kind==='https'?'tls':q.kind,label:q.kind.toUpperCase()+' 请求',encrypted,target:q.destination,text:encrypted?'端到端加密的请求内容':'GET / HTTP/1.1'},()=>{
        this.emit('application.request',`🎯 ${this.hosts[destination].name} 成功收齐全部 ${q.bytes} 字节请求，准备发回响应`,{host:destination,why:encrypted?'目标网站用自己的会话密钥解密出请求内容（中间经过的任何代理或路由器都无法解密这层内容），现在开始往回发响应数据。':'目标网站收到明文 HTTP 请求，开始往回发网页响应。'});
        this.chain(connections,'b',q.responseBytes,{kind:q.kind==='https'?'tls':q.kind,label:q.kind.toUpperCase()+' 响应',encrypted,target:q.destination,text:encrypted?'端到端加密的响应内容':'HTTP/1.1 200 OK'},()=>{
          this.emit('application.response',`🎉 发起应用已完整收到 ${q.responseBytes} 字节响应！接下来收尾关闭连接`,{host:this.source,unit:'app'});
          const closing=[...connections];const next=()=>{const rt=closing.shift();if(rt)this.close(rt,next);else this.succeed();};next();
        });
      });
    };
    if(q.kind==='https')this.tls((side,size,meta,cb)=>this.chain(connections,side,size,meta,cb),'浏览器 ↔ 目标网站 HTTPS',[this.source,destination],exchange);
    else if(q.kind==='ssh'){this.emit('ssh.handshake','SSH 加密会话握手完成，准备传输命令数据',{host:this.source,why:'底层 TCP 已经连上，双方完成 SSH 版本与密钥协商。'});exchange();}
    else exchange();
  }
  succeed(message='请求与响应全部圆满完成，所有 TCP 连接已正常挥手关闭',title='✅ 全流程圆满完成：请求已送达、响应已收回、连接已优雅关闭') {
    this.done=true;this.state.status='success';this.state.result={ok:true,code:'SUCCESS',message};
    this.emit('request.complete',title,{host:this.source});
  }
  datagram(ip) {
    const q=this.config.request,protocol=q.kind==='ping'?'ICMP':'UDP';let finished=false;
    const p=this.packet({ip:this.sourceIP(this.source,ip),port:protocol==='ICMP'?0:54000},{ip,port:protocol==='ICMP'?0:q.port},protocol,{payloadLength:q.bytes,length:q.bytes+28,icmpType:8,icmpId:1234,icmpSeq:1},{kind:q.kind,label:q.kind==='ping'?'ICMP Echo Request (Ping 请求)':'UDP 数据报',text:'固定实验测试数据'});
    this.sendIP(p,this.source,(received,at)=>{
      if(protocol==='UDP'&&!this.listener(at,q.port,'UDP')){this.fail('UDP_PORT_UNREACHABLE','目标设备的 UDP 端口没有监听服务',{host:at});return;}
      const reply=this.packet({ip:received.dst,port:received.dport},{ip:received.src,port:received.sport},protocol,{payloadLength:q.responseBytes,length:q.responseBytes+28,icmpType:0,icmpId:received.icmpId,icmpSeq:received.icmpSeq},{kind:q.kind,label:protocol==='ICMP'?'ICMP Echo Reply (Ping 回应)':'UDP 响应'});
      this.sendIP(reply,at,()=>{finished=true;this.succeed();});
    });
    this.schedule(this.config.transport.rto*4,()=>{if(!finished&&!this.done)this.fail(this.lastNetworkError?.code||'DATAGRAM_TIMEOUT',this.lastNetworkError?.message||'迟迟没有收到对方的回应（超时）');});
  }
  udpStream(ip) {
    const q=this.config.request,count=q.count,gap=10,stats={sent:0,received:0,echoed:0,outOfOrder:0,arrived:[],replied:[]};
    this.state.metrics.udp=stats;let highest=-1,finished=false;
    const finish=()=>{
      if(finished||this.done)return;finished=true;
      const lostRequests=[],lostReplies=[];
      for(let i=1;i<=count;i++){if(!stats.arrived.includes(i))lostRequests.push(i);else if(!stats.replied.includes(i))lostReplies.push(i);}
      const summary=`UDP 汇总：发出 ${count} 个，服务端收到 ${stats.received} 个，客户端收到回应 ${stats.echoed} 个；请求丢失 ${lostRequests.length?'#'+lostRequests.join(' #'):'无'}，回应丢失 ${lostReplies.length?'#'+lostReplies.join(' #'):'无'}，乱序到达 ${stats.outOfOrder} 次`;
      this.emit('udp.summary',summary,{host:this.source,unit:'app',why:'UDP 没有确认和重传：协议层不会补发任何丢失的数据报，是否需要补发、怎样排序，全部交给应用自己决定。这里只统计事实，不补发。'});
      if(!stats.echoed){this.fail(this.lastNetworkError?.code||'DATAGRAM_TIMEOUT',this.lastNetworkError?.message||'所有数据报都没有得到回应（UDP 不会重传）');return;}
      this.succeed(`${stats.echoed}/${count} 个数据报得到回应；丢失的 UDP 数据报不会被协议补发`,'✅ UDP 实验结束：已统计送达、丢失与乱序（没有重传）');
    };
    for(let i=0;i<count;i++)this.schedule(i*gap,()=>{
      if(this.done)return;
      const no=i+1,p=this.packet({ip:this.sourceIP(this.source,ip),port:54000},{ip,port:q.port},'UDP',{payloadLength:q.bytes,length:q.bytes+28},{kind:'udp',label:`UDP 数据报 #${no}/${count}`,text:`DGRAM ${no}/${count}`,datagram:no});
      stats.sent++;
      this.sendIP(p,this.source,(received,at)=>{
        if(!this.listener(at,q.port,'UDP')){this.fail('UDP_PORT_UNREACHABLE','目标设备的 UDP 端口没有监听服务',{host:at});return;}
        stats.received++;stats.arrived.push(no);
        const late=no<highest;highest=Math.max(highest,no);if(late)stats.outOfOrder++;
        this.emit('udp.deliver',late?`服务端收下 #${no}：乱序到达（已先收到 #${highest}）`:`服务端收下 #${no}（按到达顺序交给应用）`,{host:at,unit:'app',datagram:no,why:late?'这个数据报比后发出的包更晚到达。UDP 不排序，应用拿到的就是到达顺序；需要顺序的应用要自己加序号并重排。':'UDP 逐个数据报交给应用，每个数据报保持原有边界，不与前后报文合并。'});
        const reply=this.packet({ip:received.dst,port:received.dport},{ip:received.src,port:received.sport},'UDP',{payloadLength:q.responseBytes,length:q.responseBytes+28},{kind:'udp',label:`UDP 响应 #${no}`,text:`ECHO ${no}/${count}`,datagram:no});
        this.sendIP(reply,at,()=>{stats.echoed++;stats.replied.push(no);if(stats.echoed===count)finish();});
      });
    });
    this.schedule((count-1)*gap+this.config.transport.rto*2,finish);
  }
  wrap(inner,origin,receive) {
    if(!this.wgReady){this.wgQueue=this.wgQueue||[];this.wgQueue.push(()=>this.wrap(inner,origin,receive));if(!this.wgStarting)this.wgHandshake();return;}
    const peer=this.config.vpn.peer,forward=origin===this.source,to=forward?{host:peer,ip:this.ip(peer),port:this.config.vpn.port}:{host:this.source,ip:this.wgEndpoint.ip,port:this.wgEndpoint.port};
    const outer=this.packet({ip:this.ip(origin),port:this.config.vpn.port},to,'UDP',{payloadLength:inner.length+32,length:inner.length+60,inner:clone(inner)},{kind:'wireguard',label:'WireGuard 加密外层包',encrypted:true,innerId:inner.id});
    this.emitPacket('vpn.encapsulate',`VPN 套壳封装：把内层包 ${inner.id} 整个锁进外层 UDP 包 ${outer.id}`,outer,{host:origin,before:clone(inner),why:`这就是 VPN 和普通代理最大的区别：WireGuard 不拆开你的 TCP 连接，而是把原来的整个 IP 包（${inner.id}: ${inner.src} → ${inner.dst}）原封不动加密塞进外层 UDP 包（${outer.id}: 发往对端公网 ${to.ip}:${to.port}）里寄出去。`});
    this.sendIP(outer,origin,receive);
  }
  unwrap(outer,host,receive) {
    if(!this.config.vpn.keyValid){this.fail('VPN_KEY','WireGuard 对端密钥核对失败，拒绝解密数据包',{host});return;}
    const inner=clone(outer.inner);delete inner.meta.inject;
    this.emitPacket('vpn.decapsulate',`VPN 拆壳还原：从外层 ${outer.id} 解密取出原汁原味的内层包 ${inner.id}`,inner,{host,before:clone(outer),outerPacket:outer.id,why:`对端拆掉外层 UDP 外壳并解密，完好无损地拿回当初塞进去的同一个内层包 ${inner.id}（连包 ID、内网源目的 IP 和 TCP 序号都分毫不差）。`});
    this.emitPacket('tun.inject',`VPN 把还原出来的内层包 ${inner.id} 塞回虚拟网卡 TUN`,inner,{host,unit:'tun',why:'解封出来的内层包通过虚拟网卡 utun 交回内核，由内核交给本机监听的 SSH 或应用服务。'});
    this.forward(inner,host,receive,false);
  }
  wgHandshake() {
    this.wgStarting=true;const peer=this.config.vpn.peer;
    const tunnel={id:this.id('wireguard'),from:this.source,to:peer,phase:'INITIATION',logical:true};this.state.tunnels.push(tunnel);
    this.emit('vpn.handshake','WireGuard 隧道还没建立，先发包跟对端核对密钥（UDP 握手）',{host:this.source,tunnel:clone(tunnel),why:'在用 VPN 搬运内层包之前，两端要先通过 UDP 41641 端口互相核对公私钥、商定对称加密会话密钥。'});
    const init=this.packet({ip:this.ip(this.source),port:this.config.vpn.port},{ip:this.ip(peer),port:this.config.vpn.port},'UDP',{payloadLength:148,length:176},{kind:'wireguard-handshake',label:'WireGuard 握手发起'});
    this.sendIP(init,this.source,(p,at)=>{
      if(!this.listener(at,this.config.vpn.port,'UDP'))return;
      if(!this.config.vpn.keyValid){this.fail('VPN_KEY','WireGuard 密钥对不上！对端发现你的密钥无效，拒绝建立 VPN 隧道',{host:at});return;}
      this.wgEndpoint={ip:p.src,port:p.sport};
      const reply=this.packet({ip:p.dst,port:p.dport},{ip:p.src,port:p.sport},'UDP',{payloadLength:92,length:120},{kind:'wireguard-handshake',label:'WireGuard 握手回应'});
      this.sendIP(reply,at,()=>{this.wgReady=true;tunnel.phase='ESTABLISHED';this.emit('vpn.established','🛡️ WireGuard 加密隧道建立成功！开始搬运内层 IP 包',{host:this.source,tunnel:clone(tunnel)});for(const send of this.wgQueue)send();this.wgQueue=[];});
    });
    this.schedule(this.config.transport.rto*4,()=>{if(!this.wgReady&&!this.done)this.fail('VPN_TIMEOUT','WireGuard 握手超时：请检查 UDP 端口、网线或对端路由是否通畅');});
  }
  run() {
    this.start();let iterations=0;
    while(this.queue.length&&!this.done&&iterations++<12000&&this.events.length<3500) {
      this.queue.sort((a,b)=>a.at-b.at||a.order-b.order);const item=this.queue.shift();this.clock=item.at;item.fn();
    }
    if(!this.done)this.fail('EVENT_LIMIT',this.queue.length?'达到实验事件上限，请缩小数据量或检查配置':'没有后续事件，连接未能完成');
    return {config:clone(this.config),initial:this.initial,events:this.events,final:clone(this.state),result:clone(this.state.result)};
  }
}
function ipNumberLocal(ip){return ip.split('.').reduce((n,p)=>(n*256+ +p)>>>0,0);}
