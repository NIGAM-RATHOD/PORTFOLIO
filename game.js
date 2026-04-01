/* ═══════════════════════════════════════════════
   BACKGROUND 3D SCENE
   ═══════════════════════════════════════════════ */
(function(){
  const c=document.getElementById('bg-canvas'),
    r=new THREE.WebGLRenderer({canvas:c,alpha:true,antialias:true});
  r.setSize(innerWidth,innerHeight);r.setPixelRatio(Math.min(devicePixelRatio,2));
  const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,1000);
  cam.position.z=30;
  sc.add(new THREE.AmbientLight(0x6c63ff,.3));
  const dl=new THREE.DirectionalLight(0x00d4ff,.5);dl.position.set(5,10,15);sc.add(dl);
  const shapes=[],geos=[new THREE.IcosahedronGeometry(1,0),new THREE.OctahedronGeometry(1,0),
    new THREE.TetrahedronGeometry(1,0),new THREE.TorusGeometry(.7,.3,8,16),new THREE.DodecahedronGeometry(.8,0)],
    cols=[0x6c63ff,0x00d4ff,0xff6b9d,0x8b5cf6,0x06d6a0,0xffd93d];
  for(let i=0;i<35;i++){const g=geos[~~(Math.random()*geos.length)],
    mt=new THREE.MeshPhongMaterial({color:cols[~~(Math.random()*cols.length)],transparent:true,
      opacity:.08+Math.random()*.1,wireframe:Math.random()>.4,shininess:100}),
    m=new THREE.Mesh(g,mt),s=.3+Math.random()*1.2;m.scale.set(s,s,s);
    m.position.set((Math.random()-.5)*60,(Math.random()-.5)*40,(Math.random()-.5)*30-10);
    m.userData={rx:(Math.random()-.5)*.008,ry:(Math.random()-.5)*.008,
      fs:.3+Math.random()*.6,fo:Math.random()*6.28,by:m.position.y};
    sc.add(m);shapes.push(m)}
  const pg=new THREE.BufferGeometry(),pp=new Float32Array(500*3);
  for(let i=0;i<1500;i++)pp[i]=(Math.random()-.5)*80;
  pg.setAttribute('position',new THREE.BufferAttribute(pp,3));
  const pts=new THREE.Points(pg,new THREE.PointsMaterial({size:.06,color:0x6c63ff,transparent:true,opacity:.4}));
  sc.add(pts);let mx=0,my=0;
  document.addEventListener('mousemove',e=>{mx=(e.clientX/innerWidth-.5)*2;my=(e.clientY/innerHeight-.5)*2});
  (function a(){requestAnimationFrame(a);const t=performance.now()*.001;
    shapes.forEach(s=>{s.rotation.x+=s.userData.rx;s.rotation.y+=s.userData.ry;
      s.position.y=s.userData.by+Math.sin(t*s.userData.fs+s.userData.fo)*1.2});
    pts.rotation.y+=.0002;pts.rotation.x+=.0001;
    cam.position.x+=(mx*2.5-cam.position.x)*.015;cam.position.y+=(-my*1.5-cam.position.y)*.015;
    cam.lookAt(sc.position);r.render(sc,cam)})();
  addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();
    r.setSize(innerWidth,innerHeight)});
})();

/* ═══════════════════════════════════════════════
   COUNTDOWN
   ═══════════════════════════════════════════════ */
(function(){
  const t=new Date();t.setDate(t.getDate()+30);
  function u(){let d=t-new Date();if(d<0)d=0;
    document.getElementById('cd-d').textContent=String(~~(d/864e5)).padStart(2,'0');
    document.getElementById('cd-h').textContent=String(~~(d%864e5/36e5)).padStart(2,'0');
    document.getElementById('cd-m').textContent=String(~~(d%36e5/6e4)).padStart(2,'0');
    document.getElementById('cd-s').textContent=String(~~(d%6e4/1e3)).padStart(2,'0')}
  u();setInterval(u,1000);
})();

/* ═══════════════════════════════════════════════
   CIRCUIT FLOW PUZZLE GAME
   ═══════════════════════════════════════════════ */
