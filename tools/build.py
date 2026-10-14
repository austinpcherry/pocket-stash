#!/usr/bin/env python3
"""Pocket Stash build: validate lessons, optionally render missing narration, bundle to dist/.
usage: build.py [--check] [--render KOKORO_DIR]"""
import json,glob,os,re,sys,hashlib,shutil,subprocess
A=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(A)
VOICES={'bella':1,'michael':6}
AUDIO_VERSION=1  # bump only if you re-render an existing narration line, so devices re-download audio
TEMPLATES={'list','chat','quad','bars','split','big','rem'}
LABELS=['Setup','Problem','Apply','Result']
tpl=open('src/template.html',encoding='utf-8').read()
TOPICS=set(re.findall(r"(?:'([^']+)'|(\w+)):'#[0-9A-Fa-f]{6}'",re.search(r"var TOPICS=\{(.*?)\};",tpl,re.S).group(1)))
TOPICS={a or b for a,b in TOPICS}
MOTIFS=set(re.findall(r'(\w+):\1',re.search(r'var MOTIFS=\{(.*?)\};',tpl).group(1)))
errs=[];lessons=[]
def err(f,m): errs.append('%s: %s'%(f,m))
def strings(o):
    if isinstance(o,str): yield o
    elif isinstance(o,dict):
        for v in o.values(): yield from strings(v)
    elif isinstance(o,list):
        for v in o: yield from strings(v)
seen=set();nums=set()
for f in sorted(glob.glob('lessons/*.json')):
    try: L=json.load(open(f,encoding='utf-8'))
    except Exception as e: err(f,'bad JSON: %s'%e); continue
    for k in ['n','id','topic','secs','title','src','idea','apply','remind','motif','who','scenes']:
        if k not in L or L[k] in ('',None,[]): err(f,'missing '+k)
    if errs and errs[-1].startswith(f): continue
    if not re.fullmatch(r'[a-z0-9]+',L['id']): err(f,'id must be lowercase letters and digits')
    if L['id'] in seen: err(f,'duplicate id')
    seen.add(L['id'])
    if L['n'] in nums: err(f,'duplicate n')
    nums.add(L['n'])
    if L['topic'] not in TOPICS: err(f,'unknown topic %r (add it to TOPICS in src/template.html)'%L['topic'])
    if L['motif'] not in MOTIFS: err(f,'unknown motif %r'%L['motif'])
    if len(L['remind'])>90: err(f,'remind over 90 chars')
    if len(L['idea'])>240: err(f,'idea over 240 chars')
    if len(L['scenes'])!=4: err(f,'needs exactly 4 scenes (Setup, Problem, Apply, Result)')
    for k,s in enumerate(L['scenes']):
        if s.get('l')!=LABELS[min(k,3)]: err(f,'scene %d label should be %s'%(k,LABELS[min(k,3)]))
        if s.get('t') not in TEMPLATES: err(f,'scene %d unknown template %r'%(k,s.get('t')))
        n=len(s.get('nar','').split())
        if n<8 or n>42: err(f,'scene %d narration is %d words (8 to 42)'%(k,n))
    for t in strings(L):
        if '—' in t or '–' in t: err(f,'contains a dash character: %r'%t[:40])
    lessons.append(L)
lessons.sort(key=lambda l:l['n'])
# audio lines
lines=[]
for L in lessons:
    for k,s in enumerate(L['scenes']): lines.append({'key':'%s-%d'%(L['id'],k),'text':s['nar']})
    lines.append({'key':'%s-%d'%(L['id'],len(L['scenes'])),'text':L['remind']})
os.makedirs('build',exist_ok=True)
json.dump(lines,open('build/lines.json','w'),indent=1)
if '--render' in sys.argv:
    M=sys.argv[sys.argv.index('--render')+1]
    for v,sid in VOICES.items():
        subprocess.run([sys.executable,'tools/render.py',A,v,str(sid),'build/lines.json',M],check=True)
