  /* ---------- Stick figure scenes: a tiny animation engine ----------
     A scene lists actors, props and timed events. Times are fractions (0 to 1) of the scene's length,
     so the same script fits either narrator's voice. Everything is computed from the time alone, so
     pausing and restarting just work. */
  var ACT=(function(){
    var W=86,H=125,FLOOR=104,D=Math.PI/180;
    var COL={hi:'var(--hi)',paper:'var(--paper)',amber:'#FFB83D',sky:'#7CC4FF',mint:'#7BE0B4',rose:'#F28BB0',violet:'#B9A6FF',dim:'var(--dim)'};
    function mk(o){var b={tor:0,hd:0,la:[8,4],ra:[-8,-4],ll:[5,2],rl:[-5,-2],o:null},k;for(k in o)b[k]=o[k];return b}
    var POSES={
      stand:mk({}),
      slump:mk({tor:20,hd:18,la:[16,10],ra:[14,8],ll:[3,3],rl:[-3,-3]}),
      think:mk({ra:[40,150],hd:6}),
      point:mk({ra:[95,92],tor:3}),
      shrug:mk({la:[62,168],ra:[-62,-168]}),
      cheer:mk({la:[165,175],ra:[-165,-175],o:[{k:'tor',a:3,f:8}]}),
      wave:mk({la:[140,165],o:[{k:'la',i:1,a:18,f:8}]}),
      sit:mk({ll:[88,2],rl:[84,0],la:[20,40],ra:[10,35],tor:2}),
      type:mk({ll:[88,2],rl:[84,0],la:[50,92],ra:[44,88],tor:8,o:[{k:'la',i:1,a:5,f:9}]}),
      hold:mk({la:[40,100],ra:[30,100]}),
      nod:mk({o:[{k:'hd',a:9,f:6}]}),
      shake:mk({o:[{k:'hd',a:14,f:9}]}),
      bow:mk({tor:38,hd:10,la:[25,20],ra:[20,15]}),
      frozen:mk({la:[12,8],ra:[-12,-8],tor:-3,hd:-6}),
      angry:mk({la:[12,40],ra:[-12,-40],tor:6,o:[{k:'tor',a:2,f:10}]}),
      sleep:mk({tor:12,hd:30,la:[10,8],ra:[8,6]}),
      sweep:mk({la:[60,62],ra:[40,50],tor:12,o:[{k:'tor',a:6,f:5}]})
    };
    function cp(p){return {tor:p.tor,hd:p.hd,la:p.la.slice(),ra:p.ra.slice(),ll:p.ll.slice(),rl:p.rl.slice(),o:p.o}}
    function lp(a,b,k){return {tor:a.tor+(b.tor-a.tor)*k,hd:a.hd+(b.hd-a.hd)*k,
      la:[a.la[0]+(b.la[0]-a.la[0])*k,a.la[1]+(b.la[1]-a.la[1])*k],ra:[a.ra[0]+(b.ra[0]-a.ra[0])*k,a.ra[1]+(b.ra[1]-a.ra[1])*k],
      ll:[a.ll[0]+(b.ll[0]-a.ll[0])*k,a.ll[1]+(b.ll[1]-a.ll[1])*k],rl:[a.rl[0]+(b.rl[0]-a.rl[0])*k,a.rl[1]+(b.rl[1]-a.rl[1])*k],o:b.o}}
    function sm(k){k=Math.max(0,Math.min(1,k));return k*k*(3-2*k)}
    function ez(k){k=Math.max(0,Math.min(1,k));var c=1.5;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2)}
    function f1(n){return (Math.round(n*10)/10).toString()}
    function vec(a,L){return [Math.sin(a*D)*L,Math.cos(a*D)*L]}
    var LT=11,UA=5.8,FA=5.6,TH=7.2,SH=7.2,HR=3.4;

    /* props: each returns SVG in local coordinates. 'b' props sit with their base at y, 'c' props are centred on y. */
    function est(s){return s.length*1.95+4}
    var PROPS={
      desk:function(p){return '<rect x="-15" y="-11.5" width="30" height="1.6" rx=".6" fill="var(--dim)"/><path d="M-13 -10 V0 M13 -10 V0" stroke="var(--dim)" stroke-width="1.4" stroke-linecap="round"/>'},
      chair:function(){return '<path d="M-5 -7.4 H5 M-5 -7.4 V-16 M-4 -7.4 V0 M4 -7.4 V0" stroke="var(--dim)" stroke-width="1.4" stroke-linecap="round" fill="none"/>'},
      laptop:function(){return '<path d="M-6 0 H6 L5 -1.4 H-5 Z" fill="var(--dim)"/><rect x="-5" y="-8" width="10" height="6.6" rx=".8" fill="var(--ink)" stroke="var(--paper)" stroke-width=".7"/><path d="M-3 -6 H3 M-3 -4.2 H1.4" stroke="var(--hi)" stroke-width=".7" stroke-linecap="round"/>'},
      screen:function(p){return '<rect x="-14" y="-24" width="28" height="19" rx="1.4" fill="var(--ink)" stroke="var(--paper)" stroke-width=".8"/><path d="M-8 -8 V-12 M-3 -8 V-17 M2 -8 V-14 M7 -8 V-20" stroke="var(--hi)" stroke-width="2.4" stroke-linecap="round"/><path d="M0 -5 V0 M-5 0 H5" stroke="var(--dim)" stroke-width="1.2"/>'},
      board:function(p){var L=(p.lines||[]),h='<rect x="-17" y="-24" width="34" height="'+(8+L.length*5.4)+'" rx="1.4" fill="var(--paper)" stroke="var(--dim)" stroke-width=".8"/>';
        L.forEach(function(t,i){h+='<text x="-14.4" y="'+(-17.6+i*5.4)+'" font-size="3.2" fill="var(--ink)" font-family="IBM Plex Sans,sans-serif" font-weight="500">'+esc(t)+'</text>'});return h},
      paper:function(p){var t=p.text?'<text x="0" y="-1.6" text-anchor="middle" font-size="2.7" fill="var(--ink)" font-family="IBM Plex Mono,monospace" font-weight="500">'+esc(p.text)+'</text>':'';
        return '<rect x="-4.4" y="-12" width="8.8" height="11" rx=".8" fill="var(--paper)"/><path d="M-2.6 -9 H2.6 M-2.6 -6.6 H2.6 M-2.6 -4.2 H1" stroke="var(--dim)" stroke-width=".7"/>'+t},
      phone:function(){return '<rect x="-1.6" y="-5" width="3.2" height="5" rx=".7" fill="var(--ink)" stroke="var(--paper)" stroke-width=".6"/>'},
      cup:function(){return '<path d="M-2.4 -4 H2.4 L1.8 0 H-1.8 Z" fill="var(--paper)"/><path d="M2.3 -3 q2 0 0 2.2" stroke="var(--paper)" stroke-width=".7" fill="none"/>'},
      moon:function(){return '<path d="M0 -8 A8 8 0 1 0 8 0 A6.4 6.4 0 0 1 0 -8 Z" transform="translate(-4 4)" fill="#F7E7A9"/><circle cx="-12" cy="-6" r=".7" fill="#F7E7A9"/><circle cx="9" cy="-9" r=".6" fill="#F7E7A9"/><circle cx="12" cy="3" r=".7" fill="#F7E7A9"/>'},
      sun:function(){var r='';for(var a=0;a<360;a+=45)r+='<line x1="'+f1(Math.cos(a*D)*7)+'" y1="'+f1(Math.sin(a*D)*7)+'" x2="'+f1(Math.cos(a*D)*9.4)+'" y2="'+f1(Math.sin(a*D)*9.4)+'" stroke="#FFD66B" stroke-width="1.2" stroke-linecap="round"/>';return '<circle r="5" fill="#FFD66B"/>'+r},
      wifi:function(p){var x=p.off?'<path d="M-6 -3 L6 9 M6 -3 L-6 9" stroke="var(--bad)" stroke-width="1.8" stroke-linecap="round"/>':'';
        return '<path d="M-8 -2 q8 -7 16 0 M-5 1.4 q5 -4.4 10 0" fill="none" stroke="'+(p.off?'var(--dim)':'var(--hi)')+'" stroke-width="1.5" stroke-linecap="round"/><circle cx="0" cy="5" r="1.3" fill="'+(p.off?'var(--dim)':'var(--hi)')+'"/>'+x},
      sign:function(p){var w=est(p.text||''),c=p.tone==='bad'?'var(--bad)':(p.tone==='dim'?'var(--dim)':'var(--hi)');
        return '<path d="M0 0 V-8" stroke="var(--dim)" stroke-width="1.2"/><rect x="'+f1(-w/2)+'" y="-16" width="'+f1(w)+'" height="8.6" rx="1.6" fill="var(--ink)" stroke="'+c+'" stroke-width=".9"/><text x="0" y="-10.2" text-anchor="middle" font-size="3.6" fill="'+c+'" font-family="Bricolage Grotesque,sans-serif" font-weight="800">'+esc(p.text||'')+'</text>'},
      chip:function(p){var w=est(p.text||''),c=p.tone==='bad'?'var(--bad)':(p.tone==='good'?'var(--good)':'var(--paper)');
        return '<rect x="'+f1(-w/2)+'" y="-2.8" width="'+f1(w)+'" height="5.6" rx="2.8" fill="var(--ink)" stroke="'+c+'" stroke-width=".7"/><text x="0" y="1.1" text-anchor="middle" font-size="3" fill="'+c+'" font-family="IBM Plex Sans,sans-serif" font-weight="500">'+esc(p.text||'')+'</text>'},
      check:function(){return '<circle r="3.6" fill="var(--good)"/><path d="M-1.8 .2 L-.4 1.7 L2 -1.6" stroke="var(--ink)" stroke-width="1.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'},
      cross:function(){return '<circle r="3.6" fill="var(--bad)"/><path d="M-1.5 -1.5 L1.5 1.5 M1.5 -1.5 L-1.5 1.5" stroke="var(--ink)" stroke-width="1.1" stroke-linecap="round"/>'},
      spark:function(){return '<g class="pr-spark"><path d="M0 -4 Q.5 -.5 4 0 Q.5 .5 0 4 Q-.5 .5 -4 0 Q-.5 -.5 0 -4Z" fill="#FFF3B0"/></g>'},
      zzz:function(){return '<g class="pr-zzz"><text x="0" y="0" font-size="4.4" fill="var(--paper)" font-family="Bricolage Grotesque,sans-serif" font-weight="800">z</text><text x="3.4" y="-4" font-size="5.4" fill="var(--paper)" font-family="Bricolage Grotesque,sans-serif" font-weight="800">z</text></g>'},
      sink:function(){return '<rect x="-12" y="-13" width="24" height="13" rx="1" fill="rgba(238,242,246,.14)" stroke="var(--dim)" stroke-width=".8"/><path d="M-9 -13 v-3 q0 -3 3 -3 h4" fill="none" stroke="var(--dim)" stroke-width="1.2"/>'},
      dishes:function(p){var n=p.n||3,h='';for(var i=0;i<n;i++)h+='<ellipse cx="'+(i%2?.8:-.8)+'" cy="'+(-1.4-i*1.6)+'" rx="4.6" ry="1.2" fill="var(--paper)" stroke="var(--dim)" stroke-width=".4"/>';return h},
      fridge:function(){return '<rect x="-7" y="-28" width="14" height="28" rx="1.2" fill="rgba(238,242,246,.12)" stroke="var(--dim)" stroke-width=".9"/><path d="M-7 -17 H7 M4 -25 V-20 M4 -15 V-10" stroke="var(--dim)" stroke-width=".9" stroke-linecap="round"/>'},
      bulb:function(){return '<circle r="4" fill="#FFE27A"/><rect x="-1.8" y="3.4" width="3.6" height="2.6" rx=".6" fill="var(--dim)"/>'},
      window:function(){return '<rect x="-9" y="-14" width="18" height="14" rx="1" fill="rgba(124,196,255,.12)" stroke="var(--dim)" stroke-width=".9"/><path d="M0 -14 V0 M-9 -7 H9" stroke="var(--dim)" stroke-width=".7"/>'},
      heart:function(){return '<path d="M0 3 C-6 -1 -4 -6 0 -3 C4 -6 6 -1 0 3Z" fill="var(--bad)"/>'}
    };
    var HAIRS={"spike": "M-3.2 -1.6 L-3 -5 L-1.2 -3.4 L0 -5.8 L1.2 -3.4 L3 -5 L3.2 -1.6 Z", "bob": "M-3.6 1.6 Q-4.2 -4.2 0 -4.2 Q4.2 -4.2 3.6 1.6 L2.6 -1.6 Q0 -2.8 -2.6 -1.6 Z", "cap": "M-3.5 -1 A3.5 3.5 0 0 1 3.5 -1 Z M2 -1 H6", "bun": "M-3.2 -1.4 Q0 -4.4 3.2 -1.4 Q0 -2.6 -3.2 -1.4 Z M0 -4.6 m-1.7 0 a1.7 1.7 0 1 0 3.4 0 a1.7 1.7 0 1 0 -3.4 0"};
    var ANCH={chip:'c',check:'c',cross:'c',spark:'c',zzz:'c',bulb:'c',moon:'c',sun:'c',wifi:'c',heart:'c',phone:'b'};
    var SFXFOR={check:'chime',cross:'strike',chip:'pop',sign:'pop',spark:'chime',heart:'chime'};

    function make(s,sp){
      var acts={},props={},evs=[],E={},sfx=[];
      var order=0;
      Object.keys(s.actors||{}).forEach(function(id){var a=s.actors[id];
        acts[id]={id:id,x:a.x,f:a.f||1,sc:(a.s||1)*1.5,hair:a.hair||['spike','bob','cap','bun'][Object.keys(acts).length%4],col:COL[a.col||'paper']||a.col,pose:a.pose||'stand',face:a.face||[0.3,0,1],ev:[],go:[],turn:[],speak:[],fc:[]};});
      Object.keys(s.props||{}).forEach(function(id){var p=s.props[id];
        props[id]={id:id,k:p.k,x:p.x,y:p.y==null?(ANCH[p.k]==='c'?60:FLOOR):p.y,sc:p.s||1,vis:p.vis===0?0:1,p:p,z:p.z||'back',ev:[],mv:[],tt:[]}});
      Object.keys(acts).forEach(function(k){var a=acts[k],o=s.actors[k];if(o.in!=null){a.go.push({t:0,x:o.x});a.x=o.in}});
      var banners=[],bursts=[],lastSfx={};
      (s.ev||[]).forEach(function(e){
        var t=e[0]*sp,tg=e[1],v=e[2],a=e[3],b=e[4],c=e[5],A=acts[tg],P=props[tg];
        if(A){
          if(v==='pose')A.ev.push({t:t,n:a,d:b||.5});
          else if(v==='go')A.go.push({t:t,x:a});
          else if(v==='turn')A.turn.push({t:t,f:a});
          else if(v==='face')A.fc.push({t:t,m:a,b:b||0,e:c==null?1:c});
          else if(v==='say'||v==='think'||v==='shout'){A.speak.push({t:t,k:v,text:a,tone:b||'',dur:c||3.4});sfx.push((v==='shout'?'strike':'pop')+':'+f1(t))}
          else if(v==='hush')A.speak.push({t:t,k:'hush',dur:0});
        }else if(P){
          if(v==='show'){P.tt.push({t:t,v:1});sfx.push((SFXFOR[P.k]||'pop')+':'+f1(t))}
          else if(v==='hide')P.tt.push({t:t,v:0});
          else if(v==='move')P.mv.push({t:t,x:a,y:b,d:c||.8});
          else if(v==='mood')P.tt.push({t:t,v:1})
        }else if(tg==='*'){
          if(v==='banner'){banners.push({t:t,text:a,tone:b||''});sfx.push('pop:'+f1(t));if(b==='good')bursts.push({t:t+.1,x:W/2,y:20,tone:'good'});if(b==='bad')bursts.push({t:t,x:0,y:0,tone:'shake'})}
          else if(v==='sfx')sfx.push(a+':'+f1(t));
          else if(v==='burst'){bursts.push({t:t,x:a,y:b,tone:c||'good'});sfx.push('chime:'+f1(t))}
        }
      });
      Object.keys(acts).forEach(function(k){var a=acts[k];['ev','go','turn','speak','fc'].forEach(function(n){a[n].sort(function(x,y){return x.t-y.t})})});
      Object.keys(props).forEach(function(k){var p=props[k];['mv','tt'].forEach(function(n){p[n].sort(function(x,y){return x.t-y.t})})});
      banners.sort(function(x,y){return x.t-y.t});
      var refs={};
      /* ---- markup ---- */
      var gid='sg'+Math.floor(Math.random()*1e6),bg=s.bg||'',h='<div class="actw"><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMax meet" aria-hidden="true" style="overflow:visible">';
      h+='<defs><radialGradient id="'+gid+'" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="'+(bg==='night'?'#5C7CFF':'#FFB83D')+'" stop-opacity="'+(bg==='night'?.2:.16)+'"/><stop offset="1" stop-color="#FFB83D" stop-opacity="0"/></radialGradient><linearGradient id="'+gid+'f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EEF2F6" stop-opacity=".13"/><stop offset="1" stop-color="#EEF2F6" stop-opacity=".02"/></linearGradient></defs>';
      h+='<g data-cam="1"><ellipse cx="'+W/2+'" cy="72" rx="60" ry="56" fill="url(#'+gid+')"/>';
      if(bg==='night'){for(var si=0;si<14;si++)h+='<circle data-star="'+si+'" cx="'+f1((si*37.7)%W)+'" cy="'+f1(8+(si*23.3)%44)+'" r=".5" fill="#F7E7A9"/>'}
      h+='<g fill="#EEF2F6">';for(var di=0;di<9;di++)h+='<circle data-d="'+di+'" r=".5" opacity=".18"/>';h+='</g>';
      h+='<line x1="-40" y1="'+FLOOR+'" x2="'+(W+40)+'" y2="'+FLOOR+'" stroke="var(--dim)" stroke-width=".8" opacity=".7"/>';
      h+='<rect x="-40" y="'+FLOOR+'" width="'+(W+80)+'" height="'+(H+60-FLOOR)+'" fill="url(#'+gid+'f)"/>';
      if(s.cap)h+='<text x="1" y="4" font-size="2.9" fill="var(--dim)" font-family="IBM Plex Mono,monospace" letter-spacing=".1em">'+esc(String(s.cap).toUpperCase())+'</text>';
      function propG(p,front){return (p.z==='front')===front?'<g data-pr="'+p.id+'"><g data-in="1">'+(PROPS[p.k]?PROPS[p.k](p.p):'')+'</g></g>':''}
      Object.keys(props).forEach(function(k){h+=propG(props[k],false)});
      Object.keys(acts).forEach(function(k){var a=acts[k];
        h+='<ellipse cx="0" cy="0" rx="7" ry="1.4" fill="rgba(0,0,0,.28)" stroke="none" data-sx="'+k+'"/>';
        h+='<g data-a="'+k+'" stroke="'+a.col+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none">'+
          '<path data-p="rl"/><path data-p="ll"/><path data-p="rf" stroke-width="2"/><path data-p="lf" stroke-width="2"/><path data-p="tor"/><path data-p="ra"/><path data-p="la"/><circle data-p="rh" r="1.25" fill="'+a.col+'" stroke="none"/><circle data-p="lh" r="1.25" fill="'+a.col+'" stroke="none"/>'+
          '<g data-p="head"><circle r="'+HR+'" fill="var(--ink)"/><path data-p="hair" d="'+(HAIRS[a.hair]||'')+'" fill="'+(a.hair==='cap'?'var(--hi)':a.col)+'" stroke="'+(a.hair==='cap'?'var(--hi)':a.col)+'" stroke-width=".5"/><g data-p="face" stroke-width=".7" fill="var(--paper)" stroke="var(--paper)">'+
          '<ellipse data-p="e1" cx="-1.3" cy="-.5" rx=".55" ry=".55" stroke="none"/><ellipse data-p="e2" cx="1.3" cy="-.5" rx=".55" ry=".55" stroke="none"/>'+
          '<path data-p="c1" d="M-1.8 -.5 h1 M.8 -.5 h1" stroke-width=".5" opacity="0"/>'+
          '<path data-p="br1" fill="none"/><path data-p="br2" fill="none"/><path data-p="mo" fill="none"/></g></g></g>';});
      Object.keys(props).forEach(function(k){h+=propG(props[k],true)});
      h+='<g data-bub="1"></g><g data-fx="1"></g></g><g data-ban="1"></g></svg><i hidden data-sfx="'+sfx.join(' ')+'"></i></div>';
      E.html=h;
      /* ---- binding and per-frame drawing ---- */
      E.bind=function(host){
        var root=host.querySelector('.actw');refs={root:root,a:{},p:{},bub:root.querySelector('[data-bub]'),ban:root.querySelector('[data-ban]'),bubKey:{},banKey:-1};
        Object.keys(acts).forEach(function(k){var g=root.querySelector('[data-a="'+k+'"]'),o={g:g};
          ['rl','ll','rf','lf','rh','lh','tor','ra','la','head','face','e1','e2','c1','br1','br2','mo','hair'].forEach(function(n){o[n]=g.querySelector('[data-p="'+n+'"]')});o.sh=root.querySelector('[data-sx="'+k+'"]');refs.a[k]=o});
        refs.cam=root.querySelector('[data-cam]');refs.fx=root.querySelector('[data-fx]');refs.stars=root.querySelectorAll('[data-star]');refs.dust=root.querySelectorAll('[data-d]');
        Object.keys(props).forEach(function(k){refs.p[k]=root.querySelector('[data-pr="'+k+'"]')});
      };
      function lastBefore(arr,t){var r=null,i;for(i=0;i<arr.length;i++){if(arr[i].t<=t)r=arr[i];else break}return r}
      function posX(a,t){
        var x=a.x,i,g,from=a.x,moving=0,dir=0,start,dur,k;
        for(i=0;i<a.go.length;i++){g=a.go[i];if(g.t>t)break;
          dur=Math.max(.3,Math.abs(g.x-from)/20);k=(t-g.t)/dur;
          if(k<1){x=from+(g.x-from)*sm(k);moving=1;dir=g.x>from?1:-1;return {x:x,m:moving,d:dir}}
          from=g.x;x=g.x;dir=g.x>=a.x?1:-1}
        return {x:x,m:0,d:0};
      }
      function poseAt(a,t){
        var from=cp(POSES[a.pose]||POSES.stand),to=from,t0=0,dur=.01,i,e,name=a.pose;
        for(i=0;i<a.ev.length;i++){e=a.ev[i];if(e.t>t)break;
          from=lp(from,to,ez((e.t-t0)/dur));to=cp(POSES[e.n]||POSES.stand);t0=e.t;dur=e.d;name=e.n}
        var r=lp(from,to,ez((t-t0)/dur));return r;
      }
      function pathOf(pts){return 'M'+pts.map(function(p){return f1(p[0])+' '+f1(p[1])}).join(' L')}
      function drawActor(a,o,t){
        var pos=posX(a,t),pz=poseAt(a,t),osc=pz.o,i,ob,f=a.f,tf=lastBefore(a.turn,t);
        if(tf)f=tf.f;
        if(pos.m)f=pos.d||f;
        pz=cp(pz);
        if(osc)for(i=0;i<osc.length;i++){ob=osc[i];var w=Math.sin(t*ob.f)*ob.a;if(ob.i!=null)pz[ob.k][ob.i]+=w;else pz[ob.k]+=w}
        pz.tor+=Math.sin(t*2)*.8;
        if(pos.m){var ph=t*7.5;var sw=Math.sin(ph),sw2=Math.sin(ph+Math.PI);
          pz.ll=[28*sw,28*sw-12*Math.max(0,-sw)];pz.rl=[28*sw2,28*sw2-12*Math.max(0,-sw2)];
          pz.la=[18*sw2,18*sw2+10];pz.ra=[18*sw,18*sw+10];pz.tor=4;}
        var drop=Math.max(Math.cos(pz.ll[0]*D)*TH+Math.cos(pz.ll[1]*D)*SH,Math.cos(pz.rl[0]*D)*TH+Math.cos(pz.rl[1]*D)*SH);
        var sc=a.sc,hipY=FLOOR-drop*sc;
        var tv=[Math.sin(pz.tor*D)*LT,-Math.cos(pz.tor*D)*LT],sh=[tv[0]*.86,tv[1]*.86];
        var hd=pz.tor+pz.hd,hc=[tv[0]+Math.sin(hd*D)*(HR+.9),tv[1]-Math.cos(hd*D)*(HR+.9)];
        function limb(o0,a1,a2,L1,L2){var v1=vec(a1,L1),v2=vec(a2,L2);return pathOf([o0,[o0[0]+v1[0],o0[1]+v1[1]],[o0[0]+v1[0]+v2[0],o0[1]+v1[1]+v2[1]]])}
        o.ll.setAttribute('d',limb([0,0],pz.ll[0],pz.ll[1],TH,SH));o.rl.setAttribute('d',limb([0,0],pz.rl[0],pz.rl[1],TH,SH));
        function endOf(o0,a1,a2,L1,L2){var v1=vec(a1,L1),v2=vec(a2,L2);return [o0[0]+v1[0]+v2[0],o0[1]+v1[1]+v2[1]]}
        var le=endOf([0,0],pz.ll[0],pz.ll[1],TH,SH),re=endOf([0,0],pz.rl[0],pz.rl[1],TH,SH),lh=endOf(sh,pz.la[0],pz.la[1],UA,FA),rh=endOf(sh,pz.ra[0],pz.ra[1],UA,FA);
        o.lf.setAttribute('d','M'+f1(le[0])+' '+f1(le[1])+' h2.6');o.rf.setAttribute('d','M'+f1(re[0])+' '+f1(re[1])+' h2.6');
        o.lh.setAttribute('cx',f1(lh[0]));o.lh.setAttribute('cy',f1(lh[1]));o.rh.setAttribute('cx',f1(rh[0]));o.rh.setAttribute('cy',f1(rh[1]));
        o.sh.setAttribute('transform','translate('+f1(pos.x)+' '+FLOOR+') scale('+f1(sc*(pos.m?.9:1))+' 1)');
        o.tor.setAttribute('d',pathOf([[0,0],tv]));
        o.la.setAttribute('d',limb(sh,pz.la[0],pz.la[1],UA,FA));o.ra.setAttribute('d',limb(sh,pz.ra[0],pz.ra[1],UA,FA));
        o.head.setAttribute('transform','translate('+f1(hc[0])+' '+f1(hc[1])+') rotate('+f1(hd)+')');
        o.g.setAttribute('transform','translate('+f1(pos.x)+' '+f1(hipY)+') scale('+(f*sc)+' '+sc+')');
        var fc=lastBefore(a.fc,t),F=fc?[fc.m,fc.b,fc.e]:a.face,m=F[0],b=F[1],ey=F[2]==null?1:F[2];
        o.mo.setAttribute('d','M-1.5 1.7 Q0 '+f1(1.7+m*1.6)+' 1.5 1.7');
        o.mo.setAttribute('stroke-width',.6);
        var bl=(t%3.4<.13)?.12:1,look=.3;o.e1.setAttribute('ry',f1(.55*bl));o.e2.setAttribute('ry',f1(.55*bl));o.e1.setAttribute('cx',f1(-1.3+look));o.e2.setAttribute('cx',f1(1.3+look));o.e1.style.opacity=o.e2.style.opacity=ey?1:0;o.c1.setAttribute('opacity',ey?0:1);
        if(b){o.br1.setAttribute('d','M-2.4 '+f1(-2.1-b*.5)+' L-.5 '+f1(-2.1+b*.9));o.br2.setAttribute('d','M2.4 '+f1(-2.1-b*.5)+' L.5 '+f1(-2.1+b*.9));o.br1.setAttribute('stroke-width',.6);o.br2.setAttribute('stroke-width',.6)}
        else{o.br1.setAttribute('d','');o.br2.setAttribute('d','')}
        return {x:pos.x,y:hipY-(LT+HR*2)*sc};
      }
      function wrap(txt,n){var w=txt.split(' '),L=[],cur='';w.forEach(function(x){if((cur+' '+x).trim().length>n&&cur){L.push(cur);cur=x}else cur=(cur+' '+x).trim()});if(cur)L.push(cur);return L}
      function bubble(sp,t,at){
        var L=wrap(sp.text,15),mx=0,left=Math.max(0,Math.floor((t-sp.t-.12)*30));L.forEach(function(l){mx=Math.max(mx,l.length)});
        var w=mx*1.95+5,hh=L.length*4.4+3.2,cx=Math.max(w/2+1,Math.min(W-w/2-1,at.x)),top=Math.max(10,at.y-hh-6);
        var col=sp.tone==='bad'?'var(--bad)':(sp.tone==='good'?'var(--good)':'var(--ink)');
        var k=Math.min(1,(t-sp.t)/.3),s=.5+.5*ez(k),stroke=sp.k==='think'?'var(--dim)':col;
        var h='<g transform="translate('+f1(cx)+' '+f1(top+hh)+') scale('+f1(s)+')" opacity="'+f1(Math.min(1,k*1.4))+'">';
        h+='<rect x="'+f1(-w/2)+'" y="'+f1(-hh)+'" width="'+f1(w)+'" height="'+f1(hh)+'" rx="'+(sp.k==='think'?hh/2.4:2)+'" fill="var(--paper)" stroke="'+(sp.tone==='bad'?'var(--bad)':'none')+'" stroke-width=".7"'+(sp.k==='think'?' stroke-dasharray="1.2 1"':'')+'/>';
        var tx=at.x-cx;
        if(sp.k==='think')h+='<circle cx="'+f1(tx)+'" cy="'+f1(3.2)+'" r="1.3" fill="var(--paper)"/><circle cx="'+f1(tx)+'" cy="'+f1(6.2)+'" r=".8" fill="var(--paper)"/>';
        else h+='<path d="M'+f1(tx-1.6)+' 0 L'+f1(tx)+' 3.6 L'+f1(tx+1.6)+' 0 Z" fill="var(--paper)"/>';
        L.forEach(function(l,i){var shown=l.slice(0,left);left=Math.max(0,left-l.length-1);h+='<text x="'+f1(-l.length*.97)+'" y="'+f1(-hh+4.1+i*4.4)+'" font-size="3.4" fill="'+(sp.tone==='bad'?'#B3382A':'var(--ink)')+'" font-family="IBM Plex Sans,sans-serif" font-weight="500" xml:space="preserve">'+esc(shown)+'</text>'});
        return h+'</g>';
      }
      E.render=function(t){
        if(!refs.root)return;
        var bh='',k,at={};
        Object.keys(acts).forEach(function(id){var a=acts[id];at[id]=drawActor(a,refs.a[id],t)});
        Object.keys(acts).forEach(function(id){var a=acts[id],sp=lastBefore(a.speak,t);
          if(sp&&sp.k!=='hush'&&t<sp.t+sp.dur)bh+=bubble(sp,t,at[id]);});
        refs.bub.innerHTML=bh;
        var shx=0,shy=0,fx='',bi2,B,age,j,ang,spd,px,py,cols=['#FFB83D','#7BE0B4','#7CC4FF','#F28BB0','#EEF2F6'];
        for(bi2=0;bi2<bursts.length;bi2++){B=bursts[bi2];age=t-B.t;if(age<0)continue;
          if(B.tone==='shake'){if(age<.45){shx=Math.sin(age*70)*1.4*(1-age/.45);shy=Math.cos(age*55)*.6*(1-age/.45)}continue}
          if(age>1.8)continue;
          for(j=0;j<22;j++){var r1=Math.abs(Math.sin(j*12.9898+B.x*3.1)),r2=Math.abs(Math.sin(j*78.233+B.y*1.7));
            ang=(j/22)*Math.PI*2+r1;spd=18+r2*30;px=B.x+Math.cos(ang)*spd*age*(1-age*.25);py=B.y+Math.sin(ang)*spd*age*.8+34*age*age;
            fx+='<rect x="'+f1(px)+'" y="'+f1(py)+'" width="2.4" height="1.5" fill="'+cols[j%5]+'" opacity="'+f1(Math.max(0,1-age/1.8))+'" transform="rotate('+f1(age*360*(r1+.5))+' '+f1(px)+' '+f1(py)+')"/>'}}
        refs.fx.innerHTML=fx;
        var cz=1+.045*Math.min(1,t/Math.max(1,sp));
        refs.cam.setAttribute('transform','translate('+f1(W/2+shx)+' '+f1(72+shy)+') scale('+f1(cz)+') translate('+(-W/2)+' -72)');
        for(k=0;k<refs.dust.length;k++){refs.dust[k].setAttribute('cx',f1(((k*53.7+t*(2+k%3))%(W+10))-5));refs.dust[k].setAttribute('cy',f1(14+((k*31.3)%80)+Math.sin(t*.8+k)*3))}
        for(k=0;k<refs.stars.length;k++)refs.stars[k].setAttribute('opacity',f1(.45+.45*Math.sin(t*1.6+k*1.9)));
        Object.keys(props).forEach(function(id){var p=props[id],g=refs.p[id],x=p.x,y=p.y,i,m,from=[p.x,p.y],vis=p.vis,tt=lastBefore(p.tt,t),op;
          for(i=0;i<p.mv.length;i++){m=p.mv[i];if(m.t>t)break;var kk=sm((t-m.t)/m.d);x=from[0]+(m.x-from[0])*kk;y=from[1]+(m.y-from[1])*kk;if(kk>=1)from=[m.x,m.y]}
          if(tt)op=Math.min(1,(t-tt.t)/.25),vis=tt.v?op:1-op;else vis=p.vis;
          var pk=tt&&tt.v?.55+.45*ez((t-tt.t)/.4):1,fl=(ANCH[p.k]==='c'&&!p.mv.length)?Math.sin(t*1.8+p.x)*.7:0;g.setAttribute('transform','translate('+f1(x)+' '+f1(y+fl)+') scale('+f1(p.sc*pk)+')');g.setAttribute('opacity',f1(Math.max(0,Math.min(1,vis))));});
        var bn=null,bi=-1;for(k=0;k<banners.length;k++){if(banners[k].t<=t){bn=banners[k];bi=k}}
        if(bn){
          if(refs.banKey!==bi){var L=wrap(bn.text,17),col=bn.tone==='bad'?'var(--bad)':(bn.tone==='good'?'var(--good)':'var(--hi)'),s='';
            var mxl=0;L.forEach(function(l){mxl=Math.max(mxl,l.length)});var bw=mxl*3.7+8;
            s='<rect x="'+f1(-bw/2)+'" y="-7.4" width="'+f1(bw)+'" height="'+f1(L.length*7.2+2.6)+'" rx="3.4" fill="var(--ink)" fill-opacity=".88" stroke="'+col+'" stroke-width=".7"/>';
            L.forEach(function(l,i){s+='<text x="0" y="'+(i*7.2)+'" text-anchor="middle" font-size="6.4" font-weight="800" font-family="Bricolage Grotesque,sans-serif" fill="'+col+'">'+esc(l)+'</text>'});
            refs.ban.innerHTML='<g data-bt="1">'+s+'</g>';refs.banKey=bi}
          var kb=ez((t-bn.t)/.45);refs.ban.firstChild.setAttribute('transform','translate('+(W/2)+' 15) scale('+f1(.55+.45*kb)+')');refs.ban.firstChild.setAttribute('opacity',f1(Math.min(1,(t-bn.t)/.15)));
        }else if(refs.banKey!==-1){refs.ban.innerHTML='';refs.banKey=-1}
      };
      return E;
    }
    return {make:make};
  })();
  R.act=function(s,sp){var E=ACT.make(s,sp);PL.eng=E;return E.html};
