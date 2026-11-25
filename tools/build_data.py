# -*- coding: utf-8 -*-
"""Генерирует data/*.json из компактных источников. Запуск: python3 tools/build_data.py"""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'src', 'data'); os.makedirs(D, exist_ok=True)
def dump(name, obj):
    with open(os.path.join(D, name), 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))

# ---------- WORDS ----------
words = []
for i, line in enumerate(open(os.path.join(ROOT, 'tools', 'words.txt'), encoding='utf-8')):
    line = line.strip()
    if not line: continue
    w, pos, tr, df, ex, topic, lvl = line.split('|')
    words.append({'id': 'w%d' % i, 'w': w, 'pos': pos, 'tr': tr, 'def': df, 'ex': ex, 'topic': topic, 'lvl': int(lvl)})
dump('words.json', words)

# ---------- QUESTIONS ----------
Qs = []
def Q(id, skill, topic, lvl, q, opts, a, expl, wrong=None, exam='ielts', src='Оригинал проекта, 2025', passage=None, typ='mcq'):
    d = dict(id=id, skill=skill, topic=topic, lvl=lvl, q=q, opts=opts, a=a, expl=expl, wrong=wrong or [], exam=exam, src=src, typ=typ)
    if passage: d['passage'] = passage
    Qs.append(d)

# Grammar
G = lambda *a, **k: Q(*a, **k)
G('g1','grammar','tenses_pp',1,'I ___ to Paris three times.',['went','have been','was going','am going'],1,
  'Рассказываем об <b>опыте</b> без точного времени → <b>Present Perfect</b> (have been). Слово «three times» не указывает конкретный момент в прошлом.',
  ['Past Simple нужен, когда есть точное время (last year, in 2019).','','Was going — процесс в прошлом, а не опыт.','Am going — будущее/настоящее, не подходит к «three times».'])
G('g2','grammar','tenses_pp',1,'She ___ here since 2019.',['lives','has lived','lived','is living'],1,
  '<b>since + точка во времени</b> → Present Perfect (has lived): действие началось в прошлом и продолжается сейчас.',
  ['Present Simple не сочетается с since.','','Past Simple означает, что она здесь уже не живёт.','Present Continuous не используется с since для длительного состояния.'])
G('g3','grammar','tenses_pp',1,'We ___ the report yesterday.',['have finished','finished','finish','are finishing'],1,
  '<b>yesterday</b> — конкретное время в прошлом. С ним нельзя использовать Present Perfect, только <b>Past Simple</b>.',
  ['Present Perfect не используется с yesterday / last week / in 2010.','','Present Simple — регулярные действия, не прошлое.','Continuous — действие в процессе сейчас.'])
G('g4','grammar','articles',1,'___ Moon orbits ___ Earth.',['A / an','The / the','– / the','The / –'],1,
  'Уникальные в своём роде объекты (the Moon, the Earth, the Sun) используются с <b>the</b>.',
  ['A/an — для одного из многих, а Луна единственная.','','Перед Moon артикль нужен.','Перед Earth тоже нужен the.'])
G('g5','grammar','articles',2,'She is ___ honest woman.',['a','an','the','–'],1,
  'Выбор a/an зависит от <b>звука</b>, а не буквы. «Honest» начинается с гласного звука /ɒ/ (h не читается) → <b>an</b>.',
  ['A — перед согласным звуком, а здесь h немая.','','The — о конкретной, уже известной женщине.','Перед исчисляемым существительным в ед. числе артикль нужен.'])
G('g6','grammar','articles',1,'I love ___ music.',['the','a','–','an'],2,
  'Когда говорим о чём-то <b>в общем</b> (неисчисляемое/мн. число), артикль <b>не нужен</b>.',
  ['The — о конкретной музыке, но здесь вообще о музыке.','A — music неисчисляемое.','','An — music неисчисляемое, да и начинается на согласный.'])
G('g7','grammar','conditionals',1,'If it ___ tomorrow, we will stay at home.',['rains','will rain','rained','would rain'],0,
  'Первый тип условных: <b>If + Present Simple, will + V</b>. После if будущее время не используется.',
  ['','After if нельзя ставить will.','Past Simple — это уже второй тип (нереальное).','Would — для нереального условия.'])
G('g8','grammar','conditionals',2,'If I ___ you, I would study harder.',['am','was','were','be'],2,
  'Второй тип: <b>If + Past Simple, would + V</b>. В нереальных условиях с I/he/she обычно используется <b>were</b>.',
  ['Present Simple — для реальных условий.','Was допустимо в разговорной речи, но на экзамене лучше were.','','Be — не подходит по форме.'])
G('g9','grammar','conditionals',3,'If she had studied, she ___ the exam.',['would pass','would have passed','will pass','passed'],1,
  'Третий тип (нереальное прошлое): <b>If + Past Perfect, would have + V3</b>.',
  ['Would pass — второй тип.','','Will pass — будущее реальное.','Passed — не передаёт сослагательность.'])
G('g10','grammar','passive',2,'The bridge ___ in 1990.',['built','was built','has built','is building'],1,
  'Мост не строил сам, его строили → <b>Passive: was/were + V3</b>. 1990 — прошлое, значит was built.',
  ['Built без was — неполная форма.','','Has built — актив, а подлежащее — не исполнитель.','Is building — актив настоящее.'])
G('g11','grammar','passive',2,'English ___ all over the world.',['speaks','is spoken','spoken','is speaking'],1,
  'Язык «говорят» (им пользуются) → <b>Passive Present: is/are + V3</b>.',
  ['Speaks — актив, но язык не говорит.','','Spoken без is — нет глагола.','Is speaking — актив Continuous.'])
