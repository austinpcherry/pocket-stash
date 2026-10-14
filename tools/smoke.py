import asyncio,sys
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8766/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
        ctx=await b.new_context(viewport={'width':390,'height':800})
        pg=await ctx.new_page()
        errs=[];fails=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.on('response',lambda r:fails.append(r.url) if r.status>=400 and 'fonts' not in r.url else None)
        await pg.goto(URL);await pg.wait_for_timeout(1200)
        await pg.click('[data-view=browse]')
        n=await pg.evaluate("document.querySelectorAll('#browseGrid .card').length")
        await pg.click('#browseGrid .card[data-id="dilemma"] .watch');await pg.click('#plStart')
        await pg.wait_for_timeout(6000)
        st=await pg.evaluate("document.getElementById('plStatus').textContent")
        sw=await pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>!!r)")
        print('cards',n,'| status:',st,'| sw:',sw,'| errors:',errs,'| 4xx:',fails)
        await b.close()
asyncio.run(main())
