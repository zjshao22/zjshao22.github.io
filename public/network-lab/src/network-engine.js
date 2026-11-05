import {clone,isIPv4,parseCIDR,longestMatch,validateConfig} from './network-config.js';
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
    this.state={time:0,status:'ready',result:null,hosts:clone(input.hosts),interfaces:input.hosts.flatMap(h=>h.interfaces.map(f=>({...f,host:h.id}))),routes:input.hosts.flatMap(h=>h.routes.map(r=>({...r,host:h.id}))),sockets:[],connections:[],packets:{},dnsRecords:[],nat:[],tls:[],tunnels:[],streams:[],metrics:{sent:0,delivered:0,dropped:0,retransmissions:0,bytes:0}};
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
    if(p.linkFrame)layers.push({type:'ethernet',name:'以太网帧首部（链路示意）',fields:{源MAC:p.linkFrame.srcMac,目的MAC:p.linkFrame.dstMac,EtherType:'0x0800',说明:'按点对点链路端点生成示例 MAC；不执行 ARP，FCS 未模拟'}});
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
    this.emitPacket('ip.send',`${this.hosts[origin].name} 生成 ${p.protocol} 报文`,p,{host:origin,unit:'kernel',why:'发送端为这条连接创建独立的 IP/传输层首部。'});
    if(p.meta.inject) {
      delete p.meta.inject;this.emitPacket('tun.inject','TUN 回注原始连接的响应',p,{host:origin,unit:'tun',why:'本地用户态栈为原始会话生成响应首部。'});
      this.schedule(1,()=>this.deliver(p,origin,receive));
    } else this.forward(p,origin,receive,false);
  }
  deliver(p,host,receive) {
    this.state.metrics.delivered++;
    this.emitPacket('ip.deliver',`${this.hosts[host].name} 将报文交给接收端`,p,{host,unit:'kernel'});
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
      this.emitPacket('nat.restore',p.innerError?'NAT 根据 ICMP 差错内嵌首部恢复内网目的地址':'NAT 根据返回映射恢复内网地址和端口',p,{host,before,why:p.innerError?'RFC 5508：网关读取 ICMP 差错内嵌的原包首部匹配 NAT 会话，将差错转发回内网发起端。':'使用协议、公网端口与远端端点匹配原会话。'});
    }
    if(this.hasIP(host,p.dst)) {
      if(p.inner)return this.unwrap(p,host,receive);
      return this.deliver(p,host,receive);
    }
    if(transit&&!h.forwarding) {
      this.emitPacket('ip.drop','中间设备没有开启 IP 转发',p,{host});this.state.metrics.dropped++;return;
    }
    if(transit) {
      const before=clone(p);p.ttl--;
      this.emitPacket('ip.ttl','路由器递减 TTL',p,{host,before});
      if(p.ttl<=0){this.icmpError(p,host,11,0,'TTL_EXCEEDED','TTL 耗尽，报文无法继续转发');return;}
    }
    const rule=this.route(host,p.dst);
    this.emitPacket('route.lookup',rule?`${h.name} 命中 ${rule.prefix}`:`${h.name} 无匹配路由`,p,{host,unit:'kernel',route:rule?{prefix:rule.prefix,iface:rule.iface,via:rule.via,metric:rule.metric}:null,why:'按最长前缀优先；前缀相同时使用较小 metric，仍相同则保持表中顺序。'});
    if(!rule){this.icmpError(p,host,3,0,'NO_ROUTE','找不到到 '+p.dst+' 的路由');return;}
    const device=h.interfaces.find(f=>f.id===rule.iface);
    if(!device.enabled){this.emitPacket('ip.drop','出口接口已关闭',p,{host});this.state.metrics.dropped++;return;}
    if(rule.iface==='utun') {
      this.emitPacket('tun.read','TUN 把完整 IP 数据报交给用户态',p,{host,unit:'tun'});
      if(this.config.vpn.enabled&&(host===this.source||host===this.config.vpn.peer))return this.wrap(p,host,receive);
      if(host===this.source&&this.config.proxy.tun) {
        if(p.connection&&this.runtime[p.connection]?.role==='original')return this.deliver(p,host,receive);
        this.fail('TUN_LOOP','代理自身的出站又命中 TUN：请为代理服务器添加更具体的物理出口路由（真实系统中 sing-box / Tailscale 也可通过 IP_BOUND_IF 绑定物理网卡、Linux SO_MARK 策略路由或进程排除避免回环）',{host,packet:clone(p),route:clone(rule)});return;
      }
      this.fail('TUN_UNAVAILABLE','路由选择了 TUN，但没有启用对应的代理或 VPN 处理程序',{host,packet:clone(p)});return;
    }
    const next=rule.via||this.config.links.filter(l=>l.enabled&&(l.a===host||l.b===host)).map(l=>l.a===host?l.b:l.a).find(id=>this.hasIP(id,p.dst));
    const link=this.config.links.find(l=>l.enabled&&((l.a===host&&l.b===next)||(l.b===host&&l.a===next)));
    if(!link){this.emitPacket('link.unreachable','所选下一跳没有可用链路',p,{host,route:clone(rule)});this.state.metrics.dropped++;return;}
    if(h.nat&&rule.iface===h.natInterface&&!mapping&&p.src!==this.ip(host,h.natInterface)) {
      let n=this.state.nat.find(n=>n.host===host&&n.protocol===p.protocol&&n.privateIP===p.src&&n.privatePort===(p.protocol==='ICMP'?p.icmpId:p.sport)&&n.remoteIP===p.dst&&n.remotePort===p.dport);
      const before=clone(p);
      if(!n){n={id:this.id('nat'),host,protocol:p.protocol,privateIP:p.src,privatePort:p.protocol==='ICMP'?p.icmpId:p.sport,publicIP:this.ip(host,h.natInterface),publicPort:62000+this.state.nat.length,remoteIP:p.dst,remotePort:p.dport};this.state.nat.push(n);}
      p.src=n.publicIP;if(p.protocol==='ICMP')p.icmpId=n.publicPort;else p.sport=n.publicPort;
      this.emitPacket('nat.translate','NAT 改写外层源地址与端口',p,{host,before,mapping:clone(n)});
    }
    if(p.length>link.mtu){this.icmpError(p,host,3,4,'MTU_EXCEEDED',`报文 ${p.length} 字节超过链路 MTU ${link.mtu}；DF 已设置`,{mtu:link.mtu});return;}
    const before=clone(p);p.path.push(host);
    const mac=id=>'02:00:00:00:'+String(this.config.hosts.findIndex(h=>h.id===id)+1).padStart(2,'0')+':01';
    p.linkFrame={srcMac:mac(host),dstMac:mac(next)};
    this.emitPacket('link.send',`${h.name} → ${this.hosts[next].name}`,p,{host,from:host,to:next,link:link.id,latency:link.latency,before,visibility:this.visibility(p)});
    const forced=this.config.faults.dropFirst&&!this.forcedDrop&&p.protocol==='TCP'&&p.flags==='SYN';
    if(forced)this.forcedDrop=true;
    if(forced||this.random()*100<link.loss) {
      this.schedule(link.latency,()=>{this.state.metrics.dropped++;this.emitPacket('link.drop','链路丢弃报文',p,{host:next,from:host,to:next,link:link.id,why:forced?'本次实验注入：丢弃第一个 TCP SYN':'固定随机种子按链路丢包率计算'});});return;
    }
    this.schedule(link.latency,()=>{
      this.emitPacket('link.receive',`${this.hosts[next].name} 收到报文`,p,{host:next,from:host,to:next,link:link.id,visibility:this.visibility(p)});
      const framed=clone(p);delete p.linkFrame;this.emitPacket('l2.decapsulate','接收接口移除当前链路的二层首部',p,{host:next,before:framed,unit:'kernel'});
      this.forward(p,next,receive,true);
    });
  }
  icmpError(p,host,type,code,error,message,extra={}) {
    this.state.metrics.dropped++;
    this.emitPacket('icmp.error',message,p,{host,code:error,icmp:{type,code,...extra},why:'中间设备检测到转发错误并生成 ICMP 差错反馈；当前模型不自动执行 IP 分片或 PMTUD 重分段。'});
    if(!this.lastNetworkError)this.lastNetworkError={code:error,message};
    if(!this.icmpReturnSent&&host!==this.source&&p.protocol!=='ICMP') {
      this.icmpReturnSent=true;
      const label=type===11?'ICMP Time Exceeded (TTL=0)':code===4?`ICMP Fragmentation Needed (MTU=${extra.mtu})`:'ICMP Destination Unreachable';
      const reply=this.packet({ip:this.ip(host),port:0},{ip:p.src,port:0},'ICMP',{icmpType:type,icmpCode:code,payloadLength:28,length:56,innerError:{id:p.id,src:p.src,dst:p.dst,sport:p.sport,dport:p.dport,protocol:p.protocol,icmpId:p.icmpId}},{kind:'icmp-error',label,target:p.dst,text:`${message}（引用原包 ${p.id}）`,note:'RFC 792 / RFC 1812：路由器将原 IP 首部与前 8 字节传输首部放入 ICMP 差错载荷发回源端；这也是 traceroute 获知沿途路由器 IP 的原理'});
      this.sendIP(reply,host,(received,at)=>this.emitPacket('icmp.receive',`${this.hosts[at].name} 收到路由器返回的 ${label}`,received,{host:at,unit:'kernel',why:`源地址 ${received.src} 即为报错路由器接口地址；应用或内核据此获知路径故障原因。`}));
    }
  }
  visibility(p) {
    const encrypted=p.meta.outerTls||p.meta.encrypted||p.meta.kind==='wireguard';
    return {链路可见:`${p.src}:${p.sport} → ${p.dst}:${p.dport} / ${p.protocol} / ${p.length} 字节`,应用内容:encrypted?'加密；当前链路不能读取':'未加密的应用载荷',域名:p.meta.kind==='dns'?p.meta.target:p.meta.outerTls||p.meta.kind==='wireguard'?'未从该载荷直接披露':p.meta.target||'未提供',限制:'不据此排除 DNS、SNI、指纹或流量分析带来的其他信息'};
  }
  resolve(host,name,callback) {
    if(isIPv4(name)){callback(name);return;}
    const cached=this.state.dnsRecords.find(r=>r.host===host&&r.name===name&&r.expires>this.clock);
    if(cached){this.emit('dns.cache','DNS 命中缓存',{host,record:clone(cached)});callback(cached.ip);return;}
    const queryId=this.id('dns'),from={ip:this.ip(host),port:53053+(this.counter.dns||0)},to={ip:this.ip(this.dnsHost),port:53};let finished=false;
    const p=this.packet(from,to,'UDP',{payloadLength:32+name.length,length:60+name.length},{kind:'dns',label:'DNS 查询',target:name,text:`QNAME=${name}; QTYPE=A`,queryId});
    this.emit('dns.query',`${this.hosts[host].name} 查询 ${name}`,{host,queryId,why:'DNS 缓存与权威答案为实验数据；查询路径通过当前路由与链路计算。'});
    this.sendIP(p,host,(received,at)=>{
      if(this.config.faults.dns||!this.listener(at,53,'UDP'))return;
      const answer=Object.hasOwn(this.config.dns.records,name)?this.config.dns.records[name]:undefined;
      const reply=this.packet({ip:received.dst,port:53},{ip:received.src,port:received.sport},'UDP',{payloadLength:48+name.length,length:76+name.length},{kind:'dns',label:'DNS 响应',target:name,text:answer?`${name} = ${answer}`:'NXDOMAIN',queryId});
      this.sendIP(reply,at,()=>{
        if(finished)return;finished=true;
        if(!answer){this.fail('DNS_NXDOMAIN','DNS 中不存在这个域名：'+name,{host});return;}
        const record={id:queryId,host,name,ip:answer,expires:this.clock+this.config.dns.ttl*1000};this.state.dnsRecords.push(record);
        this.emit('dns.answer','DNS 返回 '+answer,{host,record:clone(record)});callback(answer);
      });
    });
    this.schedule(this.config.transport.rto*4,()=>{if(!finished){finished=true;this.fail('DNS_TIMEOUT','DNS 查询超时：检查解析器服务、路由与链路',{host});}});
  }
  open(a,b,role,ready,virtual=false) {
    const id=this.id('connection'),index=this.counter.connection;
    const record={id,role,a:clone(a),b:clone(b),aState:'CLOSED',bState:'LISTEN',aNext:1000+index*10000,bNext:8000+index*10000,aRecv:8001+index*10000,bRecv:1001+index*10000,bytesAcked:0,virtual};
    const rt={id,role,a,b,record,pending:[],opened:false,ready,virtual,observed:{},receive:{a:record.aRecv,b:record.bRecv},buffer:{a:{},b:{}}};
    this.runtime[id]=rt;this.state.connections.push(record);
    this.state.sockets.push({id:this.id('socket'),connection:id,host:a.host,local:a.ip+':'+a.port,remote:b.ip+':'+b.port,role,state:'SYN-SENT'});
    this.state.sockets.push({id:this.id('socket'),connection:id,host:b.host,local:b.ip+':'+b.port,remote:a.ip+':'+a.port,role,state:'LISTEN'});
    this.change(rt,'a','SYN-SENT');
    this.emit('socket.create',`${role} 创建独立 TCP Socket`,{host:a.host,connection:id,unit:role==='original'?'app':'agent',why:'每条 TCP 连接拥有自己的四元组、序号、窗口与状态；转发字节不会保留上游的 TCP 首部。'});
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
      if(pending.tries>this.config.transport.retries){const e=this.lastNetworkError;this.fail(e?.code||'TCP_TIMEOUT',e?.message||`${rt.role} 等待确认超时，已重传 ${this.config.transport.retries} 次`,{connection:rt.id,host:rt[side].host});return;}
      if(pending.tries){this.state.metrics.retransmissions++;this.emit('tcp.retransmit','超时重传：保持相同的 TCP 序号',{host:rt[side].host,connection:rt.id,segment:pending.id,seq:start,attempt:pending.tries});}
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
    for(const p of list){rt.pending.splice(rt.pending.indexOf(p),1);rt.record.bytesAcked+=p.size;this.emit('tcp.ack','TCP 确认已收到的连续字节',{connection:rt.id,host:rt[side].host,ack,segment:p.id});p.acked();}
  }
  receiveSegment(rt,side,p) {
    const other=side==='a'?'b':'a';
    rt.observed[side]={ip:p.src,port:p.sport};
    rt.record[side+'Peer']=p.src+':'+p.sport;
    const socket=this.state.sockets.find(s=>s.connection===rt.id&&s.host===rt[side].host&&s.local===rt[side].ip+':'+rt[side].port);
    if(socket)socket.remote=rt.record[side+'Peer'];
    if(p.flags.includes('RST')){this.fail('CONNECTION_REFUSED',`${this.hosts[rt[side].host].name} 收到 RST：远端端口没有监听`,{host:rt[side].host,connection:rt.id});return;}
    if(p.flags==='SYN') {
      const accept=rt.virtual||this.listener(rt.b.host,rt.b.port,'TCP');
      if(!accept) {this.segment(rt,'b','RST,ACK',0,{kind:'tcp',label:'端口未监听'},0);return;}
      if(this.config.faults.targetBlocked&&['target','direct'].includes(rt.role))return;
      if(rt.record.bState==='LISTEN') {
        rt.receive.b=p.seq+1;rt.record.bRecv=rt.receive.b;this.change(rt,'b','SYN-RECEIVED');
        this.emit('tcp.state','接收 SYN，状态变为 SYN-RECEIVED',{host:rt.b.host,connection:rt.id});
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
      if(!rt.opened){rt.opened=true;this.emit('tcp.established','三次握手完成：'+rt.role,{host:rt.b.host,connection:rt.id});rt.ready(rt);}
    } else if(p.flags.includes('ACK'))this.acknowledge(rt,side,p.ack);
    if(p.payloadLength) {
      const expected=rt.receive[side];
      if(p.seq===expected) {
        rt.receive[side]+=p.payloadLength;
        while(rt.buffer[side][rt.receive[side]]){const size=rt.buffer[side][rt.receive[side]];delete rt.buffer[side][rt.receive[side]];rt.receive[side]+=size;}
        rt.record[side+'Recv']=rt.receive[side];
        this.state.metrics.bytes+=p.payloadLength;
        this.emitPacket('tcp.data','接收连续 TCP 字节',p,{host:rt[side].host,why:'确认号指向下一个期望字节；原始 IP/TCP 首部不属于应用字节流。'});
      } else {
        if(p.seq>expected)rt.buffer[side][p.seq]=p.payloadLength;
        this.emitPacket(p.seq<expected?'tcp.duplicate':'tcp.out-of-order',p.seq<expected?'重复段：不重复交付字节':'乱序段暂存，确认连续字节边界',p,{host:rt[side].host});
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
    const chunk=Math.min(this.config.transport.mss,this.config.transport.window),window=this.config.transport.window;
    let cursor=0,acked=0,inFlight=0,finished=false;
    const pump=()=>{
      if(finished||this.done)return;
      while(cursor<length&&inFlight<window) {
        const size=Math.min(chunk,length-cursor,window-inFlight);cursor+=size;inFlight+=size;
        this.reliable(rt,side,'PSH,ACK',size,meta,()=>{inFlight-=size;acked+=size;if(acked===length){finished=true;complete();}else pump();});
      }
    };
    pump();
  }
  close(rt,complete) {
    this.change(rt,'a','FIN-WAIT-1');this.emit('tcp.close','发起 TCP 四次挥手',{host:rt.a.host,connection:rt.id});
    this.reliable(rt,'a','FIN,ACK',0,{kind:'tcp',label:'FIN'},()=>{
      this.change(rt,'a','FIN-WAIT-2');this.change(rt,'b','LAST-ACK');
      this.reliable(rt,'b','FIN,ACK',0,{kind:'tcp',label:'FIN'},()=>{
        this.change(rt,'b','CLOSED');this.change(rt,'a','TIME-WAIT');
        this.emit('tcp.time-wait','发送端进入 TIME-WAIT，接收端已关闭',{host:rt.a.host,connection:rt.id,why:'TIME-WAIT 作为协议状态保留；不模拟真实 2MSL 的墙钟等待。'});complete();
      });
    });
  }
  tls(send,label,participants,complete,isProxy=false) {
    const session={id:this.id('tls'),label,role:isProxy?'proxy':'application',participants,phase:'CLIENT_HELLO',logical:true};this.state.tls.push(session);if(isProxy)this.proxyTls=session;
    this.emit('tls.client-hello',label+'：ClientHello',{host:participants[0],tls:clone(session),why:'按 TLS 1.3 协议阶段建模；不执行密钥交换、证书链验证或真实密码运算。'});
    send('a',128,{kind:'tls-handshake',label:label+' ClientHello',target:this.config.request.destination,encrypted:false},()=>{
      session.phase='SERVER_HELLO';this.emit('tls.server-hello',label+'：ServerHello / 证书 / Finished',{host:participants[1],tls:clone(session)});
      send('b',256,{kind:'tls-handshake',label:label+' ServerHello + 加密握手',encrypted:true},()=>{
        if(this.config.faults.certificate){session.phase='FAILED';this.fail('TLS_CERTIFICATE','TLS 证书策略校验失败（注入的逻辑校验结果）',{tls:clone(session),host:participants[0]});return;}
        session.phase='CERTIFICATE_ACCEPTED';this.emit('tls.certificate',label+'：证书策略接受',{host:participants[0],tls:clone(session)});
        send('a',64,{kind:'tls-handshake',label:label+' Finished',encrypted:true},()=>{session.phase='ESTABLISHED';this.emit('tls.established',label+' 已建立',{host:participants[0],tls:clone(session)});complete(session);});
      });
    });
  }
  proxyRule(target,ip) {
    return this.config.proxy.rules.find(r=>r.pattern==='*'||r.pattern===target||(r.pattern.startsWith('*.')&&target.endsWith(r.pattern.slice(1)))||(parseCIDR(r.pattern)&&((ipNumberLocal(ip)&parseCIDR(r.pattern).mask)>>>0)===parseCIDR(r.pattern).network))?.action||'direct';
  }
  start() {
    this.state.status='running';const q=this.config.request;
    this.emit('request.start',`发起 ${q.kind.toUpperCase()} 请求：${q.destination}`,{host:this.source,unit:'app'});
    const system=this.config.proxy.system&&q.usesSystemProxy&&['https','http'].includes(q.kind);
    if(system) {
      this.emit('proxy.system','应用读取系统代理，首先连接本机入口',{host:this.source,unit:'app',why:'应用遵从系统代理设置；CONNECT 中的目标域名可交给远端解析。'});
      this.originalIP=isIPv4(q.destination)?q.destination:null;this.buildProxy(true);return;
    }
    const resolved=ip=>{
      this.originalIP=ip;const r=this.route(this.source,ip);
      if(this.config.proxy.tun&&r?.iface==='utun'&&!this.config.vpn.enabled)this.buildProxy(false);
      else this.buildDirect(ip);
    };
    if(this.config.dns.mode==='fake'&&!isIPv4(q.destination)) {
      this.originalName=q.destination;this.state.dnsRecords.push({id:this.id('dns'),host:this.source,name:q.destination,ip:'198.18.0.1',expires:this.clock+60000,fake:true});
      this.emit('dns.fake','本地 fake-IP 映射：198.18.0.1',{host:this.source,why:`fake-IP 仅在本机生效：立即向应用返回占位地址 198.18.0.1，并在本机代理内存中记录 198.18.0.1 ↔ ${q.destination} 映射表；真实解析留待远端执行。`});resolved('198.18.0.1');
    } else if(this.config.dns.mode==='remote'&&!isIPv4(q.destination)&&this.config.proxy.tun) {
      this.ensureOuter(()=>this.resolve(this.proxy,q.destination,ip=>{this.resolvedIP=ip;this.emit('dns.relay','解析结果经已建立的代理通道交回应用',{host:this.source});resolved(ip);}));
    } else this.resolve(this.source,q.destination,resolved);
  }
  endpoint(host,ip,port){return {host,ip,port};}
  sourceIP(host,target) {if(target.startsWith('127.'))return '127.0.0.1';const r=this.route(host,target);return this.ip(host,r?.iface);}
  buildDirect(ip) {
    const q=this.config.request;
    if(q.kind==='ping'||q.kind==='udp'){this.datagram(ip);return;}
    const dest=ip.startsWith('127.')?this.hosts[this.source]:this.config.hosts.find(h=>this.hasIP(h.id,ip));
    const destination=dest?.id||this.id('unknown');
    if(!dest){this.fail('UNKNOWN_TARGET','目标地址不属于当前实验拓扑中的设备');return;}
    const a=this.endpoint(this.source,this.sourceIP(this.source,ip),51234),b=this.endpoint(destination,ip,q.port);
    this.open(a,b,'direct',rt=>this.application([rt],destination));
  }
  ensureOuter(complete) {
    if(this.outer){complete(this.outer);return;}
    const ip=this.ip(this.proxy),a=this.endpoint(this.source,this.sourceIP(this.source,ip),53000),b=this.endpoint(this.proxy,ip,this.config.proxy.port);
    this.open(a,b,'proxy',rt=>{
      this.outer=rt;
      if(this.config.proxy.transportTls)this.tls((side,size,meta,cb)=>this.data(rt,side,size,meta,cb),'代理 TLS',[this.source,this.proxy],()=>complete(rt),true);
      else complete(rt);
    });
  }
  buildProxy(system) {
    const q=this.config.request;
    if(!['https','http','ssh'].includes(q.kind)){this.fail('PROXY_PROTOCOL','普通代理模型当前只接受 TCP 应用；请用直连或 VPN 实验 UDP / ICMP');return;}
    const a=this.endpoint(this.source,system?'127.0.0.1':this.sourceIP(this.source,this.originalIP),51234);
    const b=this.endpoint(this.source,system?'127.0.0.1':this.originalIP,system?this.config.proxy.localPort:q.port);
    this.open(a,b,'original',original=>{
      const begin=()=>{
      if(system)this.emit('http.connect','HTTP CONNECT 传达目标域名与端口',{host:this.source,connection:original.id,target:q.destination+':'+q.port});
      const known=Object.hasOwn(this.config.dns.records,q.destination)?this.config.dns.records[q.destination]:'0.0.0.0';
      const action=this.proxyRule(q.destination,this.originalIP||known);
      const fakeMapped=this.config.dns.mode==='fake'&&this.originalIP==='198.18.0.1';
      this.emit('proxy.rule','代理规则选择：'+action,{host:this.source,action,why:fakeMapped?`原始 TCP 包目的 IP 仅为 198.18.0.1（IP/TCP 首部不含域名）；本机代理通过反查 fake-IP 映射表（198.18.0.1 → ${q.destination}）还原域名并匹配规则。`:'按规则表顺序匹配域名、后缀或 CIDR，决定走代理、直连或拒绝。'});
      if(action==='reject'){this.fail('POLICY_REJECT','代理规则拒绝这个目标');return;}
      const connectTarget=(ip,remote)=>{
        this.resolvedIP=ip;const host=this.config.hosts.find(h=>this.hasIP(h.id,ip));
        if(!host){this.fail('UNKNOWN_TARGET','代理目标不属于实验拓扑');return;}
        const from=remote?this.proxy:this.source;
        this.open(this.endpoint(from,this.sourceIP(from,ip),48720),this.endpoint(host.id,ip,q.port),'target',target=>{
          const ready=()=>this.application(remote?[original,this.outer,target]:[original,target],host.id);
          if(system)this.data(original,'b',39,{kind:'http',label:'HTTP CONNECT 200',text:'HTTP/1.1 200 Connection Established'},ready);else ready();
        });
      };
      if(action==='direct') {this.resolve(this.source,q.destination,ip=>connectTarget(ip,false));return;}
      this.ensureOuter(outer=>{
        const meta={kind:'proxy',label:'VLESS 目标与字节流（逻辑）',target:q.destination+':'+q.port,text:fakeMapped?`反查 fake-IP (198.18.0.1 → ${q.destination}:${q.port}) + 鉴权信息 + 待转发字节`:'连接目标 + 鉴权信息 + 待转发字节',encrypted:this.config.proxy.transportTls,note:'不包含原始 IP/TCP 首部'};
        this.data(outer,'a',64,meta,()=>{
          if(this.config.faults.proxyAuth||this.config.proxy.clientAuth!==this.config.proxy.serverAuth){this.fail('PROXY_AUTH','远端代理拒绝认证，无法创建目标连接',{host:this.proxy});return;}
          this.emit('proxy.target','远端代理读取目标并创建新的 TCP 连接',{host:this.proxy,target:q.destination+':'+q.port,why:'外层 IP 只指向代理；网站目标在代理协议中传达。'});
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
      this.emit('stream.relay','把字节流写入 '+rt.id,{host:rt[side].host,connection:rt.id,streamId:stream.id,why:'保持应用字节关联；下一条连接重新生成自己的 TCP/IP 首部。'});
      this.data(rt,side,size,{...meta,streamId:stream.id},()=>{stream.delivered.push(rt.id);next();});
    };
    next();
  }
  application(connections,destination) {
    const q=this.config.request;
    if(!this.hosts[destination].services.some(s=>s.enabled&&s.protocol==='TCP'&&s.port===q.port&&s.kind===q.kind)){this.fail('APPLICATION_PROTOCOL','目标监听服务与请求的应用协议不匹配',{host:destination});return;}
    const exchange=()=>{
      const encrypted=q.kind==='https'||q.kind==='ssh';
      this.chain(connections,'a',q.bytes,{kind:q.kind==='https'?'tls':q.kind,label:q.kind.toUpperCase()+' 请求',encrypted,target:q.destination,text:encrypted?'逻辑加密应用字节':'GET / HTTP/1.1'},()=>{
        this.emit('application.request','目标应用收到请求字节',{host:destination,why:encrypted?'由目标应用持有的会话解密；中间代理仅转发。':'HTTP 明文交给目标服务。'});
        this.chain(connections,'b',q.responseBytes,{kind:q.kind==='https'?'tls':q.kind,label:q.kind.toUpperCase()+' 响应',encrypted,target:q.destination,text:encrypted?'逻辑加密响应字节':'HTTP/1.1 200 OK'},()=>{
          this.emit('application.response','响应已返回发起应用',{host:this.source,unit:'app'});
          const closing=[...connections];const next=()=>{const rt=closing.shift();if(rt)this.close(rt,next);else this.succeed();};next();
        });
      });
    };
    if(q.kind==='https')this.tls((side,size,meta,cb)=>this.chain(connections,side,size,meta,cb),'浏览器 ↔ 目标 HTTPS TLS',[this.source,destination],exchange);
    else if(q.kind==='ssh'){this.emit('ssh.handshake','SSH 应用加密会话建立（逻辑阶段）',{host:this.source,why:'TCP 传输已建立；本模型不实施真实 SSH 密钥交换。'});exchange();}
    else exchange();
  }
  succeed() {
    this.done=true;this.state.status='success';this.state.result={ok:true,code:'SUCCESS',message:'请求与响应已完成，TCP 连接已关闭或进入 TIME-WAIT'};
    this.emit('request.complete','实验成功：请求与回程闭环完成',{host:this.source});
  }
  datagram(ip) {
    const q=this.config.request,protocol=q.kind==='ping'?'ICMP':'UDP';let finished=false;
    const p=this.packet({ip:this.sourceIP(this.source,ip),port:protocol==='ICMP'?0:54000},{ip,port:protocol==='ICMP'?0:q.port},protocol,{payloadLength:q.bytes,length:q.bytes+28,icmpType:8,icmpId:1234,icmpSeq:1},{kind:q.kind,label:q.kind==='ping'?'ICMP Echo Request':'UDP 数据报',text:'固定实验数据'});
    this.sendIP(p,this.source,(received,at)=>{
      if(protocol==='UDP'&&!this.listener(at,q.port,'UDP')){this.fail('UDP_PORT_UNREACHABLE','UDP 目标端口未监听',{host:at});return;}
      const reply=this.packet({ip:received.dst,port:received.dport},{ip:received.src,port:received.sport},protocol,{payloadLength:q.responseBytes,length:q.responseBytes+28,icmpType:0,icmpId:received.icmpId,icmpSeq:received.icmpSeq},{kind:q.kind,label:protocol==='ICMP'?'ICMP Echo Reply':'UDP 响应'});
      this.sendIP(reply,at,()=>{finished=true;this.succeed();});
    });
    this.schedule(this.config.transport.rto*4,()=>{if(!finished&&!this.done)this.fail(this.lastNetworkError?.code||'DATAGRAM_TIMEOUT',this.lastNetworkError?.message||'等待数据报响应超时');});
  }
  wrap(inner,origin,receive) {
    if(!this.wgReady){this.wgQueue=this.wgQueue||[];this.wgQueue.push(()=>this.wrap(inner,origin,receive));if(!this.wgStarting)this.wgHandshake();return;}
    const peer=this.config.vpn.peer,forward=origin===this.source,to=forward?{host:peer,ip:this.ip(peer),port:this.config.vpn.port}:{host:this.source,ip:this.wgEndpoint.ip,port:this.wgEndpoint.port};
    const outer=this.packet({ip:this.ip(origin),port:this.config.vpn.port},to,'UDP',{payloadLength:inner.length+32,length:inner.length+60,inner:clone(inner)},{kind:'wireguard',label:'WireGuard 传输数据',encrypted:true,innerId:inner.id});
    this.emitPacket('vpn.encapsulate','把完整内层 IP 包封装为 WireGuard / UDP',outer,{host:origin,before:clone(inner),why:'内层包标识与首部保留在加密载荷中；外层拥有独立公网目的地址。'});
    this.sendIP(outer,origin,receive);
  }
  unwrap(outer,host,receive) {
    if(!this.config.vpn.keyValid){this.fail('VPN_KEY','WireGuard 对端密钥校验失败（逻辑结果）',{host});return;}
    const inner=clone(outer.inner);delete inner.meta.inject;
    this.emitPacket('vpn.decapsulate','WireGuard 恢复同一个内层 IP 数据报',inner,{host,before:clone(outer),outerPacket:outer.id,why:'解密前后的内层 packet ID 与 IP/传输层字段保持一致。'});
    this.emitPacket('tun.inject','VPN 将恢复的内层 IP 包回注内核',inner,{host,unit:'tun'});
    this.forward(inner,host,receive,false);
  }
  wgHandshake() {
    this.wgStarting=true;const peer=this.config.vpn.peer;
    const tunnel={id:this.id('wireguard'),from:this.source,to:peer,phase:'INITIATION',logical:true};this.state.tunnels.push(tunnel);
    this.emit('vpn.handshake','WireGuard 握手发起（逻辑阶段）',{host:this.source,tunnel:clone(tunnel)});
    const init=this.packet({ip:this.ip(this.source),port:this.config.vpn.port},{ip:this.ip(peer),port:this.config.vpn.port},'UDP',{payloadLength:148,length:176},{kind:'wireguard-handshake',label:'Handshake Initiation'});
    this.sendIP(init,this.source,(p,at)=>{
      if(!this.listener(at,this.config.vpn.port,'UDP'))return;
      if(!this.config.vpn.keyValid){this.fail('VPN_KEY','WireGuard 对端密钥校验失败（逻辑结果）',{host:at});return;}
      this.wgEndpoint={ip:p.src,port:p.sport};
      const reply=this.packet({ip:p.dst,port:p.dport},{ip:p.src,port:p.sport},'UDP',{payloadLength:92,length:120},{kind:'wireguard-handshake',label:'Handshake Response'});
      this.sendIP(reply,at,()=>{this.wgReady=true;tunnel.phase='ESTABLISHED';this.emit('vpn.established','WireGuard 隧道建立，开始发送完整内层包',{host:this.source,tunnel:clone(tunnel)});for(const send of this.wgQueue)send();this.wgQueue=[];});
    });
    this.schedule(this.config.transport.rto*4,()=>{if(!this.wgReady&&!this.done)this.fail('VPN_TIMEOUT','WireGuard 握手超时：检查 UDP 端口、链路与对端路由');});
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
