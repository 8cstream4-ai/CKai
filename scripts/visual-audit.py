"""Visual evidence on a fresh emulator with synthetic data only."""
import base64, json, os, pathlib, runpy, shutil, sqlite3, subprocess, time
phase = os.environ.get('PROOF_PHASE', 'before')
out = pathlib.Path('artifacts/visual-proof') / phase
out.mkdir(parents=True, exist_ok=True)
helpers = runpy.run_path('mobile/scripts/android-smoke.py')
adb, wait, tap = (helpers[name] for name in ['adb','wait','tap'])
for file in pathlib.Path('artifacts/android-smoke').glob('*.png'): shutil.copyfile(file, out / file.name)

def shot(name): (out / name).write_bytes(adb('exec-out','screencap','-p'))

def record_intro():
    adb('shell','am','force-stop','app.ckai.privateassistant')
    recording = subprocess.Popen(['adb','shell','screenrecord','--time-limit','8','/sdcard/ckai-intro.mp4'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    time.sleep(0.5)
    adb('shell','am','start','-W','-n','app.ckai.privateassistant/.MainActivity')
    wait('CKaiTest')
    recording.wait(timeout=15)
    (out/'intro.mp4').write_bytes(adb('exec-out','cat','/sdcard/ckai-intro.mp4'))

record_intro()
adb('root'); adb('wait-for-device'); time.sleep(1)
assert adb('shell','id','-u').strip()==b'0', 'Root required for synthetic fixture injection on a fresh emulator.'
path='/data/user/0/app.ckai.privateassistant/databases/ckai.db'
adb('shell','am','force-stop','app.ckai.privateassistant')
local=pathlib.Path('/tmp/ckai-audit.db')
local.write_bytes(adb('exec-out','cat',path))
for suffix in ['-wal','-shm']:
    result=subprocess.run(['adb','exec-out','cat',path+suffix],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if result.returncode==0: pathlib.Path(str(local)+suffix).write_bytes(result.stdout)
connection=sqlite3.connect(local)
row=connection.execute('SELECT value FROM settings WHERE id=1').fetchone(); settings=json.loads(row[0])
connection.execute('DELETE FROM messages'); connection.execute('DELETE FROM conversations')
connection.execute('INSERT INTO conversations(id,title,updatedAt) VALUES (?,?,?)',('audit-format','Audit Markdown FR',1))
answer='Voici *un passage en italique* et ** un mot important **.\n\n~~Texte retiré~~.\n\n| Modèle | Usage |\n|---|---|\n| Rapide | Quotidien |\n\n- **Clair** : lisible\n- *Fluide* : naturel'
for i,role,text in [('a-user','user','Montre-moi une réponse bien présentée.'),('a-ai','assistant',answer)]:
    connection.execute('INSERT INTO messages(id,chatId,role,content,state,error,createdAt,rich) VALUES (?,?,?,?,?,?,?,?)',(i,'audit-format',role,text,'complete',None,1 if role=='user' else 2,'{}'))
connection.commit()

def apply(theme):
    settings['theme']=theme
    connection.execute('UPDATE settings SET value=? WHERE id=1',(json.dumps(settings),)); connection.commit(); connection.execute('PRAGMA wal_checkpoint(TRUNCATE)')
    adb('shell','am','force-stop','app.ckai.privateassistant')
    adb('push',str(local),'/data/local/tmp/ckai-audit.db')
    adb('shell','cp','/data/local/tmp/ckai-audit.db',path)
    adb('shell','rm','-f',path+'-wal',path+'-shm')
    adb('shell','am','start','-W','-n','app.ckai.privateassistant/.MainActivity')
    wait('CKaiTest'); tap('Historique'); tap('Audit Markdown FR'); wait('passage')

for width,height,theme,scale in [(720,1600,'dark','1.0'),(786,1704,'light','1.0'),(860,1864,'amoled','1.3')]:
    adb('shell','wm','size',f'{width}x{height}'); adb('shell','wm','density','320')
    adb('shell','settings','put','system','font_scale',scale)
    apply(theme); shot(f'chat-{width//2}dp-{theme}-font{scale}.png')
adb('shell','settings','put','system','accelerometer_rotation','0'); adb('shell','settings','put','system','user_rotation','1'); time.sleep(2); shot('chat-landscape.png')
adb('shell','settings','put','system','user_rotation','0')
connection.close()
(out/'evidence.json').write_text(json.dumps({'phase':phase,'synthetic':True,'sizesDp':[360,393,430],'themes':['dark','light','amoled'],'fontScales':[1,1.3],'physicalPhone':'not attached','captureUnix':time.time()},indent=2))
print('Visual audit evidence captured:',phase)
