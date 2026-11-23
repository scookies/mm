'use strict';
// Every sound card plays its exact native-speaker recording.
const flappyWords=['ကား','ငါး','ဆီ','ဘာ','လာ','သား'];
const flappyPool=()=> $('flappySet').value==='words'?flappyWords:(recordingSets[$('flappySet').value]||letters);
let flappyRunning=false,flappyDeck=[],flappyIndex=0,flappyCleared=0,flappyPhase='idle',flappyOptions=[];
let flappyY=165,flappyFlight=0,flappyFrame=null,flappyLast=null,flappySession=0;
let flappyObstacles=[],flappyHoverY=165,flappyLiftFrom=165,flappyScenery=0,flappyTime=0,flappySpeed=0;
function lockFlappyCards(){
  for(const card of flappyOptions){card.playButton.disabled=true;card.chooseButton.disabled=true;}
}
function stopFlappy(message){
  flappySession++;flappyRunning=false;
  if(flappyFrame!==null)cancelAnimationFrame(flappyFrame);
  flappyFrame=null;flappyLast=null;stopAudio();lockFlappyCards();
  $('flappyStop').disabled=true;$('flappyStart').textContent='Start →';
  if(message)$('flappyStatus').textContent=message;
}
function drawFlappy(){
  $('flappyBird').setAttribute('transform',`translate(88 ${flappyY.toFixed(1)})`);
  $('flappyWing').setAttribute('transform',`rotate(${Math.sin(flappyTime*13)*16} -8 7)`);
  $('flappyClouds').setAttribute('transform',`translate(${-flappyScenery%480} 0)`);
  $('flappyGround').setAttribute('patternTransform',`translate(${-flappyScenery*3%24} 0)`);
  for(const pole of flappyObstacles)pole.element.setAttribute('transform',`translate(${pole.x.toFixed(1)} 0)`);
}
function createFlappyCourse(){
  $('flappyPoles').replaceChildren();
  const svg=(tag,attributes)=>{
    const element=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [name,value] of Object.entries(attributes))element.setAttribute(name,value);
    return element;
  };
  // All ten poles belong to one world. They keep their positions as prompts change.
  flappyObstacles=Array.from({length:10},(_,i)=>{
    const gap=126+Math.random()*54,element=svg('g',{}),top=gap-60,bottom=gap+60;
    for(const attributes of [
      {width:58,height:top},{y:bottom,width:58,height:280-bottom},
      {x:-5,y:top-12,width:68,height:14,rx:3},{x:-5,y:bottom,width:68,height:14,rx:3}
    ])element.append(svg('rect',attributes));
    $('flappyPoles').append(element);return {x:440+i*300,gap,element};
  });
}
function flappyChoiceForms(target,pool){
  // Vowel lessons contrast the same consonant's forms when all three are included.
  const family=familyForms(target).filter(isIncludedForm);
  const preferred=['aa','i'].includes($('flappySet').value)&&family.length===3?family:pool;
  const distractors=new Map();
  for(const form of shuffle(preferred)){
    if(availableSounds.has(form)&&soundFor(form)!==soundFor(target))distractors.set(soundFor(form),form);
  }
  return shuffle([target,...shuffle([...distractors.values()]).slice(0,2)]);
}
function renderFlappyCards(){
  const session=flappySession,prompt=flappyIndex;
  $('flappyChoices').replaceChildren();$('flappyChoices').hidden=false;
  flappyOptions=flappyChoiceForms(flappyDeck[flappyIndex],flappyPool()).map((form,position)=>{
    const card=document.createElement('div');card.className='flappy-sound-card';
    const playButton=document.createElement('button');playButton.type='button';playButton.className='flappy-sound-play';
    playButton.textContent=`♪ Sound ${position+1}`;playButton.setAttribute('aria-label',`Play sound ${position+1}`);
    const chooseButton=document.createElement('button');chooseButton.type='button';chooseButton.className='flappy-sound-choose';
    chooseButton.textContent='Choose';chooseButton.setAttribute('aria-label',`Choose sound ${position+1}`);chooseButton.disabled=true;
    const option={form,heard:false,wrong:false,card,playButton,chooseButton};
    playButton.onclick=()=>{
      if(!flappyRunning||flappyPhase!=='waiting'||session!==flappySession||prompt!==flappyIndex)return;
      play(form,$('flappyAudioStatus'),()=>{
        if(!flappyRunning||flappyPhase!=='waiting'||session!==flappySession||prompt!==flappyIndex)return;
        option.heard=true;chooseButton.disabled=option.wrong;
      });
    };
    chooseButton.onclick=()=>{if(session===flappySession&&prompt===flappyIndex)chooseFlappySound(position);};
    card.append(playButton);card.append(chooseButton);$('flappyChoices').append(card);return option;
  });
}
function nextFlappyPrompt(){
  stopAudio();flappyPhase='waiting';flappyHoverY=flappyY;flappyFlight=0;
  $('flappyWord').textContent=flappyDeck[flappyIndex];$('flappyAudioStatus').textContent='';
  $('flappyStatus').textContent='Listen to the cards. Choose the sound that matches the word.';
  $('flappyScene').setAttribute('aria-label','Bird flying toward the next pole. Choose a matching sound to pass it.');
  renderFlappyCards();drawFlappy();
}
function flappyTick(now){
  if(!flappyRunning)return;
  const dt=flappyLast===null?0:Math.min((now-flappyLast)/1000,.05);flappyLast=now;
  flappyTime+=dt;flappyScenery+=dt*15;
  const pole=flappyObstacles[flappyIndex];
  const desiredSpeed=flappyPhase==='flying'?230:85;
  flappySpeed+=(desiredSpeed-flappySpeed)*Math.min(1,dt*5);
  let distance=flappySpeed*dt;
  if(flappyPhase==='waiting'){
    distance=Math.min(distance,Math.max(0,pole.x-155));
    const hover=flappyHoverY+Math.sin(flappyTime*4)*3;
    flappyY+=(hover-flappyY)*Math.min(1,dt*5);
  }else if(flappyPhase==='flying'){
    flappyFlight+=dt;
    const lift=Math.min(flappyFlight/.45,1);
    flappyY=flappyLiftFrom+(pole.gap-flappyLiftFrom)*(1-Math.pow(1-lift,3));
    // Keep a safe approach while aligning with the gap, without resetting the world.
    if(lift<1)distance=Math.min(distance,Math.max(0,pole.x-155));
  }
  for(const obstacle of flappyObstacles)obstacle.x-=distance;
  if(flappyPhase==='flying'){
    if(pole.x<5){
      flappyCleared++;$('flappyScore').textContent=`${flappyCleared} of 10 poles`;
      if(flappyCleared===10){
        stopFlappy('You did it! 10 matching sounds and 10 clear flights. Start again to keep playing.');
        flappyPhase='complete';drawFlappy();return;
      }
      flappyIndex++;nextFlappyPrompt();
    }
  }
  drawFlappy();flappyFrame=requestAnimationFrame(flappyTick);
}
function startFlappy(){
  stopFlappy();$('flappyChoices').replaceChildren();$('flappyChoices').hidden=true;flappyOptions=[];
  const pool=flappyPool(),missing=pool.filter(form=>!availableSounds.has(form));
  if(missing.length){$('flappyStatus').textContent=`${missing.length} sounds still need recording for this set. Open Record missing sounds first.`;return;}
  if(new Set(pool.map(soundFor)).size<3){$('flappyStatus').textContent='This set needs at least three different recorded sounds.';return;}
  flappyDeck=[];while(flappyDeck.length<10){
    const round=shuffle(pool);
    if(round[0]===flappyDeck[flappyDeck.length-1])round.push(round.shift());
    flappyDeck.push(...round);
  }
  flappyIndex=0;flappyCleared=0;flappyRunning=true;flappyLast=null;
  flappyY=180;flappyHoverY=180;flappyLiftFrom=180;flappyScenery=0;flappyTime=0;flappySpeed=0;
  createFlappyCourse();
  $('flappyScore').textContent='0 of 10 poles';$('flappyStart').textContent='Restart →';$('flappyStop').disabled=false;
  nextFlappyPrompt();flappyFrame=requestAnimationFrame(flappyTick);
}
function chooseFlappySound(position){
  const option=flappyOptions[position];
  if(!flappyRunning||flappyPhase!=='waiting'||!option?.heard||option.wrong)return false;
  if(soundFor(option.form)!==soundFor(flappyDeck[flappyIndex])){
    option.wrong=true;option.chooseButton.disabled=true;option.card.classList.add('wrong');
    option.chooseButton.textContent='Try another';
    $('flappyStatus').textContent='That sound does not match. Listen again and try another card. Your bird will wait.';return false;
  }
  stopAudio();flappyPhase='flying';flappyFlight=0;flappyLiftFrom=flappyY;lockFlappyCards();
  option.card.classList.add('correct');option.chooseButton.textContent='Correct!';
  $('flappyAudioStatus').textContent='';$('flappyStatus').textContent='Correct sound! Up and through the poles!';
  $('flappyScene').setAttribute('aria-label','Correct sound: bird flying through the gap');return true;
}
$('openFlappyGame').onclick=()=>{
  stopAudio();$('gamesGallery').hidden=true;$('memoryGame').hidden=true;$('flappyGame').hidden=false;
  $('flappyHeading').focus();
};
$('flappyBack').onclick=showGamesGallery;
$('flappyStart').onclick=startFlappy;
$('flappyStop').onclick=()=>stopFlappy('Game stopped. Press Start for a fresh flight.');
$('flappySet').onchange=()=>{stopFlappy('Practice set changed. Press Start for a new flight.');$('flappyChoices').hidden=true;};
window.addEventListener('pagehide',()=>stopFlappy());
document.addEventListener?.('visibilitychange',()=>{if(document.hidden&&flappyRunning)stopFlappy('Game paused while away. Press Start when you return.');});
