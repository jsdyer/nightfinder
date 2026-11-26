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
    browser=p.chromium.launch(executable_path=__import__('os').environ.get('CHROMIUM_PATH'));page=browser.new_page(viewport={'width':1280,'height':900});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/nightfinder/')
    expect(page.get_by_role('heading', level=1)).to_have_text('Canadian Night Sky Planner')
    expect(page.locator('#sky-summary')).to_be_visible()
    page.get_by_role('link', name='See Peggy’s Cove tonight').click()
    expect(page.locator('#sky-title')).to_contain_text('Peggy’s Cove')
    expect(page.locator('#photo-place')).to_have_value('peggys-cove')
    assert page.locator('#dark').inner_text()
    page.get_by_role('link', name='Choose your community').click()
    expect(page.locator('#place-search')).to_be_focused()
    expect(page.locator('#results')).to_be_visible()
    page.get_by_text('Saved locations, balcony and local horizon',exact=True).click()
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
    page.get_by_text('Saved locations, balcony and local horizon',exact=True).click()
    page.locator('#saved-horizons').select_option(label='Test balcony');page.locator('#load-horizon').click()
    expect(page.locator('#horizon-points')).to_have_value('0, 90');expect(page.locator('#use-horizon')).to_be_checked()
    page.locator('#lat').fill('44.65');expect(page.locator('#use-horizon')).not_to_be_checked()
    page.locator('#photo-place').select_option('peggys-cove')
    expect(page.locator('#lat')).to_have_value('44.491778')
    expect(page.locator('#use-horizon')).not_to_be_checked()
    page.locator('#save-horizon').click()
    page.reload();expect(page.locator('#results')).to_be_visible()
    page.get_by_text('Saved locations, balcony and local horizon',exact=True).click()
    page.locator('#saved-horizons').select_option(label='Peggy’s Cove · Peggys Point, NS');page.locator('#load-horizon').click()
    expect(page.locator('#use-horizon')).not_to_be_checked()
    page.get_by_role('button',name='Calculate sky').click()
    page.locator('#session-cloud').select_option('20')
    expect(page.locator('#session-status')).to_contain_text('Load a cloud forecast')
    page.locator('#photo-place').select_option('stanley-park')
    expect(page.locator('#zone')).to_have_value('America/Vancouver')
    expect(page.locator('#tide-link')).to_have_attribute('href',__import__('re').compile('photo_place=stanley-park'))
    for width,height in [(390,844),(320,700)]:
     page.set_viewport_size({'width':width,'height':height});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'overflow {width}'
    page.evaluate('window.scrollTo(0,0)')
    assert page.get_by_role('link', name='Choose your community').bounding_box()['y'] < 700
    assert not errors,errors;browser.close()
  finally:server.shutdown();server.server_close()
 print('Nightfinder horizon/browser checks passed')
if __name__=='__main__':main()
