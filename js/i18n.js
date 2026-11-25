(function(){
const D={
ru:{home:'Главная',path:'Путь',practice:'Практика',exam:'Экзамен',me:'Профиль',dash:'Прогресс',settings:'Настройки',journal:'Журнал ошибок',sources:'Откуда материалы',
 start:'Начать',next:'Дальше',back:'Назад',check:'Проверить',skip:'Пропустить',finish:'Завершить',retry:'Ещё раз',close:'Закрыть',save:'Сохранить',
 mission:'Миссия дня',streak:'Серия',xp:'Опыт',daysLeft:'дней до экзамена',minPerDay:'мин в день',
 goal:'Твоя цель',zero:'Начать с нуля',diag:'Пройти диагностику',loading:'Миша ищет нужную страницу…',
 correct:'Верно!',wrong:'Неверно',yourAnswer:'Твой ответ',rightAnswer:'Правильный ответ',why:'Почему так',whyNot:'Почему твой вариант не подходит',tryYourself:'Теперь попробуй сам',
 understood:'Понял',simpler:'Объясни проще',addJournal:'В журнал ошибок',inJournal:'В журнале',
 theme:'Тема',light:'Светлая',dark:'Тёмная',language:'Язык интерфейса',sound:'Звуки',bigText:'Крупный шрифт',dys:'Режим для дислексии',reduce:'Меньше анимации',
 export:'Экспорт прогресса',import:'Импорт прогресса',reset:'Сбросить всё',apiKeys:'ИИ-ключи (хранятся только на этом устройстве)',
 aiOff:'ИИ недоступен — работаю на локальной базе',aiLeft:'ИИ',words:'Слова',cards:'Карточки',reader:'Читалка',books:'Книги',
 addWord:'В мои слова',review:'Разбор ошибок с Мишей',score:'Результат',overall:'Общий'},
en:{home:'Home',path:'Path',practice:'Practice',exam:'Exam',me:'Profile',dash:'Progress',settings:'Settings',journal:'Mistake log',sources:'Material sources',
 start:'Start',next:'Next',back:'Back',check:'Check',skip:'Skip',finish:'Finish',retry:'Try again',close:'Close',save:'Save',
 mission:'Daily mission',streak:'Streak',xp:'XP',daysLeft:'days to exam',minPerDay:'min a day',
 goal:'Your goal',zero:'Start from zero',diag:'Take diagnostic',loading:'Misha is looking for the page…',
 correct:'Correct!',wrong:'Incorrect',yourAnswer:'Your answer',rightAnswer:'Correct answer',why:'Why',whyNot:'Why your choice is wrong',tryYourself:'Now try yourself',
 understood:'Got it',simpler:'Explain simpler',addJournal:'Add to mistake log',inJournal:'In the log',
 theme:'Theme',light:'Light',dark:'Dark',language:'Interface language',sound:'Sounds',bigText:'Large text',dys:'Dyslexia mode',reduce:'Reduce motion',
 export:'Export progress',import:'Import progress',reset:'Reset everything',apiKeys:'AI keys (stored on this device only)',
 aiOff:'AI unavailable — using the local database',aiLeft:'AI',words:'Words',cards:'Flashcards',reader:'Reader',books:'Books',
 addWord:'Add to my words',review:'Mistake review with Misha',score:'Score',overall:'Overall'}};
const LINES={
 ru:{hello:['Привет! Я Миша. Сам когда-то зубрил английский под гул самовара — теперь помогаю тебе.','Здравствуй! Начнём? Чай остынет — а слова нет.','О, ты пришёл! Давай по чуть-чуть, но каждый день.'],
  think:['Хм… дай-ка подумаю.','Так-так… тут есть ловушка.','Прочитай ещё раз — внимательно, как письмо из дома.'],
  happy:['Отлично! Так держать.','Верно! Медведь доволен.','Чистая работа!','Вот это по-нашему!'],
  sad:['Ничего страшного — ошибки это тоже конспект.','Бывает. Разберём вместе — и больше не повторится.','Не вешай нос: на ошибках и учатся.'],
  cheer:['Ты справишься! Я в тебя верю.','Ещё чуть-чуть. Терпение и труд — и band растёт.','Давай, шаг за шагом.'],
  board:['Смотри на доску — тут самое важное.','Запоминай схему: она выручит на экзамене.'],
  celebrate:['Ура-а! Самовар на стол!','Победа! Конфетти за мой счёт.','Это достойно пирога!'],
  explain:['Сейчас объясню, в чём подвох.','Тут все спотыкаются — смотри, как это устроено.']},
 en:{hello:['Hi! I am Misha. I used to cram English myself — now I teach it.','Welcome back! The tea is hot, the words are fresh.'],think:['Hmm… let me think.','There is a trap here.'],happy:['Great job!','Correct! The bear is pleased.'],sad:['No worries — mistakes are notes too.','Let us fix it together.'],cheer:['You can do it!','Step by step.'],board:['Look at the board — this matters.'],celebrate:['Hooray! Samovar on the table!'],explain:['Let me explain the trick.']}};
const S=window.I18N={lang:'ru',
 t(k){return (D[S.lang]&&D[S.lang][k])||D.ru[k]||k},
 line(state){const L=(LINES[S.lang]||LINES.ru)[state]||LINES.ru[state]||LINES.ru.hello;return L[Math.floor(Math.random()*L.length)]}};
window.t=k=>S.t(k);
})();
