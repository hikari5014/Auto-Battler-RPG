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
function mkSave(p){const s={gold:0,talents:{core:1}};p(s);return s;}
const PROF={
 fresh: mkSave(s=>{}),
 early: mkSave(s=>{
  Object.assign(s.talents,{A0:3,B0:3,F0:2,D0:2,C0:2});
  s.gear={v:3,nextId:99,shards:0,gems:{},presets:[],items:[
   item(1,'weapon',1,1,5,{affixes:[['crit']]}), item(2,'armor',1,1,3,{affixes:[['hp']]}), item(3,'helm',0,1,2), item(4,'boots',0,1,2), item(5,'gloves',0,1,0), item(6,'ring',0,1,0,{main:'atk',jlv:2,skill:'thunder'})],
   equip:{weapon:1,armor:2,helm:3,boots:4,gloves:5,ring1:6}};
  s.mounts={owned:{horse:{lv:8,exp:0,star:1}},ride:'horse'};
 }),
 midlite: mkSave(s=>{
  Object.assign(s.talents,{A0:5,A1:4,A2:2,B0:5,B1:2,F0:5,F1:2,D0:5,D1:2,C0:3,C1:4,E0:2,X0:1});
  s.gear={v:3,nextId:99,shards:0,gems:{},presets:[],items:[
   item(1,'weapon',2,3,6,{affixes:[['crit'],['critDmg']],gems:['ruby-2']}), item(2,'armor',2,3,5,{affixes:[['atk'],['dr']],gems:['emerald-2']}),
   item(3,'helm',1,3,5,{affixes:[['hp']],gems:['ruby-1']}), item(4,'boots',1,3,5,{affixes:[['atk']],gems:['ruby-1']}),
   item(5,'gloves',2,3,5,{affixes:[['atk'],['critDmg']]}), item(6,'necklace',1,3,4,{affixes:[['crit']],jlv:4,skill:'thunder'}),
   item(7,'ring',2,3,4,{main:'atk',affixes:[['crit'],['hp']],jlv:4,skill:'star'}), item(8,'ring',1,2,3,{main:'hp',affixes:[['atk']]})],
   equip:{weapon:1,armor:2,helm:3,boots:4,gloves:5,necklace:6,ring1:7,ring2:8}};
  s.mounts={owned:{horse:{lv:20,exp:0,star:2},drake:{lv:10,exp:0,star:1}},ride:'drake'};
 }),
 mid: mkSave(s=>{
  fullFinite(s);
  s.gear={v:3,nextId:99,shards:0,gems:{},presets:[],items:[
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
  const g=k=>['ruby-5','amethyst-5','emerald-5'];
  s.gear={v:3,nextId:99,shards:0,gems:{},presets:[],items:[
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

import fs from 'fs';
const all=D.HEROES.map(h=>h.id);
for(const [k,sv] of Object.entries(PROF)){
  Object.assign(sv,{tutorialDone:true,owned:all,selected:'blade',difficulty:'casual',chapter:1,maxChapter:10,progress:{casual:10,easy:10,normal:10,hard:10,hell:10,nightmare:10},stats:{runs:0,wins:0,hardWin:0,hellWin:0,bestWave:0,dailyWins:0,coins:0,kills:0,events:0}});
  fs.writeFileSync('saves/'+k+'.json',JSON.stringify(sv));
}
console.log('ok');
