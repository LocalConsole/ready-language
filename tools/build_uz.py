# Собирает data/uz.json из tools/uz*.txt (русский ⇒ узбекский)
import json,re,glob
CY=re.compile('[А-Яа-яЁё]')
LOOK=str.maketrans('аеорсухАЕОРСТХВКМН','aeorsuxAEORSTXBKMH')
ui={};bad=[]
for f in sorted(glob.glob('tools/uz[0-9].txt')):
    for ln in open(f,encoding='utf-8'):
        ln=ln.rstrip('\n')
        if ' ⇒ ' not in ln: continue
        ru,uz=ln.split(' ⇒ ',1)
        if CY.search(uz):
            uz2=uz.translate(LOOK)
            if CY.search(uz2): bad.append((ru,uz))
            uz=uz2
        ui[ru]=uz
full=json.load(open('/tmp/ru_data_full.json',encoding='utf-8')) if False else None
import subprocess
# восстановим список полных строк так же, как при извлечении
seen={};out=[]
def walk(o):
    if isinstance(o,str):
        if CY.search(o) and o not in seen: seen[o]=1;out.append(o)
    elif isinstance(o,list): [walk(x) for x in o]
    elif isinstance(o,dict): [walk(v) for v in o.values()]
for f in sorted(glob.glob('data/*.json')):
    if 'uz' in f or f.endswith('words.json'):continue
    walk(json.load(open(f,encoding='utf-8')))
data={}
for f in sorted(glob.glob('tools/uzd[0-9].txt')):
    for ln in open(f,encoding='utf-8'):
        ln=ln.rstrip('\n')
        m=re.match(r'(\d+) ⇒ (.*)$',ln)
        if not m: continue
        uz=m.group(2)
        if CY.search(uz):
            uz2=uz.translate(LOOK)
            if CY.search(uz2): bad.append((m.group(1),uz))
            uz=uz2
        data[out[int(m.group(1))]]=uz
words=[x for x in open('tools/uzw.txt',encoding='utf-8').read().split('\n') if x]
ws=json.load(open('data/words.json',encoding='utf-8'))
assert len(words)==len(ws)
wd={w['id']:u for w,u in zip(ws,words)}
miss=[s for s in out if s not in data]
print('ui',len(ui),'data',len(data),'missing data',len(miss),'words',len(wd),'bad',bad[:5])
json.dump({'ui':ui,'data':data,'words':wd},open('data/uz.json','w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
