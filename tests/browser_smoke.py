"""Verify horizon persistence and observing constraints at the Pages subpath."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json, shutil, tempfile, threading
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
def main():
 with tempfile.TemporaryDirectory() as temp:
  shutil.copytree(ROOT/'dist',Path(temp)/'nightfinder')
  (Path(temp)/'assets').mkdir();(Path(temp)/'assets/tool-metrics.js').write_text('')
  server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=temp));threading.Thread(target=server.serve_forever,daemon=True).start()
  try:
   with sync_playwright() as p:
    browser=p.chromium.launch();page=browser.new_page(viewport={'width':1280,'height':900});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/nightfinder/')
    expect(page.locator('#results')).to_be_visible()
    page.get_by_text('Your balcony, buildings and local horizon',exact=True).click()
    page.locator('#horizon-name').fill('Test balcony')
    page.locator('#horizon-points').fill('0, 90')
    page.locator('#use-horizon').check()
    page.locator('#save-horizon').click();expect(page.locator('#horizon-status')).to_contain_text('Saved')
    page.get_by_role('button',name='Calculate sky').click()
    expect(page.locator('#session-status')).to_contain_text('No target')
    expect(page.locator('#visibility')).to_contain_text('No clear sample')
    with page.expect_download() as dl:page.locator('#export').click()
    data=json.loads(Path(dl.value.path()).read_text());assert data['settings']['horizon']==[[0,90]];assert not data['sessions']
    page.reload();expect(page.locator('#results')).to_be_visible()
    page.get_by_text('Your balcony, buildings and local horizon',exact=True).click()
    page.locator('#saved-horizons').select_option(label='Test balcony');page.locator('#load-horizon').click()
    expect(page.locator('#horizon-points')).to_have_value('0, 90');expect(page.locator('#use-horizon')).to_be_checked()
    page.locator('#lat').fill('44.65');expect(page.locator('#use-horizon')).not_to_be_checked()
    for width,height in [(390,844),(320,700)]:
     page.set_viewport_size({'width':width,'height':height});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'overflow {width}'
    assert not errors,errors;browser.close()
  finally:server.shutdown();server.server_close()
 print('Nightfinder horizon/browser checks passed')
if __name__=='__main__':main()
