/* ATALT — ATA — 001 · one clock, displacement engine, the cuts, accordion, countdown */

/* ---- event facts: one place to change ---- */
const FACTS = {
  dateShort: 'FR · 25.09.26',   // per quicket.me/events/atalt-001 (Fri 25 Sep 2026)
  dateLong:  'FR · 25.09.26',
};
document.querySelectorAll('[data-fact]').forEach(el=>{ const k=el.dataset.fact; if(FACTS[k]) el.textContent=FACTS[k]; });

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- the room darkens as the night approaches ----
   21 days out the palette sits at its published values; by the 25th the ink has
   deepened and the off-white warmed. Nobody notices it. Everybody feels it. */
(function dusk(){
  const gate = new Date('2026-09-25T15:00:00+06:00').getTime();
  const days = Math.max(0, (gate - Date.now()) / 86400000);
  const t = Math.min(1, Math.max(0, 1 - days / 21));           // 0 far out -> 1 on the night
  const mix = (a, b) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  const r = document.documentElement.style;
  r.setProperty('--ink',  hex(mix([10, 10, 10],  [7, 6, 5])));      // warm, deeper
  r.setProperty('--off',  hex(mix([245, 243, 237], [246, 241, 228])));// warmer
  r.setProperty('--hair', hex(mix([61, 58, 50],  [54, 50, 41])));
})();

/* the hero's orchestrated moment is a GSAP timeline, built in MOTION at the end of this file */
const hero=document.getElementById('hero');

/* ============================================================
   THE PAGE'S ONE CLOCK
   One scroll listener, one requestAnimationFrame. The listener only
   records; everything scroll-driven (springs, hero flag, altered rows,
   sigil shear, stillness, the cuts) reads the recorded position inside
   the frame. Rects are measured when layout can have changed — resize,
   fonts, load, the accordion — never inside the frame. The loop sleeps
   the moment nothing is moving and no input arrived in the last 400 ms.
   ============================================================ */
const CLOCK=(()=>{
  let H=innerHeight, L=H*0.38, sy=scrollY, vel=0, active=0, raf=0, last=performance.now(), dirty=true;
  const tasks=[];        // fn(now, dt) -> true while it still needs frames
  const measurers=[];    // fn()        -> re-read rects; layout is clean when called
  function measure(){ dirty=false; H=innerHeight; L=H*0.38; sy=scrollY; for(const m of measurers) m(); }
  function tick(now){
    raf=0;
    const dt=Math.min(0.032,(now-last)/1000); last=now;
    if(dirty) measure();
    let keep=false;
    for(const t of tasks) if(t(now,dt)) keep=true;
    if(keep||now-active<400) raf=requestAnimationFrame(tick);         // 400 ms after the last *input*
  }
  function wake(input){ if(input) active=performance.now(); if(!raf) raf=requestAnimationFrame(tick); }
  function invalidate(){ dirty=true; wake(false); }
  // the one scroll listener: record position + velocity, nothing else
  addEventListener('scroll',()=>{ const y=scrollY, d=y-sy; sy=y; vel=vel*0.6+d*0.4; wake(true); },{passive:true});
  addEventListener('resize',invalidate);                              // re-measure only; springs keep x/v (iOS toolbar fires this mid-scroll)
  addEventListener('load',invalidate);
  if(document.fonts) document.fonts.ready.then(invalidate);
  // accordion, late images: the observer fires every frame of the 571 ms open, so re-measure at most
  // every 90 ms (a trailing pass catches the final layout); the springs read rects ≤ 90 ms old meanwhile
  let roT=0;
  if('ResizeObserver' in window) new ResizeObserver(()=>{ if(!roT) roT=setTimeout(()=>{ roT=0; invalidate(); },90); }).observe(document.querySelector('main'));
  return {
    add(task,measurer){ tasks.push(task); if(measurer) measurers.push(measurer); },
    wake, invalidate,
    velGain:1.15,                          // how hard scroll speed shears the page; Lenis raises it (it spreads a wheel tick over many frames)
    get y(){return sy}, get H(){return H}, get L(){return L},
    get vel(){return vel}, set vel(v){vel=v},
  };
})();

/* ---- poster screens ----
   Every screen after the hero is one viewport tall. The site has one display size (--fs): FIT finds, per
   screen, the largest size at which its content still fits above the Request access bar with no word
   running out of its column, and uses the smallest of those everywhere: a binary search, a few layouts a
   screen, run only when the
   viewport's size changes or the fonts land, never while scrolling. Windows 600 px tall or less keep the
   CSS sizes and scroll freely (the same threshold as the snapping). */
(function fit(){
  const root=document.documentElement, boxes=[...document.querySelectorAll('[data-fit]')];
  if(!boxes.length) return;
  const short=matchMedia('(max-height:600px)');
  let sig='', t=0;
  const fits=R=>{
    const last=R.lastElementChild;
    if(last&&last.getBoundingClientRect().bottom>R.getBoundingClientRect().bottom+.5) return false;
    if(R.scrollWidth>R.clientWidth+1) return false;                   // a track that grew past the column
    for(const e of R.querySelectorAll('.split,.name .n,.count .line')) if(e.scrollWidth>e.clientWidth+1) return false;
    return true;
  };
  function run(){
    if(short.matches){
      if(root.classList.contains('fit')){ root.classList.remove('fit'); root.style.removeProperty('--fs'); root.style.removeProperty('--fs-l'); sig=''; CLOCK.invalidate(); }
      return;
    }
    root.classList.add('fit');
    const s=innerWidth+'x'+boxes[0].clientHeight;                     // svh screens: the iOS toolbar doesn't change this
    if(s===sig) return; sig=s;
    root.classList.add('fitting');
    // the largest size (between floor and ceil) at which screen R still fits, trying it on R alone
    const search=(R,prop,floor,ceil)=>{
      let lo=floor, hi=ceil+1;
      R.style.setProperty(prop,lo+'px');
      if(fits(R)) while(hi-lo>1){ const m=(lo+hi)>>1; R.style.setProperty(prop,m+'px'); if(fits(R)) lo=m; else hi=m; }
      R.style.removeProperty(prop);
      return lo;
    };
    const phone=innerWidth<761;
    // one display size for every screen: the largest each allows, then the smallest of those
    let size=phone?52:88;                                               // the ceiling
    for(const R of boxes) if(R.dataset.fit!=='own') size=Math.min(size,search(R,'--fs',phone?22:30,size));
    root.style.setProperty('--fs',size+'px');
    // the lineup (data-fit="own"): names and genres at one size of their own, never above the display size
    let lineup=size;
    for(const R of boxes) if(R.dataset.fit==='own') lineup=Math.min(lineup,search(R,'--fs-l',phone?14:18,size));
    root.style.setProperty('--fs-l',lineup+'px');
    root.classList.remove('fitting');
    CLOCK.invalidate();
  }
  run();
  addEventListener('resize',()=>{ clearTimeout(t); t=setTimeout(run,120); },{passive:true});
  const again=()=>{ sig=''; run(); };
  if(document.fonts) document.fonts.ready.then(again);
  addEventListener('load',again);
})();

/* ---- page state from the clock: hero flag, altered rows and the sigil shear ----
   The states run under reduced motion too (they are states, not motion); the shear does not.
   (The headings' reveal lives in MOTION.) */
