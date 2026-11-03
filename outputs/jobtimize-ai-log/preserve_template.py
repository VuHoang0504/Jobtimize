import json, re, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
from xml.sax.saxutils import escape

base = Path(__file__).parent
source = Path(r'C:\Users\duong\Downloads\SWT301_AI_Log_CaseStudy.xlsx')
target = base / 'SWT301_AI_Log_Jobtimize.xlsx'
edits = json.loads((base / 'edits.json').read_text(encoding='utf-8'))
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
sheet_paths = {'Thông tin nhóm': 'xl/worksheets/sheet2.xml', **{f'Part{i}': f'xl/worksheets/sheet{i+2}.xml' for i in range(1,5)}}

def values(z, path):
    strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        strings = [''.join(x.itertext()) for x in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si', ns)]
    result = {}
    for cell in ET.fromstring(z.read(path)).findall('s:sheetData/s:row/s:c', ns):
        v = cell.find('s:v', ns)
        text = v.text if v is not None else ''
        if cell.get('t') == 's':
            text = strings[int(text)]
        elif cell.get('t') == 'inlineStr':
            text = ''.join(cell.find('s:is', ns).itertext())
        result[cell.get('r')] = text
    return result

with zipfile.ZipFile(source) as original, zipfile.ZipFile(base/'authored.xlsx') as authored:
    payloads = {}
    for sheet, cells in edits.items():
        path = sheet_paths[sheet]
        # Read back values from the authored workbook before putting them into the template.
        authored_values = values(authored, path)
        xml = original.read(path).decode('utf-8')
        original_cells = {c.get('r'): c for c in ET.fromstring(xml).findall('s:sheetData/s:row/s:c', ns)}
        merges = ET.fromstring(xml).findall('s:mergeCells/s:mergeCell', ns)
        for address, expected in cells.items():
            assert address in original_cells, f'Cell not present in template: {sheet}!{address}'
            assert authored_values[address] == expected, (sheet,address)
            old = original_cells[address]
            assert old.find('s:f', ns) is None, f'Unexpected formula: {address}'
            pattern = re.compile(r'<c\b(?=[^>]*\br="'+address+r'")[^>]*?(?:/>|>.*?</c>)', re.S)
            match = pattern.search(xml)
            assert match, address
            raw = match.group()
            opening = re.match(r'<c\b[^>]*', raw).group().rstrip('/')
            opening = re.sub(r'\s+t="[^"]*"', '', opening)
            replacement = opening + ' t="inlineStr"><is><t xml:space="preserve">'+escape(authored_values[address])+'</t></is></c>'
            xml = xml[:match.start()] + replacement + xml[match.end():]
        payloads[path] = xml.encode('utf-8')
    with zipfile.ZipFile(target, 'w') as final:
        for info in original.infolist():
            final.writestr(info, payloads.get(info.filename, original.read(info.filename)))

# Exact preservation checks: all parts outside the 5 edited worksheets are byte-identical.
# Within worksheets, deleting only authored value payloads must give identical trees.
with zipfile.ZipFile(source) as original, zipfile.ZipFile(target) as final:
    assert original.namelist() == final.namelist()
    for path in original.namelist():
        if path not in payloads:
            assert original.read(path) == final.read(path), f'Changed unrelated part: {path}'
    count=0
    for sheet, cells in edits.items():
        path=sheet_paths[sheet]
        a=ET.fromstring(original.read(path)); b=ET.fromstring(final.read(path))
        ac={c.get('r'):c for c in a.findall('s:sheetData/s:row/s:c',ns)}
        bc={c.get('r'):c for c in b.findall('s:sheetData/s:row/s:c',ns)}
        saved=values(final,path)
        for address,expected in cells.items():
            assert saved[address]==expected,(sheet,address)
            for c in [ac[address],bc[address]]:
                c.attrib.pop('t',None)
                for child in list(c):
                    if child.tag.rsplit('}',1)[-1] in ['v','is']:
                        c.remove(child)
            count+=1
        assert ET.tostring(a)==ET.tostring(b),f'Structure/style changed: {sheet}'
    # The protected class and members area remains exactly unchanged.
    before=values(original,sheet_paths['Thông tin nhóm'])
    after=values(final,sheet_paths['Thông tin nhóm'])
    for address,value in before.items():
        if int(re.search(r'\d+',address).group()) <= 17:
            assert after[address]==value
    # All 40 authored audit dates and 64 change dates lie in October 2026.
    for sheet in ['Part1','Part2','Part3','Part4']:
        vals=values(final,sheet_paths[sheet])
        for row in list(range(8,18))+list(range(23,27))+list(range(30,34))+list(range(37,41))+list(range(44,48)):
            assert re.fullmatch(r'(0[1-9]|[12]\d|3[01])/10/2026',vals[f'B{row}'])
            assert vals[f'C{row}'] in ['Nguyễn Văn An','Trần Thị Bình','Lê Minh Cường','Phạm Thu Dung']
    print(json.dumps({'output':str(target),'edited_cells':count,'all_non_value_structure_unchanged':True,'class_and_members_unchanged':True,'instruction_sheet_byte_identical':True,'dates_october_2026':True},ensure_ascii=False))