G('g12','grammar','prepositions',1,'She is good ___ mathematics.',['in','at','on','for'],1,
  'Устойчивое сочетание: <b>good at</b> + навык/предмет.',
  ['Good in — ошибка, хотя встречается в речи.','','On — не сочетается с good.','Good for — «полезный для».'])
G('g13','grammar','prepositions',1,'The meeting is ___ Monday.',['in','at','on','by'],2,
  'Дни недели и даты → <b>on</b>. Месяцы/годы → in. Точное время → at.',
  ['In — для месяцев и лет.','At — для точного времени (at 5 pm).','','By — «к сроку».'])
G('g14','grammar','prepositions',2,'He is interested ___ history.',['on','at','in','for'],2,
  'Устойчивое сочетание: <b>interested in</b>.',
  ['On — неверное сочетание.','At — используется с good/bad at.','','For — «подходит для».'])
G('g15','grammar','relative',2,'The man ___ car was stolen called the police.',['who','whose','which','whom'],1,
  '<b>Whose</b> показывает принадлежность (чья машина). Who/whom заменяют человека как подлежащее/дополнение.',
  ['Who заменяет человека, но не показывает «чей».','','Which — для предметов.','Whom — объект, а здесь нужна принадлежность.'])
G('g16','grammar','relative',2,'This is the book ___ I told you about.',['who','that','whose','what'],1,
  'Для предмета в определительном придаточном: <b>that / which</b>.',
  ['Who — для людей.','','Whose — принадлежность.','What не вводит придаточное определительное.'])
G('g17','grammar','modal',2,'You ___ smoke here. It is forbidden.',['mustn\'t','don\'t have to','needn\'t','shouldn\'t'],0,
  '<b>Mustn\'t</b> = запрещено. <b>Don\'t have to</b> = не обязательно (но можно). Классическая ловушка!',
  ['','Don\'t have to — «не обязан», но разрешено.','Needn\'t — не нужно, но не запрещено.','Shouldn\'t — совет, не запрет.'])
G('g18','grammar','modal',2,'You ___ wear a uniform; it is optional.',['mustn\'t','don\'t have to','can\'t','shouldn\'t'],1,
  '«Это по желанию» → <b>don\'t have to</b> (нет обязанности).',
  ['Mustn\'t — запрет.','','Can\'t — нельзя.','Shouldn\'t — не рекомендуется.'])
G('g19','grammar','subject_verb',2,'The number of students ___ increasing.',['are','is','were','have'],1,
  '<b>The number of</b> + мн. число → глагол в <b>единственном</b> (говорим о «числе»). A number of → глагол во мн. числе.',
  ['Are — было бы правильно после «A number of».','','Were — прошедшее, не соответствует контексту.','Have — нет формы глагола -ing.'])
G('g20','grammar','subject_verb',3,'Neither of the answers ___ correct.',['are','is','were','be'],1,
  '<b>Neither of</b> формально требует единственного числа: is.',
  ['Are — разговорный вариант, но экзамен проверяет правило.','','Were — не подходит по времени.','Be — не согласуется.'])
G('g21','grammar','reported',2,'He said he ___ tired.',['is','was','has been','will be'],1,
  'В косвенной речи после said время «сдвигается назад»: is → <b>was</b>.',
  ['Is — прямая речь.','','Has been — не соответствует сдвигу.','Will be — будущее.'])
G('g22','grammar','comparatives',1,'This exam is ___ than the last one.',['more difficult','most difficult','difficulter','more difficulter'],0,
  'Длинные прилагательные (3+ слога): <b>more + adj + than</b>.',
  ['','Most — превосходная степень.','Difficulter — такой формы нет.','Двойное сравнение запрещено.'])
G('g23','grammar','comparatives',1,'She is the ___ student in the class.',['good','better','best','most good'],2,
  'Превосходная степень от good → <b>the best</b>.',
  ['Good — положительная.','Better — сравнительная (между двумя).','','Most good — неправильная форма.'])
G('g24','grammar','gerunds',2,'She suggested ___ a taxi.',['to take','taking','take','to taking'],1,
  'После <b>suggest</b> используется герундий: suggest + V-ing.',
  ['После suggest нельзя to + V.','','Голый инфинитив не используется.','Ошибка в форме.'])
G('g25','grammar','gerunds',2,'I look forward to ___ you.',['see','seeing','saw','to see'],1,
  'В look forward <b>to</b> — это предлог, поэтому дальше идёт герундий.',
  ['После предлога нельзя инфинитив без -ing.','','Saw — прошедшее время.','Двойной to.'])

# Reading passages
P1 = 'p1'; P2 = 'p2'
passages = [
 {'id':'p1','title':'The Return of the Urban Beehive','skill':'reading','src':'Оригинальный текст (создан для этого проекта), 2025','text':
  "Over the past decade, cities from London to Moscow have seen an unexpected newcomer on their rooftops: the honeybee. Urban beekeeping, once a curiosity, has grown into a popular hobby, with thousands of hives now sitting on office blocks, hotels and even museums.\n\nSupporters argue that city bees often do better than their countryside cousins. Gardens and parks provide a wide range of flowers that bloom at different times, while intensive farming in rural areas can leave bees with only a single crop to feed on. Cities also tend to use fewer pesticides.\n\nHowever, some ecologists warn that the trend has a hidden cost. Honeybees are not endangered, and large numbers of them may compete with wild pollinators such as bumblebees for limited food. A study of one large park found that wild bee numbers fell in areas close to new hives. Researchers therefore suggest that people who wish to help pollinators should plant native flowers and leave patches of bare soil for solitary bees instead of simply buying a hive."},
 {'id':'p2','title':'Sleep and Learning','skill':'reading','src':'Оригинальный текст (создан для этого проекта), 2025','text':
  "For many students, an all-night study session before an exam feels like a sign of dedication. Sleep scientists, however, argue that it is one of the least effective ways to prepare.\n\nDuring sleep, the brain does not simply rest; it replays the events of the day and moves information from short-term to long-term memory. This process is strongest during the deep stages of sleep early in the night, and is further supported by dreaming later on.\n\nIn one experiment, two groups of volunteers learned a list of word pairs. One group slept for eight hours, while the other stayed awake for the same period. When tested twelve hours later, the sleepers remembered nearly 40 per cent more pairs. Interestingly, a short afternoon nap of around twenty minutes also improved alertness, although it had little effect on long-term memory. The researchers concluded that students should treat sleep as part of their revision timetable rather than as time taken away from it."}]
