import test from 'node:test';
import assert from 'node:assert/strict';
import {preset,PRESETS,validateConfig,interfaceMac,BROADCAST_MAC,ETHERTYPE,LINK_LAYER_DEFAULTS,clone} from '../src/network-config.js';
import {simulate} from '../src/network-engine.js';

const run=(change=()=>{})=>{const c=preset('arp-gateway');change(c);return simulate(c);};
const seedOf=r=>r.final.arp.map(a=>({host:a.host,iface:a.iface,ip:a.ip,mac:a.mac,owner:a.owner,ownerIface:a.ownerIface}));

test('acceptance topology is a valid, no-NAT A -> R -> B configuration',()=>{
  const c=preset('arp-gateway');
  assert.deepEqual(validateConfig(c),[]);
  assert.equal(c.linkLayer.enabled,true);
  assert.equal(c.request.destination,'10.20.30.40');
  const a=c.hosts.find(h=>h.id==='hostA'),r=c.hosts.find(h=>h.id==='routerR'),b=c.hosts.find(h=>h.id==='hostB');
  assert.equal(a.interfaces[0].address,'192.168.1.100/24');
  assert.deepEqual(r.interfaces.map(f=>f.address),['192.168.1.1/24','10.20.30.1/24']);
  assert.equal(b.interfaces[0].address,'10.20.30.40/24');
  assert.ok(c.hosts.every(h=>!h.nat),'no NAT on any device');
  assert.equal(c.request.kind,'ping');
});

test('first access computes route -> ARP miss -> broadcast -> unicast reply -> cache -> frame, in that order',()=>{
  const r=run(),types=r.events.map(e=>e.type);
  assert.equal(r.result.code,'SUCCESS');
  assert.ok(types.indexOf('route.lookup')<types.indexOf('arp.miss'));
  assert.ok(types.indexOf('arp.miss')<types.indexOf('arp.request'));
  assert.ok(types.indexOf('arp.request')<types.indexOf('arp.reply'));
  assert.ok(types.indexOf('arp.reply')<types.indexOf('arp.cache-update'));
  assert.ok(types.indexOf('arp.cache-update')<types.indexOf('arp.dequeue'));
  assert.ok(types.indexOf('arp.dequeue')<types.indexOf('link.send'));

  const miss=r.events.find(e=>e.type==='arp.miss');
  assert.equal(miss.nextHopIP,'192.168.1.1','cross-network resolves the gateway, not the final target');
  assert.equal(miss.host,'hostA');
  assert.equal(miss.iface,'eth0');
  assert.equal(miss.waiting,true);
  assert.equal(miss.snapshot.arp.length,0);
  assert.equal(miss.snapshot.arpPending.length,1,'the IP packet is queued, not dropped');

  const req=r.events.find(e=>e.type==='arp.request');
  assert.equal(req.dstMac,BROADCAST_MAC);
  assert.equal(req.packet.linkFrame.etherType,ETHERTYPE.ARP);
  assert.equal(req.packet.arp.op,1);
  assert.equal(req.packet.arp.senderIP,'192.168.1.100');
  assert.equal(req.packet.arp.targetIP,'192.168.1.1');
  assert.deepEqual(req.packet.layers.map(l=>l.type),['ethernet','arp']);

  const reply=r.events.find(e=>e.type==='arp.reply');
  assert.equal(reply.packet.linkFrame.etherType,ETHERTYPE.ARP);
  assert.equal(reply.packet.arp.op,2);
  assert.equal(reply.packet.arp.senderIP,'192.168.1.1');
  assert.equal(reply.packet.linkFrame.dstMac,req.srcMac,'reply is unicast back to the requester');

  const dequeue=r.events.find(e=>e.type==='arp.dequeue');
  assert.equal(dequeue.snapshot.arpPending.length,0,'queue drained after resolution');
  const send=r.events.find(e=>e.type==='link.send');
  assert.equal(send.packet.id,dequeue.packetId,'the original packet resumes, not a fabricated copy');
  assert.equal(send.packet.dst,'10.20.30.40');
  assert.equal(send.packet.ttl,16,'IP header unchanged while waiting for ARP');
});

test('directly attached network resolves the final destination; cross-network resolves the gateway',()=>{
  const r=run(),misses=r.events.filter(e=>e.type==='arp.miss');
  assert.ok(misses.some(e=>e.host==='hostA'&&e.nextHopIP==='192.168.1.1'),'gateway next hop');
  assert.ok(misses.some(e=>e.host==='routerR'&&e.iface==='eth1'&&e.nextHopIP==='10.20.30.40'),'final target on directly attached link');
  const requests=r.events.filter(e=>e.type==='arp.request');
  assert.ok(requests.some(e=>e.nextHopIP==='192.168.1.1'));
  assert.ok(requests.some(e=>e.nextHopIP==='10.20.30.40'));
});

