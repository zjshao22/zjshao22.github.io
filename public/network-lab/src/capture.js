// Capture parsing is deliberately independent from the simulation model.
const ip4=(b,o)=>[...b.slice(o,o+4)].join('.');
const ip6=(b,o)=>Array.from({length:8},(_,i)=>(b[o+i*2]*256+b[o+i*2+1]).toString(16)).join(':');
const flags=n=>[[2,'SYN'],[16,'ACK'],[1,'FIN'],[4,'RST'],[8,'PSH'],[32,'URG']].filter(([bit])=>n&bit).map(([,s])=>s).join(',');
const u16=(b,o)=>b[o]*256+b[o+1];
export function decodePacket(bytes,linkType=101) {
  const b=new Uint8Array(bytes),v=new DataView(b.buffer,b.byteOffset,b.byteLength);let offset=0,ethertype;
  if(linkType===1) {
    if(b.length<14)return {summary:'截断的以太网帧',layers:[]};
    ethertype=u16(b,12);offset=14;
    while([0x8100,0x88a8].includes(ethertype)&&b.length>=offset+4){ethertype=u16(b,offset+2);offset+=4;}
  } else if([0,108].includes(linkType))offset=4;
  else if(linkType===113){if(b.length<16)return {summary:'截断的 Linux SLL',layers:[]};ethertype=u16(b,14);offset=16;}
  else if(linkType===276){if(b.length<20)return {summary:'截断的 Linux SLL2',layers:[]};ethertype=u16(b,0);offset=20;}
  else if(![101,228,229].includes(linkType))return {summary:'未解码的链路类型 '+linkType,layers:[],unsupported:true};
  if(ethertype&&![0x0800,0x86dd].includes(ethertype))return {summary:'非 IP 帧 0x'+ethertype.toString(16),layers:[],unsupported:true};
  if(offset>=b.length)return {summary:'截断的网络首部',layers:[]};
  const version=b[offset]>>4,layers=[];let src,dst,protocol,end;
  if(version===4) {
    if(b.length<offset+20)return {summary:'截断的 IPv4 首部',layers};
    const ihl=(b[offset]&15)*4,length=u16(b,offset+2),fragment=u16(b,offset+6);
    if(ihl<20||length<ihl||b.length<offset+ihl)return {summary:'无效 IPv4 首部长度',layers};
    src=ip4(b,offset+12);dst=ip4(b,offset+16);protocol=b[offset+9];end=Math.min(b.length,offset+length);
    layers.push({name:'IPv4',fields:{源地址:src,目的地址:dst,TTL:b[offset+8],首部长度:ihl,总长度:length,协议:protocol,片偏移:fragment&8191}});
    offset+=ihl;
    if(fragment&8191)return {version,src,dst,protocol:'IPv4 fragment',summary:`${src} → ${dst} / 非首片`,layers,fragment:true};
  } else if(version===6) {
    if(b.length<offset+40)return {summary:'截断的 IPv6 首部',layers};
    src=ip6(b,offset+8);dst=ip6(b,offset+24);protocol=b[offset+6];end=Math.min(b.length,offset+40+u16(b,offset+4));
    layers.push({name:'IPv6',fields:{源地址:src,目的地址:dst,跳数限制:b[offset+7],载荷长度:u16(b,offset+4),下一首部:protocol}});offset+=40;
    let extensions=0;
    while([0,43,60,44,51].includes(protocol)&&offset+8<=end&&extensions++<12) {
      const current=protocol;protocol=b[offset];
      if(current===44&&u16(b,offset+2)>>3)return {version,src,dst,protocol:'IPv6 fragment',summary:`${src} → ${dst} / 非首片`,layers,fragment:true};
      const size=current===44?8:current===51?(b[offset+1]+2)*4:(b[offset+1]+1)*8;
      if(size<8||offset+size>end)return {summary:'截断的 IPv6 扩展首部',layers};offset+=size;
    }
  } else return {summary:'未解码的网络版本 '+version,layers,unsupported:true};
  let sport=0,dport=0,transport=({1:'ICMP',6:'TCP',17:'UDP',58:'ICMPv6'})[protocol]||'IP '+protocol,payload=offset;
  if(protocol===6&&offset+20<=end) {
    sport=u16(b,offset);dport=u16(b,offset+2);const header=(b[offset+12]>>4)*4;
    if(header<20||offset+header>end)return {summary:'截断或无效的 TCP 首部',layers,src,dst};
    layers.push({name:'TCP',fields:{源端口:sport,目的端口:dport,序号:v.getUint32(offset+4),确认号:v.getUint32(offset+8),标志:flags(b[offset+13]),窗口:u16(b,offset+14),首部长度:header}});payload=offset+header;
  } else if(protocol===17&&offset+8<=end) {
    sport=u16(b,offset);dport=u16(b,offset+2);const length=u16(b,offset+4);end=Math.min(end,offset+length);payload=offset+8;
    layers.push({name:'UDP',fields:{源端口:sport,目的端口:dport,长度:length}});
  } else if([1,58].includes(protocol)&&offset+4<=end)layers.push({name:transport,fields:{类型:b[offset],代码:b[offset+1]}});
  else if([6,17].includes(protocol))return {summary:'截断的 '+transport+' 首部',layers,src,dst};
  let application='';
  if((sport===53||dport===53)&&protocol===17&&payload+12<=end) {
    const dns=b.slice(payload,end),name=readDNSName(dns,12);
    const response=(dns[2]&128)!==0;application='DNS';layers.push({name:'DNS',fields:{查询标识:u16(dns,0),类型:response?'响应':'查询',问题:name,问题数量:u16(dns,4),回答数量:u16(dns,6),返回码:dns[3]&15}});
  } else if(protocol===6&&payload+5<=end&&b[payload]>=20&&b[payload]<=23&&b[payload+1]===3) {
    application='TLS';layers.push({name:'TLS Record（未解密）',fields:{类型:b[payload],版本:`${b[payload+1]}.${b[payload+2]}`,声明长度:u16(b,payload+3),说明:'仅解析当前分组内可见的记录首部；未执行 TCP 重组或 TLS 解密'}});
  }
  return {version,src,dst,sport,dport,protocol:transport,application,summary:`${src}${sport?':'+sport:''} → ${dst}${dport?':'+dport:''} / ${application||transport}`,layers,payloadLength:Math.max(0,end-payload),encrypted:application==='TLS'};
}
function readDNSName(b,start) {
  let offset=start,jumps=0;const labels=[],seen=new Set();
  while(offset<b.length&&labels.length<128) {
    const size=b[offset++];if(size===0)return labels.join('.');
    if((size&192)===192) {
      if(offset>=b.length||jumps++>32)return '[无效压缩指针]';
      const pointer=((size&63)<<8)|b[offset];if(seen.has(pointer))return '[循环压缩指针]';seen.add(pointer);offset=pointer;
    } else {
      if(size>63||offset+size>b.length)return '[截断域名]';
      labels.push(new TextDecoder().decode(b.slice(offset,offset+size)));offset+=size;
    }
  }
  return '[截断域名]';
}
export function parseCapture(buffer) {
  if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<12)throw new Error('文件太短，无法识别抓包格式');
  if(buffer.byteLength>32*1024*1024)throw new Error('单次导入上限为 32 MB');
  const view=new DataView(buffer),bytes=new Uint8Array(buffer),packets=[],warnings=[];let format;
  const add=(time,offset,length,originalLength,linkType,iface=0)=>{
    if(packets.length>=10000)throw new Error('单次最多读取 10000 个分组，请先裁剪抓包文件');
    if(offset+length>buffer.byteLength)throw new Error('抓包记录长度超出文件边界');
    const raw=bytes.slice(offset,offset+length);packets.push({id:'capture-'+(packets.length+1),time,interface:iface,linkType,caplen:length,originalLength,raw,...decodePacket(raw,linkType)});
  };
  const magic=view.getUint32(0,false);
  if([0xa1b2c3d4,0xd4c3b2a1,0xa1b23c4d,0x4d3cb2a1].includes(magic)) {
    format='pcap';if(buffer.byteLength<24)throw new Error('pcap 全局首部不完整');
    const le=[0xd4c3b2a1,0x4d3cb2a1].includes(magic),nano=[0xa1b23c4d,0x4d3cb2a1].includes(magic),linkType=view.getUint32(20,le)&0xffff;
    let offset=24;
    while(offset<buffer.byteLength) {
      if(offset+16>buffer.byteLength)throw new Error('pcap 分组首部被截断');
      const sec=view.getUint32(offset,le),fraction=view.getUint32(offset+4,le),caplen=view.getUint32(offset+8,le),original=view.getUint32(offset+12,le);
      if(caplen>original)throw new Error('pcap 捕获长度大于原始分组长度');
      add(sec*1000+fraction/(nano?1e6:1e3),offset+16,caplen,original,linkType);offset+=16+caplen;
    }
  } else if(magic===0x0a0d0d0a) {
    format='pcapng';let offset=0,le=true,interfaces=[],section=false;
    while(offset<buffer.byteLength) {
      if(offset+12>buffer.byteLength)throw new Error('pcapng 块首部被截断');
      const shb=view.getUint32(offset,false)===0x0a0d0d0a;
      if(shb) {
        const bom=view.getUint32(offset+8,false);if(![0x1a2b3c4d,0x4d3c2b1a].includes(bom))throw new Error('pcapng 字节序标记无效');
        le=bom===0x4d3c2b1a;interfaces=[];section=true;
      }
      if(!section)throw new Error('pcapng 缺少 Section Header');
      const type=view.getUint32(offset,le),length=view.getUint32(offset+4,le);
      if(length<12||length%4||offset+length>buffer.byteLength||view.getUint32(offset+length-4,le)!==length)throw new Error('pcapng 块长度或尾部校验无效');
      if(shb&&length<28)throw new Error('pcapng Section Header 不完整');
      if(type===1) {
        if(length<20)throw new Error('pcapng 接口块不完整');
        const f={linkType:view.getUint16(offset+8,le),snaplen:view.getUint32(offset+12,le),resolution:1e-6,timeOffset:0};
        for(let at=offset+16;at+4<=offset+length-4;) {
          const code=view.getUint16(at,le),n=view.getUint16(at+2,le);at+=4;
          if(!code)break;if(at+n>offset+length-4)throw new Error('pcapng 接口选项被截断');
          if(code===9&&n===1)f.resolution=bytes[at]&128?2**-(bytes[at]&127):10**-bytes[at];
          if(code===14&&n===8)f.timeOffset=Number(view.getBigInt64(at,le));
          at+=(n+3)&~3;
        }
        interfaces.push(f);
      } else if(type===6||type===2) {
        if(length<32)throw new Error('pcapng 分组块不完整');
        const index=type===6?view.getUint32(offset+8,le):view.getUint16(offset+8,le),f=interfaces[index];
        if(!f)throw new Error('pcapng 分组引用不存在的接口');
        const high=view.getUint32(offset+12,le),low=view.getUint32(offset+16,le),caplen=view.getUint32(offset+20,le),original=view.getUint32(offset+24,le);
        if(caplen>original||28+((caplen+3)&~3)+4>length)throw new Error('pcapng 分组数据长度无效');
        add(((high*4294967296+low)*f.resolution+f.timeOffset)*1000,offset+28,caplen,original,f.linkType,index);
      } else if(type===3) {
        if(length<16||!interfaces[0])throw new Error('pcapng Simple Packet Block 缺少接口或数据');
        const original=view.getUint32(offset+8,le),f=interfaces[0],caplen=Math.min(original,f.snaplen||original);
        if(12+((caplen+3)&~3)+4>length)throw new Error('pcapng Simple Packet Block 被截断');
        add(packets.at(-1)?.time||0,offset+12,caplen,original,f.linkType);warnings.push('Simple Packet Block 没有时间戳，使用前一条时间。');
      }
      offset+=length;
    }
  } else throw new Error('无法识别文件：请选择 pcap 或 pcapng');
  const first=packets[0]?.time||0;for(const p of packets)p.relativeTime=p.time-first;
  return {format,packets,warnings:[...new Set(warnings)],source:'capture',note:'原始抓包仅在本地读取；未重组 TCP、未解密 TLS / SSH / WireGuard。'};
}
function checksum(bytes) {
  let sum=0;for(let i=0;i<bytes.length;i+=2)sum+=(bytes[i]<<8)|(bytes[i+1]||0);
  while(sum>>16)sum=(sum&65535)+(sum>>16);return (~sum)&65535;
}
export function encodePacket(p) {
  const proto={TCP:6,UDP:17,ICMP:1}[p.protocol],header=p.protocol==='TCP'?20:8,payload=p.payloadLength||0;
  const bytes=new Uint8Array(20+header+payload),v=new DataView(bytes.buffer);bytes[0]=0x45;v.setUint16(2,bytes.length);v.setUint16(4,Number(p.id?.split('-').at(-1))&65535);v.setUint16(6,p.df?0x4000:0);bytes[8]=p.ttl;bytes[9]=proto;
  bytes.set(p.src.split('.').map(Number),12);bytes.set(p.dst.split('.').map(Number),16);v.setUint16(10,checksum(bytes.slice(0,20)));
  if(proto===6||proto===17) {
    v.setUint16(20,p.sport);v.setUint16(22,p.dport);
    if(proto===6){v.setUint32(24,p.seq);v.setUint32(28,p.ack);bytes[32]=0x50;bytes[33]=[['FIN',1],['SYN',2],['RST',4],['PSH',8],['ACK',16]].reduce((n,[flag,bit])=>n|(p.flags.includes(flag)?bit:0),0);v.setUint16(34,p.window);}
    else v.setUint16(24,8+payload);
    const pseudo=new Uint8Array(12+header+payload);pseudo.set(bytes.slice(12,20));pseudo[9]=proto;new DataView(pseudo.buffer).setUint16(10,header+payload);pseudo.set(bytes.slice(20),12);v.setUint16(proto===6?36:26,checksum(pseudo)||65535);
  } else {bytes[20]=p.icmpType??8;bytes[21]=p.icmpCode??0;v.setUint16(24,p.icmpId||0);v.setUint16(26,p.icmpSeq||1);v.setUint16(22,checksum(bytes.slice(20)));}
  return bytes;
}
export function exportPcap(events) {
  const records=events.filter(e=>e.type==='link.send').map(e=>({time:e.time,bytes:encodePacket(e.packet)}));
  const bytes=new Uint8Array(24+records.reduce((n,r)=>n+16+r.bytes.length,0)),v=new DataView(bytes.buffer);v.setUint32(0,0xa1b2c3d4,true);v.setUint16(4,2,true);v.setUint16(6,4,true);v.setUint32(16,65535,true);v.setUint32(20,101,true);let at=24;
  for(const r of records){v.setUint32(at,Math.floor(r.time/1000),true);v.setUint32(at+4,Math.round(r.time%1000*1000),true);v.setUint32(at+8,r.bytes.length,true);v.setUint32(at+12,r.bytes.length,true);bytes.set(r.bytes,at+16);at+=16+r.bytes.length;}
  return bytes;
}
export function hexDump(bytes) {return Array.from({length:Math.ceil(bytes.length/16)},(_,i)=>`${(i*16).toString(16).padStart(4,'0')}  ${[...bytes.slice(i*16,i*16+16)].map(n=>n.toString(16).padStart(2,'0')).join(' ')}`).join('\n');}
