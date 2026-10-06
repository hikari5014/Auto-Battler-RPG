const R='/home/user/Auto-Battler-RPG/js/';
const T=await import(R+'talent.js'); const G=await import(R+'gear.js'); const M=await import(R+'mount.js'); const D=await import(R+'data.js');
globalThis.Math.random=(()=>{let s=7;return()=>{s=(s*16807)%2147483647;return s/2147483647;}})();
function fullFinite(save){const keys=new Set(['K0','K3','K4']);for(let i=0;i<500;i++){let b=null,bc=1e99;for(const n of T.TALENTS){if(n.kind==='inf'||n.id==='core')continue;if(n.kind==='key'&&!keys.has(n.id))continue;if(T.whyNot(save,n))continue;const c=T.talentCost(save,n);if(c<bc){bc=c;b=n;}}if(!b)break;T.buyTalent(save,b);}}
const AFF=(stat,r,ilv,q=1)=>({stat,value:Math.round(G.STATS[stat].base*G.RARITIES[r].mult*G.ilvMul(ilv)*q*10)/10});
function item(id,type,r,ilv,plus,{main,affixes=[],ench,gems=[],set,uniq,jlv,skill}={}){
  const Ty=G.TYPES[type]; const m=main||Ty.main; const k=G.RARITIES[r].mult*G.ilvMul(ilv);
  return {id,type,rarity:r,ilv,plus,main:m,value:Math.round((Ty.main?Ty.base:G.STATS[m].base*1.6)*k*10)/10,affixes:affixes.map(([s,q])=>AFF(s,r,ilv,q??0.9)),
   ench:ench?{stat:ench,value:Math.round(G.STATS[ench].base*G.RARITIES[r].mult*1.2*10)/10}:undefined,sockets:gems.slice(0,G.SOCKETS[r]).concat(Array(Math.max(0,G.SOCKETS[r]-gems.length)).fill(null)),set,uniq,jlv,skill};
}
function mkSave(p){const s={gold:1e12,talents:{core:1}};p(s);return s;}
const PROF={
 fresh: mkSave(s=>{}),
 early: mkSave(s=>{
  Object.assign(s.talents,{A0:3,B0:3,F0:2,D0:2,C0:2});
  s.gear={v:2,nextId:99,shards:0,gems:{},presets:[],items:[
   item(1,'weapon',1,1,5,{affixes:[['crit']]}), item(2,'armor',1,1,3,{affixes:[['hp']]}), item(3,'helm',0,1,2), item(4,'boots',0,1,2), item(5,'gloves',0,1,0), item(6,'ring',0,1,0,{main:'atk',jlv:2,skill:'thunder'})],
   equip:{weapon:1,armor:2,helm:3,boots:4,gloves:5,ring1:6}};
  s.mounts={owned:{horse:{lv:8,exp:0,star:1}},ride:'horse'};
 }),
 midlite: mkSave(s=>{
  Object.assign(s.talents,{A0:5,A1:4,A2:2,B0:5,B1:2,F0:5,F1:2,D0:5,D1:2,C0:3,C1:4,E0:2,X0:1});
  s.gear={v:2,nextId:99,shards:0,gems:{},presets:[],items:[
   item(1,'weapon',2,3,6,{affixes:[['crit'],['critDmg']],gems:['ruby-2']}), item(2,'armor',2,3,5,{affixes:[['atk'],['dr']],gems:['emerald-2']}),
   item(3,'helm',1,3,5,{affixes:[['hp']],gems:['ruby-1']}), item(4,'boots',1,3,5,{affixes:[['atk']],gems:['ruby-1']}),
   item(5,'gloves',2,3,5,{affixes:[['atk'],['critDmg']]}), item(6,'necklace',1,3,4,{affixes:[['crit']],jlv:4,skill:'thunder'}),
   item(7,'ring',2,3,4,{main:'atk',affixes:[['crit'],['hp']],jlv:4,skill:'star'}), item(8,'ring',1,2,3,{main:'hp',affixes:[['atk']]})],
   equip:{weapon:1,armor:2,helm:3,boots:4,gloves:5,necklace:6,ring1:7,ring2:8}};
  s.mounts={owned:{horse:{lv:20,exp:0,star:2},drake:{lv:10,exp:0,star:1}},ride:'drake'};
 }),
 mid: mkSave(s=>{
  fullFinite(s);
  s.gear={v:2,nextId:99,shards:0,gems:{},presets:[],items:[
   item(1,'weapon',3,5,10,{affixes:[['crit'],['critDmg'],['spd']],ench:'atk',gems:['ruby-3'],set:'berserk',uniq:'storm'}),
   item(2,'armor',2,5,8,{affixes:[['atk'],['dr']],ench:'hp',gems:['emerald-3'],set:'berserk'}),
   item(3,'helm',2,5,8,{affixes:[['atk'],['hp']],ench:'atk',gems:['ruby-3'],set:'berserk'}),
   item(4,'boots',2,4,8,{affixes:[['atk'],['crit']],ench:'atk',gems:['ruby-3'],set:'berserk'}),
   item(5,'gloves',3,5,8,{affixes:[['atk'],['critDmg'],['spd']],ench:'atk',gems:['sapphire-3','ruby-3'],set:'hunter',uniq:'flurry'}),
   item(6,'necklace',2,5,8,{affixes:[['atk'],['crit']],ench:'atk',gems:['amethyst-3'],set:'hunter',jlv:6,skill:'thunder'}),
   item(7,'ring',3,5,8,{main:'atk',affixes:[['crit'],['critDmg'],['spd']],ench:'atk',gems:['ruby-3','ruby-3'],uniq:'greed',jlv:6,skill:'star'}),
   item(8,'ring',2,4,8,{main:'atk',affixes:[['crit'],['critDmg']],ench:'atk',gems:['ruby-3'],jlv:6,skill:'fury'})],
   equip:{weapon:1,armor:2,helm:3,boots:4,gloves:5,necklace:6,ring1:7,ring2:8}};
  s.mounts={owned:{drake:{lv:30,exp:0,star:3}},ride:'drake'};
 }),
 late: mkSave(s=>{
  fullFinite(s); for(const b of ['A','F','B','D','C','E']) s.talents[b+'I']=30;
  const g=k=>Array(3).fill(k);
  s.gear={v:2,nextId:99,shards:0,gems:{},presets:[],items:[
   item(1,'weapon',4,10,15,{affixes:[['crit',1.1],['critDmg',1.1],['spd',1.1],['hp',1.1]],ench:'critDmg',gems:g('ruby-5'),set:'berserk',uniq:'storm'}),
   item(2,'armor',4,10,15,{affixes:[['atk',1.1],['dr',1.1],['crit',1.1],['critDmg',1.1]],ench:'atk',gems:g('ruby-5'),set:'berserk'}),
   item(3,'helm',4,10,15,{affixes:[['atk',1.1],['hp',1.1],['crit',1.1],['critDmg',1.1]],ench:'atk',gems:g('ruby-5'),set:'berserk'}),
   item(4,'boots',4,10,15,{affixes:[['atk',1.1],['crit',1.1],['critDmg',1.1],['hp',1.1]],ench:'atk',gems:g('ruby-5'),set:'berserk',uniq:'flurry'}),
   item(5,'gloves',4,10,15,{affixes:[['atk',1.1],['critDmg',1.1],['spd',1.1],['hp',1.1]],ench:'atk',gems:g('ruby-5'),set:'hunter',uniq:'flurry'}),
   item(6,'necklace',4,10,15,{affixes:[['atk',1.1],['crit',1.1],['spd',1.1],['hp',1.1]],ench:'atk',gems:g('ruby-5'),set:'hunter',jlv:10,skill:'thunder'}),
   item(7,'ring',4,10,15,{main:'atk',affixes:[['crit',1.1],['critDmg',1.1],['spd',1.1],['hp',1.1]],ench:'atk',gems:g('ruby-5'),set:'hunter',jlv:10,skill:'star'}),
   item(8,'ring',4,10,15,{main:'atk',affixes:[['crit',1.1],['critDmg',1.1],['spd',1.1],['hp',1.1]],ench:'atk',gems:g('ruby-5'),set:'hunter',jlv:10,skill:'fury'})],
   equip:{weapon:1,armor:2,helm:3,boots:4,gloves:5,necklace:6,ring1:7,ring2:8}};
  s.mounts={owned:{drake:{lv:30,exp:0,star:3}},ride:'drake'};
 }),
};
// CP model
function cp(def,save,inrunHits=6){
  const tb=T.talentBonus(save), gb=G.gearBonus(save), mt=M.riding(save); const mb=k=>(mt&&mt.stat===k?mt.bonus:0);
  const atkM=(1+tb.atk)*(1+gb.atk)*(1+mb('atk')), hpM=(1+tb.hp)*(1+gb.hp)*(1+mb('hp'));
  const spd=1+tb.spd+gb.spd+mb('spd')+(gb.extra?0:0);
  const crit=Math.min(1,(def.crit||0.05)+gb.crit+tb.crit+mb('crit')), cd=(def.critDmg||1.5)+tb.critDmg+gb.critDmg;
  const hits=(def.hits+tb.hits+gb.extra.hits+(gb.uniq.flurry||0)), dbl=tb.dbl+gb.extra.dbl;
  const splash=(def.splash||0)+tb.splash+gb.extra.splash;
  const block=Math.min(0.8,(def.block||0)+tb.block+gb.block), dr=Math.min(0.6,tb.dr+gb.dr), dodge=def.dodge||0;
  const life=(def.life||0)+tb.life+gb.life;
  const off=def.atk*atkM*spd/def.interval*(1+crit*(cd-1))*((inrunHits-1+hits)/inrunHits)*(1+dbl)*(1+splash*0.5);
  const def_=def.hp*hpM/((1-block)*(1-dr)*(1-dodge))*(1+life*2);
  return {atkM,hpM,spd,crit,cd,hits,dbl,block,dr,off,def:def_, boss:1+tb.bossDmg+gb.bossDmg, gold:tb.gold+gb.gold, tb,gb};
}
const blade=D.HEROES[0];
const f=cp(blade,PROF.fresh);
const K=1000/Math.sqrt(f.off*f.def);
for(const [k,s] of Object.entries(PROF)){const c=cp(blade,s);console.log(k.padEnd(6),'atk x'+c.atkM.toFixed(2),'hp x'+c.hpM.toFixed(2),'spd x'+c.spd.toFixed(2),'crit',c.crit.toFixed(2),'cd',c.cd.toFixed(2),'hits',c.hits,'dbl',c.dbl.toFixed(2),'blk',c.block.toFixed(2),'dr',c.dr.toFixed(2),'| OFF x'+(c.off/f.off).toFixed(1),'DEF x'+(c.def/f.def).toFixed(1),'CP',Math.round(K*Math.sqrt(c.off*c.def)),'boss+',(c.boss-1).toFixed(2),'gold+',c.gold.toFixed(2),'gearPower',G.gearPower(s));
 if(k!=='fresh'){const gb=c.gb;console.log('   gb.atk',gb.atk.toFixed(2),'gb.hp',gb.hp.toFixed(2),'gb.crit',gb.crit.toFixed(2),'gb.critDmg',gb.critDmg.toFixed(2),'gb.spd',gb.spd.toFixed(2),'tb.atk',c.tb.atk.toFixed(2),'tb.hp',c.tb.hp.toFixed(2),'skills',JSON.stringify(gb.skills));}}
// per-hero base CP (fresh)
for(const h of D.HEROES){const c=cp(h,PROF.fresh);console.log(h.id.padEnd(8),'OFF',(c.off/f.off).toFixed(2),'DEF',(c.def/f.def).toFixed(2),'CP',Math.round(K*Math.sqrt(c.off*c.def)),'price',h.price);}
// isolate contributions mid & late
for(const k of ['midlite','mid','late']){const s=PROF[k];const full=cp(blade,s);const parts={};
 const noT=JSON.parse(JSON.stringify(s));noT.talents={core:1};const noG=JSON.parse(JSON.stringify(s));noG.gear.equip={};const noM=JSON.parse(JSON.stringify(s));noM.mounts.ride=null;
 const noGem=JSON.parse(JSON.stringify(s));noGem.gear.items.forEach(i=>i.sockets=i.sockets.map(()=>null));
 const cpv=x=>K*Math.sqrt(x.off*x.def);
 console.log(k,'CP',Math.round(cpv(full)),'without talent',Math.round(cpv(cp(blade,noT))),'without gear',Math.round(cpv(cp(blade,noG))),'without mount',Math.round(cpv(cp(blade,noM))),'without gems',Math.round(cpv(cp(blade,noGem))));}
