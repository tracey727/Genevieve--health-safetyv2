const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const required=[
  'index.html','styles.css','app.js','manifest.webmanifest','sw.js',
  'assets/genevieve-ga-logo-approved-original.png',
  'assets/genevieve-tree-logo-approved-original.jpeg',
  'docs/HANDOVER_AND_DISSOCIATION_DESIGN.md',
  'docs/CLINICAL_REVIEW_V2.md'
];
for(const file of required){
  const p=path.join(root,file);
  if(!fs.existsSync(p)||fs.statSync(p).size===0)throw new Error(`Missing or empty: ${file}`);
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const mustContain=[
  'GENEVIEVE LISTENS™','No Lost Referral','Irene review room','I might not be safe',
  'page-handover','quickCaptureForm','handoverForm','summaryDraft','handoverHistory',
  'This account may be incomplete','Nothing leaves until you approve it'
];
for(const text of mustContain){if(!html.includes(text))throw new Error(`Missing content: ${text}`);}
const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);
const duplicates=ids.filter((id,i)=>ids.indexOf(id)!==i);
if(duplicates.length)throw new Error(`Duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);
const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
for(const token of [
  'localStorage','referralStatus','riskContent','serviceWorker','themeAnalysis',
  'generateHandoverSummary','persistHandoverData','approvedSummaries',
  'Unknown periods must remain marked as unknown','not sent automatically'
]){if(!js.includes(token))throw new Error(`Missing feature token: ${token}`);}
const jsRefs=[...js.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]);
const dynamic=new Set(['acceptCase','escalateCase','copyRisk','goStay','goSafetyPrefs','captureRiskMoment']);
const missing=[...new Set(jsRefs.filter(id=>!ids.includes(id)&&!dynamic.has(id)))];
if(missing.length)throw new Error(`JavaScript references missing HTML IDs: ${missing.join(', ')}`);
console.log('Structure, unique-ID, handover and feature checks passed.');
