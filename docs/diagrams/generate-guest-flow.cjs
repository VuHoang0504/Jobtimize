const fs = require('fs');
const sharp = require('../../server/node_modules/sharp');
const nodes = [
 ['home','Home Page',45,310],
 ['search','Search / Filter Jobs',340,100],
 ['browse','Browse Job Categories',340,235],
 ['details','Job Details',660,165],
 ['company','Company Information',980,165],
 ['apply','Apply / Save Job',660,310],
 ['login','User Login',660,470],
 ['cv','CV / Personalized Features',340,470],
 ['register','Register Account',340,650],
 ['otp','Verify Email OTP',660,650],
 ['reset','Password Reset',980,470],
 ['verify','Verify OTP / New Password',980,650]
];
const paths = [
 [[285,338],[310,338],[310,128],[340,128]],
 [[285,338],[325,338],[325,263],[340,263]],
 [[580,128],[615,128],[615,193],[660,193]],
 [[580,263],[630,263],[630,208],[660,208]],
 [[900,193],[980,193]],
 [[780,221],[780,310]],
 [[780,366],[780,470]],
 [[285,338],[310,338],[310,498],[660,498]],
 [[580,498],[660,498]],
 [[285,338],[300,338],[300,678],[340,678]],
 [[720,526],[720,590],[460,590],[460,650]],
 [[580,678],[660,678]],
 [[900,498],[980,498]],
 [[1100,526],[1100,650]]
];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="840" viewBox="0 0 1320 840"><defs><marker id="a" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L10 5 L0 10 Z" fill="#222"/></marker></defs><rect width="1320" height="840" fill="white"/><text x="45" y="48" font-family="Arial,sans-serif" font-size="28" font-weight="bold">Jobtimize — Guest Screen Flow (Not Logged In)</text>';
for(const pts of paths)svg+=`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#222" stroke-width="1.4" marker-end="url(#a)"/>`;
for(const [id,label,x,y]of nodes)svg+=`<rect x="${x}" y="${y}" width="240" height="56" fill="white" stroke="#222" stroke-width="1.5"/><text x="${x+120}" y="${y+34}" text-anchor="middle" font-family="Arial,sans-serif" font-size="17">${label.replaceAll('&','&amp;')}</text>`;
svg+='<text x="800" y="421" font-family="Arial,sans-serif" font-size="15" fill="#555">Login required</text><text x="45" y="775" font-family="Arial,sans-serif" font-size="15" fill="#555">Guest can browse public jobs and company information shown on job details.</text><text x="45" y="803" font-family="Arial,sans-serif" font-size="15" fill="#555">Email / Google login ends the guest flow. Account registration supports Candidate and Employer.</text></svg>';
fs.writeFileSync(`${__dirname}/screen-flow-guest.svg`,svg,'utf8');
sharp(Buffer.from(svg),{density:180}).flatten({background:'#fff'}).jpeg({quality:95,chromaSubsampling:'4:4:4'}).toFile(`${__dirname}/screen-flow-guest.jpg`).then(r=>console.log(r.width+' x '+r.height));
