// Give coplanar pavement patches one owner. Opposing carriageways can each
// generate a full-width sidewalk over the same narrow median (Liteyny is one
// example). Subtract earlier patches instead of hiding the overlap with depth bias.
const EPS = 1e-7, CELL = 16;
const area = p => p.reduce((s,a,i) => { const b=p[(i+1)%p.length]; return s+a[0]*b[1]-b[0]*a[1]; },0);
const bounds = p => [Math.min(...p.map(a=>a[0])),Math.min(...p.map(a=>a[1])),Math.max(...p.map(a=>a[0])),Math.max(...p.map(a=>a[1]))];
function half(p,a,b,inside){
  const out=[],sign=inside?1:-1,side=v=>sign*((b[0]-a[0])*(v[1]-a[1])-(b[1]-a[1])*(v[0]-a[0]));
  for(let i=0,j=p.length-1;i<p.length;j=i++){
    const u=p[j],v=p[i],du=side(u),dv=side(v),iu=du>=-EPS,iv=dv>=-EPS;
    if(iu!==iv){const t=du/(du-dv);out.push([u[0]+(v[0]-u[0])*t,u[1]+(v[1]-u[1])*t]);}
    if(iv)out.push(v);
  }
  return out.length>=3&&Math.abs(area(out))>EPS?out:[];
}
function subtract(subject,clip){
  const out=[];let rest=subject;
  for(let i=0;i<clip.length&&rest.length;i++){
    const a=clip[i],b=clip[(i+1)%clip.length],piece=half(rest,a,b,false);
    if(piece.length)out.push(piece);
    rest=half(rest,a,b,true);
  }
  return out;
}
export class PavingCoverage {
  constructor(){this.grid=new Map();this.patches=[];}
  /** true when (x, z) lies inside a pavement polygon that has been taken (the union of the input polygons = the union of what was emitted): walls use it to find the seams inside paving */
  covers(x,z){
    const ids=this.grid.get(Math.floor(x/CELL)+','+Math.floor(z/CELL));if(!ids)return false;
    for(const id of ids){const c=this.patches[id],b=c.b;if(x<b[0]||x>b[2]||z<b[1]||z>b[3])continue;
      const p=c.p;let ins=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],q=p[j];if((a[1]>z)!==(q[1]>z)&&x<(q[0]-a[0])*(z-a[1])/(q[1]-a[1])+a[0])ins=!ins;}
      if(ins)return true;}
    return false;
  }
  cells(b,fn){for(let x=Math.floor(b[0]/CELL);x<=Math.floor(b[2]/CELL);x++)for(let z=Math.floor(b[1]/CELL);z<=Math.floor(b[3]/CELL);z++)fn(x+','+z);}
  take(input){
    if(input.length===4){
      const turns=input.map((a,i)=>{const b=input[(i+1)%4],c=input[(i+2)%4];return(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);});
      if(turns.some(v=>v>EPS)&&turns.some(v=>v< -EPS))
        return [...this.take(input.slice(0,3)),...this.take([input[0],input[2],input[3]])];
    }
    if(Math.abs(area(input))<=EPS)return [];
    const p=area(input)<0?[...input].reverse():input,b=bounds(p),seen=new Set();let pieces=[p];
    this.cells(b,k=>{for(const id of this.grid.get(k)||[])seen.add(id);});
    for(const id of seen){const c=this.patches[id],q=c.b;
      if(b[0]>=q[2]-EPS||b[2]<=q[0]+EPS||b[1]>=q[3]-EPS||b[3]<=q[1]+EPS)continue;
      pieces=pieces.flatMap(s=>subtract(s,c.p));if(!pieces.length)break;
    }
    const id=this.patches.length;this.patches.push({p,b});
    this.cells(b,k=>{let ids=this.grid.get(k);if(!ids)this.grid.set(k,ids=[]);ids.push(id);});
    return pieces;
  }
}