test('each hop re-encapsulates: IP destination stays 10.20.30.40, TTL drops at the router, MACs differ',()=>{
  const r=run();
  const outbound=r.events.filter(e=>e.type==='link.send'&&e.packet.dst==='10.20.30.40');
  assert.equal(outbound.length,2,'A -> R and R -> B');
  assert.ok(outbound.every(e=>e.packet.linkFrame.etherType===ETHERTYPE.IPv4));
  assert.equal(outbound[0].srcMac,interfaceMac('hostA','eth0'));
  assert.equal(outbound[0].dstMac,interfaceMac('routerR','eth0'));
  assert.equal(outbound[1].srcMac,interfaceMac('routerR','eth1'));
  assert.equal(outbound[1].dstMac,interfaceMac('hostB','eth0'));
  assert.notEqual(outbound[0].srcMac,outbound[1].srcMac);
  assert.notEqual(outbound[0].dstMac,outbound[1].dstMac);
  assert.equal(outbound[0].packet.ttl,16);
  assert.equal(outbound[1].packet.ttl,15,'TTL decremented once by router R');
  assert.ok(outbound.every(e=>e.packet.dst==='10.20.30.40'&&e.packet.src==='192.168.1.100'),'no NAT, no IP rewrite');
  assert.ok(r.events.some(e=>e.type==='route.lookup'&&e.host==='routerR'),'router looks up its own route table');
});

test('interface MACs are stable, unique per interface, and never derived from the destination IP',()=>{
  const a=interfaceMac('routerR','eth0'),b=interfaceMac('routerR','eth1');
  assert.notEqual(a,b,'two interfaces of one device differ');
  assert.equal(a,interfaceMac('routerR','eth0'));
  assert.notEqual(interfaceMac('hostA','eth0'),interfaceMac('hostB','eth0'));
  assert.match(a,/^02:([0-9A-F]{2}:){4}[0-9A-F]{2}$/,'locally administered unicast');
  assert.equal(BROADCAST_MAC,'FF:FF:FF:FF:FF:FF');
});

test('second request hits carried-over ARP cache and does not broadcast again',()=>{
  const firstRun=run(),seed=seedOf(firstRun);
  assert.equal(seed.length,4);
  const r=run(c=>{c.linkLayer.seedCache=seed;});
  assert.equal(r.result.code,'SUCCESS');
  assert.equal(r.events.filter(e=>e.type==='arp.request').length,0,'no repeated ARP broadcast');
  assert.ok(r.events.filter(e=>e.type==='arp.cache-hit').length>=4,'cache hit observed at every hop');
  assert.equal(r.initial.arp.length,4,'seed cache is part of the initial snapshot');
  assert.equal(r.events[0].snapshot.arp.length,4);
});

test('clearing / expiring the cache forces real re-resolution',()=>{
  const seed=seedOf(run());
  const r=run(c=>{c.linkLayer.seedCache=seed;c.linkLayer.arpTtl=30;});
  assert.ok(r.events.some(e=>e.type==='arp.cache-hit'),'first packet still hits');
  assert.ok(r.events.some(e=>e.type==='arp.expire'),'later packet finds an expired entry');
  assert.ok(r.events.some(e=>e.type==='arp.request'),'expired entry triggers a new broadcast');
  const expired=r.events.find(e=>e.type==='arp.expire');
  assert.ok(expired.arpEntry?.ip,'expired entry is reported with its contents');
});

test('no ARP answer: finite retries, queued packets dropped, distinct ARP_FAILURE result',()=>{
  const r=run(c=>{c.linkLayer.silentHosts=['routerR'];c.linkLayer.arpRetries=2;c.linkLayer.arpTimeout=40;});
  assert.equal(r.result.code,'ARP_FAILURE');
  assert.ok(r.result.message.includes('192.168.1.1'));
  assert.equal(r.events.filter(e=>e.type==='arp.request').length,3,'one request plus two retries');
  assert.equal(r.events.filter(e=>e.type==='arp.retry').length,2);
  assert.ok(r.events.some(e=>e.type==='arp.failed'));
  assert.equal(r.events.filter(e=>e.type==='link.send').length,0,'nothing is sent without a resolved MAC');
  assert.ok(r.final.metrics.dropped>=1);
});

