const fs = require('fs');
const sharp = require('../../server/node_modules/sharp');
const out = __dirname;
const diagrams = [
 {id:'candidate',title:'Candidate Screen Flow',rows:[
 ['Personal Profile','Edit Profile'],
 ['CV Management','Upload / Review CV','CV Preview'],
 ['Online CV Builder','Edit Template / Content','PDF Preview'],
 ['Find Jobs from CV','Skill Gap / AI Insights','Recommended Courses'],
 ['Practice AI Interview','Questions / Answers','Evaluation / History'],
 ['My Applications','Job Details'],
 ['Saved Jobs','Job Details','Apply Dialog'],
 ['Job Alerts','Create / Edit Alert','Matching Jobs'],
 ['Invitations & Interviews','Invitation / Interview Details'],
 ['Account Security','Change Password']
 ],extra:true},
 {id:'employer',title:'Employer Screen Flow',rows:[
 ['Company Profile & Security','Edit Company Profile'],
 ['KYC Submission (dialog)','Upload Business Documents'],
 ['Create Job Posting','JD Form / AI Generator'],
 ['Job Postings','Job Details'],
 ['Job Postings','Edit Job (dialog)'],
 ['Applicants (ATS)','CV Preview'],
 ['Applicants (ATS)','Schedule Interview (dialog)'],
 ['Applicants (ATS)','Confirm / Reject (dialog)'],
 ['Candidate Search / Matching','View CV / Invite (dialog)'],
 ['Invitations & Interviews','Invitation / Interview Details'],
 ['Subscription Packages','PayOS Checkout','Payment Status'],
 ['Subscription Packages','Transaction History']
 ]},
 {id:'admin',title:'Admin Screen Flow',rows:[
 ['Analytics Dashboard','Date / Metric Filters','Charts & KPI Results'],
 ['Analytics Dashboard','Transactions List','CSV Export'],
 ['Employer Accounts','Employer Details (dialog)','KYC Review (dialog)'],
 ['Employer Accounts','Lock / Unlock (dialog)'],
 ['Candidate Accounts','Candidate Details (dialog)'],
 ['Candidate Accounts','Lock / Unlock (dialog)'],
 ['Job Moderation','Job Details (dialog)','Approve / Reject (dialog)'],
 ['Violation Reports','Report Review (dialog)','Resolve / Dismiss'],
 ['Skill Taxonomy','Add / Edit Skill (dialog)'],
 ['Job Categories','Add / Edit Category (dialog)']
 ]}
];
function xml(s){return s.replaceAll('&','&amp;').replaceAll('<','&lt;');}
async function draw(d){
 const w=1540,h=300+d.rows.length*108;
 let shapes=[], lines=[];
 const nodes=[];
 function box(id,label,x,y,width=270,height=56){nodes.push({id,label,x,y,width,height});shapes.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white" stroke="#222" stroke-width="1.5"/><text x="${x+width/2}" y="${y+height/2+6}" text-anchor="middle" font-family="Arial,sans-serif" font-size="18">${xml(label)}</text>`);}
 function line(points){lines.push(`<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#222" stroke-width="1.4" marker-end="url(#arrow)"/>`);}
 box('home','Home Page',35,100,190);box('login','User Login',290,100,190);box('dash',d.id==='admin'?'Admin Dashboard':d.id==='candidate'?'Candidate Dashboard':'Employer Dashboard',545,100,260);
 line([[225,128],[290,128]]);line([[480,128],[545,128]]);
 if(d.id!=='admin'){box('register','Register Account',290,190,190);line([[385,156],[385,190]]);}
 box('reset','Password Reset',35,190,190);line([[315,156],[315,173],[130,173],[130,190]]);
 // A shared navigation spine joins dashboard to its available sections.
 let spine=600; const first=310,last=first+(d.rows.length-1)*108;
 lines.push(`<path d="M675 156 V270 H${spine} V${last+28}" fill="none" stroke="#222" stroke-width="1.4"/>`);
 d.rows.forEach((row,i)=>{
  let y=first+i*108;
  row.forEach((label,j)=>{let x=650+j*300;box(`r${i}c${j}`,label,x,y,270);if(j)line([[x-30,y+28],[x,y+28]]);});
  line([[spine,y+28],[650,y+28]]);
 });
 // Public job browsing is separate from protected candidate workspace.
 if(d.extra){box('search','Search / Filter Jobs',35,310,240);box('details','Job Details',35,418,240);box('apply','Apply with CV (dialog)',35,526,240);line([[35,128],[15,128],[15,338],[35,338]]);line([[155,366],[155,418]]);line([[155,474],[155,526]]);shapes.push('<text x="155" y="610" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" fill="#555">Apply requires Candidate login</text>');}
 let legend=`<text x="35" y="${h-30}" font-family="Arial,sans-serif" font-size="15" fill="#555">Arrow: navigation / opens a view. Boxes include pages, tabs and dialogs. Return and logout links omitted for readability.</text>`;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L10 5 L0 10 Z" fill="#222"/></marker></defs><rect width="100%" height="100%" fill="white"/><text x="35" y="48" font-family="Arial,sans-serif" font-size="28" font-weight="bold">Jobtimize — ${d.title}</text>${lines.join('')}${shapes.join('')}${legend}</svg>`;
 // Leave room below the last screen row for the legend.
 svg=svg.replaceAll(`height="${h}"`,`height="${h+80}"`).replace(`0 0 ${w} ${h}`,`0 0 ${w} ${h+80}`).replace(`y="${h-30}"`,`y="${h+50}"`);
 fs.writeFileSync(`${out}/screen-flow-${d.id}.svg`,svg,'utf8');
 await sharp(Buffer.from(svg),{density:180}).flatten({background:'#fff'}).jpeg({quality:95,chromaSubsampling:'4:4:4'}).toFile(`${out}/screen-flow-${d.id}.jpg`);
 fs.writeFileSync(`${out}/screen-flow-${d.id}.json`,JSON.stringify({title:d.title,rows:d.rows},null,2));
 console.log(d.id+' exported');
}
(async()=>{for(const d of diagrams)await draw(d);})();
