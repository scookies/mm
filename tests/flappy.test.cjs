const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),nodes=new Map(),frames=new Map();let frameId=0,clock=0;
function element(){return {value:'',checked:true,disabled:false,hidden:false,textContent:'',attributes:{},children:[],
  classList:{add(){},remove(){},toggle(){}},append(x){this.children.push(x)},replaceChildren(){this.children=[]},
  setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]},focus(){},pause(){},load(){}};}
const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)};
for(const [id,value] of [['scope','all'],['recordSet','i'],['exploreSet','alphabet'],['flappySet','words']])get(id).value=value;
const context={document:{getElementById:get,createElement:element,createElementNS:element},window:{location:{hash:''},addEventListener(){}},Blob,URL,atob,Uint8Array,setTimeout,clearTimeout,
  requestAnimationFrame(fn){const id=++frameId;frames.set(id,fn);return id},cancelAnimationFrame(id){frames.delete(id)},
  Audio:class{pause(){}removeAttribute(){}load(){}async play(){}},indexedDB:{open(){throw Error('test storage')}}};
vm.createContext(context);
for(const file of ['recordings/bundled-recordings.js','app.js','flappy.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const run=code=>vm.runInContext(code,context);
function tick(count=1){for(let i=0;i<count;i++){clock+=50;const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(clock));}}
function heard(position){run(`flappyOptions[${position}].playButton.onclick();audio.onended()`);}
function correct(){return run('flappyOptions.findIndex(o=>soundFor(o.form)===soundFor(flappyDeck[flappyIndex]))');}

get('openFlappyGame').onclick();assert.equal(get('flappyGame').hidden,false);assert.equal(get('memoryGame').hidden,true);assert.equal(get('gamesGallery').hidden,true);
// Every active form has exactly three recorded, distinguishable choices.
for(const set of ['words','alphabet','aa','i']){
  get('flappySet').value=set;
  run(`for(const target of flappyPool()){
    const options=flappyChoiceForms(target,flappyPool());
    if(options.length!==3||!options.includes(target)||new Set(options.map(soundFor)).size!==3||options.some(o=>!availableSounds.has(o)||!isIncludedForm(o)))throw Error('Invalid options for '+target);
  }`);
}
get('flappySet').value='words';get('flappyStart').onclick();
assert.equal(run('flappyRunning'),true);assert.equal(get('flappyChoices').children.length,3);
for(const card of get('flappyChoices').children){
  assert.match(card.children[0].textContent,/Sound [123]/);assert.equal(card.children[1].textContent,'Choose');
  assert.equal(card.children[1].disabled,true);assert(!/[\u1000-\u109f]/.test(JSON.stringify(card.attributes)+card.children.map(c=>c.textContent).join('')),'sound cards must not reveal written answers');
}
assert.equal(run(`chooseFlappySound(${correct()})`),false,'cannot answer before hearing the recording');
const wrong=run('flappyOptions.findIndex(o=>soundFor(o.form)!==soundFor(flappyDeck[0]))');
heard(wrong);assert.equal(run(`audio.src===recordings.get(flappyOptions[${wrong}].form).url`),true,'play exact chosen recording');
assert.equal(run(`chooseFlappySound(${wrong})`),false);assert.equal(run('flappyPhase'),'waiting');assert.match(get('flappyStatus').textContent,/try another card/);
tick(200);assert.equal(run('flappyCleared'),0);assert.equal(run('flappyObstacles[0].x'),155,'poles wait safely for an answer');
assert.equal(get('flappyPoles').children.length,10);
const courseElements=[...get('flappyPoles').children];
let transitions=0;
for(let i=0;i<10;i++){
  const right=correct();heard(right);assert.equal(run(`flappyOptions[${right}].chooseButton.disabled`),false);
  assert(run(`chooseFlappySound(${right})`));assert(!run(`chooseFlappySound(${right})`),'no duplicate scoring');
  assert(run('flappyOptions.every(o=>o.playButton.disabled&&o.chooseButton.disabled)'));
  for(let frame=0;frame<60;frame++){
    const before=JSON.parse(run('JSON.stringify({y:flappyY,index:flappyIndex,x:flappyObstacles.map(o=>o.x)})'));
    tick();
    const after=JSON.parse(run('JSON.stringify({y:flappyY,index:flappyIndex,x:flappyObstacles.map(o=>o.x)})'));
    assert(Math.abs(after.y-before.y)<36,'bird position changes smoothly on every frame');
    for(let j=0;j<10;j++){
      assert(after.x[j]<=before.x[j]&&before.x[j]-after.x[j]<12,'each pole moves left without teleporting');
      assert.strictEqual(get('flappyPoles').children[j],courseElements[j],'pole elements persist throughout the flight');
      if(j)assert(Math.abs(after.x[j]-after.x[j-1]-300)<.000001,'course spacing stays fixed');
    }
    if(after.index!==before.index){
      transitions++;
      assert(Math.abs(after.y-before.y)<.000001,'next word does not reset the bird height');
      assert(after.x[before.index]<5&&after.x[before.index]>-12,'cleared pole remains onscreen and exits naturally');
      assert(after.x[after.index]<305,'next pole approaches as part of the same world');
    }
  }
  assert.equal(run('flappyCleared'),i+1);
}
assert.equal(transitions,9,'all nine between-pole transitions are continuous');
assert.equal(run('flappyPhase'),'complete');assert.equal(run('flappyRunning'),false);assert.equal(frames.size,0);assert.match(get('flappyStatus').textContent,/10 matching sounds/);

// Restart, settings changes, and navigation cancel playback and old callbacks.
get('flappyStart').onclick();run('flappyOptions[0].playButton.onclick()');const oldEnd=run('audio.onended'),oldChoose=run('flappyOptions[0].chooseButton.onclick');
get('flappyStart').onclick();oldEnd();oldChoose();assert(run('flappyOptions.every(o=>!o.heard)'));assert.equal(run('flappyPhase'),'waiting');assert.equal(frames.size,1);
run('flappyOptions[0].playButton.onclick()');const afterExit=run('audio.onended');get('flappyBack').onclick();afterExit();assert.equal(run('flappyRunning'),false);assert.equal(frames.size,0);assert.equal(get('gamesGallery').hidden,false);assert(run('flappyOptions.every(o=>!o.heard)'));
get('openFlappyGame').onclick();get('flappyStart').onclick();run("switchTab('quiz')");assert.equal(run('flappyRunning'),false);assert.equal(frames.size,0);
get('flappySet').value='i';get('flappySet').onchange();assert.equal(get('flappyChoices').hidden,true);get('flappyStart').onclick();assert(run('flappyDeck.every(form=>recordingSets.i.includes(form)&&isIncludedForm(form))'));
get('flappyStop').onclick();assert.equal(frames.size,0);
run("availableSounds.delete(recordingSets.i[0])");get('flappyStart').onclick();assert.equal(run('flappyRunning'),false);assert.match(get('flappyStatus').textContent,/still need recording/);
assert.equal(get('flappyChoices').hidden,true);
console.log('Passed: persistent pole course; continuous position and bird height across all 9 transitions; all 3-sound options; exact audio; retries; 10-pole completion; stale callback cleanup; navigation; missing recordings.');
