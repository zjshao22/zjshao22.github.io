// Orthogonal drawing routes connect real link endpoints; they do not create network hops.
export function routeLink(a,b,rectangles){
  const dx=b.cx-a.cx,dy=b.cy-a.cy,horizontal=Math.abs(dx)>=Math.abs(dy),sign=Math.sign(horizontal?dx:dy)||1,gap=24;
  const sourceSide=a.local?'bottom':horizontal?(sign>0?'right':'left'):(sign>0?'bottom':'top');
  const targetSide=b.local?'bottom':horizontal?(sign>0?'left':'right'):(sign>0?'top':'bottom');
  const port=(r,side)=>({left:[[r.left,r.cy],[-1,0]],right:[[r.right,r.cy],[1,0]],top:[[r.cx,r.top],[0,-1]],bottom:[[r.local?r.cx-(r.right-r.left)*.22:r.cx,r.bottom],[0,1]]})[side];
  const [start,out]=port(a,sourceSide),[finish,incoming]=port(b,targetSide);
  const lead=[start[0]+out[0]*gap,start[1]+out[1]*gap],tail=[finish[0]+incoming[0]*gap,finish[1]+incoming[1]*gap];
  const candidates=[[[lead[0],tail[1]]],[[tail[0],lead[1]]]];
  for(const x of [(lead[0]+tail[0])/2,...rectangles.flatMap(r=>[r.left-gap,r.right+gap])])candidates.push([[x,lead[1]],[x,tail[1]]]);
  for(const y of [(lead[1]+tail[1])/2,...rectangles.flatMap(r=>[r.top-gap,r.bottom+gap])])candidates.push([[lead[0],y],[tail[0],y]]);
  let best=null,score=Infinity;
  for(const bends of candidates){
    const points=[lead,...bends,tail].filter((p,i,all)=>!i||p[0]!==all[i-1][0]||p[1]!==all[i-1][1]);
    let length=0,blocked=false;
    for(let i=1;i<points.length;i++){
      const [x1,y1]=points[i-1],[x2,y2]=points[i];length+=Math.abs(x2-x1)+Math.abs(y2-y1);
      if(rectangles.some(r=>x1===x2?x1>r.left&&x1<r.right&&Math.max(y1,y2)>r.top&&Math.min(y1,y2)<r.bottom:y1>r.top&&y1<r.bottom&&Math.max(x1,x2)>r.left&&Math.min(x1,x2)<r.right)){blocked=true;break;}
    }
    const cost=length+points.length*35;
    if(!blocked&&cost<score){best=points;score=cost;}
  }
  const points=[start,...(best||[lead,tail]),finish].filter((p,i,all)=>!i||p[0]!==all[i-1][0]||p[1]!==all[i-1][1]);
  for(let i=points.length-2;i>0;i--)if((points[i-1][0]===points[i][0]&&points[i][0]===points[i+1][0])||(points[i-1][1]===points[i][1]&&points[i][1]===points[i+1][1]))points.splice(i,1);
  return points;
}
export function roundedPath(points){
  let d=`M${points[0].join(',')}`;
  for(let i=1;i<points.length-1;i++){
    const a=points[i-1],b=points[i],c=points[i+1],before=Math.hypot(b[0]-a[0],b[1]-a[1]),after=Math.hypot(c[0]-b[0],c[1]-b[1]),r=Math.min(14,before/2,after/2);
    d+=` L${b[0]+(a[0]-b[0])*r/before},${b[1]+(a[1]-b[1])*r/before} Q${b.join(',')} ${b[0]+(c[0]-b[0])*r/after},${b[1]+(c[1]-b[1])*r/after}`;
  }
  return d+` L${points.at(-1).join(',')}`;
}