TF = ['True','False','Not Given']
R = lambda *a, **k: Q(*a, skill='reading', passage=k.pop('passage'), **k)
R('r1','','tfng',1,'Urban beekeeping is now more common than it used to be.',TF,0,
  'В тексте: «once a curiosity, has grown into a popular hobby» — значит, раньше это было редкостью, а теперь распространено. Утверждение совпадает по смыслу → <b>True</b>.',
  ['','Text says the opposite.','Info is given.'],passage=P1) if False else None
def RQ(id, topic, lvl, q, opts, a, expl, wrong, passage, typ='mcq'):
    Q(id,'reading',topic,lvl,q,opts,a,expl,wrong,passage=passage,typ='mcq')
RQ('r1','tfng',1,'Urban beekeeping is now more common than it used to be.',TF,0,
  'В тексте: «once a curiosity, has grown into a popular hobby» → раньше это было редкостью, теперь распространено. Смысл совпадает → <b>True</b>.',
  ['','Текст говорит обратное.','Информация в тексте есть.'],P1,'tfng')
RQ('r2','tfng',2,'Honeybees are currently in danger of extinction.',TF,1,
  'В тексте прямо: «Honeybees are not endangered». Утверждение противоречит тексту → <b>False</b>.',
  ['Текст этого не утверждает.','','Информация есть и она противоречит утверждению.'],P1,'tfng')
RQ('r3','tfng',2,'Urban beekeepers earn more money from honey than rural farmers do.',TF,2,
  'В тексте нет ничего о доходах. Ловушка: тема пчёл знакома, но конкретно эта информация <b>не упомянута</b> → <b>Not Given</b>.',
  ['Нет информации о доходах.','Нет информации — значит нельзя противоречить.',''],P1,'tfng')
RQ('r4','mcq_reading',2,'What do researchers recommend for people who want to help pollinators?',
  ['Buy more beehives','Plant native flowers and leave bare soil','Stop using honey','Move hives to the countryside'],1,
  'Последнее предложение: «plant native flowers and leave patches of bare soil for solitary bees instead of simply buying a hive».',
  ['Исследователи говорят «instead of simply buying a hive».','','В тексте этого нет.','В тексте этого нет.'],P1)
RQ('r5','mcq_reading',3,'What is the writer\'s main purpose in the text?',
  ['To promote urban beekeeping','To show that a popular trend may have drawbacks','To explain how honey is made','To compare London and Moscow'],1,
  'Сначала плюсы, потом «However ... hidden cost» → автор показывает, что популярный тренд имеет обратную сторону.',
  ['Это только первая половина текста.','','О производстве мёда нет ни слова.','Города упомянуты лишь как примеры.'],P1)
RQ('r6','tfng',1,'Information moves to long-term memory mainly while we are awake.',TF,1,
  'В тексте: информация переносится в долговременную память <b>во время сна</b>. Утверждение противоречит → <b>False</b>.',
  ['','','Информация есть.'][:3] if False else ['Текст говорит об обратном.','','Информация в тексте есть.'],P2,'tfng')
RQ('r7','tfng',1,'The volunteers who slept remembered about 40 per cent more word pairs.',TF,0,
  '«nearly 40 per cent more pairs» ≈ about 40 per cent → <b>True</b>. «Nearly» и «about» — синонимичные приближения.',
  ['','Текст подтверждает.','Информация есть.'],P2,'tfng')
RQ('r8','tfng',2,'A 20-minute nap greatly improves long-term memory.',TF,1,
  'Нап улучшил бодрость (alertness), но «little effect on long-term memory». Утверждение противоречит → <b>False</b>.',
  ['Текст говорит «little effect».','','Информация есть.'],P2,'tfng')
RQ('r9','tfng',3,'Students who sleep more get higher exam grades.',TF,2,
  'Текст говорит о запоминании пар слов, но про оценки на экзаменах ничего нет → <b>Not Given</b>. Не додумывайте!',
  ['Нет данных об оценках.','Нет данных об оценках.',''],P2,'tfng')
RQ('r10','headings',2,'Which heading best fits the second paragraph (starting “During sleep…”)?',
  ['The benefits of long study nights','How sleep helps memory','Why dreams are important','The risks of napping'],1,
  'Абзац объясняет, как мозг во сне переносит информацию в долговременную память → «How sleep helps memory». Остальные заголовки охватывают только деталь или тему, которой нет.',
  ['Абзац говорит обратное.','','Сны упомянуты лишь мельком.','Про риски нет информации.'],P2,'headings')

