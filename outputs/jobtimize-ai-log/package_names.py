import zipfile,json,re,xml.etree.ElementTree as E
from pathlib import Path
from xml.sax.saxutils import escape
base=Path(__file__).parent
source=base/'SWT301_AI_Log_Jobtimize.xlsx'
target=base/'SWT301_AI_Log_Jobtimize_CapNhatTen.xlsx'
edits=json.loads((base/'names-edits.json').read_text(encoding='utf-8'))
paths={'Thông tin nhóm':'xl/worksheets/sheet2.xml',**{f'Part{i}':f'xl/worksheets/sheet{i+2}.xml' for i in range(1,5)}}
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(source) as src,zipfile.ZipFile(target,'w') as dst:
 for info in src.infolist():
  data=src.read(info.filename)
  sheet=next((k for k,v in paths.items() if v==info.filename),None)
  if sheet:
   xml=data.decode('utf-8')
   for addr,value in edits[sheet].items():
    pattern=re.compile(r'<c\b(?=[^>]*\br="'+addr+r'")[^>]*?(?:/>|>.*?</c>)',re.S)
    m=pattern.search(xml); assert m,addr
    opening=re.match(r'<c\b[^>]*',m.group()).group().rstrip('/')
    opening=re.sub(r'\s+t="[^"]*"','',opening)
    replacement=opening+' t="inlineStr"><is><t xml:space="preserve">'+escape(value)+'</t></is></c>'
    xml=xml[:m.start()]+replacement+xml[m.end():]
   data=xml.encode('utf-8')
  dst.writestr(info,data)
with zipfile.ZipFile(source) as src,zipfile.ZipFile(target) as dst:
 for path in src.namelist():
  sheet=next((k for k,v in paths.items() if v==path),None)
  if not sheet: assert src.read(path)==dst.read(path);continue
  a=E.fromstring(src.read(path));b=E.fromstring(dst.read(path))
  for root in [a,b]:
   for c in root.findall('s:sheetData/s:row/s:c',n):
    if c.get('r') in edits[sheet]:
     for child in list(c): c.remove(child)
     c.attrib.pop('t',None)
  assert E.tostring(a)==E.tostring(b),sheet
 print('Verified: only name text changed. All formatting and structure unchanged.')
 print(target)
