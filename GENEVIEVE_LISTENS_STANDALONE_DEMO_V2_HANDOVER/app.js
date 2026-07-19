(() => {
  'use strict';
  const STORAGE = {
    memory: 'genevieve_listens_memory_v1',
    safety: 'genevieve_listens_safety_v1',
    referrals: 'genevieve_listens_referrals_v1',
    notes: 'genevieve_listens_irene_notes_v1',
    review: 'genevieve_listens_review_v1',
    chat: 'genevieve_listens_chat_v1',
    banner: 'genevieve_listens_banner_v1',
    captures: 'genevieve_listens_captures_v2',
    handovers: 'genevieve_listens_handovers_v2',
    approved: 'genevieve_listens_approved_summaries_v2',
    sharelog: 'genevieve_listens_share_log_v2'
  };
  const $ = (id) => document.getElementById(id);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const safeParse = (value, fallback) => { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
  const nowIso = () => new Date().toISOString();
  const prettyDate = (value) => value ? new Date(value).toLocaleString('en-AU', {dateStyle:'medium', timeStyle:'short'}) : 'Not set';
  const escapeHtml = (value='') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));

  let state = {
    intent: 'listen',
    memory: safeParse(localStorage.getItem(STORAGE.memory), {}),
    safety: safeParse(localStorage.getItem(STORAGE.safety), {}),
    referrals: safeParse(localStorage.getItem(STORAGE.referrals), []),
    chat: safeParse(localStorage.getItem(STORAGE.chat), []),
    captures: safeParse(localStorage.getItem(STORAGE.captures), []),
    handovers: safeParse(localStorage.getItem(STORAGE.handovers), []),
    approved: safeParse(localStorage.getItem(STORAGE.approved), []),
    shareLog: safeParse(localStorage.getItem(STORAGE.sharelog), []),
    selectedHandoverId: null,
    stayTimer: null,
    stayRemaining: 0,
    stayInterval: 60,
    selectedCaseId: null
  };

  const defaultReferrals = () => [
    {
      id:'GL-1001', person:'Demo person A', need:'Housing and safety', owner:'Intake worker — unassigned name',
      due:new Date(Date.now()+45*60*1000).toISOString(), status:'open', requirements:'Dog must remain with person; phone contact preferred.',
      receiver:'Housing service — acceptance not yet confirmed', created:nowIso(), accepted:false,
      log:[{at:nowIso(), text:'Referral created. Current owner retains responsibility until accepted handover.'}]
    },
    {
      id:'GL-1002', person:'Demo person B', need:'Mental health follow-up', owner:'Practice coordinator',
      due:new Date(Date.now()+4*60*60*1000).toISOString(), status:'accepted', requirements:'Written explanation before any escalation.',
      receiver:'Named clinician accepted follow-up', created:nowIso(), accepted:true,
      log:[{at:nowIso(), text:'Receiving clinician accepted responsibility.'}]
    }
  ];
  if (!state.referrals.length) { state.referrals = defaultReferrals(); persistReferrals(); }

  function showPage(page) {
    qsa('.page').forEach(p => p.classList.remove('active'));
    qsa('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    const target = $(`page-${page}`);
    if (!target) return;
    target.classList.add('active');
    $('pageTitle').textContent = target.dataset.title || '';
    $('pageSubtitle').textContent = target.dataset.subtitle || '';
    $('sidebar').classList.remove('open');
    if (page === 'referrals') renderReferrals();
    if (page === 'memory') renderMemory();
    if (page === 'safety') renderSafety();
    if (page === 'irene') renderReview();
    if (page === 'handover') renderHandover();
    window.scrollTo({top:0, behavior:'smooth'});
  }

  qsa('[data-page]').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.intent) setIntent(btn.dataset.intent);
    showPage(btn.dataset.page);
  }));
  $('menuBtn').addEventListener('click', () => $('sidebar').classList.toggle('open'));

  qsa('.mode-btn').forEach(btn => btn.addEventListener('click', () => {
    qsa('.mode-btn').forEach(x => x.classList.toggle('active', x === btn));
    document.body.classList.toggle('reviewer-mode', btn.dataset.mode === 'reviewer');
    if (btn.dataset.mode === 'reviewer') showPage('irene');
  }));

  if (localStorage.getItem(STORAGE.banner) === 'dismissed') $('demoBanner').classList.add('dismissed');
  $('dismissBanner').addEventListener('click', () => { $('demoBanner').classList.add('dismissed'); localStorage.setItem(STORAGE.banner,'dismissed'); });

  function setIntent(intent) {
    state.intent = intent;
    qsa('.intent').forEach(x => x.classList.toggle('active', x.dataset.intent === intent));
    const headings = {listen:'I’m listening.',company:'I can keep you company.',celebrate:'Tell me what happened—I want to understand why it matters.',practical:'Let’s solve only one thing.'};
    $('chatHeading').textContent = headings[intent] || headings.listen;
  }
  qsa('.intent').forEach(btn => btn.addEventListener('click', () => setIntent(btn.dataset.intent)));

  function addMessage(role, text, save = true) {
    const item = {role, text, at:nowIso()};
    if (save) { state.chat.push(item); state.chat = state.chat.slice(-60); localStorage.setItem(STORAGE.chat, JSON.stringify(state.chat)); }
    const node = document.createElement('div');
    node.className = `message ${role}`;
    node.innerHTML = `${escapeHtml(text)}<span class="meta">${role === 'user' ? 'You' : 'GENEVIEVE LISTENS™ demo'} • ${new Date(item.at).toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})}</span>`;
    $('chatLog').appendChild(node); $('chatLog').scrollTop = $('chatLog').scrollHeight;
  }

  function renderChat() {
    $('chatLog').innerHTML = '';
    if (!state.chat.length) addMessage('companion','You choose what kind of response you need. I will reflect what I heard before suggesting anything.', false);
    else state.chat.forEach(m => addMessage(m.role,m.text,false));
  }

  function reflectiveResponse(text) {
    const name = state.memory.name ? `${state.memory.name}, ` : '';
    const lower = text.toLowerCase();
    const noAdvice = $('noAdvice').checked;
    let reflected = `${name}I heard that ${text.trim().replace(/[.!?]+$/,'')}.`;
    if (state.intent === 'celebrate') reflected = `${name}that sounds important. I heard: ${text.trim()}`;
    if (state.intent === 'company') reflected = `${name}I’m here in this conversation with you. You said: ${text.trim()}`;
    if (state.intent === 'practical') reflected = `${name}the one thing we are working on is: ${text.trim()}`;
    if (noAdvice) return `${reflected}\n\nI won’t try to fix it yet. What part feels most important for me to understand?`;
    if (lower.includes('suicid') || lower.includes('kill myself') || lower.includes('end my life') || lower.includes('not safe')) {
      return `${reflected}\n\nI need to ask directly because your safety matters: have you already injured yourself, taken something, or got a method within reach? You can open “I might not be safe” and answer without retelling everything.`;
    }
    const replies = {
      listen:'What have people misunderstood about what you need?',
      company:'Would you rather keep talking, sit quietly with a timed check-in, or tell me about something ordinary?',
      celebrate:'What makes this exciting for you, and what did it take for you to get here?',
      practical:'What is the smallest result that would make the next hour easier?'
    };
    return `${reflected}\n\n${replies[state.intent] || replies.listen}`;
  }

  $('chatForm').addEventListener('submit', (event) => {
    event.preventDefault(); const text = $('chatInput').value.trim(); if (!text) return;
    addMessage('user',text); $('chatInput').value='';
    const reply = reflectiveResponse(text);
    window.setTimeout(() => addMessage('companion',reply), 250);
  });
  $('comfortPulse').addEventListener('click', () => {
    if ('vibrate' in navigator) { navigator.vibrate([120,80,120,180,120,80,120]); addMessage('companion','A gentle phone pulse was requested. You remain in control; it only happens when you tap the button.'); }
    else addMessage('companion','This device does not support vibration through the browser. You can still use quiet company mode.');
  });
  $('captureChat').addEventListener('click', () => { showPage('handover'); $('captureConfirmation').textContent = 'Recent messages are available to include when you save a moment or generate a draft.'; });

  $('voiceInput').addEventListener('click', () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { addMessage('companion','Voice input is not available in this browser. Nothing was recorded.'); return; }
    const recognition = new SpeechRecognition(); recognition.lang='en-AU'; recognition.interimResults=false; recognition.maxAlternatives=1;
    recognition.onresult = e => { $('chatInput').value = e.results[0][0].transcript; };
    recognition.onerror = () => addMessage('companion','Voice input did not complete. Nothing was saved by this demo.');
    recognition.start();
  });

  function fillMemoryForm() {
    const m=state.memory; $('memName').value=m.name||''; $('memPronouns').value=m.pronouns||''; $('memAnchors').value=m.anchors||''; $('memHelps').value=m.helps||''; $('memWorse').value=m.worse||''; $('memExcited').value=m.excited||''; $('memUnsafe').value=m.unsafe||'';
  }
  $('memoryForm').addEventListener('submit', e => {
    e.preventDefault(); state.memory={name:$('memName').value.trim(),pronouns:$('memPronouns').value.trim(),anchors:$('memAnchors').value.trim(),helps:$('memHelps').value.trim(),worse:$('memWorse').value.trim(),excited:$('memExcited').value.trim(),unsafe:$('memUnsafe').value.trim(),updated:nowIso()};
    localStorage.setItem(STORAGE.memory,JSON.stringify(state.memory)); renderMemory(); updateIdentity();
  });
  $('deleteMemory').addEventListener('click', () => { if(confirm('Delete all saved companion memory from this browser?')){state.memory={};localStorage.removeItem(STORAGE.memory);fillMemoryForm();renderMemory();updateIdentity();} });
  function renderMemory(){ fillMemoryForm(); const m=state.memory; const items=[['Name',m.name],['Pronouns',m.pronouns],['Life anchors',m.anchors],['What helps',m.helps],['What makes things worse',m.worse],['Excitement signals',m.excited],['Safety signals',m.unsafe]]; const filled=items.filter(x=>x[1]); $('memoryPreview').className=filled.length?'memory-card':'empty-state'; $('memoryPreview').innerHTML=filled.length?filled.map(([k,v])=>`<div><strong>${escapeHtml(k)}</strong><span>${escapeHtml(v)}</span></div>`).join(''):'No memory has been saved.'; }
  $('exportMemory').addEventListener('click',()=>downloadJson('genevieve-listens-memory.json',state.memory));

  function fillSafetyForm(){const s=state.safety;$('safeFears').value=s.fears||'';$('safeLanguage').value=s.language||'';$('safeDependants').value=s.dependants||'';$('safePetName').value=s.petName||'';$('safePetRelationship').value=s.petRelationship||'';$('safeStayTogether').checked=!!s.stayTogether;$('safeContacts').value=s.contacts||'';$('safeConsent').value=s.consent||'';}
  $('safetyForm').addEventListener('submit',e=>{e.preventDefault();state.safety={fears:$('safeFears').value.trim(),language:$('safeLanguage').value.trim(),dependants:$('safeDependants').value.trim(),petName:$('safePetName').value.trim(),petRelationship:$('safePetRelationship').value.trim(),stayTogether:$('safeStayTogether').checked,contacts:$('safeContacts').value.trim(),consent:$('safeConsent').value.trim(),updated:nowIso()};localStorage.setItem(STORAGE.safety,JSON.stringify(state.safety));renderSafety();updateIdentity();});
  function renderSafety(){fillSafetyForm();const s=state.safety;if(s.petName||s.dependants){$('petCard').classList.add('active');$('petCard').innerHTML=`<div class="pet-card-icon">🐾</div><h3>${escapeHtml(s.petName||'Dependant requirement')}</h3><p>${escapeHtml(s.petRelationship||s.dependants||'Must be included in planning.')}</p><strong>${s.stayTogether?'WE REMAIN TOGETHER':'Requirement must be discussed'}</strong>`;}else{$('petCard').classList.remove('active');$('petCard').innerHTML='<div class="pet-card-icon">🐾</div><h3>No pet requirement saved</h3><p>Add the animal or dependant who must be included in every option.</p>';}}
  $('exportSafety').addEventListener('click',()=>downloadJson('genevieve-listens-safety-preferences.json',state.safety));

  function updateIdentity(){const name=state.memory.name||'Welcome';const pet=state.safety.petName?` • ${state.safety.petName} included`:'';$('identityName').textContent=name;$('identitySupport').textContent=`Your choices remain visible${pet}`;}

  function riskContent(type){
    const pet=state.safety.petName; const fear=state.safety.fears; const together=state.safety.stayTogether;
    const pref = fear?`Your saved concern is: “${escapeHtml(fear)}”`:'You can state fears about police, hospital, medication or loss of control.';
    const petLine=pet?`${escapeHtml(pet)} ${together?'must remain with you in every option.':'must be included in the plan.'}`:'Pets, children and dependants should be included in any plan.';
    if(type==='injury')return{cls:'urgent',title:'This needs urgent medical assessment.',body:`An injury or overdose can become dangerous even when symptoms are not obvious. ${pref}`,steps:['Move away from any remaining substance or object.','Use the fastest available emergency medical option or ask someone nearby to do it.','State your fears and safety preferences clearly.','Take your phone, identification, essential medication and dependant information.'],message:`I may have injured myself or taken something. I need urgent medical help. I am frightened about ${fear||'losing control of the process'}. Please explain each step. ${petLine}`};
    if(type==='means')return{cls:'caution',title:'Create distance without ending the conversation.',body:`The immediate goal is not to solve your life. It is to place time and distance between you and the method. ${pref}`,steps:['Put the item in another room, outside, locked away or hand it to another person if safe.','Move with your phone and any dependant to a safer space.','Keep talking while deciding who can physically join you.','If you may act before distance is created, use urgent emergency help.'],message:`I am having suicidal thoughts and I have access to a method. I need someone to help me create distance and stay engaged. ${petLine}`};
    if(type==='thoughts')return{cls:'support',title:'Listen first and reduce the next decision.',body:`You have not acted. That creates room for conversation, a short safety interval and practical support. ${pref}`,steps:['Choose “Stay with me” for repeated check-ins.','Move risky items out of reach as a precaution.','Choose one person, clinician, service or safe public place—not ten referrals.','Record any promised follow-up in No Lost Referral.'],message:`I am having suicidal thoughts but I have not acted. I need someone to listen, stay engaged and help me through the next hour. ${petLine}`};
    return{cls:'caution',title:'Uncertainty deserves a safety response.',body:`You do not need certainty before taking precautions. ${pref}`,steps:['Move away from roads, heights, medication, weapons or other danger.','Keep your phone charged and remain with your dependant.','Use quiet company mode and reassess after a short interval.','Seek urgent help if the risk increases or you act.'],message:`I am unsure whether I can remain safe. I need calm support and help reducing access to danger. ${petLine}`};
  }
  $('assessRisk').addEventListener('click',()=>{const selected=document.querySelector('input[name="risk"]:checked');if(!selected){$('riskResult').innerHTML='<span class="kicker">NEXT STEP</span><h3>Please choose the closest option.</h3><p>You do not need to explain more than that.</p>';return;}const r=riskContent(selected.value);$('riskResult').className=`panel risk-result ${r.cls}`;$('riskResult').innerHTML=`<span class="kicker">NEXT STEP</span><h3>${r.title}</h3><p>${r.body}</p><ul>${r.steps.map(x=>`<li>${x}</li>`).join('')}</ul><div class="copy-box" id="riskCopyText">${r.message}</div><div class="risk-actions"><button class="primary" id="copyRisk">Copy message</button><button class="soft" id="goStay">Open Stay with me</button><button class="outline" id="goSafetyPrefs">Review my safety preferences</button><button class="soft" id="captureRiskMoment">Capture this moment</button></div>`;$('copyRisk').onclick=()=>copyText(r.message);$('goStay').onclick=()=>showPage('stay');$('goSafetyPrefs').onclick=()=>showPage('safety');$('captureRiskMoment').onclick=()=>{showPage('handover');$('quickSafety').value=selected.value;$('quickWhat').value=`Safety check selected: ${selected.value}. ${r.message}`;};});


  function persistHandoverData(){
    localStorage.setItem(STORAGE.captures,JSON.stringify(state.captures));
    localStorage.setItem(STORAGE.handovers,JSON.stringify(state.handovers));
    localStorage.setItem(STORAGE.approved,JSON.stringify(state.approved));
    localStorage.setItem(STORAGE.sharelog,JSON.stringify(state.shareLog));
  }
  function toLocalInputDate(value=new Date()){
    const d=value instanceof Date?value:new Date(value); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,16);
  }
  function selectedUserChat(limit=8){return state.chat.filter(x=>x.role==='user').slice(-limit);}
  function safetyLabel(value){return ({safe:'Safe right now',thoughts:'Suicidal thoughts reported, no action recorded',means:'Access to a method or immediate danger reported',injury:'Injury or something taken reported',unsure:'Safety uncertain', 'not-recorded':'Not recorded'})[value]||value||'Not recorded';}
  function themeAnalysis(text){
    const groups=[
      ['Housing or homelessness',['housing','homeless','shelter','accommodation','car','case worker','caseworker']],
      ['Isolation or unmet connection',['alone','no friends','no family','someone','friend','lonely','ignored']],
      ['Service failure or missed follow-up',['callback','call back','ignored','referral','case worker','promised','follow up','follow-up']],
      ['Unsafe relationship or environment',['unsafe','eggshells','blame','bashing','threat','uncomfortable','sex']],
      ['Pet or dependant responsibility',['dog','pet','mr gruff','animal','dependant','responsibility']],
      ['Suicidal distress or safety concern',['suicid','kill myself','end my life','not safe','die','alive']],
      ['Dissociation or memory disruption',['dissociat','lost time','memory gap','numb','blur','cannot remember']],
      ['Loss of control or coercion fears',['police','hospital','locked','medication','control','forced']]
    ];
    const lower=(text||'').toLowerCase(); return groups.filter(([,terms])=>terms.some(t=>lower.includes(t))).map(([label])=>label);
  }
  function readHandoverForm(){
    return {id:state.selectedHandoverId||`HO-${String(Date.now()).slice(-8)}`,date:$('hoDate').value?new Date($('hoDate').value).toISOString():nowIso(),title:$('hoTitle').value.trim(),situation:$('hoSituation').value.trim(),emotions:$('hoEmotions').value.trim(),body:$('hoBody').value.trim(),thoughts:$('hoThoughts').value.trim(),gaps:$('hoGaps').value.trim(),incomplete:$('hoIncomplete').checked,safety:$('hoSafety').value,safetyNow:$('hoSafetyNow').value,actions:$('hoActions').value.trim(),helped:$('hoHelped').value.trim(),worse:$('hoWorse').value.trim(),outcome:$('hoOutcome').value.trim(),needs:$('hoNeeds').value.trim(),later:$('hoLater').value.trim(),updated:nowIso()};
  }
  function fillHandoverForm(item={}){
    state.selectedHandoverId=item.id||null;$('hoDate').value=toLocalInputDate(item.date||new Date());$('hoTitle').value=item.title||'';$('hoSituation').value=item.situation||'';$('hoEmotions').value=item.emotions||'';$('hoBody').value=item.body||'';$('hoThoughts').value=item.thoughts||'';$('hoGaps').value=item.gaps||'';$('hoIncomplete').checked=!!item.incomplete;$('hoSafety').value=item.safety||'not-recorded';$('hoSafetyNow').value=item.safetyNow||'safe';$('hoActions').value=item.actions||'';$('hoHelped').value=item.helped||'';$('hoWorse').value=item.worse||'';$('hoOutcome').value=item.outcome||'';$('hoNeeds').value=item.needs||'';$('hoLater').value=item.later||'';
  }
  function loadCaptureIntoForm(capture){
    if(!capture)return;fillHandoverForm({date:capture.at,title:'Captured distress event',situation:capture.what,emotions:`Intensity recorded as ${capture.intensity}/10.`,thoughts:(capture.chat||[]).map(x=>x.text).join('\n'),gaps:capture.dissociation?'Possible dissociation, lost time or incomplete recall was marked during the event.':'',incomplete:!!capture.dissociation,safety:capture.safety,safetyNow:capture.safety==='injury'||capture.safety==='means'?'unsure':'safe',actions:'',helped:'',worse:'',outcome:'',needs:'',later:''});
    $('captureConfirmation').textContent='Latest capture loaded. Add only what you remember; gaps may remain marked.';
  }
  $('quickIntensity').addEventListener('input',()=>{$('quickIntensityValue').textContent=`${$('quickIntensity').value}/10`;});
  $('quickCaptureForm').addEventListener('submit',e=>{e.preventDefault();const cap={id:`CAP-${String(Date.now()).slice(-8)}`,at:nowIso(),what:$('quickWhat').value.trim(),intensity:Number($('quickIntensity').value),safety:$('quickSafety').value,dissociation:$('quickDissociation').checked,chat:$('quickIncludeChat').checked?selectedUserChat(6):[]};state.captures.unshift(cap);state.captures=state.captures.slice(0,100);persistHandoverData();$('captureConfirmation').textContent=`Moment saved at ${new Date(cap.at).toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})}. You can expand it later.`;$('quickWhat').value='';renderHandoverHistory();});
  $('quickVoice').addEventListener('click',()=>{const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SpeechRecognition){$('captureConfirmation').textContent='Voice input is not available in this browser. Nothing was recorded.';return;}const r=new SpeechRecognition();r.lang='en-AU';r.interimResults=false;r.onresult=e=>{$('quickWhat').value=e.results[0][0].transcript;};r.onerror=()=>{$('captureConfirmation').textContent='Voice capture did not complete. Nothing was saved.';};r.start();});
  $('loadLatestCapture').addEventListener('click',()=>loadCaptureIntoForm(state.captures[0]));
  $('handoverForm').addEventListener('submit',e=>{e.preventDefault();const item=readHandoverForm();const idx=state.handovers.findIndex(x=>x.id===item.id);if(idx>=0)state.handovers[idx]=item;else state.handovers.unshift(item);state.selectedHandoverId=item.id;persistHandoverData();$('summaryStatus').textContent='Event saved';renderHandoverHistory();});
  $('clearHandoverForm').addEventListener('click',()=>fillHandoverForm({}));
  function getCurrentEvent(){const form=readHandoverForm();const filled=['title','situation','emotions','body','thoughts','gaps','actions','helped','worse','outcome','needs','later'].some(k=>form[k]);if(filled)return form;return state.handovers[0]||{};}
  function quoteLines(chat,limit){return chat.slice(-limit).map(x=>`“${x.text.replace(/\s+/g,' ').trim()}”`).join('\n');}
  function generateHandoverSummary(){
    const e=getCurrentEvent(),aud=$('summaryAudience').value,len=$('summaryLength').value,useChat=$('summaryUseChat').checked,usePrefs=$('summaryUsePrefs').checked,useQuotes=$('summaryQuotes').checked,useThemes=$('summaryThemes').checked;
    const chat=useChat?selectedUserChat(len==='detailed'?12:6):[];const allText=[e.situation,e.emotions,e.body,e.thoughts,e.gaps,e.actions,e.helped,e.worse,e.outcome,e.needs,e.later,...chat.map(x=>x.text)].filter(Boolean).join(' ');const themes=useThemes?themeAnalysis(allText):[];const name=state.memory.name||'The person';const when=e.date?prettyDate(e.date):prettyDate(nowIso());
    const unknown=[];if(!e.situation)unknown.push('the full sequence of events');if(!e.safety||e.safety==='not-recorded')unknown.push('safety level during the event');if(e.incomplete||e.gaps)unknown.push('parts of the timeline because memory may be incomplete');
    const pref=[];if(usePrefs&&state.safety.language)pref.push(`Communication: ${state.safety.language}`);if(usePrefs&&state.safety.fears)pref.push(`Concerns about help: ${state.safety.fears}`);if(usePrefs&&(state.safety.petName||state.safety.dependants))pref.push(`Pet/dependant requirement: ${state.safety.petName||state.safety.dependants}${state.safety.stayTogether?' must remain with the person.':'.'}`);if(usePrefs&&state.memory.helps)pref.push(`What helps the person feel heard: ${state.memory.helps}`);if(usePrefs&&state.memory.worse)pref.push(`What makes engagement worse: ${state.memory.worse}`);
    const header='PERSON-GENERATED HANDOVER DRAFT — NOT A DIAGNOSIS OR CLINICAL ASSESSMENT';
    if(len==='quick'){
      const context=e.situation||chat[chat.length-1]?.text||'A distressing event occurred.';const need=e.needs||'Please listen, clarify what happened and agree the next action.';return `${header}\n\n${name} is sharing an event from ${when}. ${context}\n\nDuring the event: ${e.emotions||'emotions were difficult to describe'}; safety was ${safetyLabel(e.safety)}. Current safety is ${safetyLabel(e.safetyNow)}.${e.incomplete||e.gaps?' The account may be incomplete because dissociation or memory gaps were reported.':''}\n\nWhat is needed now: ${need}${pref.length?`\n\nImportant preference: ${pref[0]}`:''}`;
    }
    if(aud==='trusted'||aud==='family'){
      return `${header}\n\nWHO THIS IS FOR\n${aud==='family'?'Family member':'Trusted person'} chosen by ${name}.\n\nWHAT HAPPENED\n${e.situation||'I am still trying to put the situation into words.'}\n\nHOW IT FELT\n${e.emotions||'I could not fully describe the emotions.'}${e.body?`\nBody or functioning changes: ${e.body}`:''}\n\nWHAT MAY BE MISSING\n${e.gaps||e.incomplete?'I may have dissociated or lost parts of the timeline. Please do not pressure me to fill gaps I cannot remember.':'No memory gap was recorded, but this is still my recollection rather than an independent account.'}\n\nWHAT HELPED / DID NOT HELP\nHelped: ${e.helped||'Not yet clear.'}\nMade it worse: ${e.worse||'Not yet clear.'}\n\nWHAT I NEED FROM YOU\n${e.needs||'Please listen, believe that the distress was real, and help me work out one next step.'}${useQuotes&&chat.length?`\n\nMY WORDS AT THE TIME\n${quoteLines(chat,3)}`:''}${pref.length?`\n\nIMPORTANT PREFERENCES\n- ${pref.join('\n- ')}`:''}\n\nCURRENT SAFETY\n${safetyLabel(e.safetyNow)}. This statement is self-reported and should be checked directly.\n\nPrepared ${prettyDate(nowIso())}. I can change or withdraw this summary.`;
    }
    const section=(title,val)=>`${title}\n${val||'Not recorded.'}`;
    let output=`${header}\n\nIDENTIFICATION\nName: ${name}\nEvent date/time: ${when}\nSummary prepared: ${prettyDate(nowIso())}\nIntended recipient: ${aud==='service'?'Support or housing service':'Health professional'}\n\n${section('SITUATION',e.situation)}\n\n${section('BACKGROUND AND CIRCUMSTANCES',e.title||'No short label recorded.')}\n\n${section('PERSON-REPORTED EMOTIONS',e.emotions)}\n\n${section('BODY / FUNCTIONING CHANGES',e.body)}\n\n${section('THOUGHTS OR MEANING AT THE TIME',e.thoughts)}\n\nSAFETY INFORMATION\nDuring event: ${safetyLabel(e.safety)}\nCurrent: ${safetyLabel(e.safetyNow)}\nThis is self-reported information and is not a clinical risk assessment.\n\nMEMORY RELIABILITY AND DISSOCIATION\n${e.gaps||e.incomplete?'The person reports possible dissociation, lost time, blurred recall or an incomplete timeline. Unknown periods must remain marked as unknown; they must not be completed by AI inference.':'No memory disruption was recorded. The account remains the person’s recollection.'}\n\n${section('ACTIONS AND CONTACT ATTEMPTS',e.actions)}\n\n${section('WHAT HELPED',e.helped)}\n\n${section('WHAT MADE THINGS WORSE OR CAUSED DISENGAGEMENT',e.worse)}\n\n${section('OUTCOME',e.outcome)}\n\n${section('CURRENT REQUEST / NEXT NEED',e.needs)}\n\n${section('LATER REFLECTION',e.later)}`;
    if(useQuotes&&chat.length)output+=`\n\nSELECTED EXACT WORDS FROM THE PERSON\n${quoteLines(chat,len==='detailed'?8:4)}`;
    if(themes.length)output+=`\n\nPOSSIBLE THEMES TO CONFIRM — NOT DIAGNOSES\n- ${themes.join('\n- ')}`;
    if(pref.length)output+=`\n\nGOALS, PREFERENCES AND NON-NEGOTIABLE REQUIREMENTS\n- ${pref.join('\n- ')}`;
    if(unknown.length)output+=`\n\nUNKNOWN OR UNCONFIRMED\n- ${unknown.join('\n- ')}`;
    output+=`\n\nSOURCE AND CONSENT\nThis draft was assembled from information entered by the person, selected recent messages, and saved preferences. It must be reviewed with the person, corrected where needed, and shared only with their current, specific consent. The recipient should confirm understanding and record who accepts responsibility for the next action.`;
    return output;
  }
  $('generateSummary').addEventListener('click',()=>{$('summaryDraft').value=generateHandoverSummary();$('summaryStatus').textContent='Draft — not approved';$('approveFacts').checked=false;$('approvePrivacy').checked=false;$('approveShare').checked=false;$('shareWarning').textContent='Review every word. Possible themes are suggestions to confirm, never facts or diagnoses.';$('shareWarning').className='share-warning';});
  $('copySummary').addEventListener('click',()=>copyText($('summaryDraft').value));
  function downloadText(filename,text){const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  $('downloadSummary').addEventListener('click',()=>downloadText('genevieve-listens-person-approved-handover.txt',$('summaryDraft').value));
  $('printSummary').addEventListener('click',()=>{const text=escapeHtml($('summaryDraft').value).replace(/\n/g,'<br>');const w=window.open('','_blank');if(!w)return;w.document.write(`<html><head><title>GENEVIEVE LISTENS handover</title><style>body{font-family:Arial;line-height:1.5;max-width:850px;margin:40px auto;padding:0 25px}h1{font-size:20px;border-bottom:2px solid #c9a227;padding-bottom:10px}.note{font-size:12px;color:#666}</style></head><body><h1>GENEVIEVE LISTENS™ — Person-approved handover</h1><div>${text}</div><p class="note">Generated by a standalone demonstration. Verify before clinical use.</p></body></html>`);w.document.close();w.print();});
  $('approveSummary').addEventListener('click',()=>{const recipient=$('summaryRecipient').value.trim();const checks=$('approveFacts').checked&&$('approvePrivacy').checked&&$('approveShare').checked;if(!$('summaryDraft').value.trim()){ $('shareWarning').textContent='Generate or write a summary first.';$('shareWarning').className='share-warning error';return;}if(!checks||!recipient){$('shareWarning').textContent='Before saving an approved version, check all three approval boxes and name the intended recipient.';$('shareWarning').className='share-warning error';return;}const item={id:`SUM-${String(Date.now()).slice(-8)}`,at:nowIso(),recipient,audience:$('summaryAudience').value,text:$('summaryDraft').value,eventId:getCurrentEvent().id||null,consent:{facts:true,privacy:true,share:true}};state.approved.unshift(item);state.shareLog.unshift({at:item.at,summaryId:item.id,recipient,status:'approved for user-controlled sharing; not sent automatically'});persistHandoverData();$('summaryStatus').textContent='Approved version saved';$('shareWarning').textContent='Approved locally. The program has not sent it anywhere. You remain in control of copying or downloading it.';$('shareWarning').className='share-warning success';renderHandoverHistory();});
  function renderHandoverHistory(){
    const items=[...state.captures.map(x=>({...x,kind:'capture'})),...state.handovers.map(x=>({...x,at:x.date||x.updated,kind:'event'})),...state.approved.map(x=>({...x,kind:'approved'}))].sort((a,b)=>new Date(b.at)-new Date(a.at));
    if(!items.length){$('handoverHistory').innerHTML='<div class="empty-state">No moments, events or approved summaries have been saved.</div>';return;}
    $('handoverHistory').innerHTML=items.map(x=>{if(x.kind==='capture')return`<article class="history-card capture"><div class="history-card-head"><div><span class="history-meta">Quick capture • ${prettyDate(x.at)}</span><h3>${escapeHtml(x.what||'Fragment saved without words')}</h3></div><span class="status-tag ${x.safety==='safe'?'accepted':x.safety==='injury'||x.safety==='means'?'overdue':'open'}">${escapeHtml(safetyLabel(x.safety))}</span></div><p>Intensity ${x.intensity}/10${x.dissociation?' • possible dissociation or lost time marked':''}</p><div class="history-actions"><button data-load-capture="${x.id}">Expand into event</button><button data-delete-capture="${x.id}">Delete</button></div></article>`;if(x.kind==='approved')return`<article class="history-card approved"><div class="history-card-head"><div><span class="history-meta">Approved summary • ${prettyDate(x.at)}</span><h3>For ${escapeHtml(x.recipient)}</h3></div><span class="status-tag accepted">Approved, not sent</span></div><p>${escapeHtml(x.text.slice(0,300))}${x.text.length>300?'…':''}</p><div class="history-actions"><button data-open-summary="${x.id}">Open approved text</button><button data-delete-summary="${x.id}">Delete</button></div></article>`;return`<article class="history-card"><div class="history-card-head"><div><span class="history-meta">Event record • ${prettyDate(x.date||x.updated)}</span><h3>${escapeHtml(x.title||'Untitled event')}</h3></div><span class="status-tag ${x.safetyNow==='safe'?'accepted':x.safetyNow==='injury'||x.safetyNow==='means'?'overdue':'open'}">${escapeHtml(safetyLabel(x.safetyNow))}</span></div><p>${escapeHtml(x.situation||'No situation description saved.')}${x.incomplete?'\nAccount marked incomplete.':''}</p><div class="history-actions"><button data-edit-event="${x.id}">Edit event</button><button data-summary-event="${x.id}">Create summary</button><button data-delete-event="${x.id}">Delete</button></div></article>`;}).join('');
    qsa('[data-load-capture]').forEach(b=>b.onclick=()=>loadCaptureIntoForm(state.captures.find(x=>x.id===b.dataset.loadCapture)));qsa('[data-delete-capture]').forEach(b=>b.onclick=()=>{state.captures=state.captures.filter(x=>x.id!==b.dataset.deleteCapture);persistHandoverData();renderHandoverHistory();});qsa('[data-edit-event]').forEach(b=>b.onclick=()=>{fillHandoverForm(state.handovers.find(x=>x.id===b.dataset.editEvent));window.scrollTo({top:400,behavior:'smooth'});});qsa('[data-summary-event]').forEach(b=>b.onclick=()=>{fillHandoverForm(state.handovers.find(x=>x.id===b.dataset.summaryEvent));$('summaryDraft').value=generateHandoverSummary();$('summaryStatus').textContent='Draft — not approved';window.scrollTo({top:$('summaryDraft').getBoundingClientRect().top+window.scrollY-100,behavior:'smooth'});});qsa('[data-delete-event]').forEach(b=>b.onclick=()=>{state.handovers=state.handovers.filter(x=>x.id!==b.dataset.deleteEvent);persistHandoverData();renderHandoverHistory();});qsa('[data-open-summary]').forEach(b=>b.onclick=()=>{const x=state.approved.find(s=>s.id===b.dataset.openSummary);$('summaryDraft').value=x?.text||'';$('summaryRecipient').value=x?.recipient||'';$('summaryStatus').textContent='Approved saved version';window.scrollTo({top:$('summaryDraft').getBoundingClientRect().top+window.scrollY-100,behavior:'smooth'});});qsa('[data-delete-summary]').forEach(b=>b.onclick=()=>{state.approved=state.approved.filter(x=>x.id!==b.dataset.deleteSummary);persistHandoverData();renderHandoverHistory();});
  }
  function renderHandover(){if(!$('hoDate').value)$('hoDate').value=toLocalInputDate();renderHandoverHistory();}
  $('exportHandover').addEventListener('click',()=>downloadJson('genevieve-listens-handover-data.json',{captures:state.captures,events:state.handovers,approvedSummaries:state.approved,shareAudit:state.shareLog,exported:nowIso()}));

  function persistReferrals(){localStorage.setItem(STORAGE.referrals,JSON.stringify(state.referrals));}
  function referralStatus(item){if(item.accepted)return'accepted';if(new Date(item.due).getTime()<Date.now())return'overdue';return item.status||'open';}
  function renderReferrals(){
    const statuses=state.referrals.map(referralStatus); const metrics=[['Active',state.referrals.length],['Accepted handovers',statuses.filter(x=>x==='accepted').length],['Awaiting acceptance',statuses.filter(x=>x==='open').length],['Overdue',statuses.filter(x=>x==='overdue').length]];
    $('referralMetrics').innerHTML=metrics.map(([l,v])=>`<div class="metric"><strong>${v}</strong><span>${l}</span></div>`).join('');
    $('referralBody').innerHTML=state.referrals.map(r=>{const s=referralStatus(r);return`<tr><td><strong>${escapeHtml(r.id)}</strong><br><small>${escapeHtml(r.person)}</small></td><td>${escapeHtml(r.need)}</td><td>${escapeHtml(r.owner)}</td><td>${prettyDate(r.due)}</td><td><span class="status-tag ${s}">${s}</span></td><td><button class="table-btn" data-case="${r.id}">Review</button></td></tr>`}).join('');
    qsa('[data-case]').forEach(btn=>btn.addEventListener('click',()=>selectCase(btn.dataset.case)));
    if(state.selectedCaseId)selectCase(state.selectedCaseId);
  }
  function selectCase(id){state.selectedCaseId=id;const r=state.referrals.find(x=>x.id===id);if(!r)return;const s=referralStatus(r);$('caseDetail').innerHTML=`<span class="kicker">CASE DETAIL</span><h3>${escapeHtml(r.id)} — ${escapeHtml(r.person)}</h3><dl><dt>Need</dt><dd>${escapeHtml(r.need)}</dd><dt>Owner</dt><dd>${escapeHtml(r.owner)}</dd><dt>Promise due</dt><dd>${prettyDate(r.due)}</dd><dt>Status</dt><dd><span class="status-tag ${s}">${s}</span></dd><dt>Requirements</dt><dd>${escapeHtml(r.requirements||'None recorded')}</dd><dt>Receiver</dt><dd>${escapeHtml(r.receiver||'Not accepted')}</dd></dl><div class="form-actions"><button class="primary" id="acceptCase">Record accepted handover</button><button class="outline" id="escalateCase">Escalate missed promise</button></div><div class="case-log">${(r.log||[]).slice().reverse().map(x=>`<div><strong>${prettyDate(x.at)}</strong><br>${escapeHtml(x.text)}</div>`).join('')}</div>`;
    $('acceptCase').onclick=()=>{r.accepted=true;r.status='accepted';r.log.push({at:nowIso(),text:'Named receiving person accepted responsibility. Original owner may now close their task after the person is informed.'});persistReferrals();renderReferrals();};
    $('escalateCase').onclick=()=>{r.status='overdue';r.log.push({at:nowIso(),text:'Missed promise escalated to team leader. Person and advocate should receive a written update.'});persistReferrals();renderReferrals();};
  }
  $('newReferral').addEventListener('click',()=>{$('referralModal').hidden=false;const d=new Date(Date.now()+60*60*1000);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());$('refDue').value=d.toISOString().slice(0,16);});
  const closeModal=()=>{$('referralModal').hidden=true;}; $('closeReferral').onclick=closeModal;$('cancelReferral').onclick=closeModal;
  $('referralForm').addEventListener('submit',e=>{e.preventDefault();const id=`GL-${String(Date.now()).slice(-6)}`;state.referrals.unshift({id,person:$('refPerson').value.trim(),need:$('refNeed').value,owner:$('refOwner').value.trim(),due:new Date($('refDue').value).toISOString(),status:'open',requirements:$('refRequirements').value.trim(),receiver:$('refReceiver').value.trim(),accepted:false,created:nowIso(),log:[{at:nowIso(),text:'Referral created. Named owner retains responsibility until accepted handover.'}]});persistReferrals();e.target.reset();closeModal();renderReferrals();});
  $('simulateMissed').addEventListener('click',()=>{const r=state.referrals.find(x=>!x.accepted);if(!r)return;r.due=new Date(Date.now()-10*60*1000).toISOString();r.status='overdue';r.log.push({at:nowIso(),text:'Demonstration: promised callback passed without accepted handover. Automatic escalation created.'});persistReferrals();renderReferrals();selectCase(r.id);});

  const reviewItems=[
    ['Listening-first wording','Does the program reflect the person’s actual request before giving instructions?'],
    ['Direct risk questions','Are questions clear, non-shaming and clinically appropriate?'],
    ['Fear and control','Does it acknowledge fear of police, hospital, medication and involuntary processes honestly?'],
    ['Pet and dependant inclusion','Are animals, children, aids and responsibilities treated as essential safety requirements?'],
    ['AI relationship boundary','Does the companion avoid claiming feelings, love, consciousness or exclusive friendship?'],
    ['Closed-loop referrals','Can no case close until a named recipient accepts responsibility?'],
    ['Missed callback escalation','Are deadlines visible and automatically escalated?'],
    ['Privacy and deletion','Can the person see, edit, export and delete all stored memory?'],
    ['Dissociation and uncertainty','Are lost time, blurred recall and unknown periods preserved without invented certainty?'],
    ['Person-approved handover','Are exact words, reported information, possible themes and clinical conclusions clearly separated?'],
    ['Audience-specific minimisation','Does each recipient receive only the information needed for that purpose?'],
    ['Consent and version control','Is consent current, specific to one version and recipient, and withdrawable?'],
    ['Clinical governance','Is a named clinical lead required before any real-world trial?'],
    ['Adverse event review','Is there a process for harm reports, near misses and urgent suspension?']
  ];
  function renderReview(){const saved=safeParse(localStorage.getItem(STORAGE.review),{});$('reviewChecklist').innerHTML=reviewItems.map(([title,desc],i)=>`<label class="review-item"><input type="checkbox" data-review="${i}" ${saved[i]?'checked':''}><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(desc)}</small></span></label>`).join('');qsa('[data-review]').forEach(cb=>cb.addEventListener('change',()=>{const current=safeParse(localStorage.getItem(STORAGE.review),{});current[cb.dataset.review]=cb.checked;localStorage.setItem(STORAGE.review,JSON.stringify(current));}));$('ireneNotes').value=localStorage.getItem(STORAGE.notes)||'';}
  $('saveIreneNotes').addEventListener('click',()=>localStorage.setItem(STORAGE.notes,$('ireneNotes').value));
  $('exportReview').addEventListener('click',()=>downloadJson('genevieve-listens-irene-review-pack-v2.json',{review:safeParse(localStorage.getItem(STORAGE.review),{}),notes:$('ireneNotes').value,memory:state.memory,safety:state.safety,referrals:state.referrals,captures:state.captures,handovers:state.handovers,approvedSummaries:state.approved,exported:nowIso()}));

  function startStay(){stopStay();state.stayInterval=Number($('stayInterval').value);state.stayRemaining=state.stayInterval;$('stayStatus').textContent='Active';renderStayClock();state.stayTimer=setInterval(()=>{state.stayRemaining--;renderStayClock();if(state.stayRemaining<=0){addTimeline('Check-in due. The demonstration remains on screen until answered.');state.stayRemaining=state.stayInterval;renderStayClock();}},1000);addTimeline('Quiet company mode started.');}
  function stopStay(){if(state.stayTimer)clearInterval(state.stayTimer);state.stayTimer=null;$('stayStatus').textContent='Stopped';}
  function renderStayClock(){const m=Math.floor(state.stayRemaining/60);const s=state.stayRemaining%60;$('stayClock').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
  function addTimeline(text,cls=''){const d=document.createElement('div');d.className=`timeline-item ${cls}`;d.innerHTML=`<strong>${new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})}</strong> — ${escapeHtml(text)}`;$('stayTimeline').prepend(d);}
  $('startStay').onclick=startStay;$('stopStay').onclick=stopStay;qsa('[data-checkin]').forEach(btn=>btn.addEventListener('click',()=>{const value=btn.dataset.checkin;if(value==='unsafe'){addTimeline('Safety changed. Opened direct safety questions.','unsafe');showPage('redmode');}else if(value==='hard'){addTimeline('Still hard. Continuing quiet company.');state.stayRemaining=state.stayInterval;}else{addTimeline('Person reported safe right now.');state.stayRemaining=state.stayInterval;}renderStayClock();}));

  function copyText(text){navigator.clipboard?.writeText(text).then(()=>alert('Copied.')).catch(()=>prompt('Copy this message:',text));}
  function downloadJson(filename,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  $('exportAll').addEventListener('click',()=>downloadJson('genevieve-listens-complete-demo-data.json',{memory:state.memory,safety:state.safety,referrals:state.referrals,chat:state.chat,captures:state.captures,handovers:state.handovers,approvedSummaries:state.approved,shareLog:state.shareLog,ireneNotes:localStorage.getItem(STORAGE.notes)||'',review:safeParse(localStorage.getItem(STORAGE.review),{}),exported:nowIso()}));
  $('resetDemo').addEventListener('click',()=>{if(!confirm('Reset all GENEVIEVE LISTENS™ demonstration data in this browser?'))return;Object.values(STORAGE).forEach(k=>localStorage.removeItem(k));location.reload();});

  renderChat();renderMemory();renderSafety();renderReferrals();renderReview();renderHandover();updateIdentity();renderStayClock();
  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
