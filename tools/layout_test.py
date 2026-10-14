"""Plays every scene of lessons from index START on and checks nothing overflows.
usage: layout_test.py URL START   (e.g. http://localhost:8766/ 31)"""
import asyncio,sys,json
from playwright.async_api import async_playwright
URL=sys.argv[1];START=int(sys.argv[2]) if len(sys.argv)>2 else 0
async def run(b,vw,vh):
    pg=await b.new_page(viewport={'width':vw,'height':vh})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(URL);await pg.wait_for_timeout(800)
    await pg.click('[data-view=browse]')
    ids=await pg.evaluate("[...document.querySelectorAll('#browseGrid .card')].map(c=>c.dataset.id)")
    bad=[]
    for id in ids[START:]:
        await pg.click(f'#browseGrid .card[data-id="{id}"] .watch');await pg.click('#plStart')
        for k in range(5):
            await pg.click(f'.pl-seg[data-k="{k}"]');await pg.wait_for_timeout(3000)
            r=await pg.evaluate("""()=>{const st=document.getElementById('plStage').getBoundingClientRect();
              const sc=document.getElementById('plScene');const scr=sc.getBoundingClientRect();
              const inner=sc.firstElementChild?sc.firstElementChild.getBoundingClientRect():null;
              const cap=document.getElementById('plCap').getBoundingClientRect();
              return {stageW:st.width,sceneH:scr.height,innerH:inner?inner.height:0,capH:cap.height,capTop:cap.top-st.top,innerBottom:inner?inner.bottom-st.top:0,overX:document.documentElement.scrollWidth>innerWidth}}""")
            if r['innerH']>r['sceneH']+1 or r['capH']>r['stageW']*0.33 or r['innerBottom']>r['capTop']+2 or r['overX']:
                bad.append((id,k,r))
        await pg.click('#plClose')
    print(vw,len(ids[START:]),'lessons checked | issues:',json.dumps(bad)[:2500] if bad else 'none','| errors:',errs)
    await pg.close()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
        await run(b,390,800);await run(b,1100,900);await b.close()
asyncio.run(main())
