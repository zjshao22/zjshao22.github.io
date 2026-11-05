import test from 'node:test';
import assert from 'node:assert/strict';
import {preset,PRESETS} from '../src/network-config.js';
import {simulate} from '../src/network-engine.js';
import {mechanismScene,mechanismEvent} from '../src/mechanism-diagram.js';

for(const item of PRESETS)test(`mechanism scene uses computed events and actual links: ${item.id}`,()=>{
  const c=preset(item.id),scene=mechanismScene(c),run=simulate(c);
  assert.deepEqual(scene.edges.filter(e=>e.link).map(e=>e.link).sort(),c.links.map(l=>l.id).sort());
  for(const e of run.events){
    const flow=mechanismEvent(scene,c,e,e.snapshot);
    for(const id of flow.active)assert.ok(scene.byId.has(id),`${e.type}: unknown node ${id}`);
    for(const part of flow.parts){assert.ok(scene.edges.some(edge=>edge.id===part.id));assert.ok(!/NaN|Infinity/.test(part.d));}
    if(e.link&&e.from&&e.to){assert.deepEqual(flow.active,[scene.hosts.get(e.from),scene.hosts.get(e.to)]);assert.equal(flow.parts[0].id,'wire:'+e.link);}
    if(e.host)assert.ok(scene.hosts.has(e.host),`missing host ${e.host}`);
  }
});
test('TUN transfer, independent proxy Socket and return application delivery have distinct paths',()=>{
  const c=preset(),scene=mechanismScene(c),run=simulate(c),flow=e=>mechanismEvent(scene,c,e,e.snapshot);
  const read=run.events.find(e=>e.type==='tun.read');assert.deepEqual(flow(read).active,['kernel','tun','agent']);
  const inject=run.events.find(e=>e.type==='tun.inject');assert.deepEqual(flow(inject).active,['agent','tun','kernel']);
  const preparesInjection=run.events.find(e=>e.type==='ip.send'&&e.packet.meta.inject);assert.deepEqual(flow(preparesInjection).active,['agent']);
  const innerTls=run.events.find(e=>e.type==='tls.client-hello'&&e.tls.role==='application');assert.deepEqual(flow(innerTls).active,['app']);
  const outerTls=run.events.find(e=>e.type==='tls.client-hello'&&e.tls.role==='proxy');assert.deepEqual(flow(outerTls).active,['agent']);
  const proxy=run.final.connections.find(c=>c.role==='proxy');
  const outgoing=run.events.find(e=>e.type==='ip.send'&&e.host==='client'&&e.connection===proxy.id);
  assert.deepEqual(flow(outgoing).active,['agent','kernel']);
  const original=run.final.connections.find(c=>c.role==='original');
  const toProxy=run.events.find(e=>e.type==='tcp.data'&&e.connection===original.id&&e.packet.src===original.a.ip);
  assert.deepEqual(flow(toProxy).active,['kernel','tun','agent']);
  const toApp=run.events.find(e=>e.type==='tcp.data'&&e.connection===original.id&&e.packet.src===original.b.ip);
  assert.deepEqual(flow(toApp).active,['kernel','app']);
});
test('direct and system proxy reflect different local receivers',()=>{
  const direct=preset('direct'),dscene=mechanismScene(direct);assert.ok(!dscene.byId.has('tun')&&!dscene.byId.has('agent'));
  const c=preset('system'),scene=mechanismScene(c),run=simulate(c),original=run.final.connections.find(c=>c.role==='original');
  const receives=run.events.find(e=>e.type==='tcp.data'&&e.connection===original.id&&e.packet.src===original.a.ip&&e.packet.sport===original.a.port);
  assert.deepEqual(mechanismEvent(scene,c,receives,receives.snapshot).active,['kernel','agent']);
  const reply=run.events.find(e=>e.type==='ip.send'&&e.connection===original.id&&e.packet.sport===original.b.port);
  assert.deepEqual(mechanismEvent(scene,c,reply,reply.snapshot).active,['agent','kernel']);
});
