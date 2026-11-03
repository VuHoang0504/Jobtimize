import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require=createRequire('C:/Users/duong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {FileBlob,SpreadsheetFile}=await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
const dir='C:/Users/duong/Desktop/Jobtimize/outputs/jobtimize-ai-log';
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(`${dir}/SWT301_AI_Log_Jobtimize.xlsx`));
for(const sheet of ['Part1','Part2','Part3','Part4']){
 for(const [area,range] of [['changes','B19:I48'],['audit','B7:I17'],['reflection','B74:I92']]){
  const pic=await wb.render({sheetName:sheet,range,scale:1,format:'png'});
  await fs.writeFile(`${dir}/final-${sheet}-${area}.png`,new Uint8Array(await pic.arrayBuffer()));
 }
}
console.log('Final workbook reopened and rendered successfully.');
