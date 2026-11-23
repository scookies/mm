'use strict';
// Keys are representative spoken sounds. All letters in one group are valid answers.
const groups = ['က','ခ','ဂဃ','င','စ','ဆ','ဇဈ','ည','ဋတ','ဌထ','ဍဎဒဓ','ဏန','ပ','ဖ','ဗဘ','မ','ယရ','လဠ','ဝ','သ','ဟ','အ'];
const letters = Array.from('ကခဂဃငစဆဇဈညဋဌဍဎဏတထဒဓနပဖဗဘမယရလဝသဟဠအ');
const representatives = ['က','ခ','ဂ','င','စ','ဆ','ဇ','ည','တ','ထ','ဒ','န','ပ','ဖ','ဗ','မ','ယ','လ','ဝ','သ','ဟ','အ'];
const $ = id => document.getElementById(id);
const shuffle = arr => {const out=[...arr];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
// Bundled native-speaker clips and newer browser recordings supply all playback.
const availableSounds = new Set();
const recordings = new Map();
// These six base consonants use tall AA in this unmodified spelling pattern.
const tallAA = new Set(Array.from('ခဂငဒပဝ'));
const iForms = letter => [letter+'ိ',letter+'ီ',letter+'ီး'];
const aaForms = letter => {const longForm=letter+(tallAA.has(letter)?'ါ':'ာ');return [letter,longForm,longForm+'း'];};
// Curriculum choice: retain these basic letters, but omit their add-on forms in every lesson.
const basicOnlyLetters = new Set(Array.from('ဃဋဌဍဎဠ'));
const isIncludedForm = form => {
  const base=Array.from(form)[0];
  if(form===base)return true;
  if(basicOnlyLetters.has(base))return false;
  // User excludes ဈ only from the I-vowel family (လုံးကြီးတင်).
  return !(base==='ဈ'&&/[ိီ]/.test(form));
};
const ignoredForms = new Set(letters.flatMap(aaForms).filter(form=>!isIncludedForm(form)));
const recordingSets = {aa:letters.flatMap(aaForms).filter(isIncludedForm),i:letters.flatMap(iForms).filter(isIncludedForm),alphabet:letters};
// Preserve older recordings and backups, including forms omitted from lessons.
const recordingKeys = new Set(letters.flatMap(l=>[...aaForms(l),...iForms(l)]));
let recordingItems = [];
const selectedRecordingSet = () => recordingSets[$('recordSet').value] || recordingSets.i;
function refreshRecordingQueue(){
  recordingItems=selectedRecordingSet().filter(l=>!$('recordMissing').checked||!recordings.has(l));
  recordIndex=Math.min(recordIndex,Math.max(0,recordingItems.length-1));
  showRecordingLetter();updateQuizStatus();
}
const practicePool = () => recordingSets[$('scope').value] || ($('scope').value==='first'?letters.slice(0,5):letters);
const familyForms = form => /[ိီ]/.test(form)?iForms(Array.from(form)[0]):aaForms(Array.from(form)[0]);
function updateQuizStatus(){
  const pool=practicePool(),missing=pool.filter(form=>!availableSounds.has(form));
  $('quizStatus').textContent=missing.length?`${missing.length} sounds still need recording for this lesson. Open Record missing sounds first.`:`All ${pool.length} sounds for this lesson are ready.`;
}
$('scope').onchange=updateQuizStatus;
const soundFor = form => {
  const base=Array.from(form)[0],representative=representatives[groups.findIndex(g=>g.includes(base))];
  if(form===base)return representative;
  return representative+form.slice(base.length).replace(/ါ/g,'ာ');
};
const matchingForms = form => {
  const group=groups.find(g=>g.includes(Array.from(form)[0]));
  if(!group)return [form];
  const forms=familyForms(form),stage=forms.indexOf(form),makeForms=/[ိီ]/.test(form)?iForms:aaForms;
  return Array.from(group,l=>makeForms(l)[stage]).filter(isIncludedForm);
};
let deck=[], index=0, score=0, missed=[], answered=false, unlocked=false, playback=0;
const audio=new Audio();audio.preload='none';
function stopAudio(){playback++;audio.pause();audio.removeAttribute('src');audio.load();}
async function play(letter,status,onHeard){stopAudio();if(!availableSounds.has(letter)){status.textContent='This sound has not been recorded yet. Add it in Record missing sounds.';return;}const request=playback;status.textContent='Loading sound…';audio.src=recordings.get(letter).url;audio.onended=()=>{if(request===playback){status.textContent='Listen again whenever you like.';onHeard?.();}};audio.onerror=()=>{if(request===playback)status.textContent='Sound could not load. Check your connection, then tap to retry.';};try{await audio.play();if(request===playback)status.textContent='Listening…';}catch(e){if(request===playback)status.textContent='Sound could not play. Check your connection or try another browser, then tap again.';}}
function switchTab(view){if(recordBusy)return;if(view!=='games'&&typeof stopFlappy==='function')stopFlappy();stopAudio();for(const name of ['quiz','explore','record','games']){$(name).hidden=name!==view;$(name+'Tab').classList.toggle('active',name===view);}}
function start(pool){stopAudio();const source=pool||practicePool();const missing=source.filter(l=>!availableSounds.has(l));if(missing.length){$('quizStatus').textContent='Saved recordings are missing for: '+missing.join(' ') + '. Record these in Record sounds, or use the browser where you saved them.';return;}deck=shuffle([...new Set(source)]);$('progress').max=deck.length;index=0;score=0;missed=[];$('setup').hidden=true;$('results').hidden=true;$('question').hidden=false;render();}
function render(){stopAudio();answered=false;unlocked=false;$('round').textContent=`QUESTION ${index+1} OF ${deck.length}`;$('score').textContent=`${score} correct`;$('progress').value=index;$('feedback').textContent='';$('next').hidden=true;$('audioStatus').textContent='Play the sound to unlock the answers.';$('choices').replaceChildren();const target=deck[index],forms=familyForms(target).filter(isIncludedForm),pool=['aa','i'].includes($('scope').value)?(forms.length>1?forms:letters):practicePool();const options=shuffle([target,...shuffle([...new Map(shuffle(pool).filter(l=>soundFor(l)!==soundFor(target)).map(l=>[soundFor(l),l])).values()]).slice(0,3)]);for(const letter of options){const button=document.createElement('button');button.textContent=letter;button.lang='my';button.disabled=true;button.onclick=()=>answer(letter);$('choices').append(button);}}
function answer(letter){if(answered||!unlocked)return;answered=true;const right=soundFor(letter)===soundFor(deck[index]);if(right)score++;else missed.push(deck[index]);for(const button of $('choices').children){button.disabled=true;if(soundFor(button.textContent)===soundFor(deck[index]))button.classList.add('correct');else if(button.textContent===letter)button.classList.add('wrong');}const matches=matchingForms(deck[index]);$('feedback').textContent=right?`That’s right! ${matches.length>1?matches.join(' and ')+' share this sound.':''}`:`This sound matches ${matches.join(' / ')}. Listen again, then keep going.`;$('score').textContent=`${score} correct`;$('next').hidden=false;$('next').textContent=index===deck.length-1?'See results →':'Next sound →';$('next').focus();}
$('play').onclick=()=>play(deck[index],$('audioStatus'),()=>{unlocked=true;if(!answered)for(const button of $('choices').children)button.disabled=false;});
$('next').onclick=()=>{if(!answered)return;index++;if(index<deck.length){render();$('play').focus();}else{stopAudio();$('question').hidden=true;$('results').hidden=false;$('progress').value=deck.length;$('round').textContent='PRACTICE COMPLETE';$('summary').textContent=`You matched ${score} of ${deck.length} sounds. ${missed.length?'Let’s give the tricky ones another listen.':'Ready for another round?'}`;$('review').textContent=[...new Set(missed)].join(' ');$('retry').hidden=!missed.length;}};
$('start').onclick=()=>start();$('again').onclick=()=>start();$('retry').onclick=()=>start([...new Set(missed)]);
$('exit').onclick=()=>{stopAudio();$('question').hidden=true;$('setup').hidden=false;$('round').textContent='LET’S BEGIN';$('score').textContent='0 correct';$('progress').value=0;};
$('quizTab').onclick=()=>switchTab('quiz');$('exploreTab').onclick=()=>switchTab('explore');$('recordTab').onclick=()=>switchTab('record');
$('gamesTab').onclick=()=>{if(!recordBusy){showGamesGallery();switchTab('games');}};
function renderExplore(){
  stopAudio();$('alphabet').replaceChildren();$('exploreStatus').textContent='Tap a form to hear its recording.';
  const pool=recordingSets[$('exploreSet').value]||letters;
  for(const letter of pool){const button=document.createElement('button');button.textContent=letter;button.lang='my';button.setAttribute('aria-label',`Play sound for ${letter}`);button.onclick=()=>play(letter,$('exploreStatus'));$('alphabet').append(button);}
}
$('exploreSet').onchange=renderExplore;
renderExplore();

function showGamesGallery(){
  if(typeof stopFlappy==='function')stopFlappy();
  $('flappyGame').hidden=true;
  stopAudio();$('gamesGallery').hidden=false;$('memoryGame').hidden=true;
  $('openMemoryGame').focus();
}
$('openMemoryGame').onclick=()=>{
  if(typeof stopFlappy==='function')stopFlappy();$('flappyGame').hidden=true;
  $('gamesGallery').hidden=true;$('memoryGame').hidden=false;
  $('memoryHeading').focus();
};
$('backToGames').onclick=showGamesGallery;

// Memory pairs match spelling, even when distinct letters share a spoken sound.
const memorySets = [
  {id:'memoryAlphabet',forms:recordingSets.alphabet},
  {id:'memoryAA',forms:recordingSets.aa.filter(form=>form!==Array.from(form)[0])},
  {id:'memoryI',forms:recordingSets.i}
];
let memoryCards=[],memoryOpen=[],memoryMatches=0,memoryTurns=0,memoryTimer=null;
const selectedMemorySets = () => memorySets.filter(set=>$(set.id).checked);
function resetMemory(){
  clearTimeout(memoryTimer);memoryTimer=null;
  memoryCards=[];memoryOpen=[];memoryMatches=0;memoryTurns=0;
  $('memoryBoard').replaceChildren();$('memoryRound').hidden=true;
  $('memoryAudioStatus').textContent='';
}
function updateMemorySelection(){
  stopAudio();resetMemory();
  const sets=selectedMemorySets();
  $('memoryStart').disabled=!sets.length;
  $('memoryStart').textContent='Start memory game →';
  $('memorySelectionStatus').textContent=sets.length?`${sets.length} ${sets.length===1?'group':'groups'} selected. Each round has 6 pairs.`:'Select at least one practice group.';
}
function startMemory(){
  const sets=selectedMemorySets();
  if(!sets.length){updateMemorySelection();return;}
  const missing=sets.flatMap(set=>set.forms).filter(form=>!availableSounds.has(form));
  if(missing.length){$('memorySelectionStatus').textContent=`${missing.length} sounds still need recording for these groups. Open Record missing sounds first.`;return;}
  stopAudio();resetMemory();
  // Seed one form from each chosen group so every selection appears in the round.
  const chosen=sets.map(set=>shuffle(set.forms)[0]);
  const rest=shuffle([...new Set(sets.flatMap(set=>set.forms))].filter(form=>!chosen.includes(form)));
  chosen.push(...rest.slice(0,6-chosen.length));
  memoryCards=shuffle([...chosen,...chosen]).map(form=>({form,matched:false,button:null}));
  memoryCards.forEach((card,position)=>{
    const button=document.createElement('button');
    button.type='button';button.className='memory-card';button.textContent='✳';
    button.setAttribute('aria-label',`Card ${position+1}, face down`);
    button.onclick=()=>flipMemoryCard(position);card.button=button;
    $('memoryBoard').append(button);
  });
  $('memoryPairs').textContent='0 of 6 pairs';$('memoryTurns').textContent='0 turns';
  $('memoryStatus').textContent='Flip two cards to find the same written form.';
  $('memorySelectionStatus').textContent=`Playing with ${sets.length} selected ${sets.length===1?'group':'groups'}.`;
  $('memoryStart').textContent='Start a new round →';$('memoryRound').hidden=false;
}
function flipMemoryCard(position){
  const card=memoryCards[position];
  if(!card||card.matched||memoryOpen.includes(position)||memoryOpen.length===2)return;
  card.button.textContent=card.form;card.button.lang='my';
  card.button.classList.add('revealed');
  card.button.setAttribute('aria-label',`Card ${position+1}: ${card.form}`);
  memoryOpen.push(position);play(card.form,$('memoryAudioStatus'));
  if(memoryOpen.length===1){$('memoryStatus').textContent='Now find the matching card.';return;}
  memoryTurns++;$('memoryTurns').textContent=`${memoryTurns} ${memoryTurns===1?'turn':'turns'}`;
  const pair=memoryOpen.map(i=>memoryCards[i]);
  if(pair[0].form===pair[1].form){
    for(const match of pair){
      match.matched=true;match.button.disabled=true;match.button.classList.add('matched');
      match.button.setAttribute('aria-label',`Matched ${match.form}`);
    }
    memoryOpen=[];memoryMatches++;$('memoryPairs').textContent=`${memoryMatches} of 6 pairs`;
    $('memoryStatus').textContent=memoryMatches===6?`You found all 6 pairs in ${memoryTurns} turns! Start a new round to play again.`:'A match! Find another pair.';
  }else{
    $('memoryStatus').textContent='Different forms. Remember where they are!';
    memoryTimer=setTimeout(()=>{
      for(const i of memoryOpen){
        const button=memoryCards[i].button;button.textContent='✳';button.lang='en';
        button.classList.remove('revealed');button.setAttribute('aria-label',`Card ${i+1}, face down`);
      }
      memoryOpen=[];memoryTimer=null;$('memoryStatus').textContent='Try another pair.';
    },1400);
  }
}
for(const set of memorySets)$(set.id).onchange=updateMemorySelection;
$('memoryStart').onclick=startMemory;

// Each saved clip belongs to its own letter; never substitute a different letter's recording.
let recordIndex=0, recorder=null, microphone=null, pendingClip=null, previewURL=null;
let recordBusy=false, database=null;
const recordStatus = message => { $('recordStatus').textContent=message; };
function setBusy(busy){
  recordBusy=busy;
  for(const id of ['recordStart','recordPrevious','recordNext','recordSet','recordMissing','recordImport','recordExport','quizTab','exploreTab','recordTab','gamesTab']) $(id).disabled=busy;
  $('recordSave').disabled=busy||!pendingClip;
  $('recordStart').disabled=busy||!database||!recordingItems.length;
  $('recordPrevious').disabled=busy||recordIndex===0||!recordingItems.length;
  $('recordNext').disabled=busy||recordIndex>=recordingItems.length-1;
  $('recordExport').disabled=busy||recordings.size===0;
}
function clearPreview(){
  $('recordPreview').pause();$('recordPreview').removeAttribute('src');$('recordPreview').load();$('recordPreview').hidden=true;
  if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;pendingClip=null;
}
function showRecordingLetter(){
  clearPreview();
  $('recordInstructions').textContent=$('recordSet').value==='i'?'Record ကိ၊ ကီ၊ ကီး, then the same three forms for each included consonant. Say the syllable, without naming the signs. Your existing recordings are kept.':($('recordSet').value==='aa'?'Record the က၊ ကာ၊ ကား pattern. Existing sounds are reused.':'Record the basic letter reading sounds, without their full letter names.');
  const selected=selectedRecordingSet(),done=selected.filter(l=>recordings.has(l)).length;
  $('recordCount').textContent=`${done} of ${selected.length} sounds saved for this set · ${selected.length-done} still needed`;
  const letter=recordingItems[recordIndex];
  $('recordLetter').textContent=letter||'✓';
  $('recordPosition').textContent=letter?`Sound ${recordIndex+1} of ${recordingItems.length}`:'This recording set is complete';
  if(!letter){
    recordStatus('All sounds in this set are saved. Download a backup, or uncheck the filter to review and rerecord.');
  }else if(recordings.has(letter)){
    $('recordPreview').src=recordings.get(letter).url;$('recordPreview').hidden=false;
    recordStatus('Saved recording. Listen below, or record again to replace it.');
  }else recordStatus('Ready. Tap Record and say the complete reading sound shown above.');
  $('recordStart').textContent=recordings.has(letter)?'Record again':'Record';
  setBusy(false);
}
$('recordSet').onchange=()=>{if(!recordBusy){recordIndex=0;refreshRecordingQueue();}};
$('recordMissing').onchange=()=>{if(!recordBusy){recordIndex=0;refreshRecordingQueue();}};
function saveRecords(entries){return new Promise((resolve,reject)=>{
  const tx=database.transaction('clips','readwrite');
  for(const entry of entries)tx.objectStore('clips').put(entry);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Save cancelled'));
});}
function installRecording(letter,blob){
  const oldURL=recordings.get(letter)?.url;
  if(oldURL?.startsWith('blob:'))URL.revokeObjectURL(oldURL);
  recordings.set(letter,{blob,url:URL.createObjectURL(blob)});availableSounds.add(letter);
}
$('recordStart').onclick=async()=>{
  if(recordBusy||!database||!recordingItems.length)return;
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){recordStatus('Microphone recording is unavailable here. Open this app on localhost or HTTPS in a browser with microphone support.');return;}
  setBusy(true);stopAudio();recordStatus('Requesting microphone access…');
  try{
    microphone=await navigator.mediaDevices.getUserMedia({audio:true});
    const chunks=[];
    recorder=new MediaRecorder(microphone);
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onerror=()=>{
      microphone?.getTracks().forEach(t=>t.stop());
      $('recordStop').hidden=true;$('recordStart').hidden=false;setBusy(false);
      recordStatus('Recording failed. Your previously saved sound is unchanged. Please try again.');
    };
    recorder.onstop=()=>{
      microphone?.getTracks().forEach(t=>t.stop());microphone=null;
      $('recordStop').hidden=true;$('recordStart').hidden=false;
      clearPreview();
      const blob=new Blob(chunks,{type:recorder.mimeType||chunks[0]?.type||'audio/webm'});
      if(blob.size){pendingClip=blob;previewURL=URL.createObjectURL(blob);$('recordPreview').src=previewURL;$('recordPreview').hidden=false;recordStatus('Listen to your recording. Save it, or tap Record to try again.');}
      else recordStatus('No sound was captured. Please record again.');
      setBusy(false);
    };
    recorder.start();$('recordStart').hidden=true;$('recordStop').hidden=false;
    recordStatus('Recording… Say the reading sound, then tap Stop.');$('recordStop').focus();
  }catch(error){microphone?.getTracks().forEach(t=>t.stop());microphone=null;setBusy(false);recordStatus(error.name==='NotAllowedError'?'Microphone access was denied. Allow it in your browser’s site settings, then try again.':'Could not start the microphone. Check that it is connected and try again.');}
};
$('recordStop').onclick=()=>{if(recorder?.state==='recording'){recorder.stop();$('recordStop').hidden=true;recordStatus('Preparing your recording…');}};
$('recordSave').onclick=async()=>{
  if(!pendingClip||recordBusy)return;
  const letter=recordingItems[recordIndex],blob=pendingClip;setBusy(true);
  try{
    await saveRecords([{letter,blob}]);installRecording(letter,blob);
    if(!$('recordMissing').checked&&recordIndex<recordingItems.length-1)recordIndex++;
    refreshRecordingQueue();
    if(recordingItems.length)recordStatus(`Saved ${letter}. Ready for ${recordingItems[recordIndex]}.`);
  }catch(error){setBusy(false);recordStatus('Could not save the recording. Keep this page open and try again; browser storage may be full.');}
};
$('recordPrevious').onclick=()=>{if(!recordBusy&&recordIndex>0){recordIndex--;showRecordingLetter();}};
$('recordNext').onclick=()=>{if(!recordBusy&&recordIndex<recordingItems.length-1){recordIndex++;showRecordingLetter();}};
function blobData(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});}
// File-backed clips are fetched only for backup export, never during startup.
async function getRecordingBlob(clip){
  if(clip.blob)return clip.blob;
  const response=await fetch(clip.url);
  if(!response.ok)throw new Error('Could not load audio for backup');
  const bytes=await response.arrayBuffer();
  clip.blob=new Blob([bytes],{type:clip.type||'audio/webm'});
  return clip.blob;
}
$('recordExport').onclick=async()=>{
  setBusy(true);
  try{
    const clips=[];for(const [letter,clip] of recordings)clips.push({letter,data:await blobData(await getRecordingBlob(clip))});
    const url=URL.createObjectURL(new Blob([JSON.stringify({format:'little-lotus-recordings',version:1,clips})],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='myanmar-reading-recordings.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    recordStatus('Backup download requested. Keep this file to restore your sounds on another browser or device.');
  }catch(error){recordStatus('Could not prepare the backup. Open the app on localhost or HTTPS and try again.');}finally{setBusy(false);}
};
function decodeClips(clips){
  const entries=[],seen=new Set();
  for(const clip of clips){
    if(!recordingKeys.has(clip.letter)||seen.has(clip.letter)||typeof clip.data!=='string'||!/^data:audio\/[^,]+;base64,/.test(clip.data))throw new Error('Invalid clip');
    const split=clip.data.indexOf(','),type=clip.data.slice(5,clip.data.indexOf(';')),raw=atob(clip.data.slice(split+1));
    if(!raw.length)throw new Error('Empty clip');
    entries.push({letter:clip.letter,blob:new Blob([Uint8Array.from(raw,c=>c.charCodeAt(0))],{type})});seen.add(clip.letter);
  }
  return entries;
}
// Load the distributed recordings first; browser-saved replacements take priority below.
if(window.LITTLE_LOTUS_RECORDINGS){
  const bundle=window.LITTLE_LOTUS_RECORDINGS;
  if(bundle.format==='little-lotus-recordings'&&bundle.version===1){
    for(const {letter,blob} of decodeClips(bundle.clips))installRecording(letter,blob);
  }else if(bundle.format==='little-lotus-audio-index'&&bundle.version===1){
    for(const clip of bundle.clips){
      if(!recordingKeys.has(clip.letter)||typeof clip.url!=='string'||!/^recordings\/audio\/[a-z]+\/[0-9a-f-]+\.webm$/.test(clip.url))continue;
      recordings.set(clip.letter,{url:clip.url,type:clip.type,blob:null});availableSounds.add(clip.letter);
    }
  }
}
$('recordImport').onchange=async e=>{
  const file=e.target.files[0];if(!file||recordBusy)return;setBusy(true);
  try{
    const backup=JSON.parse(await file.text());
    if(backup.format!=='little-lotus-recordings'||backup.version!==1||!Array.isArray(backup.clips)||backup.clips.length>recordingKeys.size)throw new Error('Invalid backup');
    const entries=decodeClips(backup.clips);
    await saveRecords(entries);for(const {letter,blob} of entries)installRecording(letter,blob);
    refreshRecordingQueue();recordStatus(`Restored ${entries.length} recordings.`);
  }catch(error){setBusy(false);recordStatus('Could not restore this file. Choose a recording backup downloaded from this app.');}finally{e.target.value='';}
};
(async()=>{
  try{
    database=await new Promise((resolve,reject)=>{
      const request=indexedDB.open('little-lotus-audio',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('clips',{keyPath:'letter'});
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
    const entries=await new Promise((resolve,reject)=>{const request=database.transaction('clips').objectStore('clips').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    for(const {letter,blob} of entries)if(recordingKeys.has(letter)&&blob instanceof Blob)installRecording(letter,blob);
    recordIndex=0;refreshRecordingQueue();$('start').disabled=false;updateQuizStatus();
  }catch(error){$('start').disabled=false;refreshRecordingQueue();$('quizStatus').textContent=letters.every(l=>availableSounds.has(l))?'Bundled sounds are ready. Browser-saved replacements could not be loaded.':'Could not load saved sounds.';recordStatus('Bundled sounds can play, but browser storage is unavailable for saving new recordings.');}
})();
window.addEventListener('pagehide',()=>{microphone?.getTracks().forEach(t=>t.stop());});

// Allow a direct link to the recording workspace.
if(window.location.hash==='#record')switchTab('record');
if(window.location.hash==='#games')switchTab('games');