test('NO_ROUTE and ARP_FAILURE are different computed failures',()=>{
  const noRoute=run(c=>{c.hosts.find(h=>h.id==='hostA').routes=[{prefix:'192.168.1.0/24',iface:'eth0',via:'',metric:100,enabled:true}];});
  assert.equal(noRoute.result.code,'NO_ROUTE');
  assert.equal(noRoute.events.filter(e=>e.type==='arp.request').length,0,'route lookup fails before any ARP work');
  const noReply=run(c=>{c.linkLayer.silentHosts=['routerR'];});
  assert.equal(noReply.result.code,'ARP_FAILURE');
  assert.ok(noReply.result.message.includes('路由'));
});

test('multi-interface device keeps independent per-interface neighbour caches',()=>{
  const r=run();
  const keys=r.final.arp.map(a=>a.host+'/'+a.iface+'|'+a.ip);
  assert.ok(keys.includes('routerR/eth0|192.168.1.100'));
  assert.ok(keys.includes('routerR/eth1|10.20.30.40'));
  assert.equal(new Set(keys).size,keys.length,'no duplicate cache entries');
  const rEth0=r.final.arp.find(a=>a.host==='routerR'&&a.iface==='eth0');
  const rEth1=r.final.arp.find(a=>a.host==='routerR'&&a.iface==='eth1');
  assert.notEqual(rEth0.mac,rEth1.mac);
  const firstHop=r.events.find(e=>e.type==='arp.cache-update'&&e.host==='hostA');
  assert.equal(firstHop.arpEntry.host,'hostA');
  assert.equal(firstHop.arpEntry.iface,'eth0');
});

test('forward/back replay is consistent: ordered events, immutable per-step snapshots',()=>{
  const r=run();
  assert.ok(r.events.every((e,i)=>!i||e.time>=r.events[i-1].time));
  assert.ok(r.events.every(e=>Array.isArray(e.snapshot.arp)&&Array.isArray(e.snapshot.arpPending)&&Array.isArray(e.snapshot.arpInFlight)));
  assert.equal(r.events[0].snapshot.arp.length,0,'early snapshot is not mutated by later events');
  assert.equal(r.events.at(-1).snapshot.arp.length,4);
  const duringWait=r.events.find(e=>e.type==='arp.miss').snapshot.arpPending;
  assert.equal(duringWait.length,1);
  assert.equal(r.events.at(-1).snapshot.arpPending.length,0);
  assert.equal(r.initial.arp.length,0);
});

test('detailed mode off: no ARP events, original event sequence unchanged',()=>{
  const baseline=simulate(preset('direct'));
  const disabled=preset('direct');disabled.linkLayer={...LINK_LAYER_DEFAULTS,enabled:false};
  const r=simulate(disabled);
  assert.deepEqual(r.events.map(e=>e.type),baseline.events.map(e=>e.type));
  assert.equal(r.events.filter(e=>e.type.startsWith('arp.')).length,0);
  assert.equal(r.final.arp.length,0);
  assert.equal(r.result.code,'SUCCESS');
  const legacy=baseline.events.find(e=>e.type==='link.send');
  assert.equal(legacy.packet.linkFrame.etherType,undefined,'legacy sample MAC path is untouched');
  assert.ok(legacy.packet.layers[0].fields.说明.includes('未启用 ARP'));
});

test('all presets still produce their documented result, including the new ARP preset',()=>{
  assert.equal(PRESETS.length,19);
  for(const item of PRESETS)assert.equal(simulate(preset(item.id)).result.code,item.expected,item.id);
});

test('configuration boundary rejects malformed link-layer settings',()=>{
  const bad=preset('arp-gateway');bad.linkLayer.arpTimeout=0;
  assert.ok(validateConfig(bad).some(e=>e.includes('链路层')));
  const bad2=preset('arp-gateway');bad2.linkLayer.silentHosts='routerR';
  assert.ok(validateConfig(bad2).length);
  const bad3=preset('arp-gateway');bad3.hosts[0].interfaces[0].mac='not-a-mac';
  assert.ok(validateConfig(bad3).some(e=>e.includes('MAC')));
  const good=clone(preset('arp-gateway'));good.hosts[0].interfaces[0].mac='02:AA:BB:CC:DD:EE';
  assert.deepEqual(validateConfig(good),[]);
  assert.equal(simulate(good).events.find(e=>e.type==='arp.request').srcMac,'02:AA:BB:CC:DD:EE');
});
