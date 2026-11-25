import re,glob,json,sys
seen={};order=[]
def add(s):
    s=s.strip()
    if s and s not in seen: seen[s]=1;order.append(s)
for f in ['index.html','js/i18n.js','js/core.js','js/ui.js','js/views1.js','js/views2.js','js/ai.js','js/boot.js','config.js']:
    t=open(f,encoding='utf-8').read()
    for m in re.finditer(r"[^'\"`<>{}$\n]*[А-Яа-яЁё][^'\"`<>{}$\n]*",t): add(m.group(0))
js=list(order);order.clear();seen.clear()
def walk(o,key=''):
    if isinstance(o,str):
        if re.search('[А-Яа-яЁё]',o):
            for part in re.split(r'<[^>]+>',o): 
                if re.search('[А-Яа-яЁё]',part): add(part)
    elif isinstance(o,list):
        for x in o: walk(x,key)
    elif isinstance(o,dict):
        for k,v in o.items(): walk(v,k)
for f in glob.glob('data/*.json'):
    if f.endswith('uz.json'):continue
    walk(json.load(open(f,encoding='utf-8')))
json.dump({'js':js,'data':list(order)},open('/tmp/ru_strings.json','w',encoding='utf-8'),ensure_ascii=False)
print(len(js),len(order))
