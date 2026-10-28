import { writeFile, mkdir } from 'node:fs/promises';
import { searchMediaImages, searchMediaVideos } from '../src/ai/media.ts';
const result={capturedAt:new Date().toISOString(),providerKeyUsed:false,checks:[]};
for(const [kind,query,search] of [['images','Monkey D. Luffy',searchMediaImages],['videos','waterfall',searchMediaVideos]]){
  try{
    const items=await search(query,fetch,AbortSignal.timeout(45000));
    result.checks.push({kind,query,count:items.length,items});
    console.log(kind+': '+items.length+' actual Wikimedia/Wikipedia results.');
    if(!items.length)process.exitCode=1;
  }catch(error){result.checks.push({kind,query,error:error instanceof Error?error.message:'unavailable'});console.log(kind+': '+result.checks.at(-1).error);process.exitCode=1;}
}
await mkdir('artifacts',{recursive:true});
await writeFile('artifacts/media-live.json',JSON.stringify(result,null,2));
