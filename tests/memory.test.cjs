const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const nodes=new Map(),timers=new Map();let timerId=0;
function element(){
  const classes=new Set();
  return {value:'',checked:false,disabled:false,hidden:false,textContent:'',children:[],attributes:{},
    classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),toggle(name,on){on?classes.add(name):classes.delete(name)},contains:name=>classes.has(name)},
    append(child){this.children.push(child)},replaceChildren(){this.children=[]},
    setAttribute(name,value){this.attributes[name]=value},removeAttribute(name){delete this.attributes[name]},pause(){},load(){},focus(){}};
}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},createElement:element};
for(const [id,value] of [['recordSet','i'],['scope','all'],['exploreSet','alphabet']])document.getElementById(id).value=value;
document.getElementById('recordMissing').checked=true;document.getElementById('memoryAlphabet').checked=true;
document.getElementById('memoryGame').hidden=true;
const context={document,Blob,URL,atob,Uint8Array,
  setTimeout(fn){const id=++timerId;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)},
  window:{location:{hash:'#games'},addEventListener(){}},
  Audio:class{pause(){}removeAttribute(){}load(){}async play(){}},
  indexedDB:{open(){throw new Error('Storage unavailable in test')}}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'recordings/bundled-recordings.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context);
const run=code=>vm.runInContext(code,context),get=id=>document.getElementById(id);
const ids=['memoryAlphabet','memoryAA','memoryI'];
function select(mask){ids.forEach((id,i)=>get(id).checked=Boolean(mask&(1<<i)));get('memoryAlphabet').onchange();}
function flushTimers(){for(const [id,fn] of [...timers]){timers.delete(id);fn();}}
function cards(){return JSON.parse(run('JSON.stringify(memoryCards.map(c=>({form:c.form,matched:c.matched})))'));}

assert.equal(get('games').hidden,false,'direct game link opens the Games tab');
assert.equal(get('quiz').hidden,true);
assert.equal(get('memoryGame').hidden,true,'Games opens the gallery before showing a game');
get('openMemoryGame').onclick();
assert.equal(get('gamesGallery').hidden,true);assert.equal(get('memoryGame').hidden,false);
get('backToGames').onclick();
assert.equal(get('gamesGallery').hidden,false);assert.equal(get('memoryGame').hidden,true);
get('openMemoryGame').onclick();
assert.deepEqual(JSON.parse(run('JSON.stringify(memorySets.map(s=>s.forms.length))')),[33,54,78]);
for(let mask=1;mask<8;mask++){
  select(mask);get('memoryStart').onclick();
  const forms=cards().map(c=>c.form),counts=new Map();
  assert.equal(forms.length,12);assert.equal(get('memoryBoard').children.length,12);
  for(const form of forms)counts.set(form,(counts.get(form)||0)+1);
  assert.equal(counts.size,6);assert([...counts.values()].every(n=>n===2));
  for(let i=0;i<ids.length;i++){
    const pool=JSON.parse(run(`JSON.stringify(memorySets[${i}].forms)`));
    if(mask&(1<<i))assert(forms.some(f=>pool.includes(f)),'every checked group appears');
  }
  assert(forms.every(f=>run(`selectedMemorySets().some(s=>s.forms.includes(${JSON.stringify(f)}))`)));
  for(const button of get('memoryBoard').children){assert.equal(button.textContent,'✳');assert.match(button.attributes['aria-label'],/face down/);}
}

// No choices cannot start a round; reselecting enables play again.
select(0);assert.equal(get('memoryStart').disabled,true);get('memoryStart').onclick();assert.equal(cards().length,0);
select(7);assert.equal(get('memoryStart').disabled,false);get('memoryStart').onclick();
const forms=cards().map(c=>c.form),other=forms.findIndex(f=>f!==forms[0]);
run('flipMemoryCard(0)');
assert.equal(run('audio.src'),run(`recordings.get(${JSON.stringify(forms[0])}).url`),'reveal uses exact form recording');
run('flipMemoryCard(0)');assert.equal(run('memoryOpen.length'),1,'same card cannot match itself');
run(`flipMemoryCard(${other})`);assert.equal(run('memoryTurns'),1);
const third=forms.findIndex((_,i)=>i!==0&&i!==other);
run(`flipMemoryCard(${third})`);assert.equal(run('memoryOpen.length'),2,'third flip blocked during mismatch');
flushTimers();assert.equal(run('memoryOpen.length'),0);
assert.equal(get('memoryBoard').children[0].textContent,'✳');
assert.equal(get('memoryBoard').children[0].classList.contains('revealed'),false);

// Reset cancels mismatch callbacks so old rounds cannot affect a new board.
run(`flipMemoryCard(0);flipMemoryCard(${other})`);assert.equal(timers.size,1);
get('memoryStart').onclick();assert.equal(timers.size,0);flushTimers();assert.equal(run('memoryTurns'),0);
const round=cards();
for(const form of new Set(round.map(c=>c.form))){
  const pair=round.flatMap((card,i)=>card.form===form?[i]:[]);
  pair.forEach(i=>run(`flipMemoryCard(${i})`));
  pair.forEach(i=>assert.equal(get('memoryBoard').children[i].disabled,true));
  run(`flipMemoryCard(${pair[0]})`);
}
assert.equal(run('memoryMatches'),6);assert.equal(run('memoryTurns'),6);
assert.match(get('memoryStatus').textContent,/all 6 pairs in 6 turns/);
get('backToGames').onclick();get('openMemoryGame').onclick();
assert.equal(run('memoryMatches'),6,'returning from gallery preserves the current round');
get('gamesTab').onclick();assert.equal(get('gamesGallery').hidden,false);assert.equal(get('memoryGame').hidden,true);
get('openMemoryGame').onclick();
select(2);assert.equal(get('memoryRound').hidden,true);assert.equal(cards().length,0);

// Two different spellings do not match merely because they share a sound.
select(1);get('memoryStart').onclick();
run("memoryCards[0].form='ဇ';memoryCards[1].form='ဈ'");
assert.equal(run("soundFor('ဇ')===soundFor('ဈ')"),true);
run('flipMemoryCard(0);flipMemoryCard(1)');assert.equal(run('memoryMatches'),0);
select(4);assert.equal(timers.size,0,'changing groups cancels the pending mismatch');

// The existing curriculum omissions apply to both vowel groups.
assert.equal(run("memorySets[1].forms.some(f=>basicOnlyLetters.has(Array.from(f)[0]))"),false);
assert.equal(run("memorySets[2].forms.some(f=>basicOnlyLetters.has(Array.from(f)[0])||f.startsWith('ဈ'))"),false);
assert.equal(run("memorySets[1].forms.includes('ခါ')&&memorySets[1].forms.includes('ခါး')"),true);
select(1);run("availableSounds.delete('က')");get('memoryStart').onclick();
assert.equal(cards().length,0);assert.match(get('memorySelectionStatus').textContent,/still need recording/);
run("setBusy(true)");assert.equal(get('gamesTab').disabled,true);
console.log('Passed: all 7 checkbox combinations; exact audio; 6 pairs; reveal/mismatch/match/completion; restart timers; curriculum exclusions; missing clips; recording lock.');
