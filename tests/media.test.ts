import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaRequest, commonsImages, wikipediaImages, commonsVideos, searchMediaImages } from '../src/ai/media.ts';
import { createChatTransport, providers } from '../src/ai/index.ts';
import type { ChatEvent, Json } from '../src/ai/types.ts';

for(const [query,expected] of [
  ['Donne image','image'],['Montre-moi une photo de Luffy','image'],['Je voudrais des vidéos de cascades','video'],
  ['Une image de Paris','image'],['Sans photos, explique Paris',null],['Analyse cette image',null],
  ['Génère une image de Paris',null],['Comment fonctionne une image numérique ?',null],['Regarde ma vidéo',null]
] as const) test('Intention média : '+query,()=>assert.equal(mediaRequest(query, /analyse|regarde/i.test(query)),expected));

test('Commons : original accepté sans miniature, attribution et dimensions conservées',()=>{
  const items=commonsImages({query:{pages:{'1':{title:'File:Test.png',imageinfo:[{url:'https://upload.wikimedia.org/a.png',descriptionurl:'https://commons.wikimedia.org/wiki/File:Test.png',mime:'image/png',width:100,height:80,extmetadata:{Artist:{value:'<b>Auteur</b>'},LicenseShortName:{value:'CC BY-SA 4.0'}}}]}}}});
  assert.equal(items.length,1);assert.equal(items[0]?.credit,'Auteur');assert.equal(items[0]?.width,100);assert.equal(items[0]?.license,'CC BY-SA 4.0');
});
test('Médias : aucune URL privée, adresse inventée hors Wikimedia ou vidéo dans les images',()=>{
  assert.deepEqual(commonsImages({query:{pages:[{imageinfo:[{url:'http://127.0.0.1/x',descriptionurl:'https://example.com'}]},{imageinfo:[{url:'https://attacker.example/image.jpg',descriptionurl:'https://example.com'}]},{imageinfo:[{url:'https://upload.wikimedia.org/a.webm',mime:'video/webm',descriptionurl:'https://commons.wikimedia.org/wiki/File:X'}]}]}}),[]);
  assert.deepEqual(commonsImages({error:'unavailable'}),[]);
});
test('Wikipedia : ne pas promettre une licence libre pour une illustration encyclopédique',()=>{
  const items=wikipediaImages({query:{pages:[{title:'Monkey D. Luffy',fullurl:'https://en.wikipedia.org/wiki/Monkey_D._Luffy',thumbnail:{source:'https://upload.wikimedia.org/wikipedia/en/a.png',width:300,height:400}}]}});
  assert.equal(items[0]?.title,'Monkey D. Luffy');assert.match(items[0]?.license??'',/Droits/);assert.ok(!items[0]?.license.includes('libre'));
});
test('Vidéo : choisir une dérivée WebM lisible au lieu du fichier OGV',()=>{
  const items=commonsVideos({query:{pages:[{title:'File:Water.ogv',videoinfo:[{url:'https://upload.wikimedia.org/a.ogv',mime:'video/ogg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Water.ogv',derivatives:[{src:'https://upload.wikimedia.org/a.480.webm',type:'video/webm; codecs=vp9',height:480},{src:'https://upload.wikimedia.org/a.1080.webm',type:'video/webm',height:1080}]}]}]}});
  assert.equal(items[0]?.url,'https://upload.wikimedia.org/a.480.webm');assert.equal(items[0]?.mime,'video/webm');
});
test('Recherche : Commons vide puis repli Wikipedia, aucun jeton requis',async()=>{
  const calls:string[]=[];
  const items=await searchMediaImages('Luffy',async (input)=>{const url=String(input);calls.push(url);return Response.json(url.includes('commons.')?{query:{pages:[]}}:{query:{pages:[{title:'Luffy',fullurl:'https://fr.wikipedia.org/wiki/Luffy',thumbnail:{source:'https://upload.wikimedia.org/a.png'}}]}});},new AbortController().signal);
  assert.ok(items.length);assert.ok(calls.some(url=>url.includes('wikipedia.org')));assert.ok(calls.every(url=>!url.includes('token')));
});
test('Recherche annulée : aucun résultat périmé ni nouvelle requête',async()=>{
  const controller=new AbortController();controller.abort();let calls=0;
  await assert.rejects(()=>searchMediaImages('Luffy',async()=>{calls++;return Response.json({});},controller.signal));
  assert.equal(calls,0);
});
test('Outil exigé seulement au premier tour, puis résultat réel transmis au modèle',async()=>{
  const bodies:Record<string,unknown>[]=[];let executed=false;
  const frame=(value:unknown)=>'data: '+JSON.stringify(value)+'\n\n';
  const end=(reason:string)=>frame({choices:[{delta:{},finish_reason:reason}]})+'data: [DONE]\n\n';
  const transport=createChatTransport({secrets:{async get(){return 'test-only';},async set(){},async remove(){}},fetch:async(_url,init)=>{
    bodies.push(JSON.parse(String(init?.body)));
    return new Response(bodies.length===1?frame({choices:[{delta:{tool_calls:[{index:0,id:'media-1',function:{name:'search_images',arguments:'{"query":"Luffy"}'}}]}}]})+end('tool_calls'):frame({choices:[{delta:{content:'Voici les images trouvées.'}}]})+end('stop'),{headers:{'content-type':'text/event-stream'}});
  }});
  const events:ChatEvent[]=await Array.fromAsync(transport.stream({provider:providers.groq,level:'fort',messages:[{role:'user',content:'Donne image'}],requiredTool:'search_images',tools:{search_images:{description:'Images',parameters:{type:'object'},async execute():Promise<Json>{executed=true;return {count:1,displayedInChat:true};}}}}));
  assert.equal(executed,true);assert.deepEqual(bodies[0]?.tool_choice,{type:'function',function:{name:'search_images'}});assert.equal(bodies[1]?.tool_choice,undefined);
  assert.ok(events.some(event=>event.type==='tool-end'));assert.equal(events.at(-1)?.type,'done');
});
test('Outil exigé inconnu : erreur de configuration avant tout réseau',async()=>{
  let calls=0;const transport=createChatTransport({secrets:{async get(){return 'test';},async set(){},async remove(){}},fetch:async()=>{calls++;return Response.json({});}});
  const events=await Array.fromAsync(transport.stream({provider:providers.groq,messages:[{role:'user',content:'image'}],requiredTool:'invented'}));
  assert.equal(calls,0);assert.equal(events.at(-1)?.type,'error');
});

test('Une photo jointe à identifier ne déclenche pas une recherche de nouvelles images',()=>{
  assert.equal(mediaRequest('Photo de ma voiture, quelle marque ?',true),null);
  assert.equal(mediaRequest('Montre-moi des photos de ce modèle de voiture',true),'image');
});
