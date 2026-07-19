const fs=require('fs');
const vm=require('vm');
const path=require('path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);
class ClassList{constructor(){this.s=new Set()}add(...x){x.forEach(v=>this.s.add(v))}remove(...x){x.forEach(v=>this.s.delete(v))}toggle(v,on){if(on===undefined)on=!this.s.has(v);on?this.s.add(v):this.s.delete(v);return on}contains(v){return this.s.has(v)}}
class El{
  constructor(id=''){this.id=id;this.value='';this.checked=false;this.innerHTML='';this.textContent='';this.className='';this.classList=new ClassList();this.dataset={};this.children=[];this.style={};this._handlers={};this.scrollTop=0;this.scrollHeight=0;}
  addEventListener(type,fn){this._handlers[type]=fn}
  appendChild(n){this.children.push(n);this.scrollHeight=this.children.length}
  prepend(n){this.children.unshift(n)}
  click(){if(this._handlers.click)this._handlers.click({preventDefault(){}})}
  reset(){}
  getBoundingClientRect(){return {top:0}}
}
const elements=Object.fromEntries(ids.map(id=>[id,new El(id)]));
const local={};
const localStorage={getItem:k=>Object.prototype.hasOwnProperty.call(local,k)?local[k]:null,setItem:(k,v)=>{local[k]=String(v)},removeItem:k=>{delete local[k]}};
const document={
  getElementById:id=>elements[id]||null,
  querySelectorAll:()=>[],
  querySelector:()=>null,
  createElement:()=>new El(),
  body:new El('body')
};
const windowObj={document,scrollTo(){},addEventListener(){},setTimeout:fn=>fn(),setInterval:()=>1,clearInterval(){},open:()=>null,SpeechRecognition:undefined,webkitSpeechRecognition:undefined};
const context={
  console,document,window:windowObj,localStorage,navigator:{},location:{reload(){}},
  confirm:()=>true,alert(){},prompt:()=>'',Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL(){}},
  setTimeout:fn=>fn(),setInterval:()=>1,clearInterval(){},Date,JSON,Math,Object,String,Number,Array,Set
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context,{filename:'app.js'});
function fire(id,type='click'){const e=elements[id];if(!e||!e._handlers[type])throw new Error(`No ${type} handler for ${id}`);e._handlers[type]({preventDefault(){},target:e});}
// Quick capture
elements.quickWhat.value='A promised callback did not happen and I felt abandoned. I may have lost time.';
elements.quickIntensity.value='9';elements.quickSafety.value='thoughts';elements.quickDissociation.checked=true;elements.quickIncludeChat.checked=false;
fire('quickCaptureForm','submit');
let captures=JSON.parse(local.genevieve_listens_captures_v2||'[]');
if(captures.length!==1||!captures[0].dissociation)throw new Error('Quick capture did not save dissociation marker');
// Build full event
elements.hoDate.value='2026-07-19T13:00';elements.hoTitle.value='Missed callback';elements.hoSituation.value='A service promised a callback and did not follow up.';elements.hoEmotions.value='Abandoned and distressed at 9/10.';elements.hoBody.value='Could not organise thoughts.';elements.hoThoughts.value='I felt that I did not matter.';elements.hoGaps.value='Possible dissociation and incomplete recall.';elements.hoIncomplete.checked=true;elements.hoSafety.value='thoughts';elements.hoSafetyNow.value='safe';elements.hoActions.value='Called and asked a coordinator to follow up.';elements.hoHelped.value='Staying with my dog.';elements.hoWorse.value='Repeated unowned referrals.';elements.hoOutcome.value='No named owner.';elements.hoNeeds.value='A named owner and confirmed next action.';
fire('handoverForm','submit');
const events=JSON.parse(local.genevieve_listens_handovers_v2||'[]');
if(events.length!==1||events[0].incomplete!==true)throw new Error('Event record did not save');
// Generate structured clinician draft
elements.summaryAudience.value='clinician';elements.summaryLength.value='standard';elements.summaryUseChat.checked=false;elements.summaryUsePrefs.checked=false;elements.summaryQuotes.checked=false;elements.summaryThemes.checked=true;
fire('generateSummary','click');
const draft=elements.summaryDraft.value;
for(const text of ['PERSON-GENERATED HANDOVER DRAFT','MEMORY RELIABILITY AND DISSOCIATION','SOURCE AND CONSENT','possible dissociation'])if(!draft.includes(text))throw new Error(`Draft missing ${text}`);
// Approval gate
elements.approveFacts.checked=true;elements.approvePrivacy.checked=true;elements.approveShare.checked=true;elements.summaryRecipient.value='Irene — psychologist';
fire('approveSummary','click');
const approved=JSON.parse(local.genevieve_listens_approved_summaries_v2||'[]');
if(approved.length!==1||approved[0].recipient!=='Irene — psychologist')throw new Error('Approved summary did not save');
if(!elements.shareWarning.textContent.includes('not sent'))throw new Error('No-send transparency warning missing');
console.log('Runtime smoke test passed: capture, dissociation marker, event record, structured draft and consent gate.');
