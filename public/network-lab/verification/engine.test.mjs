import test from 'node:test';
import assert from 'node:assert/strict';
import {preset,PRESETS,parseCIDR,longestMatch,validateConfig,newHost} from '../src/network-config.js';
import {simulate} from '../src/network-engine.js';
const run=(name,change=()=>{})=>{const c=preset(name);change(c);return simulate(c);};
const standard=Object.fromEntries(['direct','tun','system','tail'].map(name=>[name,run(name)]));
for(const [name,r] of Object.entries(standard))test(name+' completes computed request, response and TCP close',()=>{
 assert.equal(r.result.ok,true);assert.ok(r.events.length>100);assert.ok(r.final.connections.every(c=>c.aState==='TIME-WAIT'&&c.bState==='CLOSED'));
 assert.equal(r.initial.connections.length,0);assert.equal(r.events[0].snapshot.connections.length,0);assert.equal(r.events[0].snapshot.status,'running');
 assert.ok(r.events.every((e,i)=>!i||e.time>=r.events[i-1].time));
});
test('longest prefix and metric determine route',()=>{
 const routes=[['0.0.0.0/0',1],['128.0.0.0/1',2],['203.0.113.10/32',100],['203.0.113.10/32',10]].map(([prefix,metric])=>({prefix,metric,parsed:parseCIDR(prefix)}));
 assert.equal(longestMatch(routes,'203.0.113.10').metric,10);assert.equal(longestMatch(routes,'142.250.72.14').prefix,'128.0.0.0/1');assert.equal(parseCIDR('300.2.3.4/24'),null);assert.equal(parseCIDR('1.2.3.4/33'),null);
});
test('proxy uses three independent TCP sequences; outer destination is proxy',()=>{
 const r=standard.tun;assert.deepEqual(r.final.connections.map(c=>c.role),['original','proxy','target']);
 assert.equal(new Set(r.final.connections.map(c=>c.aNext)).size,3);
 const outer=r.events.find(e=>e.type==='link.send'&&e.packet.connection===r.final.connections[1].id);assert.equal(outer.packet.dst,'203.0.113.10');assert.notEqual(outer.packet.dst,'142.250.72.14');
 assert.ok(r.final.streams.some(s=>s.connections.length===3));assert.ok(r.events.some(e=>e.packet?.meta.outerTls&&e.packet.meta.kind==='tls-handshake'));
});
test('NAT mappings return through public address and restore exact tuple',()=>{
 const r=standard.direct,translated=r.events.find(e=>e.type==='nat.translate'&&e.packet.protocol==='TCP'),restored=r.events.find(e=>e.type==='nat.restore'&&e.packet.protocol==='TCP');
 assert.equal(translated.before.src,'192.168.1.10');assert.equal(translated.packet.src,'198.51.100.25');assert.equal(restored.packet.dst,'192.168.1.10');assert.equal(restored.packet.dport,51234);assert.equal(translated.before.src,'192.168.1.10');
 assert.ok(r.events.some(e=>e.type==='link.send'&&e.packet.layers[0].type==='ethernet'));assert.ok(r.events.some(e=>e.type==='l2.decapsulate'&&e.packet.layers[0].type==='ip'));
});
test('removing proxy /32 changes real computed route and terminates loop',()=>{const r=run('tun',c=>c.hosts[0].routes=c.hosts[0].routes.filter(r=>r.prefix!=='203.0.113.10/32'));assert.equal(r.result.code,'TUN_LOOP');assert.ok(r.events.length<100);});
test('TUN disabled with system proxy enabled still works after routes are removed',()=>{const r=run('tun',c=>{c.proxy.tun=false;c.proxy.system=true;c.hosts[0].routes=c.hosts[0].routes.filter(r=>r.iface!=='utun');});assert.equal(r.result.ok,true);assert.ok(r.events.some(e=>e.type==='http.connect'));});
test('application may ignore system proxy',()=>{const r=run('system',c=>c.request.usesSystemProxy=false);assert.equal(r.result.ok,true);assert.deepEqual(r.final.connections.map(c=>c.role),['direct']);});
test('DNS failure is computed from missing response',()=>assert.equal(run('direct',c=>c.faults.dns=true).result.code,'DNS_TIMEOUT'));
test('missing DNS record yields NXDOMAIN',()=>assert.equal(run('direct',c=>c.dns.records={}).result.code,'DNS_NXDOMAIN'));
test('remote DNS moves queries to proxy host; fake IP stays local',()=>{
 for(const mode of ['remote','fake']){const r=run('tun',c=>c.dns.mode=mode);assert.equal(r.result.ok,true);assert.ok(r.events.some(e=>e.type==='dns.query'&&e.host==='proxy'));if(mode==='fake'){assert.ok(r.final.dnsRecords.some(r=>r.fake));assert.equal(r.final.connections[0].b.ip,'198.18.0.1');}}
});
test('closed proxy listener returns routed RST',()=>assert.equal(run('tun',c=>c.hosts.find(h=>h.id==='proxy').services[0].enabled=false).result.code,'CONNECTION_REFUSED'));
test('changed authentication value fails authentication',()=>assert.equal(run('tun',c=>c.proxy.clientAuth='wrong').result.code,'PROXY_AUTH'));
test('certificate failure and target SYN blackhole produce different errors',()=>{assert.equal(run('direct',c=>c.faults.certificate=true).result.code,'TLS_CERTIFICATE');const r=run('tun',c=>c.faults.targetBlocked=true);assert.equal(r.result.code,'TCP_TIMEOUT');assert.equal(r.final.metrics.retransmissions,3);});
test('deterministic first-SYN loss retransmits same segment and seq',()=>{
 const r=run('direct',c=>c.faults.dropFirst=true);assert.equal(r.result.ok,true);assert.equal(r.final.metrics.retransmissions,1);const syn=r.events.filter(e=>e.type==='ip.send'&&e.packet.flags==='SYN');assert.equal(syn.length,2);assert.equal(syn[0].packet.seq,syn[1].packet.seq);assert.equal(syn[0].packet.segment,syn[1].packet.segment);assert.notEqual(syn[0].packet.id,syn[1].packet.id);
});
test('MSS and receive window alter segmentation without losing bytes',()=>{const r=run('direct',c=>{c.transport.window=128;c.transport.mss=64;});assert.equal(r.result.ok,true);assert.ok(r.events.filter(e=>e.type==='ip.send'&&e.packet.payloadLength).every(e=>e.packet.payloadLength<=64));assert.equal(r.final.connections[0].bytesAcked,3008);});
test('link latency affects virtual time; disabling a link really stops traffic',()=>{const slow=run('direct',c=>c.links.forEach(l=>l.latency=20));assert.equal(slow.result.ok,true);assert.ok(slow.final.time>standard.direct.final.time);assert.equal(run('direct',c=>c.links[0].enabled=false).result.ok,false);});
test('MTU and TTL failures are surfaced by computed forwarding',()=>{assert.equal(run('direct',c=>{c.request.destination='142.250.72.14';c.transport.ttl=1;}).result.code,'TTL_EXCEEDED');assert.equal(run('direct',c=>{c.request.destination='142.250.72.14';c.links[0].mtu=100;}).result.code,'MTU_EXCEEDED');});
test('VPN outer packet contains and restores identical inner packet ID and fields',()=>{
 const r=standard.tail,pairs=r.events.filter(e=>e.type==='vpn.decapsulate');assert.ok(pairs.length>5);
 for(const e of pairs){const original=r.events.find(x=>x.type==='vpn.encapsulate'&&x.packet.id===e.outerPacket);assert.ok(original);assert.equal(original.before.id,e.packet.id);for(const key of ['src','dst','seq','ack','flags','ttl','length'])assert.equal(original.before[key],e.packet[key]);assert.notEqual(original.packet.dst,e.packet.dst);}
 assert.equal(run('tail',c=>c.vpn.keyValid=false).result.code,'VPN_KEY');
});
test('proxy rule direct and reject alter connections',()=>{assert.equal(run('tun',c=>c.proxy.rules=[{pattern:'www.google.com',action:'reject'}]).result.code,'POLICY_REJECT');const r=run('tun',c=>{c.proxy.rules=[{pattern:'*',action:'direct'}];c.hosts[0].routes.unshift({prefix:'142.250.72.14/32',iface:'en0',via:'gateway',metric:1,enabled:true});});assert.equal(r.result.ok,true);});
test('HTTP, UDP and ICMP echo complete through NAT',()=>{
 for(const kind of ['http','udp','ping']){const r=run('direct',c=>{c.request.kind=kind;c.request.port=kind==='http'?80:5000;c.request.bytes=32;c.request.responseBytes=32;});assert.equal(r.result.ok,true,kind);if(kind==='http')assert.equal(r.final.tls.length,0);}
});
test('added server, link and routes participate in computation',()=>{
 const r=run('direct',c=>{const h=newHost('server',1);h.interfaces[0].address='10.0.1.1/24';h.routes=[{prefix:'0.0.0.0/0',iface:'eth0',via:'isp',metric:100,enabled:true}];c.hosts.push(h);c.links.push({id:'new',a:'isp',b:h.id,latency:10,loss:0,mtu:1500,enabled:true});c.hosts.find(h=>h.id==='isp').routes.push({prefix:'10.0.1.1/32',iface:'eth0',via:h.id,metric:10,enabled:true});c.request.destination='10.0.1.1';});assert.equal(r.result.ok,true);assert.ok(r.events.some(e=>e.host==='host1'));
});
test('seeded packet loss gives reproducible event sequence',()=>{const a=run('direct',c=>{c.request.destination='142.250.72.14';c.links[0].loss=12;});const b=run('direct',c=>{c.request.destination='142.250.72.14';c.links[0].loss=12;});assert.deepEqual(a.events.map(e=>[e.type,e.time,e.packet?.id]),b.events.map(e=>[e.type,e.time,e.packet?.id]));});
test('configuration boundary rejects malformed data without entering simulation',()=>{for(const c of [null,[],{}, {...preset(),hosts:[null,{}]}, {...preset(),transport:{}}])assert.ok(validateConfig(c).length);assert.throws(()=>simulate({}),/设备/);const c=preset();c.hosts[0].interfaces[0].address='192.168.1.1/24';assert.ok(validateConfig(c).some(e=>e.includes('重复')));});