# Listening
L1 = ("Receptionist: Good morning, City Library. How can I help?\nCaller: Hi, I'd like to join the library.\nReceptionist: Certainly. Is it for yourself?\nCaller: Yes. I'm a student at the university, so I think I get a discount?\nReceptionist: That's right. Students pay twelve pounds a year instead of twenty. You'll need to bring proof of your address.\nCaller: Is a bank statement okay?\nReceptionist: A bank statement is fine, or a utility bill, but not a phone bill.\nCaller: Great. And what time do you close?\nReceptionist: We're open until eight on weekdays, but on Saturdays we close at five, not six as it says on the website. That's an error we're fixing.\nCaller: Perfect, I'll come on Saturday morning.\nReceptionist: Lovely. See you then.")
L2 = ("Welcome to today's seminar on bird migration. Many people believe that birds fly south simply because it gets cold. In fact, the main trigger is the shortening of daylight, which changes the birds' hormones. Cold weather alone doesn't cause migration; some birds leave even when the weather is still warm. The Arctic tern makes the longest journey, travelling roughly seventy thousand kilometres a year between the Arctic and Antarctic. Researchers track them using tiny light sensors weighing less than a gram. Next week we'll look at how birds navigate using the Earth's magnetic field.")
listening = [
 {'id':'l1','title':'Library membership (phone call)','skill':'listening','text':L1,'src':'Оригинальный сценарий (создан для проекта), 2025'},
 {'id':'l2','title':'Seminar: bird migration','skill':'listening','text':L2,'src':'Оригинальный сценарий (создан для проекта), 2025'}]
def LQ(id, topic, lvl, q, opts, a, expl, wrong, passage):
    Q(id,'listening',topic,lvl,q,opts,a,expl,wrong,passage=passage)
LQ('l1q1','listening_form',1,'How much do students pay for annual membership?',['£10','£12','£20','£2'],1,
  'Ключ: «Students pay twelve pounds a year instead of twenty». Ловушка: £20 — цена для обычных читателей.',
  ['Такой суммы не звучало.','','Обычная цена, не студенческая.','Такой суммы не звучало.'],'l1')
LQ('l1q2','listening_form',2,'Which document is NOT accepted as proof of address?',['Bank statement','Utility bill','Phone bill','Passport'][:3]+['None of them'],2,
  'Ключ: «but not a phone bill». Слово «not» легко пропустить — на Listening внимательно слушайте отрицания.',
  ['Принимается.','Принимается.','','Такого варианта не было.'],'l1')
LQ('l1q3','listening_form',2,'What time does the library close on Saturdays?',['5 pm','6 pm','8 pm','4 pm'],0,
  'Ловушка-самоисправление: «six as it says on the website. That\'s an error» → правильно <b>five</b>. 8 — это будни.',
  ['','Это ошибка на сайте.','Это будни.','Не звучало.'],'l1')
LQ('l1q4','listening_form',1,'When will the caller visit the library?',['Friday evening','Saturday morning','Saturday evening','Sunday'],1,
  'Ключ: «I\'ll come on Saturday morning».',
  ['Не звучало.','','Не звучало.','Не звучало.'],'l1')
LQ('l2q1','listening_lecture',2,'What is the main trigger for bird migration?',['Cold weather','Shorter daylight','Lack of food','Magnetic field'],1,
  'Ключ: «the main trigger is the shortening of daylight». Cold weather — распространённое заблуждение, лектор его опровергает.',
  ['Лектор говорит, что это миф.','','Не упоминалось как причина.','Это тема следующего занятия.'],'l2')
LQ('l2q2','listening_lecture',2,'How far does the Arctic tern travel each year?',['7,000 km','70,000 km','17,000 km','700,000 km'],1,
  '«roughly seventy thousand kilometres» = 70,000 km. Тренируйтесь различать seventeen / seventy.',
  ['','','Seventeen ≠ seventy.','Слишком много.'][:1]+['']+['Seventeen ≠ seventy.','Слишком много.'],'l2')
LQ('l2q3','listening_lecture',3,'How heavy are the light sensors?',['More than a gram','Less than a gram','10 grams','5 grams'],1,
  '«weighing less than a gram».',['Наоборот.','','Не звучало.','Не звучало.'],'l2')
LQ('l2q4','listening_lecture',2,'What is the topic of next week\'s seminar?',['Arctic tern habitats','Bird hormones','Navigation by magnetic field','Weather and climate'],2,
  'Последняя фраза: «how birds navigate using the Earth\'s magnetic field».',
  ['Не упоминалось.','Это тема сегодняшнего занятия.','','Не упоминалось.'],'l2')

# SAT R&W
S = lambda *a, **k: Q(*a, skill='rw', exam='sat', **k)
S('s1','sat_transitions',1,'Solar panels have become far cheaper over the past decade. ___, many households still hesitate to install them because of the upfront cost.',['Similarly','Therefore','However','For instance'],2,
  'Между предложениями <b>противопоставление</b>: дешевле, но всё ещё колеблются → However. В SAT сначала определите логику связи (контраст / следствие / пример / добавление).',
  ['Similarly — добавление похожей идеи.','Therefore — следствие, а здесь контраст.','','For instance — пример, а здесь не пример.'],typ='mcq') if False else None
def SQ(id, topic, lvl, q, opts, a, expl, wrong):
    Q(id,'rw',topic,lvl,q,opts,a,expl,wrong,exam='sat')
SQ('s1','sat_transitions',1,'Solar panels have become far cheaper over the past decade. ___, many households still hesitate to install them because of the upfront cost.',['Similarly','Therefore','However','For instance'],2,
  'Между предложениями <b>противопоставление</b>: дешевле, но всё ещё колеблются → However. В SAT сначала определите логику связи: контраст / следствие / пример / добавление.',
  ['Similarly — добавляет похожую идею.','Therefore — следствие, а тут контраст.','','For instance — пример, а здесь не пример.'])
SQ('s2','sat_transitions',1,'The museum\'s new exhibit attracted record crowds. ___, ticket revenue rose by 30 percent.',['In contrast','As a result','Nonetheless','Meanwhile'],1,
  'Рост выручки — <b>следствие</b> большого числа посетителей → As a result.',
  ['In contrast — контраст.','','Nonetheless — уступка, а здесь причина-следствие.','Meanwhile — одновременность.'])