(()=>{
  const body=document.body, sgLo=document.querySelector('.sigil-stack .sg-lo');
  const rows=[...document.querySelectorAll('.item')].map(el=>({el,btn:el.querySelector('.name'),top:0,bottom:0}));
  let lastY=NaN, sgT='';
  function measure(){
    const y=scrollY;
    for(const r of rows){ const b=r.btn.getBoundingClientRect(); r.top=b.top+y; r.bottom=b.bottom+y; }
    lastY=NaN;                                                          // force one re-evaluation
  }
  const cls=(el,c,on)=>{ if(el.classList.contains(c)!==on) el.classList.toggle(c,on); };   // no-op writes cost style recalcs
  function task(){
    const y=CLOCK.y, H=CLOCK.H, L=CLOCK.L; if(y===lastY) return false; lastY=y;
    cls(body,'on-hero', y<H*0.7);
    for(const r of rows) cls(r.el,'altered', r.top-y<L && r.bottom-y>L);
    if(!reduce&&sgLo&&!document.documentElement.classList.contains('gl')){ const p=Math.min(1,Math.max(0,y/(H*0.9))); const t=(p*p*46).toFixed(1);   // the mark alters as you leave it
      if(t!==sgT){ sgT=t; sgLo.style.transform='translateX('+t+'px)'; } }
    return false;                                                       // never keeps the loop awake by itself
  }
  CLOCK.add(task,measure);
})();


/* ---- structural distortion: split names and portraits at the altering line ---- */
document.querySelectorAll('.name .n').forEach(n=>{
  const t=n.textContent;
  n.setAttribute('aria-label',t);
  const btn=n.closest('.name'); if(btn) btn.setAttribute('aria-label',t);
  n.innerHTML=t.split(' ').map(word=>
    '<span class="w" aria-hidden="true">'+[...word].map(c=>
      `<span class="ch"><span class="t">${c}</span><span class="b">${c}</span></span>`).join('')+'</span>'
  ).join(' ');
});document.querySelectorAll('.inner figure').forEach(f=>{ const img=f.querySelector('img'); if(!img) return;
  const w=document.createElement('div'); w.className='cut'; img.classList.add('hi'); const lo=img.cloneNode(); lo.className='lo'; lo.alt='';
  f.replaceChild(w,img); w.append(img,lo); });

/* ============================================================
   HERO SIGNAL
   The sigil and the wordmark drawn into one WebGL texture and torn along their own cut lines,
   like a signal breaking up: thin rows thrown right in hard steps (24 a second), a faint ghost
   trailing each tear, the lower halves sliding as a block. Scroll speed, the pointer and the
   jolts put energy in; it bleeds out to a clean mark. It draws only while there is energy or
   the hero is being scrolled past, never offscreen. Plain WebGL, one texture, one quad.
   Reduced motion, no WebGL, a failed paint or a lost context: the DOM marks underneath stay,
   settled to the finished mark.
   ============================================================ */
