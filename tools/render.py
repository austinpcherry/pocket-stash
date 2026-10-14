import sys, json, time, subprocess, os, wave
import numpy as np
import sherpa_onnx
# usage: render.py <app_dir> <voice> <speaker_id> <lines.json> <kokoro_model_dir>
S=sys.argv[1]; voice=sys.argv[2]; sid=int(sys.argv[3]); LINES=sys.argv[4]; M=sys.argv[5]; limit=0
cfg=sherpa_onnx.OfflineTtsConfig(
  model=sherpa_onnx.OfflineTtsModelConfig(
    kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(model=M+'/model.onnx',voices=M+'/voices.bin',tokens=M+'/tokens.txt',data_dir=M+'/espeak-ng-data'),
    num_threads=2,provider='cpu'),
  max_num_sentences=2)
tts=sherpa_onnx.OfflineTts(cfg)
lines=json.load(open(LINES))
if limit: lines=lines[:limit]
out=S+'/audio/'+voice; os.makedirs(out,exist_ok=True)
dp=f'{S}/audio/{voice}-durations.json'
durs=json.load(open(dp)) if os.path.exists(dp) else {}
t0=time.time()
for i,l in enumerate(lines):
    if os.path.exists(f"{out}/{l['key']}.mp3"): continue
    a=tts.generate(l['text'],sid=sid,speed=1.0)
    x=np.array(a.samples,dtype=np.float32); sr=a.sample_rate
    # trim leading/trailing near-silence, keep a small pad
    thr=0.01; idx=np.where(np.abs(x)>thr)[0]
    if len(idx): x=x[max(0,idx[0]-int(.05*sr)):min(len(x),idx[-1]+int(.12*sr))]
    pcm=(np.clip(x,-1,1)*32767).astype(np.int16)
    wav=f"{out}/{l['key']}.wav"
    with wave.open(wav,'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes(pcm.tobytes())
    mp3=f"{out}/{l['key']}.mp3"
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',wav,'-ac','1','-b:a','56k','-af','loudnorm=I=-17:TP=-2:LRA=9',mp3],check=True)
    os.remove(wav)
    durs[l['key']]=round(len(x)/sr,2)
    print(i+1,len(lines),l['key'],durs[l['key']],'s',round(time.time()-t0,1),'elapsed',flush=True)
json.dump(durs,open(f'{S}/audio/{voice}-durations.json','w'))
print('done',voice,round(time.time()-t0,1))
