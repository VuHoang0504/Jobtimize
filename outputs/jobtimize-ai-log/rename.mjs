import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire('C:/Users/duong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {FileBlob,SpreadsheetFile}=await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
const dir='C:/Users/duong/Desktop/Jobtimize/outputs/jobtimize-ai-log';
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(`${dir}/SWT301_AI_Log_Jobtimize.xlsx`));
const mapping={'Nguyễn Văn An':'Đỗ Minh Tuấn Anh','Trần Thị Bình':'Bì Lê Vũ Hoàng','Lê Minh Cường':'Nguyễn Thành Phước','Phạm Thu Dung':'Mai Xuân Quý'};
const edits={};
for(const name of ['Thông tin nhóm','Part1','Part2','Part3','Part4']){
 const sh=wb.worksheets.getItem(name), vals=sh.getRange('A1:I95').values;
 for(let r=0;r<vals.length;r++)for(let c=0;c<vals[r].length;c++){
  if(typeof vals[r][c]!=='string')continue;
  let value=vals[r][c];
  for(const [old,next] of Object.entries(mapping))value=value.replaceAll(old,next);
  if(value!==vals[r][c]){
   const addr=String.fromCharCode(65+c)+(r+1);
   sh.getRange(addr).values=[[value]];
   (edits[name]??={})[addr]=value;
  }
 }
}
wb.recalculate();
await (await SpreadsheetFile.exportXlsx(wb)).save(`${dir}/names-authored.xlsx`);
await fs.writeFile(`${dir}/names-edits.json`,JSON.stringify(edits));
console.log('Updated names in',Object.values(edits).reduce((n,x)=>n+Object.keys(x).length,0),'cells.');
