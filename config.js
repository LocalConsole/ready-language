/* Конфиг. Ключи сюда НЕ вписывайте для публичного сайта — они видны всем.
   Безопасный путь: Cloudflare Worker (см. worker/cloudflare-worker.js) и укажите его адрес в proxyUrl. */
window.MISHA_CONFIG={
  proxyUrl:'https://script.google.com/macros/s/AKfycbxgC_2zj5-rVRmzXTVDkKkExT3pRG4YbVRhL5JPs6ALQkrS_pUDbwMTPgN2m50eMUO51w/exec', // готовый ИИ-прокси (Google Apps Script): ключи Groq/Gemini/Mistral/OpenRouter хранятся внутри него
  keys:{groq:'',gemini:'',openrouter:''}, // заглушки; лучше вводить в Настройках
  models:{groq:'llama-3.3-70b-versatile',gemini:'gemini-2.0-flash',openrouter:'meta-llama/llama-3.3-70b-instruct:free'},
  dailySoftLimit:{groq:200,gemini:200,openrouter:100,proxy:300},
  books:[ // книги для домашек; названия — твои, содержимое добавляешь сам
    {id:'cam',title:'Cambridge IELTS',exam:'ielts'},
    {id:'barron',title:"Barron's Essential Words for the IELTS",exam:'ielts'},
    {id:'sat-guide',title:'Official Digital SAT Study Guide',exam:'sat'},
    {id:'own',title:'Мои слова и тексты',exam:'both'}]
};