SQ('s3','sat_transitions',2,'Dr. Lee\'s early work focused on coastal erosion. ___, her later research examined river systems.',['Likewise','Therefore','Subsequently','For example'],2,
  'Связь по времени: сначала ранняя работа, затем поздняя → Subsequently («позже»).',
  ['Likewise — «так же».','Therefore — следствие.','','For example — пример.'])
SQ('s4','sat_boundaries',2,'The experiment failed ___ the researchers had miscalculated the temperature.',[', the researchers','the researchers','; because the researchers','because the researchers'],3,
  'Нужно соединить следствие и причину. <b>because</b> — подчинительный союз, перед ним запятая не нужна. Запятая без союза — comma splice; точка с запятой не ставится перед подчинительным союзом.',
  ['Comma splice — два предложения через запятую.','Run-on — нет разделителя.','Точка с запятой + because — ошибка: после ; идёт самостоятельное предложение.',''])
SQ('s5','sat_boundaries',2,'The scientist, along with her two assistants, ___ the results yesterday.',['announce','announced','have announced','were announcing'],1,
  'Вставка «along with ...» не меняет число подлежащего: <b>The scientist</b> — единственное. И «yesterday» требует Past Simple.',
  ['Неверная форма.','','Have — множественное число и Present Perfect.','Were — множественное число.'])
SQ('s6','sat_boundaries',1,'The ___ new policy was welcomed by employees.',['company\'s','companys','companies\'','companys\''],0,
  'Принадлежность одной компании → <b>company\'s</b> (ед. число + \'s).',
  ['','Нет апострофа.','Множественное число — нужно было бы companies\'.','Такой формы нет.'])
SQ('s7','sat_vocab',2,'The author\'s tone is ___ rather than sarcastic; she sincerely praises the mayor.',['genuine','hostile','ambiguous','indifferent'],0,
  'Ключ: «sincerely praises» → искренний = genuine. Подсказка в самом предложении всегда есть.',
  ['','Hostile — враждебный.','Ambiguous — неоднозначный, но автор искренна.','Indifferent — равнодушный.'])
SQ('s8','sat_vocab',3,'Although the plan seemed ___ at first, it soon proved impractical.',['feasible','absurd','hostile','obsolete'],0,
  'Although = контраст. «Impractical» ← противоположность «feasible» (выполнимый).',
  ['','Absurd не создаёт контраста с impractical.','Hostile — не про планы.','Obsolete — устаревший.'])
SQ('s9','sat_concision',1,'Which choice is the most concise and clear?',['Due to the fact that it was raining, we stayed home.','Because it was raining, we stayed home.','The reason we stayed home was because of the rain.','It was raining, which was why we stayed home.'],1,
  'SAT любит краткость без потери смысла. «Due to the fact that» → because.',
  ['Многословно.','','Избыточно: reason ... because.','Многословно.'])
SQ('s10','sat_concision',2,'Walking through the park, ___',['the flowers were beautiful to Maya.','Maya admired the flowers.','the flowers caught her eye as the wind blew.','a bench was where Maya sat.'],1,
  'Причастный оборот должен относиться к подлежащему-человеку, который «walks». Только <b>Maya</b> гуляла. В остальных вариантах — dangling modifier.',
  ['Цветы не гуляли.','','Цветы не гуляли.','Скамейка не гуляла.'])

# SAT Math
M = lambda id, topic, lvl, q, opts, a, expl, wrong: Q(id,'math',topic,lvl,q,opts,a,expl,wrong,exam='sat')
M('m1','m_linear',1,'If 3x + 5 = 20, what is the value of x?',['3','4','5','15'],2,'3x = 20 − 5 = 15 → x = 15 ÷ 3 = <b>5</b>.',['Ошибка при вычитании.','Ошибка при делении.','','15 — это 3x, а не x.'])
M('m2','m_linear',1,'A line passes through (0, 2) and (3, 8). What is its slope?',['1','2','3','6'],1,'Slope = (y₂−y₁)/(x₂−x₁) = (8−2)/(3−0) = 6/3 = <b>2</b>.',['','','Не делите на 2.','6 — это только разность y.'][:1]+['','Взяли число x вместо отношения.','6 — это только разность y.'])
M('m3','m_quad',2,'Which are the solutions of x² − 5x + 6 = 0?',['1 and 6','2 and 3','−2 and −3','−1 and 6'],1,'Разложим: (x − 2)(x − 3) = 0 → x = <b>2</b> или <b>3</b>. Проверка: 2·3 = 6, 2+3 = 5.',['1·6=6, но 1+6=7≠5.','','Знаки неверны: сумма должна быть +5.','−1·6 = −6.'])
M('m4','m_percent',1,'A jacket costs $80 and is discounted by 25%. What is the sale price?',['$55','$60','$65','$20'],1,'Скидка 25% = 80 × 0,25 = 20. Цена = 80 − 20 = <b>$60</b>. (Ловушка: $20 — это сама скидка.)',['Ошибка в расчёте.','','Ошибка в расчёте.','Это размер скидки.'])
M('m5','m_percent',1,'What is 15% of 240?',['24','30','36','45'],2,'0,15 × 240 = <b>36</b>. Можно: 10% = 24, 5% = 12, 24+12 = 36.',['Это 10%.','','','Это 18,75%.'][:1]+['Это 12,5%.','','Это 18,75%.'])
M('m6','m_linear',2,'If x + y = 10 and x − y = 2, what is x?',['4','6','8','12'],1,'Сложим уравнения: 2x = 12 → x = <b>6</b>. Тогда y = 4.',['Это y.','','Не подходит: 8 − y = 2 → y = 6, но тогда x + y = 14.','Не подходит.'])
M('m7','m_quad',2,'If f(x) = 2x² − 3, what is f(3)?',['9','15','21','33'],1,'f(3) = 2·3² − 3 = 2·9 − 3 = 18 − 3 = <b>15</b>. Порядок: сначала степень, затем умножение.',['Ошибка в порядке действий.','','Забыли вычесть 3 или ошиблись знаком.','Ошибка: (2·3)² − 3.'])
M('m8','m_percent',2,'In a class, the ratio of boys to girls is 3:2. If there are 30 students, how many are girls?',['10','12','15','18'],1,'Всего частей 3 + 2 = 5. Одна часть = 30 ÷ 5 = 6. Девочек 2 части = <b>12</b>.',['Ошибка в делении.','','Половина класса.','Это число мальчиков.'])
M('m9','m_percent',1,'What is the mean of 4, 8, 12 and 16?',['8','10','12','40'],1,'Mean = сумма ÷ количество = (4+8+12+16)/4 = 40/4 = <b>10</b>.',['Это медиана-ошибка.','','Ошибка.','Это сумма.'])
M('m10','m_quad',2,'What is 2³ · 2⁴ in simplest form?',['2¹²','2⁷','4⁷','2¹'],1,'При умножении степеней с одинаковым основанием <b>показатели складываются</b>: 2³·2⁴ = 2⁷.',['Показатели не умножаются.','','Основание не меняется.','Показатели не вычитаются.'])
M('m11','m_linear',1,'If y = 3x − 2, what is y when x = 4?',['10','12','14','6'],0,'y = 3·4 − 2 = 12 − 2 = <b>10</b>.',['','Забыли вычесть 2.','Ошибка в расчёте.','Ошибка в расчёте.'])
M('m12','m_geo',2,'A right triangle has legs 6 and 8. What is the length of its hypotenuse?',['10','12','14','100'],0,'Теорема Пифагора: c² = 6² + 8² = 36 + 64 = 100 → c = <b>10</b>.',['','Неверно.','Сумма катетов.','Это c², а не c.'])