const GL=(()=>{
  const root=document.documentElement, marks=document.querySelector('.hero-marks'),
        box=document.querySelector('.hero .sigil-stack'), sgImg=document.querySelector('.hero .sg:not(.sg-lo)'), wm=document.querySelector('.hero .wm-big');
  if(reduce||!marks||!box||!sgImg||!wm) return null;
  const cv=document.createElement('canvas'); cv.className='hero-gl'; cv.setAttribute('aria-hidden','true');
  let gl=null; try{ gl=cv.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,powerPreference:'low-power'}); }catch(e){}
  if(!gl) return null;
  const VS='attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const FS='precision mediump float;varying vec2 v;uniform sampler2D T;uniform float t,amp,rt,rb,py,pa,lv;uniform vec3 S,W;'+
    'float h(float n){return fract(sin(n)*43758.5453);}'+
    'void main(){float y=v.y,f=floor(t*24.),e=clamp(amp+lv*.6,0.,1.4);'+
    'float rw=floor(y*140.),r=h(rw*1.37+f*.71),r2=h(rw*7.13+f*1.91),r3=h(floor(y*26.)*3.1+f*.37);'+
    'float nl=max(exp(-abs(y-S.y)*16.),exp(-abs(y-W.y)*20.));'+                       // tears gather at the two cut lines
    'float tear=step(1.-(.04+.42*min(e,1.)),r)*(.25+.75*r2)*e*(.3+nl)+step(.985-.12*min(e,1.),r3)*e*.5+step(.9,r)*pa*exp(-abs(y-py)*14.)*.8;'+
    'float low=max(step(S.z,y)*step(y,S.y),step(W.z,y)*step(y,W.y));'+                 // the lower halves
    'float dx=tear*.045+low*(amp*.025+lv*.04),on=step(.0001,tear);'+                  // always rightward: sample to the left
    'vec4 c=max(texture2D(T,vec2(v.x-dx,y)),texture2D(T,vec2(v.x-dx*2.4-.004,y))*.32*on);'+
    'float top=max(step(S.y,y)*step(y,S.x),step(W.y,y)*step(y,W.x));'+
    'gl_FragColor=c*step(v.x,mix(rb,rt,top));}';                                      // intro: top halves wipe in, then the bottom halves
  const U={rt:0,rb:0,amp:0,pa:0,py:.5,lv:0}, S=new Float32Array([1,.5,0]), Wm=new Float32Array([1,.5,0]);
  const loc={}, off=document.createElement('canvas');
  let tex=null, ready=false, painting=false, pending=false, intro=false, lastLv=-1, heroBottom=Infinity, mTop=0, mH=1, key='';
  const sh=(type,src)=>{ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null; };
  function init(){
    const vs=sh(gl.VERTEX_SHADER,VS), fs=sh(gl.FRAGMENT_SHADER,FS); if(!vs||!fs) return false;
    const prog=gl.createProgram(); gl.attachShader(prog,vs); gl.attachShader(prog,fs); gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const pl=gl.getAttribLocation(prog,'p'); gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl,2,gl.FLOAT,false,0,0);
    ['T','t','amp','rt','rb','py','pa','lv','S','W'].forEach(k=>loc[k]=gl.getUniformLocation(prog,k));
    tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,tex);
    [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]]
      .forEach(([k,v])=>gl.texParameteri(gl.TEXTURE_2D,k,v));
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    return true;
  }
  function draw(now){
    if(!ready) return;
    gl.viewport(0,0,cv.width,cv.height); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1i(loc.T,0); gl.uniform1f(loc.t,now/1000);
    gl.uniform1f(loc.amp,U.amp); gl.uniform1f(loc.rt,U.rt); gl.uniform1f(loc.rb,U.rb);
    gl.uniform1f(loc.py,U.py); gl.uniform1f(loc.pa,U.pa); gl.uniform1f(loc.lv,U.lv);
    gl.uniform3fv(loc.S,S); gl.uniform3fv(loc.W,Wm);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  function settleDom(){                    // the fallback must be the finished mark, not the intro's first frame
    sgImg.style.clipPath='inset(0 0 50% 0)';
    const lo=document.querySelector('.hero .sg-lo'); if(lo) lo.style.clipPath='inset(50% 0 0 0)';
    wm.querySelectorAll('.hi,.low').forEach(g=>g.style.clipPath='inset(0 -2% 0 0)');
    const ln=wm.querySelector('line'); if(ln) ln.style.strokeDashoffset='0';
  }
  function fail(){ ready=false; settleDom(); root.classList.remove('gl'); cv.remove(); }
  async function paint(){
    if(painting){ pending=true; return; } painting=true;
    try{
      const dpr=Math.min(2,devicePixelRatio||1), mr=marks.getBoundingClientRect(), sr=box.getBoundingClientRect(), wr=wm.getBoundingClientRect();
      const color=getComputedStyle(root).getPropertyValue('--off').trim()||'#F5F3ED';
      if(sgImg.decode) await sgImg.decode().catch(()=>{});
      const svg=wm.cloneNode(true);                                   // the wordmark, whole: no clips, no engine transforms
      svg.querySelectorAll('[style]').forEach(n=>n.removeAttribute('style'));
      svg.setAttribute('xmlns','http://www.w3.org/2000/svg'); svg.setAttribute('color',color);
      svg.setAttribute('width',String(wr.width*dpr)); svg.setAttribute('height',String(wr.height*dpr));
      const im=new Image(); im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));
      await im.decode();
      const w=Math.max(1,Math.round(mr.width*dpr)), h=Math.max(1,Math.round(mr.height*dpr));
      off.width=cv.width=w; off.height=cv.height=h;
      const c=off.getContext('2d'); c.clearRect(0,0,w,h);
      c.drawImage(sgImg,(sr.left-mr.left)*dpr,(sr.top-mr.top)*dpr,sr.width*dpr,sr.height*dpr);
      c.drawImage(im,(wr.left-mr.left)*dpr,(wr.top-mr.top)*dpr,wr.width*dpr,wr.height*dpr);
      gl.bindTexture(gl.TEXTURE_2D,tex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,off);
      const Y=px=>1-px/mr.height, st=sr.top-mr.top, wt=wr.top-mr.top;
      S[0]=Y(st); S[1]=Y(st+sr.height*.5); S[2]=Y(st+sr.height);              // the webp's bar is at 50% of its height
      Wm[0]=Y(wt); Wm[1]=Y(wt+wr.height*32/56); Wm[2]=Y(wt+wr.height);         // the wordmark's line: y 30 in a viewBox from -2, 56 tall
      ready=true; draw(performance.now());
    }catch(e){ fail(); }
    painting=false;
    if(pending){ pending=false; paint(); }
  }
  if(!init()) return null;
  marks.append(cv); root.classList.add('gl');
  cv.addEventListener('webglcontextlost',e=>{ e.preventDefault(); ready=false; settleDom(); root.classList.remove('gl'); });
  cv.addEventListener('webglcontextrestored',()=>{ if(init()){ root.classList.add('gl'); key=''; paint(); } else fail(); });
  const readyP=paint();
  CLOCK.add((now,dt)=>{
    if(!ready) return intro;
    const y=CLOCK.y, H=CLOCK.H;
    if(!intro){ U.amp=Math.max(0,U.amp-dt*1.4);                               // energy bleeds out
      const v=Math.abs(CLOCK.vel); if(v>.6) U.amp=Math.min(1.1,U.amp+Math.min(.06,v*.003)); }
    U.pa=Math.max(0,U.pa-dt*2.2);
    const lv=Math.min(1,Math.max(0,y/(H*.9))), live=intro||U.amp>.003||U.pa>.003;
    if(y<heroBottom&&(live||lv!==lastLv)){ U.lv=lv; lastLv=lv; draw(now); }     // offscreen: nothing drawn
    return live;
  },()=>{
    const hr=hero.getBoundingClientRect(), mr=marks.getBoundingClientRect(), y=scrollY;
    heroBottom=hr.bottom+y; mTop=mr.top+y; mH=mr.height||1;
    const k=[mr.width,mr.height,box.getBoundingClientRect().width,getComputedStyle(root).getPropertyValue('--off')].join('|');
    if(k!==key){ key=k; paint(); }                                             // repaint only when the marks actually changed
  });
  if(matchMedia('(hover:hover) and (pointer:fine)').matches)
    hero.addEventListener('pointermove',e=>{ U.py=1-((e.clientY+CLOCK.y)-mTop)/mH; U.pa=Math.min(1,U.pa+.1); CLOCK.wake(true); },{passive:true});
  return {
    U, ready:readyP,
    intro(on){ intro=on; if(on) CLOCK.wake(false); },
    kick(a){ if(!ready||intro) return; U.amp=Math.min(1.1,U.amp+a); CLOCK.wake(false); },
    reveal(){ readyP.then(()=>{ U.rt=U.rb=1; intro=false; draw(performance.now()); }); },
  };
})();

/* ============================================================
   BACKGROUND SIGNAL
   The hero's failing signal, spread behind the whole page: a WebGL canvas drawn at a third of the
   screen's resolution and scaled up without smoothing, so it reads as digital cells, not film grain.
   Sparse static; rows that tear right in hard steps (24 a second); bright block runs inside the
   tears; faint scanlines; and the page's cut line at 38%, which only shows while the signal is
   disturbed. Scroll speed, the pointer and the hero's jolts disturb it; it settles back to a quiet idle
   (crawling scanlines, a slow roll, faint micro-glitches at about 12 frames a second) that never quite
   stops, except while the tab is hidden or a sheet covers the page. Deeper into the page the static thickens. Reduced motion, no WebGL, a lost context: the
   CSS grain instead.
   ============================================================ */
