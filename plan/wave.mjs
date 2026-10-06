const L=await import('/home/user/Auto-Battler-RPG/js/levels.js');
for(const d of L.DIFFICULTIES){
 let tot=0;const rows=[];
 for(let w=1;w<=15;w++){const c=L.waveCurve(w);let hp,atk,n;
  if(w===15){const bs=(1+0.16*14)*10;hp=bs*22+2*c.hp*3;atk=bs*2.6;n=3;}else{n=c.count+d.count+(w>=8?2:w>=3?1:0);const capt=(w>=8?2:w>=3?1:0);hp=c.hp*((n-capt)+capt*3)+(w%5===0?5*c.hp:0);atk=c.atk;}
  hp*=18*L.diffScale(d.hp,w);atk*=2.4*L.diffScale(d.atk,w);tot+=hp;rows.push([w,Math.round(hp),atk.toFixed(1),Math.sqrt(hp*atk).toFixed(0)]);}
 console.log(d.id,'boss share of total HP',(rows[14][1]/tot*100).toFixed(0)+'%', rows.filter(r=>[1,3,5,8,11,14,15].includes(r[0])).map(r=>`w${r[0]} hp${r[1]} atk${r[2]} T${r[3]}`).join(' | '));
}
