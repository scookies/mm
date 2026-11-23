const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const index=JSON.parse(fs.readFileSync(path.join(root,'recordings/audio-index.json'),'utf8'));
const original=JSON.parse(fs.readFileSync(path.join(root,'recordings/myanmar-reading-recordings.json'),'utf8'));
const newer=JSON.parse(fs.readFileSync(path.join(root,'recordings/incoming/myanmar-reading-recordings-new.json'),'utf8'));
const merged=new Map([...original.clips,...newer.clips].map(clip=>[clip.letter,clip]));
assert.equal(index.clips.length,165);assert.equal(new Set(index.clips.map(c=>c.letter)).size,165);
for(const clip of index.clips){
 const bytes=fs.readFileSync(path.join(root,clip.url));
 assert.equal(bytes.length,clip.size_bytes);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),clip.sha256);
 assert(bytes.equals(Buffer.from(merged.get(clip.letter).data.split(',')[1],'base64')));
}
const nodes=new Map();function el(){return {value:'',checked:true,disabled:false,children:[],classList:{toggle(){},add(){}},append(x){this.children.push(x)},replaceChildren(){this.children=[]},setAttribute(){},pause(){},load(){},removeAttribute(){},focus(){}}}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,el());return nodes.get(id)},createElement:el};
for(const [id,value]of [['recordSet','i'],['scope','i'],['exploreSet','alphabet']])document.getElementById(id).value=value;
const override=new Blob(['new local take'],{type:'audio/webm'});let requests=0;
const c={document,Blob,URL,atob,Uint8Array,setTimeout,window:{location:{hash:''},addEventListener(){}},Audio:class{pause(){}removeAttribute(){}load(){}async play(){}},fetch:async url=>{requests++;const b=fs.readFileSync(path.join(root,url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};},indexedDB:{open(){const r={};queueMicrotask(()=>{r.result={transaction(){return {objectStore(){return {getAll(){const a={};queueMicrotask(()=>{a.result=[{letter:'က',blob:override}];a.onsuccess()});return a}}}}}};r.onsuccess()});return r}}};
vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'recordings/bundled-recordings.js'),'utf8'),c);vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),c);
(async()=>{
 await new Promise(r=>setImmediate(r));assert.equal(requests,0,'startup must not fetch audio');
 assert.equal(vm.runInContext('recordings.size',c),165);assert.equal(vm.runInContext('recordingItems.length',c),0);
 assert.strictEqual(vm.runInContext("recordings.get('က').blob",c),override);
 await vm.runInContext("play('ကီ',$('audioStatus'))",c);assert(vm.runInContext('audio.src',c).endsWith('1000-102e.webm'));
 const clip=vm.runInContext("recordings.get('ကီ')",c);const blob=await vm.runInContext("getRecordingBlob(recordings.get('ကီ'))",c);assert.equal(requests,1);assert.equal(blob.type,'audio/webm;codecs=opus');assert.equal(blob.size,index.clips.find(c=>c.letter==='ကီ').size_bytes);
 await vm.runInContext("getRecordingBlob(recordings.get('ကီ'))",c);assert.equal(requests,1,'backup reuses fetched blob');
 await vm.runInContext("getRecordingBlob(recordings.get('က'))",c);assert.equal(requests,1,'local override needs no fetch');
 for(const [scope,count] of [['all',33],['aa',87],['i',78]]){
  vm.runInContext(`$('scope').value='${scope}';start()`,c);assert.equal(vm.runInContext('deck.length',c),count);
  for(let i=0;i<count;i++){vm.runInContext(`index=${i};render();unlocked=true;answer(deck[index])`,c);assert(document.getElementById('choices').children.length>=3);}
  assert.equal(vm.runInContext('score',c),count);
 }
 for(const {letter} of index.clips){const b=await vm.runInContext(`getRecordingBlob(recordings.get(${JSON.stringify(letter)}))`,c);assert(b.size>0);}
 assert.equal(requests,164,'backup fetches file-backed clips only, retaining the local override');
 console.log('Passed: 165 extracted clips match merged source bytes; no startup audio downloads; file playback; lazy backup export; local overrides; all 33/87/78 quiz questions.');
})().catch(e=>{console.error(e);process.exitCode=1});