KEYS={'l1q1':'Students pay twelve pounds a year instead of twenty','l1q2':'but not a phone bill','l1q3':'we close at five, not six as it says on the website','l1q4':"I'll come on Saturday morning",'l2q1':'the main trigger is the shortening of daylight','l2q2':'roughly seventy thousand kilometres','l2q3':'weighing less than a gram','l2q4':"how birds navigate using the Earth's magnetic field",
'r1':'once a curiosity, has grown into a popular hobby','r2':'Honeybees are not endangered','r4':'plant native flowers and leave patches of bare soil','r5':'However, some ecologists warn that the trend has a hidden cost','r6':'moves information from short-term to long-term memory','r7':'nearly 40 per cent more pairs','r8':'had little effect on long-term memory','r10':'it replays the events of the day and moves information'}
for q in Qs:
    if q['id'] in KEYS: q['key']=KEYS[q['id']]
# fix wrong-list lengths
for q in Qs:
    w = q['wrong']
    while len(w) < len(q['opts']): w.append('')
    q['wrong'] = [x if (x or i==q['a']) else 'Этот вариант не подходит по смыслу — сверь с правилом выше.' for i,x in enumerate(w[:len(q['opts'])])]
dump('questions.json', {'questions': Qs, 'passages': passages, 'listening': listening})

# ---------- LESSONS ----------
def L(id, module, exam, title, icon, minutes, topic, explain, example, task=None, tip=None):
    return dict(id=id, module=module, exam=exam, title=title, icon=icon, min=minutes, topic=topic, explain=explain, example=example, task=task, tip=tip)
