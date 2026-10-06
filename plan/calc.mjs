const R='/home/user/Auto-Battler-RPG/js/';
const T=await import(R+'talent.js'); const L=await import(R+'levels.js'); const D=await import(R+'data.js');
// talent: buy all finite nodes greedily by cost
const save={gold:1e12,talents:{core:1}};
let spent=0, log=[];
const keysPick=new Set(['K0','K3','K4']);// one per pair: K0/K1, K2/K3, K4/K5
for(let iter=0;iter<500;iter++){
  let best=null,bc=Infinity;
  for(const n of T.TALENTS){ if(n.kind==='inf'||n.id==='core')continue; if(n.kind==='key'&&!keysPick.has(n.id))continue;
    if(T.whyNot(save,n))continue; const c=T.talentCost(save,n); if(c<bc){bc=c;best=n;} }
  if(!best)break; spent+=bc; T.buyTalent(save,best); log.push([T.totalPoints(save),spent]);
}
console.log('finite pts',T.totalPoints(save),'total cost',spent);
for(const p of [10,20,30,40,50,60,70,80,90,100]){const r=log.find(x=>x[0]>=p); if(r)console.log('pts',p,'cum',r[1]);}
const tb=T.talentBonus(save); console.log(JSON.stringify(tb));
// infinite
for(const n of [10,20,30,40,50,60]) console.log('inf lv',n,'cost one node',Math.round(1500*(Math.pow(1.12,n)-1)/0.12));
// waves
for(let w=1;w<=15;w++){const c=L.waveCurve(w); console.log('w',w,c.hp.toFixed(2),c.atk.toFixed(2),c.count, L.DIFFICULTIES.map(d=>(L.diffScale(d.hp,w)).toFixed(2)).join('/'));}
const w=15; console.log('boss scale',(1+0.16*14)*10);
// skill prices
for(const d of L.DIFFICULTIES){ const p=w=>Math.round(45*Math.pow(1.17,w-1)*d.price); console.log(d.id,'2star lv0 w1',p(1),'w8',p(8),'w14',p(14),'lv4 mult',Math.pow(d.lvGrow,4).toFixed(1),'3star lv8 mult',Math.pow(d.lvGrow,8).toFixed(0));}