const BG=(()=>{
  const root=document.documentElement;
  if(reduce) return null;
  const cv=document.createElement('canvas'); cv.className='bg-gl'; cv.setAttribute('aria-hidden','true');
  let gl=null; try{ gl=cv.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'}); }catch(e){}
  if(!gl) return null;
  const VS='attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const FS='precision mediump float;varying vec2 v;uniform vec2 R;uniform float t,e,lv,py,pa;uniform vec3 I,O;'+
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}'+
    'float h1(float n){return fract(sin(n)*43758.5453);}'+
    'void main(){vec2 c=floor(v*R);float f=floor(t*24.),E=clamp(e,0.,1.5),y=c.y;'+
    'float band=floor(y/3.),near=pa*exp(-abs(y/R.y-py)*12.);'+                         // rows in bands of 3 cells
    'float rb=h1(band*1.73+f*.131),rb2=h1(band*9.17+f*.713);'+
    'float tear=step(1.-(.01+.22*smoothstep(.15,1.,E)+.35*near),rb);'+                              // which bands tear this frame
    'float sh=floor(tear*rb2*R.x*(.04+.16*min(E,1.)));'+                                         // how far right, in cells
    'vec2 q=vec2(c.x-sh,y);'+
    'float roll=exp(-abs(v.y-(1.-fract(t*.05)))*26.);'+'float st=step(.99-.015*lv-.025*min(E,1.)-.006*roll,h(q+vec2(f*17.,f*31.)))*(.07+.16*h(q*1.31+f));'+     // sparse static, thicker deeper down
    'float run=h(vec2(floor(q.x/(3.+floor(rb2*16.))),band*7.+f));'+
    'float blk=tear*step(.5,run)*mix(.025,.03+.14*min(E+near,1.),smoothstep(.12,.35,E+near))*(.5+.5*h(vec2(q.x*.5,band)+f));'+   // faint micro-glitches even at rest             // block runs inside the tears
    'float sc=step(mod(y-floor(t*6.),3.),.5)*(.007+.006*min(E,1.))+roll*.008;'+                                                  // scanlines
    'float ly=floor(R.y*.62+(h1(f*3.3)-.5)*E*R.y*.03);'+                                 // the cut line at 38% from the top
    'float ln=(1.-step(.5,abs(y-ly)))*step(.15,E)*step(.35,h(vec2(floor(c.x/5.),f)))*(.06+.2*E);'+
    'gl_FragColor=vec4(mix(I,O,clamp(max(max(st,blk),ln)+sc,0.,1.)),1.);}';
  const loc={};
  let ready=false, e=.12, pa=0, py=.5, lastDraw=-1e9, lastY=NaN, docH=1;
  const sh=(type,src)=>{ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null; };
  const rgb=c=>(c.match(/[\d.]+/g)||[0,0,0]).slice(0,3).map(n=>n/255);
  function init(){
    const vs=sh(gl.VERTEX_SHADER,VS), fs=sh(gl.FRAGMENT_SHADER,FS); if(!vs||!fs) return false;
    const prog=gl.createProgram(); gl.attachShader(prog,vs); gl.attachShader(prog,fs); gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const pl=gl.getAttribLocation(prog,'p'); gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl,2,gl.FLOAT,false,0,0);
    ['R','t','e','lv','py','pa','I','O'].forEach(k=>loc[k]=gl.getUniformLocation(prog,k));
    return true;
  }
  function setup(){                        // size in cells, and the palette as the dusk script left it
    const px=innerWidth<761?3:2.5, w=Math.max(1,Math.round(innerWidth/px)), h=Math.max(1,Math.round(innerHeight/px));
    if(cv.width!==w||cv.height!==h){ cv.width=w; cv.height=h; }
    gl.viewport(0,0,w,h); gl.uniform2f(loc.R,w,h);
    const probe=document.createElement('i'); document.body.append(probe);
    probe.style.color='var(--ink)'; const I=rgb(getComputedStyle(probe).color);
    probe.style.color='var(--off)'; const O=rgb(getComputedStyle(probe).color); probe.remove();
    gl.uniform3f(loc.I,I[0],I[1],I[2]); gl.uniform3f(loc.O,O[0],O[1],O[2]);
    docH=Math.max(1,document.documentElement.scrollHeight-innerHeight);
  }
  function draw(now){
    gl.uniform1f(loc.t,now/1000); gl.uniform1f(loc.e,e); gl.uniform1f(loc.py,py); gl.uniform1f(loc.pa,pa);
    gl.uniform1f(loc.lv,Math.min(1,Math.max(0,CLOCK.y/docH)));
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4); lastDraw=now;
  }
  if(!init()) return null;
  document.body.prepend(cv); root.classList.add('bg');
  cv.addEventListener('webglcontextlost',ev=>{ ev.preventDefault(); ready=false; root.classList.remove('bg'); });
  cv.addEventListener('webglcontextrestored',()=>{ if(init()){ setup(); ready=true; root.classList.add('bg'); draw(performance.now()); } });
  CLOCK.add((now,dt)=>{
    if(!ready) return false;
    const y=CLOCK.y, v=Math.abs(CLOCK.vel);
    if(v>.5) e=Math.min(1,e+Math.min(.06,v*.004));                          // scroll speed disturbs it
    e=Math.max(.12,e-dt*1.1); pa=Math.max(0,pa-dt*1.8);                       // and it settles
    const live=e>.125||pa>.005, moved=y!==lastY;
    if(!(live||moved)) return false;
    if(now-lastDraw>=41){ draw(now); lastY=y; return live; }                   // hard steps: at most 24 frames a second
    return true;                                                               // come back for the frame this one skipped
  },()=>{ setup(); lastY=NaN; if(!ready){ ready=true; draw(performance.now()); } });
  if(matchMedia('(hover:hover) and (pointer:fine)').matches)
    addEventListener('pointermove',ev=>{ py=1-ev.clientY/innerHeight; pa=Math.min(.6,pa+.04); CLOCK.wake(true); },{passive:true});
  // the idle: a dozen quiet frames a second so the signal is always alive, on a timer rather than the page's clock
  setInterval(()=>{ if(!ready||document.hidden||document.body.style.overflow==='hidden') return;
    const now=performance.now(); if(now-lastDraw>=70) draw(now); },84);
  return { kick(a){ if(!ready) return; e=Math.min(1.2,e+a); CLOCK.wake(false); } };
})();
/* ============================================================
   DISPLACEMENT ENGINE
   One idea: the visitor alters the page. Four inputs feed one
   spring per element, so it never reads as four separate effects.
   Motion is horizontal only and biased right — the altering line.
   (Defined after the halves exist. Rects come from the clock's
   measure pass; the frame itself reads no layout.)
   ============================================================ */
const ENGINE = !reduce && (()=>{
  const K=520, D=26;                       // same spring as --sp-throw
  let nodes=[], byEl=new Map();
  function build(){                        // re-query; nodes already known keep their spring state
    const next=[], seen=new Map();
    const add=(sel,gain)=>document.querySelectorAll(sel).forEach((el,i)=>{
      const n=byEl.get(el)||{el,x:0,v:0,top:0,h:0,last:''};
      n.gain=(typeof gain==='function'?gain(el,i):gain); next.push(n); seen.set(el,n); });
    if(!document.documentElement.classList.contains('gl')) add('.hero .wm-big .low',1.5);   // under WebGL the shader tears the mark
    add('.split .b',0.55);                 // the headings are ~2x the old size: the same pixels would read as a doubled word
    // each letter shears a slightly different amount — a cut, not a moved block
    add('.name .n .ch .b',(el,i)=>0.18+0.34*((Math.sin(i*12.9898)*43758.5453)%1+1)/2);
    add('.cut .lo',1.25);
    for(const [el,n] of byEl) if(!seen.has(el)&&n.last) el.style.transform='';           // dropped nodes go home
    nodes=next; byEl=seen; CLOCK.invalidate();
  }
  function measure(){ const y=scrollY; for(const n of nodes){ const r=n.el.getBoundingClientRect(); n.top=r.top+y; n.h=r.height; } }

  let drag=0, my=-1e5;
  // drag: alter the page with your own hand. works over buttons too — a horizontal
  // pull past the threshold becomes a drag and its click is swallowed on release.
  let pending=false, dragging=false, didDrag=false, x0=0, y0=0;
  addEventListener('pointerdown',e=>{ if(e.target.closest('iframe,input,textarea'))return;
    pending=true; dragging=false; x0=e.clientX; y0=e.clientY; },{passive:true});
  addEventListener('pointermove',e=>{ my=e.clientY;
    if(pending){ const dx=e.clientX-x0, dy=e.clientY-y0;
      if(!dragging && Math.abs(dx)>8 && Math.abs(dx)>Math.abs(dy)) dragging=true;
      if(dragging) drag=Math.max(-110,Math.min(110,dx*0.7)); }
    CLOCK.wake(true); },{passive:true});
  const release=()=>{ if(dragging){ didDrag=true; setTimeout(()=>didDrag=false,0); }
    pending=false; dragging=false; drag=0; CLOCK.wake(true); };
  addEventListener('pointerup',release); addEventListener('pointercancel',release);
  addEventListener('click',e=>{ if(didDrag){ e.stopPropagation(); e.preventDefault(); } },true);
  addEventListener('mouseleave',()=>{ my=-1e5; });

  // the countdown's pulse travels across the page once a second — and only wakes the loop
  // for as long as the springs ring (no 400 ms tail), and only if it hit something
  function pulse(){
    const y=CLOCK.y, H=CLOCK.H, L=CLOCK.L; let hit=false;
    for(const n of nodes){ const top=n.top-y, bottom=top+n.h;
      if(bottom>0&&top<H){ n.v+=42*n.gain*(1-Math.min(1,Math.abs(top+n.h/2-L)/H)); hit=true; } }
    if(hit) CLOCK.wake(false);
  }

  function step(now,dt){
    const y=CLOCK.y, H=CLOCK.H, L=CLOCK.L; let vel=CLOCK.vel, moving=false;
    for(const n of nodes){
      const top=n.top-y, bottom=top+n.h;                                                  // cached rect, no layout read
      if(bottom<-200||top>H+200){ if(n.x||n.v){ n.x=0; n.v=0; n.last=''; n.el.style.transform=''; } continue; }
      const mid=top+n.h/2;
      const cross=Math.max(0,1-Math.abs(mid-L)/170)*9;                                    // sitting on the line
      const near=my>-1e4?Math.max(0,1-Math.abs(my-mid)/300)*20:0;                          // cursor cuts what it passes
      const target=(cross+near+Math.max(-72,Math.min(72,vel*CLOCK.velGain))+drag)*n.gain;
      n.v+=(-K*(n.x-target)-D*n.v)*dt; n.x+=n.v*dt;
      const t='translateX('+n.x.toFixed(2)+'px)'; if(t!==n.last){ n.last=t; n.el.style.transform=t; }   // write only on change
      if(Math.abs(n.x-target)>0.05||Math.abs(n.v)>0.4) moving=true;
    }
    vel*=0.90; if(Math.abs(vel)<0.05) vel=0; CLOCK.vel=vel;
    return moving||!!vel||!!drag;          // stillness only changes on scroll, and scroll wakes
  }
  build(); CLOCK.add(step,measure);
  return { pulse, rebuild:()=>{ build(); CLOCK.wake(false); } };
})();
CLOCK.wake(false);                         // first frame: measure, then set every state

