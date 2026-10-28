"""Real Android media imports and local notification lifecycle; no provider key or fake AI answer."""
import json, pathlib, re, runpy, shutil, subprocess, time
helpers=runpy.run_path('mobile/scripts/android-smoke.py')
adb,wait,tap,dump,label=(helpers[name] for name in ['adb','wait','tap','dump','label'])
out=pathlib.Path('artifacts/v05-proof');out.mkdir(parents=True,exist_ok=True)
def shot(name):
    time.sleep(.5);(out/name).write_bytes(adb('exec-out','screencap','-p'))
def has(text):
    try:return any(text.casefold() in label(node).casefold() for node in dump().iter('node'))
    except (subprocess.SubprocessError,FileNotFoundError):return False
def find_scrolling(text):
    for _ in range(7):
        if has(text):return
        width,height=map(int,re.findall(r'\d+',adb('shell','wm','size').decode())[-2:])
        adb('shell','input','swipe',str(width//2),str(height*3//4),str(width//2),str(height//3),'350')
    wait(text)
def choose_document(name):
    tap('Joindre une photo, une vidéo ou un fichier');tap('Fichiers')
    time.sleep(.6)
    if not has(name):
        for title in ['Show roots','Afficher les racines','Open navigation drawer']:
            if has(title):tap(title);break
        for title in ['Downloads','Téléchargements','Download']:
            if has(title):tap(title);break
    wait(name);tap(name)
    # Some system document pickers require a final confirmation for multi-select.
    if has('OPEN'):tap('OPEN')
def service_running():
    text=adb('shell','dumpsys','activity','services','app.ckai.privateassistant').decode(errors='replace')
    return 'app.ckai.background.CKaiReplyService' in text and ('isForeground=true' in text or 'foregroundId=6101' in text)
def wait_service(expected,seconds=12):
    end=time.monotonic()+seconds
    while time.monotonic()<end:
        if service_running()==expected:return
        time.sleep(.3)
    raise AssertionError('Foreground reply service expected active='+str(expected))
def notification_dump():
    text=adb('shell','dumpsys','notification','--noredact').decode(errors='replace')
    (out/'notifications.txt').write_text(text)
    return text

recording=None
try:
    adb('shell','pm','grant','app.ckai.privateassistant','android.permission.POST_NOTIFICATIONS')
    for name in ['CKai-image-test.png','CKai-video-test.mp4']:
        adb('push','artifacts/fixtures/'+name,'/sdcard/Download/'+name)
        adb('shell','am','broadcast','-a','android.intent.action.MEDIA_SCANNER_SCAN_FILE','-d','file:///sdcard/Download/'+name)
    wait('CKaiTest')
    # Keyboard must leave the actual send button visible, beyond merely opening the IME.
    tap('Message à CKai');adb('shell','input','text','Bonjour')
    time.sleep(1);node=wait('Envoyer');bounds=list(map(int,re.findall(r'\d+',node.attrib['bounds'])))
    assert bounds[2]>bounds[0] and bounds[3]>bounds[1],'Send button has no visible bounds'
    shot('01-composer-clavier.png');adb('shell','input','keyevent','4')
    choose_document('CKai-image-test.png');wait('Retirer CKai-image-test.png')
    shot('02-photo-jointe.png');tap('Envoyer')
    wait('Agrandir : CKai-image-test.png');wait('Ajoute ta clé Groq')
    shot('03-photo-dans-chat.png');tap('Agrandir : CKai-image-test.png');wait('Fermer l’image')
    shot('04-photo-plein-ecran.png');tap('Fermer l’image')
    tap('Nouvelle conversation');wait('CKaiTest')
    choose_document('CKai-video-test.mp4');wait('Retirer CKai-video-test.mp4')
    shot('05-video-jointe.png');tap('Envoyer');wait('Lire CKai-video-test.mp4')
    wait('Ajoute ta clé Groq');shot('06-video-dans-chat.png')
    tap('Lire CKai-video-test.mp4');wait('Fermer la vidéo');time.sleep(2)
    assert not has('Cette vidéo ne peut pas être lue'),'Video decoder reported a failure'
    shot('07-lecture-video.png');tap('Fermer la vidéo')
    # The test runs the same service/headless keepalive as generation, with a labelled local timer.
    tap('Historique');tap('Profil et réglages');find_scrolling('Tester les notifications')
    recording=subprocess.Popen(['adb','shell','screenrecord','--time-limit','45','/sdcard/ckai-background.mp4'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    tap('Tester les notifications');wait_service(True)
    adb('shell','input','keyevent','3');adb('shell','cmd','statusbar','expand-notifications')
    shot('08-notification-en-cours.png')
    wait_service(False,seconds=20)
    end=time.monotonic()+10
    while 'Notification de test CKai' not in notification_dump() and time.monotonic()<end:time.sleep(.5)
    assert 'Notification de test CKai' in notification_dump(),'No completion notification while CKai was backgrounded'
    shot('09-notification-terminee.png')
    # Tapping the actual notification opens the conversation that owns the job.
    tap('Notification de test CKai');wait('Lire CKai-video-test.mp4')
    shot('10-notification-ouvre-chat.png')
    tap('Historique');tap('Profil et réglages');find_scrolling('Tester les notifications')
    tap('Tester les notifications');wait_service(True)
    adb('shell','input','keyevent','3');adb('shell','cmd','statusbar','expand-notifications')
    tap('Arrêter');wait_service(False,seconds=12)
    shot('11-arret-notification.png')
    (out/'result.json').write_text(json.dumps({'synthetic':True,'providerRequest':False,'realPhotoImport':True,'realVideoImportAndPlayback':True,'backgroundTimerAndCompletionNotification':True,'notificationOpensOwningChat':True,'notificationCancelStopsService':True,'note':'Local service probe, not a live Groq generation; test account contains no API key.'},indent=2))
    print('V05: real photo/video imports and playback, headless background notification, deep link and cancellation passed.')
finally:
    if recording is not None:
        try:
            if recording.poll() is None:
                adb('shell','pkill','-INT','screenrecord')
            recording.wait(timeout=8)
            (out/'background.mp4').write_bytes(adb('exec-out','cat','/sdcard/ckai-background.mp4'))
        except (subprocess.SubprocessError,FileNotFoundError): print('Background video unavailable; inspect screenshots and logs.')
    (out/'app-logcat.txt').write_bytes(adb('logcat','-d','-s','ReactNativeJS:V','AndroidRuntime:V','libc:F','*:S'))
    shot('99-fin.png')

    target=pathlib.Path('artifacts/visual-proof/after');target.mkdir(parents=True,exist_ok=True)
    for captured in out.glob('*.png'):shutil.copyfile(captured,target/('v05-'+captured.name))
    if (out/'result.json').exists():shutil.copyfile(out/'result.json',target/'v05-results.json')