lessons = [
 L('v1','vocab','both','Слова по корням и приставкам','🌱',12,'words',
   ['Большинство академических слов построено из <b>корня</b> + приставок + суффиксов.','Приставки: <b>un-</b> (не), <b>re-</b> (снова), <b>inter-</b> (между), <b>sub-</b> (под), <b>pre-</b> (до).','Суффиксы: <b>-tion</b> (существительное), <b>-able</b> (можно), <b>-ize/-ise</b> (делать), <b>-ive</b> (прилагательное).','Знаешь корень — можешь угадать слово, которого не видел.'],
   '<b>viable</b> ← via (жизнь) + -able = «жизнеспособный»; <b>interpret</b> ← inter (между) + pret (толковать).',
   task={'type':'vocab'}, tip='Выучи 5 слов в день, а не 50 в субботу: SRS сам вернёт слова вовремя.'),
 L('gr1','grammar','both','Present Perfect и Past Simple','⏱️',10,'tenses_pp',
   ['<b>Past Simple</b> — конкретное время в прошлом: yesterday, in 2019, last week.','<b>Present Perfect</b> — опыт, результат или период «до сих пор»: ever, never, already, since, for.','Если есть точная дата — всегда Past Simple.','Для длительного состояния: since + точка, for + период.'],
   'I <b>have visited</b> Paris (опыт) → I <b>visited</b> Paris <b>in 2019</b> (точное время).'),
 L('gr2','grammar','both','Артикли a / an / the','📌',8,'articles',
   ['<b>a / an</b> — один из многих, впервые. Выбор по <b>звуку</b>: an hour, a university.','<b>the</b> — конкретный или уникальный: the Sun, the book we discussed.','Без артикля — общие понятия, неисчисляемые и мн. число: I love music.'],
   'She is <b>an</b> honest woman. <b>The</b> Moon orbits <b>the</b> Earth.'),
 L('gr3','grammar','both','Условные предложения (0, 1, 2, 3)','🔀',12,'conditionals',
   ['<b>1-й тип</b>: If + Present, will + V → реальное будущее.','<b>2-й тип</b>: If + Past, would + V → нереальное настоящее (If I were you…).','<b>3-й тип</b>: If + Past Perfect, would have + V3 → нереальное прошлое.','После if не ставим will в 1-м типе.'],
   'If I <b>were</b> rich, I <b>would travel</b>. If she <b>had studied</b>, she <b>would have passed</b>.'),
 L('gr4','grammar','both','Предлоги и устойчивые сочетания','🧩',8,'prepositions',
   ['Дни и даты — <b>on</b>; месяцы, годы — <b>in</b>; точное время — <b>at</b>.','Учите предлоги <b>с глаголом/прилагательным как блок</b>: good at, interested in, depend on.'],
   'He is <b>interested in</b> history. The meeting is <b>on</b> Monday <b>at</b> 5.'),
 L('rd1','reading','ielts','Reading: True / False / Not Given','📖',15,'tfng',
   ['<b>True</b> — текст говорит то же самое (синонимы!).','<b>False</b> — текст <b>противоречит</b> утверждению.','<b>Not Given</b> — в тексте <b>нет</b> информации. Ваши знания не считаются!','Ловушки: слова always / never / all / only, сравнения, причина vs совпадение.'],
   'Утверждение: «Honeybees are in danger». Текст: «are not endangered» → <b>False</b>. Текст ничего не говорит о доходах → <b>Not Given</b>.',
   tip='Сначала найдите место в тексте. Если места нет — вероятно, Not Given.'),
 L('rd2','reading','ielts','Reading: вопросы с выбором и заголовки','🧭',12,'mcq_reading',
   ['Не читайте весь текст перед вопросами: <b>skim</b> (заголовок, первые фразы абзацев).','Ответ почти всегда <b>перефразирован</b> — ищите синонимы, не те же слова.','Неверные варианты часто содержат слова из текста, но с другим смыслом.','Заголовок абзаца = его <b>главная мысль</b>, а не деталь.'],
   'Текст: «people who wish to help pollinators should plant native flowers» → вариант «Plant native flowers» (почти те же слова — но проверьте контекст).'),
 L('ls1','listening','ielts','Listening: форма и ловушки','🎧',12,'listening_form',
   ['Читайте вопросы заранее и <b>предугадывайте тип ответа</b> (число, имя, место).','Ловушка №1: <b>самоисправление</b> — «five, no, sorry, six».','Ловушка №2: <b>отрицание</b> — слово «not» легко пропустить.','Ловушка №3: числа seventeen / seventy — слушайте ударение.'],
   '«…close at five, not six as on the website» → ответ <b>5</b>. Именно последнее уточнение верно.'),
 L('ls2','listening','ielts','Listening: лекции и главная мысль','🎙️',10,'listening_lecture',
   ['Лектор часто <b>опровергает миф</b> («Many people believe… In fact…»). Ответ после In fact.','Слова-сигналы: however, in fact, the main point, what is important.','Запоминайте числа и единицы измерения.'],
   '«Many people believe… In fact, the main trigger is daylight» → ответ: daylight.'),
 L('wr1','writing','ielts','Writing Task 1: описание графика','📊',20,'writing',
   ['Структура: <b>Introduction</b> (перефразируйте задание) → <b>Overview</b> (2 главных тренда, без цифр) → <b>Body 1</b> и <b>Body 2</b> (данные).','Минимум 150 слов, ~20 минут.','Лексика трендов: rose sharply, fluctuated, remained stable, peaked at, accounted for.','Не пишите мнение — только факты с графика.'],
   '<i>The line graph illustrates changes in… Overall, X increased while Y fell…</i>',
   task={'type':'writing','id':'t1'}),
 L('wr2','writing','ielts','Writing Task 2: эссе','✍️',30,'writing',
   ['Минимум 250 слов, ~40 минут. 4 абзаца: <b>Intro / Body 1 / Body 2 / Conclusion</b>.','Intro: перефраз + <b>thesis</b> (ваша позиция).','Body: Point → Explanation → Example.','Связки: Firstly, Moreover, However, As a result — но не в каждой строке!','Критерии: Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy.'],
   'Thesis: <i>While remote work has drawbacks, I believe its advantages outweigh them.</i>',
   task={'type':'writing','id':'t2'}),
 L('sp1','speaking','ielts','Speaking: Part 1, 2, 3','🎤',15,'speaking',
   ['<b>Part 1</b> (4–5 мин): личные темы, ответ 2–3 предложения. Ответ + причина + пример.','<b>Part 2</b>: 1 минута подготовки, 2 минуты монолога. Используйте план: Who/What/When/Where/Why/Feelings.','<b>Part 3</b>: абстрактные вопросы — мнение + причина + контраст.','Не заучивайте тексты: экзаменатор это замечает.'],
   '<i>Well, I’d say… The main reason is that… For example…</i>',
   task={'type':'speaking'}),
 L('sat1','sat_rw','sat','SAT R&W: переходные слова','🔗',10,'sat_transitions',
   ['Определите логику между предложениями: <b>контраст</b> (However), <b>следствие</b> (As a result), <b>пример</b> (For instance), <b>добавление</b> (Moreover), <b>время</b> (Subsequently).','Сначала закройте варианты и скажите связь своими словами.'],
   'Cheaper panels… ___, many hesitate → <b>However</b> (контраст).'),
 L('sat2','sat_rw','sat','SAT R&W: границы предложений','✂️',12,'sat_boundaries',
   ['Два самостоятельных предложения нельзя соединять запятой (comma splice).','Исправления: точка, <b>;</b>, запятая + and/but, подчинительный союз.','Вставки (along with…) не меняют число подлежащего.','Принадлежность: ед. — company’s, мн. — companies’.'],
   '✗ It rained, we left. ✓ It rained; we left. ✓ Because it rained, we left.'),
 L('sat3','sat_rw','sat','SAT R&W: слова в контексте и краткость','🪶',10,'sat_vocab',
   ['В вопросах на слова ищите <b>подсказку внутри предложения</b>: союзы although / rather than задают контраст.','Выбирайте самый краткий вариант, если смысл и грамматика сохранены.'],
   '«sincerely praises» → <b>genuine</b>.'),
 L('smath1','sat_math','sat','Math: линейные уравнения и наклон','📐',15,'m_linear',
   ['Решайте как весы: что делаем слева, делаем справа.','Наклон: <b>(y₂ − y₁)/(x₂ − x₁)</b>.','Системы: сложение или подстановка.'],
   '3x + 5 = 20 → 3x = 15 → x = 5. Delta y / delta x = 6/3 = 2.'),
 L('smath2','sat_math','sat','Math: квадраты, функции, степени','🧮',15,'m_quad',
   ['Разложение: x² + bx + c = (x + p)(x + q), где p·q = c, p + q = b.','f(3): подставьте и соблюдайте порядок действий.','Степени: aᵐ · aⁿ = aᵐ⁺ⁿ.'],
   'x² − 5x + 6 = (x − 2)(x − 3).'),
 L('smath3','sat_math','sat','Math: проценты, отношения, среднее','💯',12,'m_percent',
   ['x% от N = N · x/100. Скидка 25% → умножаем на 0,75.','Отношение a:b — всего a+b частей.','Среднее = сумма ÷ количество.'],
   '80 − 25% = 80 · 0,75 = 60.'),
]
modules = [
 {'id':'vocab','title':'Словарь','icon':'📚','exam':'both'},
 {'id':'grammar','title':'Грамматика','icon':'🔤','exam':'both'},
 {'id':'reading','title':'IELTS Reading','icon':'📖','exam':'ielts'},
 {'id':'listening','title':'IELTS Listening','icon':'🎧','exam':'ielts'},
 {'id':'writing','title':'IELTS Writing','icon':'✍️','exam':'ielts'},
 {'id':'speaking','title':'IELTS Speaking','icon':'🎤','exam':'ielts'},
 {'id':'sat_rw','title':'SAT Reading & Writing','icon':'🔗','exam':'sat'},
 {'id':'sat_math','title':'SAT Math','icon':'📐','exam':'sat'}]