/* ---- jolts: hard cuts, never eases ---- */
if(!reduce){
  (function jitter(){ setTimeout(()=>{ if(document.body.classList.contains('on-hero')){
      if(GL&&document.documentElement.classList.contains('gl')) GL.kick(.32+Math.random()*.3);   // the signal drops out for a moment
      else if(ENGINE) ENGINE.pulse();
      if(BG) BG.kick(.18+Math.random()*.2); } jitter(); }, 1400+Math.random()*2600); })();       // and the room behind it flickers
}

/* ---- countdown to the gate: 25 Sep 2026, 15:00, Dhaka (UTC+6) ---- */
const GATE = new Date('2026-09-25T15:00:00+06:00').getTime();
const cnt=document.getElementById('count'); const nums={}; cnt.querySelectorAll('.num').forEach(n=>nums[n.dataset.u]=n);
function tick(){ let d=GATE-Date.now(); if(d<=0){ d=0; cnt.classList.add('done'); }
  const s=Math.floor(d/1000); const v={d:Math.floor(s/86400),h:Math.floor(s%86400/3600),m:Math.floor(s%3600/60),s:s%60};
  for(const k in v){ const t=String(v[k]).padStart(2,'0');
    if(nums[k].textContent!==t){ nums[k].textContent=t;
      if(!reduce){ nums[k].classList.add('kick'); requestAnimationFrame(()=>requestAnimationFrame(()=>nums[k].classList.remove('kick')));
        if(k==='s'&&ENGINE) ENGINE.pulse(); } } } }
tick(); setInterval(tick,1000);

/* ---- artist sheet ----
   The lineup screen holds only names and genres. A name opens a full screen that the line cuts open
   (left to right) with the portrait, bio, links and set; previous and next move through the six.
   Escape or Close cuts it shut and returns focus to the name. The page underneath is locked meanwhile,
   so the snapping and the pager leave it alone. */
(function sheet(){
  const el=document.getElementById('sheet'); if(!el) return;
  const bodies=el.querySelector('.sheet-bodies'), nameEl=el.querySelector('.sheet-name'), genreEl=el.querySelector('.sheet-genre'),
        countEl=el.querySelector('.sheet-count'), closeBtn=el.querySelector('.sheet-close');
  const data=[...document.querySelectorAll('.acc .item')].map(it=>{
    const btn=it.querySelector('.name'), body=it.querySelector('.body');
    bodies.append(body); btn.setAttribute('aria-haspopup','dialog');
    return {btn,body,name:btn.getAttribute('aria-label')||'',genre:(it.querySelector('.m')||{}).textContent||''}; });
  const pad=n=>String(n).padStart(2,'0');
  let cur=-1, opener=null;
  function show(i){
    i=(i+data.length)%data.length;
    if(cur>=0){ data[cur].body.classList.remove('on'); data[cur].btn.setAttribute('aria-expanded','false'); }
    cur=i; const d=data[i];
    d.body.classList.add('on'); d.btn.setAttribute('aria-expanded','true');
    nameEl.textContent=d.name; genreEl.textContent=d.genre; countEl.textContent=pad(i+1)+' / '+pad(data.length);
    el.scrollTop=0; if(ENGINE) setTimeout(ENGINE.rebuild,40);
  }
  function open(i){
    opener=document.activeElement; show(i);
    el.classList.add('open'); el.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
    setTimeout(()=>closeBtn.focus({preventScroll:true}),reduce?0:120);
  }
  function close(){
    if(!el.classList.contains('open')) return;
    el.classList.remove('open'); el.setAttribute('aria-hidden','true'); document.body.style.overflow='';
    if(cur>=0) data[cur].btn.setAttribute('aria-expanded','false');
    if(opener&&opener.focus) opener.focus({preventScroll:true});
  }
  data.forEach((d,i)=>d.btn.addEventListener('click',()=>open(i)));
  closeBtn.addEventListener('click',close);
  el.querySelector('.sheet-prev').addEventListener('click',()=>show(cur-1));
  el.querySelector('.sheet-next').addEventListener('click',()=>show(cur+1));
  el.addEventListener('keydown',e=>{
    if(e.key==='Escape'){ e.stopPropagation(); close(); return; }
    if(e.key!=='Tab') return;                                                     // keep focus inside the sheet
    const f=[...el.querySelectorAll('button,a[href],iframe')].filter(n=>n.getClientRects().length);
    if(!f.length) return; const first=f[0], last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey&&document.activeElement===last){ e.preventDefault(); first.focus(); }
  });
})();

/* ---- the screen index ----
   Six ticks: how many screens there are, which one you are on, and a way to jump to one. Built from the
   sections themselves, kept in step by one IntersectionObserver — no scroll work. */