(function(){
  const canvas=document.getElementById('puzzle-canvas');
  const ctx=canvas.getContext('2d');
  let W,H,cellSize,offsetX,offsetY;
  let grid=[];
  let solution=[];
  let COLS=5,ROWS=5;
  let moves=0,seconds=0,timer=null,level=1,totalSolved=0;
  let best=localStorage.getItem('cf-best')||null;
  let animating=false;
  let animTile=null,animFrom=0,animTo=0,animStart=0;
  const ANIM_DUR=200;

  // Directions: 0=up,1=right,2=down,3=left
  const DX=[0,1,0,-1],DY=[-1,0,1,0];

  // Tile types: array of connected directions
  const TYPES={
    STRAIGHT:[0,2],   // │
    STRAIGHT_H:[1,3], // ─
    BEND_0:[0,1],     // ╰ 
    BEND_1:[1,2],     // ╭
    BEND_2:[2,3],     // ╮
    BEND_3:[3,0],     // ╯
    TEE_0:[0,1,2],    // ├
    TEE_1:[1,2,3],    // ┬
    TEE_2:[2,3,0],    // ┤
    TEE_3:[3,0,1],    // ┴
    CROSS:[0,1,2,3],  // ┼
    END_0:[0],END_1:[1],END_2:[2],END_3:[3],
    SOURCE:[0,1,2,3]
  };

  if(best)document.getElementById('s-best').textContent=fmtTime(+best);
  document.getElementById('s-solved').textContent=totalSolved;

  // ── Generate valid puzzle ──
  function generate(){
    grid=[];solution=[];
    for(let y=0;y<ROWS;y++){grid[y]=[];solution[y]=[];
      for(let x=0;x<COLS;x++){grid[y][x]={dirs:[],rot:0,source:false,connected:false};solution[y][x]=0}}

    // Build spanning tree using randomized DFS
    const visited=Array.from({length:ROWS},()=>Array(COLS).fill(false));
    const edges=[];
    const stack=[];
    const sx=~~(COLS/2),sy=~~(ROWS/2);
    visited[sy][sx]=true;stack.push([sx,sy]);
    grid[sy][sx].source=true;

    while(stack.length){
      const[cx,cy]=stack[stack.length-1];
      const neighbors=[];
      for(let d=0;d<4;d++){
        const nx=cx+DX[d],ny=cy+DY[d];
        if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS&&!visited[ny][nx])neighbors.push(d);
      }
      if(neighbors.length===0){stack.pop();continue}
      const d=neighbors[~~(Math.random()*neighbors.length)];
      const nx=cx+DX[d],ny=cy+DY[d];
      visited[ny][nx]=true;
      edges.push([cx,cy,d]);
      stack.push([nx,ny]);
    }

    // Add some extra edges for more interesting puzzles (30% chance)
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      for(let d=0;d<4;d++){
        const nx=x+DX[d],ny=y+DY[d];
        if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS&&Math.random()<.25){
          const hasEdge=edges.some(e=>(e[0]===x&&e[1]===y&&e[2]===d)||(e[0]===nx&&e[1]===ny&&e[2]===(d+2)%4));
          if(!hasEdge)edges.push([x,y,d]);
        }
      }
    }

    // Build direction sets
    const dirSets=Array.from({length:ROWS},()=>Array.from({length:COLS},()=>new Set()));
    for(const[x,y,d]of edges){
      dirSets[y][x].add(d);
      const nx=x+DX[d],ny=y+DY[d];
      if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS)dirSets[ny][nx].add((d+2)%4);
    }
    // Source connects all 4
    dirSets[sy][sx]=new Set([0,1,2,3]);

    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      grid[y][x].dirs=[...dirSets[y][x]].sort();
      solution[y][x]=0; // solution rotation is 0
    }

    // Scramble by random rotations
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if(grid[y][x].source)continue;
      const rots=~~(Math.random()*4);
      for(let r=0;r<rots;r++){
        grid[y][x].dirs=grid[y][x].dirs.map(d=>(d+1)%4);
      }
      grid[y][x].rot=rots;
    }
    updateConnections();
  }

  // ── Check connectivity from source ──
  function updateConnections(){
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)grid[y][x].connected=false;
    const sy=~~(ROWS/2),sx=~~(COLS/2);
    const q=[[sx,sy]];grid[sy][sx].connected=true;
    while(q.length){
      const[cx,cy]=q.shift();
      for(const d of grid[cy][cx].dirs){
        const nx=cx+DX[d],ny=cy+DY[d];
        if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS&&!grid[ny][nx].connected){
          const opp=(d+2)%4;
          if(grid[ny][nx].dirs.includes(opp)){
            grid[ny][nx].connected=true;q.push([nx,ny]);
          }
        }
      }
    }
  }

  function isSolved(){
    return grid.every(row=>row.every(cell=>cell.connected));
  }

  // ── Resize ──
  function resize(){
    const dpr=Math.min(devicePixelRatio,2);
    W=canvas.clientWidth;H=canvas.clientHeight;
    canvas.width=W*dpr;canvas.height=H*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    cellSize=Math.min((W-40)/COLS,(H-40)/ROWS);
    offsetX=(W-COLS*cellSize)/2;offsetY=(H-ROWS*cellSize)/2;
  }

  // ── Drawing ──
  const COL_CONNECTED='#00d4ff';
  const COL_DISCONN='#2a2a4a';
  const COL_SOURCE='#6c63ff';
  const COL_GLOW='rgba(0,212,255,.3)';

  function draw(){
    ctx.clearRect(0,0,W,H);

    // Draw grid background
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      const cx=offsetX+x*cellSize+cellSize/2;
      const cy=offsetY+y*cellSize+cellSize/2;
      const s=cellSize*.88;
      const r=cellSize*.12;

      // Tile bg
      ctx.save();
      ctx.beginPath();
      roundRect(ctx,cx-s/2,cy-s/2,s,s,r);
      const isConn=grid[y][x].connected;
      const grad=ctx.createRadialGradient(cx,cy,0,cx,cy,s*.6);
      if(grid[y][x].source){
        grad.addColorStop(0,'rgba(108,99,255,.25)');grad.addColorStop(1,'rgba(108,99,255,.08)');
      }else if(isConn){
        grad.addColorStop(0,'rgba(0,212,255,.12)');grad.addColorStop(1,'rgba(0,212,255,.04)');
      }else{
        grad.addColorStop(0,'rgba(255,255,255,.04)');grad.addColorStop(1,'rgba(255,255,255,.015)');
      }
      ctx.fillStyle=grad;ctx.fill();
      ctx.strokeStyle=isConn?'rgba(0,212,255,.2)':'rgba(255,255,255,.06)';
      ctx.lineWidth=1;ctx.stroke();
      ctx.restore();

      // Draw pipes
      const cell=grid[y][x];
      let drawDirs=cell.dirs;

      // Handle animation
      if(animTile&&animTile.x===x&&animTile.y===y){
        const t=Math.min((performance.now()-animStart)/ANIM_DUR,1);
        const ease=1-Math.pow(1-t,3);
        const angle=(animTo-animFrom)*ease+animFrom;
        ctx.save();ctx.translate(cx,cy);ctx.rotate(angle*Math.PI/2);ctx.translate(-cx,-cy);
        // draw dirs in un-rotated state for animation
        drawDirs=animTile.origDirs;
      }

      drawPipes(ctx,cx,cy,cellSize,drawDirs,cell.source,cell.connected);

      if(animTile&&animTile.x===x&&animTile.y===y)ctx.restore();

      // Source indicator
      if(cell.source){
        ctx.save();
        ctx.beginPath();ctx.arc(cx,cy,cellSize*.15,0,Math.PI*2);
        const sg=ctx.createRadialGradient(cx,cy,0,cx,cy,cellSize*.15);
        sg.addColorStop(0,'rgba(108,99,255,.9)');sg.addColorStop(1,'rgba(108,99,255,.3)');
        ctx.fillStyle=sg;ctx.fill();
        ctx.shadowBlur=15;ctx.shadowColor='#6c63ff';
        ctx.beginPath();ctx.arc(cx,cy,cellSize*.08,0,Math.PI*2);
        ctx.fillStyle='#fff';ctx.fill();ctx.shadowBlur=0;
        ctx.restore();
      }

      // Glow for connected tiles
      if(isConn&&!cell.source){
        ctx.save();ctx.beginPath();ctx.arc(cx,cy,cellSize*.06,0,Math.PI*2);
        ctx.fillStyle='rgba(0,212,255,.5)';ctx.shadowBlur=10;ctx.shadowColor=COL_CONNECTED;
        ctx.fill();ctx.shadowBlur=0;ctx.restore();
      }
    }

    // Floating particles on connected pipes
    drawParticles();
  }

  function drawPipes(ctx,cx,cy,cs,dirs,isSource,isConn){
    const pw=cs*.1;
    const half=cs*.38;
    const col=isSource?COL_SOURCE:isConn?COL_CONNECTED:COL_DISCONN;

    ctx.save();
    ctx.lineCap='round';ctx.lineJoin='round';

    if(isConn){ctx.shadowBlur=isSource?12:8;ctx.shadowColor=col}

    ctx.strokeStyle=col;ctx.lineWidth=pw;
    ctx.beginPath();
    for(const d of dirs){
      ctx.moveTo(cx,cy);
      switch(d){
        case 0:ctx.lineTo(cx,cy-half);break;
        case 1:ctx.lineTo(cx+half,cy);break;
        case 2:ctx.lineTo(cx,cy+half);break;
        case 3:ctx.lineTo(cx-half,cy);break;
      }
    }
    ctx.stroke();

    // Outer glow layer
    if(isConn){
      ctx.strokeStyle=col.replace(')',', 0.15)').replace('rgb','rgba');
      ctx.lineWidth=pw*2.5;ctx.shadowBlur=0;
      ctx.beginPath();
      for(const d of dirs){
        ctx.moveTo(cx,cy);
        switch(d){
          case 0:ctx.lineTo(cx,cy-half);break;
          case 1:ctx.lineTo(cx+half,cy);break;
          case 2:ctx.lineTo(cx,cy+half);break;
          case 3:ctx.lineTo(cx-half,cy);break;
        }
      }
      ctx.stroke();
    }
    ctx.shadowBlur=0;
    ctx.restore();
  }

  // ── Particles ──
  const particles=[];
  function spawnParticles(){
    if(particles.length>60)return;
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if(!grid[y][x].connected||Math.random()>.08)continue;
      const dirs=grid[y][x].dirs;
      if(dirs.length===0)continue;
      const d=dirs[~~(Math.random()*dirs.length)];
      const cx=offsetX+x*cellSize+cellSize/2;
      const cy=offsetY+y*cellSize+cellSize/2;
      particles.push({x:cx,y:cy,dx:DX[d]*cellSize*.015,dy:DY[d]*cellSize*.015,
        life:1,source:grid[y][x].source});
    }
  }
  function drawParticles(){
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];
      p.x+=p.dx;p.y+=p.dy;p.life-=.02;
      if(p.life<=0){particles.splice(i,1);continue}
      ctx.save();ctx.globalAlpha=p.life*.6;
      ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);
      ctx.fillStyle=p.source?'#a78bfa':'#00d4ff';ctx.fill();
      ctx.shadowBlur=6;ctx.shadowColor=p.source?'#6c63ff':'#00d4ff';
      ctx.fill();ctx.shadowBlur=0;ctx.restore();
    }
  }

  function roundRect(ctx,x,y,w,h,r){
    ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
  }

  // ── Click handler ──
  canvas.addEventListener('click',e=>{
    if(animating)return;
    const rect=canvas.getBoundingClientRect();
    const mx=e.clientX-rect.left,my=e.clientY-rect.top;
    const gx=~~((mx-offsetX)/cellSize),gy=~~((my-offsetY)/cellSize);
    if(gx<0||gx>=COLS||gy<0||gy>=ROWS)return;
    if(grid[gy][gx].source)return;

    if(!timer)startTimer();
    moves++;document.getElementById('s-moves').textContent=moves;

    // Animate rotation
    const origDirs=[...grid[gy][gx].dirs];
    animTile={x:gx,y:gy,origDirs};animFrom=0;animTo=1;animStart=performance.now();animating=true;

    setTimeout(()=>{
      grid[gy][gx].dirs=grid[gy][gx].dirs.map(d=>(d+1)%4);
      updateConnections();
      animTile=null;animating=false;
      if(isSolved())onSolved();
    },ANIM_DUR);
  });

  // ── Solve ──
  function onSolved(){
    if(timer){clearInterval(timer);timer=null}
    totalSolved++;level++;
    document.getElementById('s-solved').textContent=totalSolved;

    if(!best||seconds<+best){
      best=seconds;localStorage.setItem('cf-best',best);
      document.getElementById('s-best').textContent=fmtTime(+best);
      showToast('🏆 NEW BEST! Level cleared in '+fmtTime(seconds)+'!');
    }else{
      showToast('⚡ Circuit connected! Level '+level+' unlocked!');
    }

    // Update progress
    const pct=Math.min(42+totalSolved*8,98);
    document.getElementById('prog-fill').style.width=pct+'%';
    document.getElementById('pct-val').textContent=pct+'%';

    // Celebration flash
    let flash=1;
    const fi=setInterval(()=>{flash-=.02;if(flash<=0){clearInterval(fi);return}
      canvas.style.boxShadow='0 0 '+(flash*40)+'px rgba(0,212,255,'+flash*.4+')'},16);

    // Next level after delay
    setTimeout(()=>{
      if(level<=3){COLS=5;ROWS=5}
      else if(level<=6){COLS=6;ROWS=6}
      else{COLS=7;ROWS=7}
      document.getElementById('level-ind').textContent='LEVEL '+level+' · '+COLS+'×'+ROWS+' GRID';
      newPuzzle();
    },2000);
  }

  // ── Timer ──
  function startTimer(){if(timer)clearInterval(timer);seconds=0;
    timer=setInterval(()=>{seconds++;document.getElementById('s-time').textContent=fmtTime(seconds)},1000)}
  function fmtTime(s){return ~~(s/60)+':'+String(s%60).padStart(2,'0')}

  // ── Controls ──
  function newPuzzle(){
    moves=0;seconds=0;if(timer){clearInterval(timer);timer=null}
    document.getElementById('s-moves').textContent='0';
    document.getElementById('s-time').textContent='0:00';
    generate();resize();
  }

  document.getElementById('btn-new').onclick=()=>{level=1;COLS=5;ROWS=5;
    document.getElementById('level-ind').textContent='LEVEL 1 · 5×5 GRID';newPuzzle();showToast('⚡ New puzzle generated!')};
  document.getElementById('btn-reset').onclick=()=>{
    // Reset to scrambled state
    newPuzzle();showToast('↩ Puzzle reset!')};
  document.getElementById('btn-hint').onclick=()=>{
    const hints=['Start from the source (center) and work outward.',
      'Edge tiles connect to fewer neighbors — solve them first.',
      'Look for dead-end pipes — they must point toward a neighbor.',
      'T-junctions always have exactly 3 connections.',
      'Corner tiles can only connect to 2 adjacent sides.',
      'Straight pipes always connect opposite sides.'];
    showToast('💡 '+hints[~~(Math.random()*hints.length)])};

  // ── Render Loop ──
  let lastSpawn=0;
  function loop(t){
    requestAnimationFrame(loop);
    if(t-lastSpawn>200){spawnParticles();lastSpawn=t}
    draw();
  }

  resize();generate();
  requestAnimationFrame(loop);
  addEventListener('resize',()=>{resize()});

  // ── Toast ──
  window.showToast=function(msg){
    const el=document.getElementById('toast');
    el.textContent=msg;el.classList.add('show');
    setTimeout(()=>el.classList.remove('show'),3000)};
})();
