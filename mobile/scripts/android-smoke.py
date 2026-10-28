"""Runs against an installed APK on an Android emulator; no provider key required."""
import pathlib, re, subprocess, time, xml.etree.ElementTree as ET
out = pathlib.Path('artifacts/android-smoke'); out.mkdir(parents=True, exist_ok=True)

def adb(*args, timeout=25):
    return subprocess.run(['adb', *args], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout).stdout

def dump():
    adb('shell','rm','-f','/sdcard/ckai-ui.xml')
    if pathlib.Path('/tmp/ckai-ui-dump.jar').exists():
        adb('shell','CLASSPATH=/system/framework/uiautomator.jar:/data/local/tmp/ckai-ui-dump.jar','app_process','/system/bin','CKaiDump','/sdcard/ckai-ui.xml')
    else:
        adb('shell', 'uiautomator', 'dump', '/sdcard/ckai-ui.xml')
    raw = adb('exec-out', 'cat', '/sdcard/ckai-ui.xml').decode('utf8')
    (out / 'last-ui.xml').write_text(raw)
    return ET.fromstring(raw)

def label(node):
    return node.attrib.get('text', '') + ' ' + node.attrib.get('content-desc', '')

def wait(text, seconds=50):
    end = time.monotonic() + seconds
    while time.monotonic() < end:
        try:
            root = dump()
            nodes=list(root.iter('node'))
            if any("Pixel Launcher isn't responding" in label(node) for node in nodes):
                close=next((node for node in nodes if node.attrib.get('resource-id')=='android:id/aerr_close'),None)
                if close is not None:
                    coords=list(map(int,re.findall(r'\d+',close.attrib['bounds'])))
                    adb('shell','input','tap',str((coords[0]+coords[2])//2),str((coords[1]+coords[3])//2))
                    adb('shell','am','start','-W','-n','app.ckai.privateassistant/.MainActivity')
                    continue
            for node in nodes:
                if text.casefold() in label(node).casefold(): return node
        except (subprocess.SubprocessError, ET.ParseError): pass
        time.sleep(1)
    logs = adb('logcat', '-d', '-t', '300').decode('utf8', errors='replace')
    (out / 'logcat.txt').write_text(logs)
    raise AssertionError(f'Élément absent : {text}')

def tap(text):
    node = wait(text); coords = list(map(int, re.findall(r'\d+', node.attrib['bounds'])))
    adb('shell', 'input', 'tap', str((coords[0] + coords[2]) // 2), str((coords[1] + coords[3]) // 2))

def screenshot(name):
    (out / name).write_bytes(adb('exec-out', 'screencap', '-p'))

try:
    adb('install', '-r', 'artifacts/CKai-test.apk', timeout=90)
    adb('logcat', '-c')
    adb('shell', 'am', 'start', '-W', '-n', 'app.ckai.privateassistant/.MainActivity')
    wait('Prénom ou pseudo'); screenshot('01-profil.png')
    tap('Prénom ou pseudo'); adb('shell', 'input', 'text', 'CKaiTest'); adb('shell', 'input', 'keyevent', '4')
    tap('Entrer dans CKai'); wait('Historique'); wait('CKaiTest'); screenshot('02-accueil.png')
    tap('Joindre une photo, une vidéo ou un fichier'); wait('Donne du contexte'); wait('DOCX'); screenshot('03-imports.png')
    adb('shell', 'input', 'keyevent', '4')
    tap('Historique'); tap('Profil et réglages'); wait('Réglages'); screenshot('04-reglages.png')
    adb('shell', 'am', 'force-stop', 'app.ckai.privateassistant')
    adb('shell', 'am', 'start', '-W', '-n', 'app.ckai.privateassistant/.MainActivity')
    wait('CKaiTest'); print('APK : lancement, profil persistant, accueil, imports et réglages OK.')
finally:
    screenshot('99-fin.png')
    (out / 'app-logcat.txt').write_bytes(adb('logcat', '-d', '-s', 'ReactNativeJS:V', 'AndroidRuntime:V', 'libc:F', '*:S'))
    (out / 'logcat.txt').write_bytes(adb('logcat', '-d', '-t', '600'))