(function rail(){
  const rail=document.getElementById('rail'); if(!rail) return;
  const screens=[...document.querySelectorAll('main > section')]; if(screens.length<2) return;
  const NAMES={hero:'atalt',sound:'the sound',artists:'lineup',rules:'house rules',access:'tickets',end:'the gate'};
  const btns=screens.map((s,i)=>{
    const name=NAMES[s.id]||s.id||('screen '+(i+1));
    const b=document.createElement('button');
    b.type='button'; b.setAttribute('aria-label','Go to '+name);
    b.innerHTML='<span class="rail-l mono"></span><span class="rail-n mono"></span><span class="tick" aria-hidden="true"></span>';
    b.querySelector('.rail-l').textContent=name;
    b.querySelector('.rail-n').textContent=String(i+1).padStart(2,'0');
    b.addEventListener('click',()=>{ if(window.__lenis) window.__lenis.scrollTo(s,{duration:.62,lock:true,force:true});
      else s.scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'}); });
    rail.append(b); return b;
  });
  let current=-1;
  const set=i=>{ if(i===current) return; if(current>=0) btns[current].removeAttribute('aria-current');
    current=i; btns[i].setAttribute('aria-current','true'); };
  const io=new IntersectionObserver(es=>{
    let best=null;
    for(const e of es) if(e.isIntersecting&&(!best||e.intersectionRatio>best.intersectionRatio)) best=e;
    if(best) set(screens.indexOf(best.target));
  },{threshold:[.5,.75]});
  screens.forEach(s=>io.observe(s));
  set(0);
})();

/* ---- contact: the closing screen's button opens Quicket's chat (its own floating icon is hidden) ---- */
(function contact(){
  const btn=document.getElementById('contact-btn'); if(!btn) return;
  btn.addEventListener('click',()=>{
    if(window.QuiketChat&&typeof window.QuiketChat.open==='function') return window.QuiketChat.open();
    const launcher=document.querySelector('[data-quiket-chat-launcher]'); if(launcher) launcher.click();
  });
})();

/* ---- loading screen ----
   "Not everything altered is broken.", torn and flickering, highlighted left to right as the page really
   loads (this script running, the display face, the hero's marks), with the count at
   the foot. It runs for three seconds whatever the connection does, and is capped at seven; then it cuts away and the hero's
   intro starts. No loading screen under reduced motion or without GSAP: the page is simply there. */
const LOADER=(()=>{
  const root=document.documentElement, el=document.getElementById('loader');
  if(!el||reduce||!window.gsap){ root.classList.remove('loading'); if(el) el.remove(); return {done:Promise.resolve()}; }
  const num=el.querySelector('.ld-pct .n'), wait=ms=>new Promise(r=>setTimeout(r,ms));
  let target=30, shown=-1, finish;                                      // 30: the document has parsed, this script is running
  const done=new Promise(r=>finish=r), reach=v=>{ target=Math.max(target,v); };
  const face=Promise.race([document.fonts?document.fonts.load('900 1em Doto'):null,wait(2500)]).catch(()=>{}).then(()=>{ el.classList.add('on'); reach(50); });
  const marks=Promise.race([GL?GL.ready:Promise.all([...document.querySelectorAll('.hero img')].map(i=>i.decode().catch(()=>{}))),wait(2500)]).then(()=>reach(75));
  Promise.all([face,marks]).then(()=>reach(100));                      // what the first screen needs; third-party scripts load behind it
  if(document.readyState==='complete') reach(100); else addEventListener('load',()=>reach(100));
  wait(7000).then(()=>reach(100));
  (function frame(now){
    // now is time since the page opened, so the three seconds cover the whole wait, not just this script's part
    const cap=Math.min(target,100*Math.min(1,now/2500));
    let p=shown<0?0:shown+(cap-shown)*.2; if(cap-p<1) p=cap;
    if(p!==shown){ shown=p; el.style.setProperty('--p',p.toFixed(2)+'%'); num.textContent=Math.floor(p); }
    if(shown<100) return requestAnimationFrame(frame);
    setTimeout(()=>{ el.classList.add('out'); root.classList.remove('loading'); if(BG) BG.kick(.9); finish(); setTimeout(()=>el.remove(),700); },260);
  })(performance.now());
  return {done};
})();

/* ============================================================
   MOTION
   GSAP choreographs the page; Lenis gives mouse and trackpad scrolling weight. Reveals are triggered
   by IntersectionObservers, not ScrollTrigger:
   its internal frame loop never sleeps, and a phone that never idles is a phone getting hot in a pocket.
   Phones keep native scroll. The springs and the signal keep running on the page's
   clock underneath, and GSAP never writes a transform the engine owns (.split .b, .name .ch .b,
   .cut .lo, .sg-lo, .wm-big .low): it animates words inside them, or wrappers around them.
   Reduced motion or no GSAP: every final state, now.
   ============================================================ */
(function motion(){
  const root=document.documentElement, G=window.gsap;
  if(reduce||!G){ root.classList.add('noanim'); return; }
  root.classList.add('ready');
  /* "as it comes up the page": an IntersectionObserver whose bottom edge sits a little above the viewport's.
     No scroll listener and no frame while idle; identical under native scroll and Lenis. Fires once. */
  const enter=(el,fn,cut='-14%')=>{ const io=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting)){ io.disconnect(); fn(); } },
    {rootMargin:'0px 0px '+cut+' 0px'}); io.observe(el); };
  const Q=s=>[...document.querySelectorAll(s)];
  const hidden='inset(-30% 100% -30% 0%)', shown='inset(-30% -8% -30% 0%)';

  /* the hero: the line, the marks, the facts. The nav and the Request access bar sit outside it and
     are usable from the first frame. */
  const tl=G.timeline({paused:true});
  tl.fromTo('.hero-line',{scaleX:0,transformOrigin:'0% 50%'},{scaleX:1,duration:.6,ease:'expo.inOut'},0);
  if(GL&&root.classList.contains('gl')){
    tl.add(()=>GL.intro(true),.3)
      .to(GL.U,{rt:1,duration:.5,ease:'power4.inOut'},.36)                  // top halves wipe in behind the line
      .set(GL.U,{rb:1,amp:1.15},.88)                                          // bottom halves slam in, torn
      .to(GL.U,{amp:0,duration:1.25,ease:'power2.out'},.9)                    // and the signal steadies
      .add(()=>GL.intro(false),2.16);
  }else{
    tl.fromTo('.hero .sg:not(.sg-lo)',{clipPath:'inset(0% 100% 50% 0%)'},{clipPath:'inset(0% 0% 50% 0%)',duration:.5,ease:'power4.inOut'},.36)
      .fromTo('.hero .wm-big .hi',{clipPath:'inset(0% 110% 0% 0%)'},{clipPath:'inset(0% -2% 0% 0%)',duration:.5,ease:'power4.inOut'},.36)
      .fromTo('.hero .wm-big line',{strokeDashoffset:260},{strokeDashoffset:0,duration:.5,ease:'power4.inOut'},.36)
      .set('.hero .sg-lo',{clipPath:'inset(50% 0% 0% 0%)'},.88)
      .set('.hero .wm-big .low',{clipPath:'inset(0% -2% 0% 0%)'},.88)
      .fromTo('.hero .sg-lo-w',{xPercent:12},{xPercent:0,duration:1.1,ease:'elastic.out(1,.45)'},.88)   // wrappers, not the engine's halves
      .fromTo('.hero .wm-big .low-w',{x:31},{x:0,duration:1.1,ease:'elastic.out(1,.45)'},.88);
  }
  tl.add(()=>{ if(BG) BG.kick(.9); },.88);                                   // the slam disturbs the whole signal
  tl.fromTo(Q('.hero-top .muted span,.hero-top .date,.hero-foot .f,.hero-foot .muted'),{clipPath:hidden},{clipPath:shown,duration:.55,stagger:.05,ease:'power3.inOut'},1.05)
    .to('.hero-line',{scaleX:0,transformOrigin:'100% 50%',duration:.45,ease:'expo.in'},1.5);
  const fab=document.getElementById('fab');
  if(fab) tl.add(()=>{ fab.classList.add('in'); if(BG) BG.kick(.45); },1.92);   // the button lands after the facts
  const deep=scrollY>innerHeight*.5;                                          // deep link or restored scroll: the finished hero
  const go=()=>{ if(deep){ tl.progress(1); if(fab) fab.classList.add('in'); if(GL) GL.reveal(); } else tl.play(); };
  Promise.all([GL?Promise.race([GL.ready,new Promise(r=>setTimeout(r,1500))]):null,LOADER.done]).then(go);   // after the loading screen leaves

  /* headings: stamped in word by word as they come up the page. Each word's bottom half is thrown
     further than its top, so every word lands torn and closes. The unsplit text stays for screen readers. */
  Q('.split').forEach(h=>{
    const t=h.querySelector('.t'), b=h.querySelector('.b'); if(!t||!b) return;
    const sr=document.createElement('span'); sr.className='sr'; sr.textContent=[...t.childNodes].map(n=>n.nodeName==='BR'?' ':n.textContent).join(''); h.prepend(sr);
    t.setAttribute('aria-hidden','true');
    // words of the text nodes; <br> kept, and a non-breaking space stays inside its word
    const words=el=>{ const parts=[...el.childNodes]; el.textContent='';
      parts.forEach(nd=>{ if(nd.nodeType!==3){ el.append(nd); return; }
        nd.textContent.split(/([ \t\n\r]+)/).forEach(p=>{ if(!p) return; if(/^[ \t\n\r]+$/.test(p)) el.append(p);
          else { const w=document.createElement('span'); w.className='wd'; w.textContent=p; el.append(w); } }); });
      return [...el.querySelectorAll('.wd')]; };
    const tw=words(t), bw=words(b), fs=parseFloat(getComputedStyle(h).fontSize)||60;
    const run=G.timeline({paused:true,onComplete:()=>G.set([...tw,...bw],{clearProps:'clipPath,transform'})})
      .fromTo(tw,{clipPath:hidden,x:-fs*.12},{clipPath:shown,x:0,duration:.55,stagger:.045,ease:'expo.out'},0)
      .fromTo(bw,{clipPath:hidden,x:-fs*.42},{clipPath:shown,x:0,duration:.7,stagger:.045,ease:'expo.out'},.05);
    enter(h,()=>run.play());
  });

  /* labels wipe along their hairline; statements and panels wipe; body copy slides in short */
  const wipe=(els,cut='-10%')=>els.forEach(el=>{ const tw=G.fromTo(el,{clipPath:hidden},{clipPath:shown,duration:.6,ease:'power3.inOut',paused:true,
    onComplete:()=>G.set(el,{clearProps:'clipPath'})}); enter(el,()=>tw.play(),cut); });
  const slide=(els,cut='-10%')=>els.forEach(el=>{ const tw=G.fromTo(el,{x:-26,autoAlpha:0},{x:0,autoAlpha:1,duration:.62,ease:'expo.out',paused:true,
    onComplete:()=>G.set(el,{clearProps:'transform,opacity,visibility'})}); enter(el,()=>tw.play(),cut); });
  wipe(Q('.eyebrow'),'-8%');
  wipe(Q('.count'));
  slide(Q('.sound p.body,.rules .why,.access .lead,.steps>div,.partners .row'));

  /* artists: the rows are cut in one after another */
  const rows=G.fromTo('.acc .item',{clipPath:'inset(0% 100% 0% 0%)'},{clipPath:'inset(0% 0% 0% 0%)',duration:.7,stagger:.055,ease:'expo.inOut',paused:true,
    onComplete:()=>G.set('.acc .item',{clearProps:'clipPath'})});
  const acc=document.querySelector('.acc'); if(acc) enter(acc,()=>rows.play(),'-15%');


  /* Lenis: mouse and trackpad only. Driven by the page's clock (so it sleeps with it), stopped while
     an artist sheet, the admin wall or the Quicket modal holds the page, and the shear engine's velocity
     gain raised to match its longer, smoother scrolls. */
  if(matchMedia('(hover:hover) and (pointer:fine)').matches){
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js';
    s.integrity='sha384-jqpi9VmOdhyLoLURgjCn7EpnG9BbnHW57ibIZoeaIU+erWDH3k8fQQg0xH2ySjnw'; s.crossOrigin='anonymous';
    s.onload=()=>{ if(!window.Lenis) return;
      const locked=()=>root.classList.contains('loading')||getComputedStyle(document.body).overflow==='hidden'||!!document.querySelector('body > [data-quicket-modal]');
      const lenis=new window.Lenis({autoRaf:false,lerp:.09,anchors:true,smoothWheel:false,   // the wheel pages; Lenis animates the turns
        prevent:n=>locked()||!!(n&&n.closest&&n.closest('.admin,.sheet,[data-quicket-modal]'))});
      window.__lenis=lenis;
      CLOCK.velGain=2.1;
      CLOCK.add(now=>{ lenis.raf(now); return !!lenis.isScrolling||busy; });   // busy: a screen turn outlives the clock's idle window
      addEventListener('wheel',()=>CLOCK.wake(true),{passive:true});
      document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('a[href^="#"]')) CLOCK.wake(true); });
      new MutationObserver(()=>{ if(locked()) lenis.stop(); else lenis.start(); })
        .observe(document.body,{childList:true,attributes:true,attributeFilter:['style','class']});

      /* one screen per gesture. The wheel no longer scrolls the page: a gesture turns to the next or
         previous screen with a Lenis scroll that locks input until it lands. A pause of 200 ms, or a
         clearly harder push inside a trackpad's momentum tail, starts a new gesture. Keys page too.
         Windows under 600 px tall, and anything that locks the page, scroll natively instead. */
      const screens=[...document.querySelectorAll('main > section')];
      const fits=()=>innerHeight>=600;
      const setPaged=()=>root.classList.toggle('paged',fits());
      setPaged(); addEventListener('resize',setPaged,{passive:true});
      let busy=false, armed=true, lastT=0, lastA=0, decay=0, settle=0;
      const nearest=()=>{ let best=0, dist=1e9; screens.forEach((s,i)=>{ const d=Math.abs(s.getBoundingClientRect().top); if(d<dist){ dist=d; best=i; } }); return best; };
      const go=i=>{ i=Math.max(0,Math.min(screens.length-1,i)); busy=true; CLOCK.wake(true);
        /* The clock sleeps when nothing is happening, and Lenis keeps its own time. Coming out of a sleep,
           the first frame would hand it the whole idle gap as one delta and the turn would jump instead of
           run, so give it a fresh time base first. */
        lenis.raf(performance.now());
        lenis.scrollTo(screens[i],{duration:.62,easing:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,lock:true,force:true,
          onComplete:()=>setTimeout(()=>{ busy=false; CLOCK.wake(false); },140)});       // a beat after landing, so a tail cannot ride on
        setTimeout(()=>{ busy=false; },1100); };                                         // never stuck if a turn is interrupted
      addEventListener('wheel',e=>{
        if(!fits()||locked()||e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)) return;
        e.preventDefault();
        const now=performance.now(), a=Math.abs(e.deltaY);
        /* What must not turn a second screen is a trackpad's momentum tail, and a tail is the one stream
           that only ever gets weaker. So count consecutive weakening events: three in a row and the rest of
           that coast is ignored. A mouse wheel (steady notches) and a slow two-finger drag (uneven) never
           weaken three times running, so they keep paging; a gap in the stream always starts fresh. */
        if(now-lastT>180){ armed=true; decay=0; }
        else { decay=a<lastA-.5?decay+1:0; if(decay<3&&a>=8) armed=true; }
        lastT=now; lastA=a;
        if(!armed||busy||a<3) return;
        armed=false; go(nearest()+(e.deltaY>0?1:-1));
      },{passive:false});
      addEventListener('keydown',e=>{
        if(!fits()||locked()||e.defaultPrevented||e.altKey||e.metaKey||e.ctrlKey) return;
        const t=e.target; if(t.closest&&t.closest('input,textarea,select,[contenteditable]')) return;
        let d=0;
        if(e.key==='PageDown'||e.key==='ArrowDown') d=1; else if(e.key==='PageUp'||e.key==='ArrowUp') d=-1;
        else if(e.key===' '&&!(t.closest&&t.closest('button,a'))) d=e.shiftKey?-1:1;
        else if(e.key==='Home'||e.key==='End'){ e.preventDefault(); if(!busy) go(e.key==='Home'?0:screens.length-1); return; }
        if(!d) return; e.preventDefault(); if(!busy) go(nearest()+d);
      });
      addEventListener('scroll',()=>{ clearTimeout(settle); settle=setTimeout(()=>{                 // a scrollbar drag or anchor jump:
        if(busy||!fits()||locked()) return; const i=nearest();                                          // land on the nearest screen
        if(Math.abs(screens[i].getBoundingClientRect().top)>2) go(i); },220); },{passive:true});
    };
    document.head.append(s);
  }
})();

