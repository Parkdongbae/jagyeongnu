import {buildModel} from './model.js';import fs from 'fs';import {execSync} from 'child_process';
const {steps}=buildModel();
const f=v=>{const r=Math.round(v*100)/100;return Object.is(r,-0)?'0':String(r)};const fa=a=>'['+a.map(f).join(',')+']';
const fm=v=>{const r=Math.round(v*1e6)/1e6;return Object.is(r,-0)?'0':String(r)};const mat=M=>'['+[0,1,2,3].map(i=>'['+M.slice(i*4,i*4+4).map(fm).join(',')+']').join(',')+']';
function em(n){if(n.op==='diff')return'difference(){'+em(n.a)+n.b.map(em).join('')+'}';if(n.op==='uni')return'union(){'+n.c.map(em).join('')+'}';
 const M='multmatrix('+mat(n.M)+')';switch(n.p){case'B':return M+'cube('+fa(n.s)+',center=true);';case'C':return M+'cylinder(d1='+f(n.d1)+',d2='+f(n.d2)+',h='+f(n.h)+',center=true,$fn='+Math.min(n.n,16)+');';case'S':return M+'sphere(r='+f(n.r)+',$fn=12);';case'E':return M+'linear_extrude(height='+f(n.h)+',center=true)polygon(['+n.pts.map(fa).join(',')+']);';case'L':return M+'rotate_extrude($fn='+Math.min(n.n,24)+')polygon(['+n.pts.map(fa).join(',')+']);';case'P':return M+'polyhedron(points=['+n.V.map(fa).join(',')+'],faces=['+n.F.map(F=>'['+F.slice().reverse().join(',')+']').join(',')+']);'}}
const tp=(M,p)=>[0,1,2].map(i=>M[i*4]*p[0]+M[i*4+1]*p[1]+M[i*4+2]*p[2]+M[i*4+3]);
function bb(n){if(n.op==='diff')return bb(n.a);if(n.op==='uni'){const bs=n.c.map(bb);return[[0,1,2].map(i=>Math.min(...bs.map(b=>b[0][i]))),[0,1,2].map(i=>Math.max(...bs.map(b=>b[1][i])))]}
 let P=[];if(n.p==='B'){const[a,b,c]=n.s.map(v=>v/2);for(const x of[-a,a])for(const y of[-b,b])for(const z of[-c,c])P.push([x,y,z])}
 else if(n.p==='C'){const r=Math.max(n.d1,n.d2)/2,h=n.h/2;for(const x of[-r,r])for(const y of[-r,r])for(const z of[-h,h])P.push([x,y,z])}
 else if(n.p==='S'){const r=n.r;for(const x of[-r,r])for(const y of[-r,r])for(const z of[-r,r])P.push([x,y,z])}
 else if(n.p==='E'){for(const q of n.pts)for(const z of[-n.h/2,n.h/2])P.push([q[0],q[1],z])}
 else if(n.p==='L'){const r=Math.max(...n.pts.map(p=>p[0]));const z0=Math.min(...n.pts.map(p=>p[1])),z1=Math.max(...n.pts.map(p=>p[1]));for(const x of[-r,r])for(const y of[-r,r])for(const z of[z0,z1])P.push([x,y,z])}
 else if(n.p==='P')P=n.V;
 P=P.map(p=>tp(n.M,p));return[[0,1,2].map(i=>Math.min(...P.map(p=>p[i]))),[0,1,2].map(i=>Math.max(...P.map(p=>p[i])))]}
// 가지(leaf) 단위로 쪼개서 비교: uni 최상위는 자식별로
const items=[];steps.forEach((s,si)=>s.members.forEach((m,mi)=>{const fl=n=>n.op==='uni'?n.c.flatMap(fl):[n];const parts=fl(m.node);parts.forEach((p,pi)=>items.push({id:si+':'+s.label+'/'+m.label+'#'+pi,si,mi,n:p,b:bb(p)}))}));
const ov=(a,b)=>[0,1,2].every(i=>a[0][i]<b[1][i]-1&&b[0][i]<a[1][i]-1);
const skip=process.argv[2]?new RegExp(process.argv[2]):null;
const cand=[];for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const A=items[i],B=items[j];if(A.si===B.si)continue;if(ov(A.b,B.b))cand.push([A,B])}
console.error('items',items.length,'cand',cand.length);
const only=process.argv[3]?new RegExp(process.argv[3]):null;
const SH=+(process.env.SH||0),NS=+(process.env.NS||1);let k=0,ci=-1;for(const[A,B]of cand){const pk=A.id.split('#')[0].split('/')[1]+' <> '+B.id.split('#')[0].split('/')[1];if(process.env.EXC&&new RegExp(process.env.EXC).test(pk))continue;if(process.env.INC&&!new RegExp(process.env.INC).test(pk))continue;ci++;if(ci%NS!==SH)continue;if(only&&!(only.test(A.id)||only.test(B.id)))continue;k++;
 fs.writeFileSync('/tmp/ca'+SH+'.scad','intersection(){'+em(A.n)+em(B.n)+'}');let out='';try{out=execSync('timeout 100 openscad -o /tmp/ca'+SH+'.stl /tmp/ca'+SH+'.scad 2>&1').toString()}catch(e){out='ERR'+String(e.stdout)}
 if(/empty/i.test(out)||!fs.existsSync('/tmp/ca'+SH+'.stl'))continue;const stl=fs.readFileSync('/tmp/ca'+SH+'.stl','utf8');fs.unlinkSync('/tmp/ca'+SH+'.stl');
 const vs=[...stl.matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)].map(m=>m.slice(1).map(Number));let v=0;
 for(let i=0;i<vs.length;i+=3){const[p,q,r]=[vs[i],vs[i+1],vs[i+2]];v+=p[0]*(q[1]*r[2]-q[2]*r[1])-p[1]*(q[0]*r[2]-q[2]*r[0])+p[2]*(q[0]*r[1]-q[1]*r[0])}v=Math.abs(v/6);
 if(v>100)console.log(Math.round(v),A.id,'<>',B.id)}
console.error('tested',k);
if(process.env.CNT){const c={};for(const[A,B]of cand){const k=A.id.split('#')[0].split('/')[1]+' <> '+B.id.split('#')[0].split('/')[1];c[k]=(c[k]||0)+1}console.log(Object.entries(c).sort((a,b)=>b[1]-a[1]).map(e=>e[1]+' '+e[0]).join('\n'))}