for(const item of PRESETS)test('common situation '+item.id+' produces documented result',()=>{const r=simulate(preset(item.id));assert.equal(r.result.code,item.expected);});
test('LAN NAS TCP avoids WAN and TCP NAT',()=>{const r=run('home-nas');assert.ok(r.events.filter(e=>e.type==='link.send'&&e.packet.protocol==='TCP').every(e=>e.to!=='isp'));assert.ok(!r.events.some(e=>e.type==='nat.translate'&&e.packet.protocol==='TCP'));});
test('double NAT restores both levels on return',()=>{const r=run('double-nat');assert.equal(r.result.ok,true);assert.ok(r.events.some(e=>e.type==='nat.restore'&&e.host==='gateway'));assert.ok(r.events.some(e=>e.type==='nat.restore'&&e.host==='isp'));});
test('repair MTU case by lowering MSS',()=>{const r=run('small-mtu',c=>c.transport.mss=128);assert.equal(r.result.ok,true);});
test('loopback belongs to the requesting host rather than another computer',()=>{const r=run('direct',c=>{c.request.source='proxy';c.request.destination='127.0.0.1';c.request.kind='http';c.request.port=80;c.hosts.find(h=>h.id==='proxy').services.push({kind:'http',port:80,protocol:'TCP',enabled:true});});assert.equal(r.result.ok,true);assert.equal(r.final.connections[0].b.host,'proxy');assert.equal(r.final.connections[0].a.ip,'127.0.0.1');assert.ok(!r.events.some(e=>e.type==='link.send'));});
test('common cases only keep participating devices and permit inactive service references',()=>{const home=preset('home-wifi'),vpn=preset('remote-office');assert.equal(home.hosts.length,5);assert.equal(vpn.hosts.length,4);assert.equal(validateConfig(home).length,0);assert.equal(validateConfig(vpn).length,0);assert.equal(simulate(home).result.ok,true);});
test('unknown single-label DNS names return NXDOMAIN instead of inherited properties',()=>{const c=preset('direct');c.request.destination='constructor';assert.equal(simulate(c).result.code,'DNS_NXDOMAIN');});
