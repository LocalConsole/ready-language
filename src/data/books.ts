/** Книги для домашек. Названия — общие; содержимое (слова по страницам) пользователь добавляет сам. */
export const BOOKS: { id: string; title: string; exam: 'ielts' | 'sat' | 'both' }[] = [
  { id: 'cam', title: 'Cambridge IELTS', exam: 'ielts' },
  { id: 'barron', title: "Barron's Essential Words for the IELTS", exam: 'ielts' },
  { id: 'sat-guide', title: 'Official Digital SAT Study Guide', exam: 'sat' },
  { id: 'own', title: 'Мои слова и тексты', exam: 'both' },
];
