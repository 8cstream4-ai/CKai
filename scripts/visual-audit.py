"""Visual evidence on a fresh emulator with synthetic data only."""
import base64, json, os, pathlib, runpy, shutil, sqlite3, subprocess, time
phase = os.environ.get('PROOF_PHASE', 'before')
out = pathlib.Path('artifacts/visual-proof') / phase
out.mkdir(parents=True, exist_ok=True)
try:
    helpers = runpy.run_path('mobile/scripts/android-smoke.py', run_name='__main__')
finally:
    for captured in pathlib.Path('artifacts/android-smoke').glob('*.png'): shutil.copyfile(captured,out/captured.name)
adb, wait, tap = (helpers[name] for name in ['adb','wait','tap'])
for file in pathlib.Path('artifacts/android-smoke').glob('*.png'): shutil.copyfile(file, out / file.name)

def shot(name):
    if name.startswith('home-') and name != 'home-card-pressed.png': time.sleep(.8)
    (out / name).write_bytes(adb('exec-out','screencap','-p'))

def record_intro():
    adb('shell','am','force-stop','app.ckai.privateassistant')
    adb('shell','dumpsys','gfxinfo','app.ckai.privateassistant','reset')
    recording = subprocess.Popen(['adb','shell','screenrecord','--time-limit','18','/sdcard/ckai-intro.mp4'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    time.sleep(0.5)
    adb('shell','am','start','-W','-n','app.ckai.privateassistant/.MainActivity')
    wait('CKaiTest')
    shot('home-default.png')
    try:
        node=wait('Une nouvelle idée'); bounds=list(map(int,__import__('re').findall(r'\d+',node.attrib['bounds'])))
        x,y=str((bounds[0]+bounds[2])//2),str((bounds[1]+bounds[3])//2)
        press=subprocess.Popen(['adb','shell','input','swipe',x,y,x,y,'700'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        time.sleep(.2);shot('home-card-pressed.png');press.wait(timeout=3)
        tap('Message à CKai');adb('shell','input','text','%sBonjour')
        shot('home-composer-focused.png');adb('shell','input','keyevent','4')
    except Exception as error:
        print('Additional interaction capture:',type(error).__name__)
    recording.wait(timeout=25)
    (out/'gfxinfo.txt').write_bytes(adb('shell','dumpsys','gfxinfo','app.ckai.privateassistant','framestats'))
    (out/'intro.mp4').write_bytes(adb('exec-out','cat','/sdcard/ckai-intro.mp4'))

record_intro()
adb('root'); adb('wait-for-device'); time.sleep(1)
assert adb('shell','id','-u').strip()==b'0', 'Root required for synthetic fixture injection on a fresh emulator.'
path=adb('shell','find','/data/user/0/app.ckai.privateassistant','-name','ckai.db').decode().strip().splitlines()[0]
adb('shell','am','force-stop','app.ckai.privateassistant')
local=pathlib.Path('/tmp/ckai-audit.db')
content=adb('exec-out','cat',path)
assert content.startswith(b'SQLite format 3'), 'Expected the application SQLite database.'
local.write_bytes(content)
for suffix in ['-wal']:
    result=subprocess.run(['adb','exec-out','cat',path+suffix],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if result.returncode==0 and result.stdout[:4] in [bytes.fromhex('377f0682'),bytes.fromhex('377f0683')]: pathlib.Path(str(local)+suffix).write_bytes(result.stdout)
connection=sqlite3.connect(local)
row=connection.execute('SELECT value FROM settings WHERE id=1').fetchone(); settings=json.loads(row[0])
connection.execute('DELETE FROM messages'); connection.execute('DELETE FROM conversations'); connection.execute('DELETE FROM drafts')
connection.execute('INSERT INTO conversations(id,title,updatedAt) VALUES (?,?,?)',('audit-format','Audit Markdown FR',1))
answer='Voici *un passage en italique* et ** un mot important **.\n\n~~Texte retiré~~.\n\n| Modèle | Usage |\n|---|---|\n| Rapide | Quotidien |\n\n- **Clair** : lisible\n- *Fluide* : naturel'
for i,role,text in [('a-user','user','Montre-moi une réponse bien présentée.'),('a-ai','assistant',answer)]:
    connection.execute('INSERT INTO messages(id,chatId,role,content,state,error,createdAt,rich) VALUES (?,?,?,?,?,?,?,?)',(i,'audit-format',role,text,'complete',None,1 if role=='user' else 2,'{}'))
connection.commit()

def apply(theme, animations=None):
    settings['theme']=theme
    if animations is not None: settings['animations']=animations
    connection.execute('UPDATE settings SET value=? WHERE id=1',(json.dumps(settings),)); connection.commit(); connection.execute('PRAGMA wal_checkpoint(TRUNCATE)')
    adb('shell','am','force-stop','app.ckai.privateassistant')
    adb('push',str(local),'/data/local/tmp/ckai-audit.db')
    adb('shell','cp','/data/local/tmp/ckai-audit.db',path)
    adb('shell','rm','-f',path+'-wal',path+'-shm')
    adb('shell','am','start','-W','-n','app.ckai.privateassistant/.MainActivity')
    wait('CKaiTest')

for width,height,theme,scale in [(720,1600,'dark','1.0'),(786,1704,'light','1.0'),(860,1864,'amoled','1.3')]:
    adb('shell','wm','size',f'{width}x{height}'); adb('shell','wm','density','320')
    adb('shell','settings','put','system','font_scale',scale)
    apply(theme); shot(f'home-{width//2}dp-{theme}-font{scale}.png')
    tap('Historique');tap('Audit Markdown FR');wait('Audit Markdown FR');shot(f'chat-{width//2}dp-{theme}-font{scale}.png')
adb('shell','settings','put','system','accelerometer_rotation','0'); adb('shell','settings','put','system','user_rotation','1'); time.sleep(2);shot('chat-landscape.png');tap('Nouvelle conversation');wait('CKaiTest');shot('home-landscape.png')
adb('shell','settings','put','system','user_rotation','0')
if phase == 'after':
    import PIL.Image, PIL.ImageChops
    adb('shell','wm','size','786x1704');adb('shell','wm','density','320');adb('shell','settings','put','system','font_scale','1.0')
    def stability(prefix):
        time.sleep(1.2);shot(prefix+'-1.png');time.sleep(1.2);shot(prefix+'-2.png')
        a=PIL.Image.open(out/(prefix+'-1.png')).convert('RGB');b=PIL.Image.open(out/(prefix+'-2.png')).convert('RGB')
        region=(0,180,a.width,a.height-70);diff=PIL.ImageChops.difference(a.crop(region),b.crop(region))
        changed=sum(1 for pixel in diff.getdata() if max(pixel)>5);ratio=changed/(diff.width*diff.height)
        print(prefix,'changed pixels ratio',ratio)
        assert ratio < .005, prefix+' should stop continuous decorative motion'
        return ratio
    apply('dark','reduced');reducedRatio=stability('home-reduced')
    apply('dark','normal');adb('shell','dumpsys','battery','unplug');adb('shell','cmd','power','set-mode','1')
    time.sleep(1);lowPowerRatio=stability('home-low-power')
    (out/'motion-checks.json').write_text(json.dumps({'reducedChangedRatio':reducedRatio,'batterySaverChangedRatio':lowPowerRatio,'threshold':.005,'type':'emulator screenshot stability, not physical-device FPS'}))
    adb('shell','cmd','power','set-mode','0');adb('shell','dumpsys','battery','reset')
connection.close()
(out/'evidence.json').write_text(json.dumps({'phase':phase,'synthetic':True,'sizesDp':[360,393,430],'themes':['dark','light','amoled'],'fontScales':[1,1.3],'physicalPhone':'not attached','captureUnix':time.time()},indent=2))
print('Visual audit evidence captured:',phase)
