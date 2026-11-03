import zipfile,re,xml.etree.ElementTree as E
from pathlib import Path
from xml.sax.saxutils import escape
base=Path(__file__).parent
src=base/'SWT301_AI_Log_Jobtimize_CapNhatTen.xlsx'
dst=base/'SWT301_AI_Log_Jobtimize_5ThanhVien.xlsx'
path='xl/worksheets/sheet2.xml'
with zipfile.ZipFile(src) as z:
 xml=z.read(path).decode('utf-8')
 def row_pattern(r):return re.compile(r'<row\b(?=[^>]*\br="'+str(r)+r'")[^>]*?(?:/>|>.*?</row>)',re.S)
 row16=row_pattern(16).search(xml).group()
 row17=row16.replace('r="16"','r="17"')
 row17=re.sub(r'r="([B-G])16"',r'r="\g<1>17"',row17)
 values={'B17':'E','C17':'Phạm Tuấn Khôi','D17':'N/A','E17':'N/A','F17':'Thành viên','G17':''}
 for addr,value in values.items():
  pattern=re.compile(r'<c\b(?=[^>]*\br="'+addr+r'")[^>]*?(?:/>|>.*?</c>)',re.S)
  m=pattern.search(row17);assert m
  head=re.match(r'<c\b[^>]*',m.group()).group().rstrip('/')
  head=re.sub(r'\s+t="[^"]*"','',head)
  cell=head+' t="inlineStr"><is><t>'+escape(value)+'</t></is></c>'
  row17=row17[:m.start()]+cell+row17[m.end():]
 xml=row_pattern(17).sub(lambda _:row17,xml,count=1)
 p=re.compile(r'<c\b(?=[^>]*\br="C9")[^>]*?(?:/>|>.*?</c>)',re.S)
 m=p.search(xml);head=re.match(r'<c\b[^>]*',m.group()).group().rstrip('/')
 head=re.sub(r'\s+t="[^"]*"','',head)
 xml=xml[:m.start()]+head+'><v>5</v></c>'+xml[m.end():]
 with zipfile.ZipFile(dst,'w') as out:
  for info in z.infolist():out.writestr(info,xml.encode('utf-8') if info.filename==path else z.read(info.filename))
with zipfile.ZipFile(src) as a,zipfile.ZipFile(dst) as b:
 for f in a.namelist():
  if f!=path:assert a.read(f)==b.read(f),f
 old=a.read(path).decode();new=b.read(path).decode()
 assert row_pattern(17).sub('',p.sub('',old))==row_pattern(17).sub('',p.sub('',new))
 n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
 root=E.fromstring(b.read(path))
 assert root.find('s:sheetData/s:row[@r="17"]',n).get('ht')=='18'
 assert root.find('s:sheetData/s:row[@r="9"]/s:c[@r="C9"]/s:v',n).text=='5'
 print('Verified: only member count and fifth member row changed; all other content and formatting preserved.')
 print(dst)
