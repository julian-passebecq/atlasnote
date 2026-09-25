"""Galaxy planning pass: real Chromium component/UI checks on the compiled compatibility build.
Covers the Dashboard planning projection, the reviewed Power Ops handoff intake, the
secret-refusing service reference note and the bounded planning-overview export.
Uses the existing in-memory store harness; DOES NOT certify IndexedDB, reload/fresh-profile
restore, integrated PDF, production origin or any live Power Ops / Mongoku integration.
All values are synthetic.
"""
import json,os,traceback,datetime
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_support import ROOT,start_server,launch,mount_dom,close_panels
OUT=Path(os.environ.get('ATLAS_EVIDENCE',ROOT/'docs/evidence/galaxy/planning-inbox-ui'));OUT.mkdir(parents=True,exist_ok=True)
TODAY=datetime.date.today()
def day(n):return (TODAY+datetime.timedelta(days=n)).isoformat()
HANDOFF=json.dumps({'schema':'powerops.atlasnote-handoff/1','sourceApp':'powerops','generatedAt':'2026-09-25T08:00:00Z','exportId':'ui-1','items':[
 {'sourceObjectId':'po:ui:1','sourceRevision':'1','kind':'task','title':'Rotate Access service token','dueDate':day(0),'important':True,'category':'cloud'},
 {'sourceObjectId':'po:ui:2','kind':'task','title':'Review freshness view','dueDate':day(3)},
 {'sourceObjectId':'po:ui:3','kind':'task','title':'Send recap','dueDate':day(-2)},
 {'sourceObjectId':'po:ui:4','kind':'task','title':'Someday cleanup'},
 {'sourceObjectId':'po:ui:5','kind':'note','title':'Idea','text':'Planning tabs'},
 {'sourceObjectId':'po:ui:6','kind':'read-later','title':'Service tokens doc','url':'https://example.invalid/service-tokens'},
 {'sourceObjectId':'po:ui:7','kind':'note','title':'Creds','password':'Synthetic-Only-123'}]})