/* ============================================================
   ADMINISTRATION
   The two internal documents are AES-GCM encrypted at rest. The key is
   derived from the password with PBKDF2; without it the payloads are
   ciphertext, not merely hidden. Decryption happens in the browser and the
   plaintext is never written anywhere — it opens into a blob and dies with
   the tab. Note the ciphertext is public, so the password is the only
   secret: change it here and re-encrypt if it ever leaks.
   ============================================================ */
(() => {
  const VAULT = { brand: 'admin/brand.enc', brief: 'admin/brief.enc' };
  const LABEL = { brand: 'Brand guideline', brief: 'Content brief' };
  const panel = document.getElementById('admin');
  const gate  = document.getElementById('admGate');
  const dash  = document.getElementById('admDash');
  const pw    = document.getElementById('admPw');
  const msg   = document.getElementById('admMsg');
  const msg2  = document.getElementById('admMsg2');
  const view  = document.getElementById('admView');
  const frame = document.getElementById('admFrame');
  const crumb = document.getElementById('admCrumbDoc');
  const back  = document.getElementById('admBack');
  let KEYPW = null, cache = {}, blobURL = null;

  const open  = () => { panel.classList.add('open'); panel.setAttribute('aria-hidden','false');
                        document.body.style.overflow='hidden'; setTimeout(()=>pw.focus(),260); };
  const close = () => { panel.classList.remove('open'); panel.setAttribute('aria-hidden','true');
                        document.body.style.overflow=''; showDash(); };

  document.querySelectorAll('[data-admin]').forEach(a =>
    a.addEventListener('click', e => { e.preventDefault(); setMenu(false); open(); }));

  /* Nothing on the page links here any more. The wall is reached by going to
     atalt.space/administration — the site answers any unknown path with this
     page, so no route needs to exist for that to work — or with ?admin=1 on
     any address. The address bar is then put back to / so the way in does not
     travel in a screenshot, a shared link or someone's history.

     This is obscurity, not access control. It removes the invitation, not the
     lock: the documents are encrypted and the password is still the only thing
     that opens one. */
  (function fromUrl(){
    const byPath  = /^\/admin(istration)?\/?$/i.test(location.pathname);
    const byQuery = new URLSearchParams(location.search).has('admin');
    if (!byPath && !byQuery) return;
    history.replaceState(null, '', '/');
    open();
  })();
  document.getElementById('admClose').addEventListener('click', close);
  // Escape steps back one level: out of a document first, then out of the wall
  addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !panel.classList.contains('open')) return;
    if (panel.classList.contains('viewing')) showDash(); else close();
  });

  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  async function payload(name) {
    if (cache[name]) return cache[name];
    const inline = document.getElementById('vault-' + name);
    const raw = inline ? inline.textContent : await (await fetch(VAULT[name])).text();
    return (cache[name] = JSON.parse(raw));
  }
  async function decrypt(p, password) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password),
                                               'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: b64(p.salt), iterations: p.iter, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    let out = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(p.iv) }, key, b64(p.ct));
    if (p.z === 'gzip') {                                   // payloads are gzipped before encryption
      const ds = new DecompressionStream('gzip');
      out = await new Response(new Blob([out]).stream().pipeThrough(ds)).arrayBuffer();
    }
    return new TextDecoder().decode(out);
  }

  async function unlock() {
    const password = pw.value.trim();
    if (!password) return;
    msg.textContent = 'checking…'; msg.classList.remove('bad');
    try {
      await decrypt(await payload('brand'), password);   // verifies the key
      KEYPW = password;
      gate.hidden = true; dash.hidden = false;
      msg.textContent = '';
    } catch (e) {
      msg.textContent = 'wrong password'; msg.classList.add('bad');
      pw.value = ''; pw.focus();
    }
  }
  document.getElementById('admGo').addEventListener('click', unlock);
  pw.addEventListener('keydown', e => { if (e.key === 'Enter') unlock(); });

  /* A document renders inside the wall rather than in a new browser tab, so
     the plaintext lives in one window that closing the wall disposes of, and
     the crumb trail keeps the way back visible. The iframe is what stops a
     document's own stylesheet from reaching the site's, and the reverse. */
  function release() {
    if (blobURL) { URL.revokeObjectURL(blobURL); blobURL = null; }
    frame.removeAttribute('src');
  }
  function showDash() {
    release();
    view.hidden = true;
    panel.classList.remove('viewing');
    if (KEYPW) dash.hidden = false;          // never past the gate if still locked
  }
  function showDoc(name, html) {
    release();
    blobURL = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    frame.src = blobURL;
    frame.title = crumb.textContent = LABEL[name];
    dash.hidden = true; view.hidden = false;
    panel.classList.add('viewing');
    back.focus();
  }
  back.addEventListener('click', showDash);

  document.querySelectorAll('.adm-doc').forEach(btn => btn.addEventListener('click', async () => {
    const name = btn.dataset.doc;
    msg2.textContent = 'decrypting ' + LABEL[name].toLowerCase() + '…';
    try {
      showDoc(name, await decrypt(await payload(name), KEYPW));
      msg2.textContent = '';
    } catch (e) { msg2.textContent = 'could not open — reload and try again'; }
  }));
})();
