import {buildModel} from './model.js';
import fs from 'fs';
const {G,steps}=buildModel();const JEOLGI='춘분';
const f=v=>{const r=Math.round(v*100)/100;return Object.is(r,-0)?'0':String(r)};
const fa=a=>'['+a.map(f).join(',')+']';
const fm=v=>{const r=Math.round(v*1e6)/1e6;return Object.is(r,-0)?'0':String(r)};const mat=M=>'['+[0,1,2,3].map(i=>'['+M.slice(i*4,i*4+4).map(fm).join(',')+']').join(',')+']';
// 여러 번 쓰이는 연산 노드는 module로 뽑아냄
const cnt=new Map();
const walk=n=>{if(!n.op)return;cnt.set(n,(cnt.get(n)||0)+1);if(cnt.get(n)>1)return;(n.op==='diff'?[n.a,...n.b]:n.c).forEach(walk)};
Object.values(G).forEach(g=>g.members.forEach(m=>walk(m.node)));
const mods=new Map();let mid=0;const modSrc=[];
function em(n,ind=''){
 if(n.op&&cnt.get(n)>1){if(!mods.has(n)){const name='m'+(mid++);mods.set(n,name);modSrc.push('module '+name+'(){\n'+body(n,'  ')+'}\n')}return ind+mods.get(n)+'();\n'}
 return body(n,ind)}
function body(n,ind){
 if(n.op==='diff')return ind+'difference(){\n'+em(n.a,ind+'  ')+n.b.map(c=>em(c,ind+'  ')).join('')+ind+'}\n';
 if(n.op==='uni')return ind+'union(){\n'+n.c.map(c=>em(c,ind+'  ')).join('')+ind+'}\n';
 const M='multmatrix('+mat(n.M)+') ';
 switch(n.p){
  case'B':return ind+M+'cube('+fa(n.s)+',center=true);\n';
  case'C':return ind+M+'cylinder(d1='+f(n.d1)+',d2='+f(n.d2)+',h='+f(n.h)+',center=true,$fn='+n.n+');\n';
  case'S':return ind+M+'sphere(r='+f(n.r)+',$fn=32);\n';
  case'E':return ind+M+'linear_extrude(height='+f(n.h)+',center=true) polygon('+'['+n.pts.map(fa).join(',')+']);\n';
  case'L':return ind+M+'rotate_extrude($fn='+n.n+') polygon(['+n.pts.map(fa).join(',')+']);\n';
  case'P':return ind+M+'polyhedron(points=['+n.V.map(fa).join(',')+'],faces=['+n.F.map(F=>'['+F.slice().reverse().join(',')+']').join(',')+']);\n';
 }}
const keys=Object.keys(G);
let parts='';
for(const k of keys){const g=G[k];parts+='// '+k.slice(0,2)+'. '+g.n+(g.hj?' '+g.hj:'')+' — '+g.members.length+'개\nP("'+k+'") {\n';
 g.members.forEach((m,i)=>{parts+='  if(on('+i+')) { // '+m.label+'\n'+em(m.node,'    ')+'  }\n'});parts+='}\n\n'}
const head=`// 자격루(自擊漏, 1434 세종) 부재별 STL 출력용 OpenSCAD 코드 — 웹앱과 같은 모델 데이터(model.js)에서 자동 생성
// 단위 mm / 절대좌표계: x = 오른쪽(동), y = 안쪽, z = 위, z=0 = 바닥
// 모든 부재는 조립된 위치의 절대좌표로 만들어지므로, 따로 저장한 STL을 함께 불러오면 자격루 모양으로 그대로 맞춰집니다.
// 기구 치수는 「보루각기」(주척 1척 = 20.7cm, 남문현·한영호 1996), 물그릇은 1536년 유물, 배치는 2007 국립고궁박물관 복원품을 따랐고
// 나머지는 교육용 가정값입니다. 경점용 동판·걸쇠·작은 구슬은 ${JEOLGI}용입니다(절기마다 바꿔 끼움).
//
// 사용법 (부재 종류별로 저장):
//   openscad -D 'PART="04_susu"' -o 04_susu.stl jagyeongnu.scad
// 같은 종류 중 1개만 저장 (IDX = 0부터, 번호는 아래 주석의 순서):
//   openscad -D 'PART="02_pasu"' -D 'IDX=0' -o daepasuho.stl jagyeongnu.scad
// 전체를 종류별로 저장 (bash):
//   for p in ${keys.join(' ')}; do
//     openscad -D "PART=\\"$p\\"" -o $p.stl jagyeongnu.scad; done
// ※ 부재를 하나씩 따로 저장하려면 IDX를 0부터 차례로 바꿔 가며 저장하세요.
// ※ OpenSCAD 2021.01에서 확인했습니다. 최신 개발판(Manifold 엔진)을 쓰면 훨씬 빠릅니다.
//
// 부재 종류 목록:
${keys.map(k=>'//   '+k+'  '+G[k].n+' ('+G[k].members.length+'개)').join('\n')}

PART = "all";   // "all" 또는 위 목록의 부재 이름
IDX  = -1;      // -1: 그 종류 전부, 0 이상: 해당 번호 1개만
function on(i) = IDX < 0 || IDX == i;
module P(n){ if (PART=="all" || PART==n) children(); }

`;
fs.writeFileSync('jagyeongnu.scad',head+modSrc.join('\n')+'\n'+parts);
console.log('steps',steps.length,'groups',keys.length,'members',Object.values(G).reduce((a,g)=>a+g.members.length,0),'modules',mid,'bytes',fs.statSync('jagyeongnu.scad').size);