missing=[] if '--skip-audio-check' in sys.argv else [(v,l['key']) for v in VOICES for l in lines if not os.path.exists('audio/%s/%s.mp3'%(v,l['key']))]
if missing: err('audio','%d narration files missing, e.g. %s. Run build.py --render <kokoro dir>'%(len(missing),missing[0]))
if errs:
    print('\n'.join(errs)); print('\nBuild stopped: %d problem(s).'%len(errs)); sys.exit(1)
print('OK: %d lessons, %d narration lines per voice'%(len(lessons),len(lines)))
if '--check' in sys.argv: sys.exit(0)
# bundle
data=[{k:v for k,v in L.items() if k!='n'} for L in lessons]
blob=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
page=tpl.replace('/*__LESSONS__*/[]',blob,1)
head,rest=page.split('</style>',1)
meta='<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<meta name="theme-color" content="#14263A">\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icon-192.png">\n<link rel="apple-touch-icon" href="icon-192.png">\n'
reg="<script>if('serviceWorker' in navigator){window.addEventListener('load',function(){try{navigator.serviceWorker.register('sw.js')}catch(e){}})}</script>\n"
html=meta+head+'</style>\n</head>\n<body>\n'+rest+reg+'</body>\n</html>\n'
if os.path.exists('dist'): shutil.rmtree('dist')
os.makedirs('dist')
open('dist/index.html','w',encoding='utf-8').write(html)
shutil.copytree('audio','dist/audio')
json.dump({'name':'Pocket Stash','short_name':'Stash','start_url':'./','scope':'./','display':'standalone','background_color':'#14263A','theme_color':'#14263A','description':'Short, narrated ideas worth keeping.','icons':[{'src':'icon-192.png','sizes':'192x192','type':'image/png'},{'src':'icon-512.png','sizes':'512x512','type':'image/png'},{'src':'icon-512.png','sizes':'512x512','type':'image/png','purpose':'maskable'}]},open('dist/manifest.webmanifest','w'),indent=1)
from PIL import Image,ImageDraw
for sz in (192,512):
    im=Image.new('RGB',(sz,sz),'#14263A');d=ImageDraw.Draw(im)
    for i,(r,c) in enumerate([(0.36,'#2F4A66'),(0.25,'#4FD1C5'),(0.12,'#EEF2F6')]):
        R=sz*r;cx=cy=sz/2
        if i==1: d.ellipse([cx-R,cy-R,cx+R,cy+R],outline=c,width=max(3,sz//40))
        else: d.ellipse([cx-R,cy-R,cx+R,cy+R],fill=c) if i==2 else d.ellipse([cx-R,cy-R,cx+R,cy+R],outline=c,width=max(2,sz//64))
    im.save('dist/icon-%d.png'%sz)
h=hashlib.sha1(html.encode()).hexdigest()[:10]
audio=sorted('audio/bella/%s.mp3'%l['key'] for l in lines)  # only the default voice is precached; others cache as they are played
core=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png']
sw="""const V='stash-%s';
const A='stash-audio-%s';
const CORE=%s;
const AUDIO=%s;
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
  e.waitUntil(caches.open(A).then(async c=>{for(const u of AUDIO){if(!(await c.match(u)))await c.add(u).catch(()=>0)}}))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==A).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const isAudio=new URL(r.url).pathname.includes('/audio/');
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{
    if(res.ok&&new URL(r.url).origin===location.origin){const cp=res.clone();caches.open(isAudio?A:V).then(c=>c.put(r,cp))}
    return res}).catch(()=>caches.match('index.html'))));
});
"""%(h,AUDIO_VERSION,json.dumps(core),json.dumps(audio))
open('dist/sw.js','w').write(sw)
open('dist/.nojekyll','w').write('')
tot=sum(os.path.getsize(os.path.join(dp,f)) for dp,_,fs in os.walk('dist') for f in fs)
print('Built dist/ (%.1f MB). Version %s'%(tot/1e6,h))