results=[];errors=[];base=start_server(dom_only=True)
with sync_playwright() as pw:
 browser=launch(pw);ctx=browser.new_context(viewport={'width':1440,'height':1000});p=ctx.new_page();p.set_default_timeout(5000);p.on('pageerror',lambda e:errors.append(str(e)));mount_dom(p,base)
 def button(name,area=None):return (area or p).get_by_role('button',name=name,exact=True)
 def click(name,area=None):button(name,area).click();p.wait_for_timeout(100)
 def state():return p.evaluate('JSON.parse(JSON.stringify(testStore.state))')
 def reset():close_panels(p);p.set_viewport_size({'width':1440,'height':1000});p.evaluate('()=>testReset()');p.wait_for_timeout(150)
 def shot(name):p.screenshot(path=str(OUT/(name+'.png')),full_page=False)
 def check(name,fn):
  close_panels(p)
  try:r=fn();results.append({'name':name,'status':'PASS','detail':r});print('PASS',name,flush=True)
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)});traceback.print_exc();shot('failure-'+str(len(results)))
  finally:(OUT/'partial-results.json').write_text(json.dumps(results,indent=2))
 def dashboard():
  close_panels(p)
  if not p.locator('.dashboard-page').count():click('Open Dashboard')
  expect(p.locator('.dashboard-page')).to_be_visible()
 def import_handoff(text):
  click('Import from Power Ops');dialog=p.locator('dialog[open]');dialog.get_by_label('Power Ops handoff JSON',exact=True).fill(text);click('Preview import',dialog);return dialog
 def intake():
  reset();dashboard();expect(p.locator('.planning-panel')).to_be_visible();expect(p.locator('.dashboard-mini-table')).to_have_count(5)
  dialog=import_handoff(HANDOFF);expect(dialog.locator('.handoff-preview')).to_contain_text('6 new');expect(dialog.locator('.handoff-preview')).to_contain_text('1 refused');expect(dialog.locator('tr.handoff-refuse')).to_contain_text('secret-looking field');shot('handoff-preview')
  assert not state()['personal'].get('dashboardItems'),'preview writes nothing'
  click('Import 6 item(s)',dialog);expect(dialog.locator('.handoff-receipt')).to_contain_text('6 created');click('Close',dialog);expect(p.locator('dialog[open]')).to_have_count(0)
  s=state()['personal'];items=s['dashboardItems'];assert len(items)==5 and len(s['readLater'])==1
  assert all(i['origin']['app']=='powerops' for i in items) and 'Synthetic-Only' not in json.dumps(s)
  panel=p.locator('.planning-panel');expect(panel.locator('.planning-list > li')).to_have_count(3);assert panel.locator('.planning-due').all_text_contents()[1].startswith('Overdue')
  click('Agenda 3',panel);expect(panel.locator('.planning-agenda section')).to_have_count(3);expect(panel).to_contain_text('1 undated task(s) are not placed on the agenda.');shot('planning-agenda')
  dialog=import_handoff(HANDOFF);expect(dialog.locator('.handoff-preview')).to_contain_text('0 new, 0 to update, 6 unchanged');expect(button('Nothing to import',dialog)).to_be_disabled();click('Cancel',dialog)
  assert len(state()['personal']['dashboardItems'])==5,'re-import never duplicates'
  click('Mark done from planning: Send recap',panel);expect(panel.locator('[aria-pressed=true]')).to_contain_text('Agenda');assert next(i for i in state()['personal']['dashboardItems'] if i['text']=='Send recap')['status']=='done'
  return {'items':len(items)}
 check('Reviewed Power Ops intake, deduplicated re-import and planning/agenda views',intake)
 def reference():
  reset();dashboard();click('Service reference note');dialog=p.locator('dialog[open]');note=dialog.get_by_label('Service reference note',exact=True)
  text=note.input_value();assert 'Account ID' in text and 'Zone ID' in text and 'Service Token Client ID' in text
  note.fill(text+'\npassword: Synthetic-Only-123');expect(dialog.get_by_role('alert')).to_contain_text('does not store secret values');expect(button('Save reference note',dialog)).to_be_disabled()
  note.fill(text.replace('- Account ID value: ','- Account ID value: 0123456789abcdef0123456789abcdef'));expect(dialog.get_by_role('alert')).to_have_count(0);click('Save reference note',dialog);expect(p.locator('dialog[open]')).to_have_count(0)
  items=state()['personal']['dashboardItems'];assert len(items)==1 and items[0]['kind']=='note' and 'Synthetic-Only' not in items[0]['text']
  expect(p.locator('[aria-label="Quick notes table"] .dashboard-card-title').first).to_have_text('Service reference - Cloudflare');shot('service-reference')
 check('Service reference note documents identifiers and refuses secret values',reference)
 def overview():
  reset();dashboard();import_handoff(HANDOFF);click('Import 6 item(s)',p.locator('dialog[open]'));click('Close',p.locator('dialog[open]'))
  click('Export planning overview');dialog=p.locator('dialog[open]');raw=dialog.get_by_label('Planning overview JSON',exact=True).input_value();o=json.loads(raw)
  assert o['schema']=='atlasnote.planning-overview/1' and o['freshness']=='snapshot' and o['counts']['tasks']['open']==4 and len(o['openTasks'])==4
  for hidden in ['Planning tabs','service-tokens','Synthetic-Only']:assert hidden not in raw,hidden
  dialog.get_by_label('Include open task titles').uncheck();raw2=dialog.get_by_label('Planning overview JSON',exact=True).input_value();assert '"title"' not in raw2 and json.loads(raw2)['sourceRevision']==o['sourceRevision']
  click('Close',dialog);return {'bytes':len(raw)}
 check('Planning overview export is metadata-only and bounded',overview)
 def reschedule():
  reset();dashboard();import_handoff(HANDOFF);click('Import 6 item(s)',p.locator('dialog[open]'));click('Close',p.locator('dialog[open]'))
  panel=p.locator('.planning-panel');expect(panel.locator('.planning-list > li')).to_have_count(3)
  click('Open tasks 4',panel);click('Planning task: Someday cleanup',panel);dialog=p.locator('dialog[open]')
  dialog.get_by_label('Capture due date',exact=True).fill(day(1));dialog.get_by_label('Capture important',exact=True).check();expect(dialog).to_contain_text('Imported from Power Ops');click('Save captured item',dialog);expect(p.locator('dialog[open]')).to_have_count(0)
  item=next(i for i in state()['personal']['dashboardItems'] if i['text']=='Someday cleanup');assert item['important'] and item['dueAt']
  click('Next up 4',panel);expect(panel.locator('.planning-list > li')).to_have_count(4)
  click('Planning task: Someday cleanup',panel);dialog=p.locator('dialog[open]');click('Clear date',dialog);dialog.locator('textarea').fill('Someday cleanup\npassword: Synthetic-Only-123');click('Save captured item',dialog)
  expect(dialog.get_by_role('alert')).to_contain_text('does not store secret values');dialog.locator('textarea').fill('Someday cleanup');click('Save captured item',dialog);expect(p.locator('dialog[open]')).to_have_count(0)
  item=next(i for i in state()['personal']['dashboardItems'] if i['text']=='Someday cleanup');assert 'dueAt' not in item and 'Synthetic-Only' not in json.dumps(state()['personal'])
  expect(panel.locator('.planning-list > li')).to_have_count(3);shot('reschedule')
 check('Capture editor reschedules, clears dates and surfaces the secret guard',reschedule)
 def narrow():
  reset();dashboard();import_handoff(HANDOFF);click('Import 6 item(s)',p.locator('dialog[open]'));click('Close',p.locator('dialog[open]'))
  p.set_viewport_size({'width':390,'height':844});p.wait_for_timeout(200);over=p.evaluate('()=>{const d=document.querySelector(".dashboard-page");return d.scrollWidth-d.clientWidth}');assert over<=1,over;shot('planning-390')
 check('390px Dashboard planning panel has no horizontal overflow',narrow)
 browser.close()
report={'scope':__doc__,'status':'PASS' if not errors and all(r['status']=='PASS' for r in results) else 'FAIL','checks':results,'errors':errors};(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps({'status':report['status'],'passed':sum(r['status']=='PASS' for r in results),'total':len(results)}));raise SystemExit(0 if report['status']=='PASS' else 1)