dump('lessons.json', {'modules': modules, 'lessons': lessons})

# ---------- WRITING / SPEAKING PROMPTS ----------
dump('prompts.json', {
 'writing': [
  {'id':'t1','exam':'ielts','kind':'Task 1','min':20,'minWords':150,'title':'Graph description','prompt':'The table below shows the percentage of people in one country who used the internet daily, by age group, in 2005, 2015 and 2025: 16–24: 70%, 85%, 97%; 25–44: 55%, 80%, 95%; 45–64: 25%, 60%, 88%; 65+: 5%, 25%, 62%. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.'},
  {'id':'t2','exam':'ielts','kind':'Task 2','min':40,'minWords':250,'title':'Remote work','prompt':'More and more people work from home rather than in an office. Do the advantages of this development outweigh the disadvantages? Give reasons for your answer and include any relevant examples from your own knowledge or experience.'},
  {'id':'t3','exam':'ielts','kind':'Task 2','min':40,'minWords':250,'title':'AI in education','prompt':'Some people think that artificial intelligence tools should be used in classrooms from an early age, while others believe this harms learning. Discuss both views and give your own opinion.'},
  {'id':'s1','exam':'sat','kind':'SAT Expression of Ideas','min':15,'minWords':80,'title':'Rewrite for clarity','prompt':'Write a clear paragraph (80+ words) explaining why public libraries are still important in the digital age, using at least one transition and one specific example.'}],
 'speaking': {
  'part1': ['Do you work or are you a student?','What do you enjoy doing in your free time?','Tell me about the place where you live.','How often do you use public transport?','Do you prefer to study in the morning or at night? Why?','What kind of music do you like?'],
  'part2': [
   {'topic':'Describe a teacher who influenced you.','points':['who the person was','what they taught you','how they influenced you','and explain why you remember them']},
   {'topic':'Describe a useful app on your phone.','points':['what it is','how often you use it','what it helps you do','and explain why it is useful']},
   {'topic':'Describe a place you would like to visit.','points':['where it is','how you know about it','what you would do there','and explain why you want to go']}],
  'part3': ['How has technology changed the way people learn?','Do you think teachers will be replaced by technology?','Why do some people find it difficult to learn languages?','How important is it for young people to travel?']}})

# ---------- BOOKS + SOURCES ----------
dump('sources.json', {'items': [
 {'cat':'own','title':'Встроенные уроки, грамматические и SAT-вопросы, тексты Reading/Listening','license':'Оригинальные материалы проекта (MIT)','year':2025},
 {'cat':'own','title':'Словарь (≈250 слов) с определениями и примерами','license':'Оригинальные определения проекта','year':2025},
 {'cat':'open','title':'IELTS official sample test materials','license':'Открытые образцы IELTS — ссылка, не копия: ielts.org','year':2025,'url':'https://ielts.org/take-a-test/preparation-resources/sample-test-questions'},
 {'cat':'open','title':'College Board Bluebook — бесплатные практические тесты','license':'Только по ссылке, материалы не встроены: bluebook.collegeboard.org','year':2025,'url':'https://bluebook.collegeboard.org'},
 {'cat':'open','title':'Khan Academy — Official Digital SAT Prep','license':'CC BY-NC-SA, только по ссылке','year':2025,'url':'https://www.khanacademy.org/test-prep/sat'},
 {'cat':'ai','title':'Задания, сгенерированные ИИ в духе современных экзаменов','license':'Помечаются «ИИ» и не являются официальными','year':2026},
 {'cat':'user','title':'Твои книги, слова и тексты','license':'Хранятся только на твоём устройстве','year':2026}]})
print('words', len(words), 'questions', len(Qs), 'lessons', len(lessons))
