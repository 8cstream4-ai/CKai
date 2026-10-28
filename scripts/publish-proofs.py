"""Publish only synthetic screenshots as text for connector-based visual inspection."""
import base64, json, os, pathlib, urllib.request, urllib.error
repo=os.environ['GITHUB_REPOSITORY']; branch='ckai-visual-proofs'; phase=os.environ.get('PROOF_PHASE','before')
def api(path,data=None,method=None):
    request=urllib.request.Request('https://api.github.com/repos/'+repo+'/'+path,data=json.dumps(data).encode() if data is not None else None,method=method,headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','Content-Type':'application/json'})
    with urllib.request.urlopen(request) as response:return json.load(response)
try: parent=api('git/ref/heads/'+branch)['object']['sha']
except urllib.error.HTTPError as error:
    if error.code!=404:raise
    parent=None
base=api('git/commits/'+parent)['tree']['sha'] if parent else None
entries=[]
for file in (pathlib.Path('artifacts/visual-proof')/phase).glob('*.png'):
    encoded=base64.b64encode(file.read_bytes()).decode(); content='\n'.join(encoded[i:i+100] for i in range(0,len(encoded),100))
    entries.append({'path':phase+'/'+file.name+'.b64','mode':'100644','type':'blob','content':content})
for name in ['evidence.json','motion-checks.json','gfxinfo.txt','v05-results.json']:
    meta=pathlib.Path('artifacts/visual-proof')/phase/name
    if meta.exists():entries.append({'path':phase+'/'+name,'mode':'100644','type':'blob','content':meta.read_text()})
if not entries:
    print('No synthetic screenshots were produced.')
    raise SystemExit(0)
tree=api('git/trees',{'tree':entries,**({'base_tree':base} if base else {})})['sha']
commit=api('git/commits',{'message':'Synthetic visual evidence '+phase,'tree':tree,'parents':[parent] if parent else []})['sha']
if parent:api('git/refs/heads/'+branch,{'sha':commit,'force':False},'PATCH')
else:api('git/refs',{'ref':'refs/heads/'+branch,'sha':commit})
print('Screenshots available on branch',branch,'in',phase)
