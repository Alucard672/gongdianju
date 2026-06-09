import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateScore,
  formatDuration,
  getDailyRanking,
  maskName,
  maskPhone,
  pickExamQuestions,
  randomizeQuestionOptions,
} from '../examLogic.mjs';
import { QUESTION_BANK } from '../questions.mjs';

const makeQuestion = (type, id, answer = 'A') => ({
  id: `${type}-${id}`,
  type,
  answer,
  score: type === 'single' ? 1 : type === 'multiple' ? 2 : 0.5,
});

test('pickExamQuestions selects the required exam mix', () => {
  const bank = [
    ...Array.from({ length: 80 }, (_, index) => makeQuestion('single', index)),
    ...Array.from({ length: 30 }, (_, index) => makeQuestion('multiple', index, 'AC')),
    ...Array.from({ length: 25 }, (_, index) => makeQuestion('judge', index)),
  ];

  const exam = pickExamQuestions(bank, { single: 60, multiple: 15, judge: 20 });

  assert.equal(exam.filter((question) => question.type === 'single').length, 60);
  assert.equal(exam.filter((question) => question.type === 'multiple').length, 15);
  assert.equal(exam.filter((question) => question.type === 'judge').length, 20);
  assert.equal(new Set(exam.map((question) => question.id)).size, 95);
  assert.deepEqual(exam.slice(0, 60).map((question) => question.type), Array(60).fill('single'));
  assert.deepEqual(exam.slice(60, 75).map((question) => question.type), Array(15).fill('multiple'));
  assert.deepEqual(exam.slice(75).map((question) => question.type), Array(20).fill('judge'));
});

test('randomizeQuestionOptions remaps the answer letters after shuffling options', () => {
  const question = {
    id: 'q-demo',
    type: 'multiple',
    answer: 'AC',
    options: [
      { key: 'A', text: '原始A' },
      { key: 'B', text: '原始B' },
      { key: 'C', text: '原始C' },
      { key: 'D', text: '原始D' },
    ],
  };

  const shuffled = randomizeQuestionOptions(question, () => 0);

  assert.deepEqual(shuffled.options.map((option) => option.text), ['原始B', '原始C', '原始D', '原始A']);
  assert.equal(shuffled.answer, 'BD');
});

test('randomizeQuestionOptions keeps judge options fixed as A correct and B wrong', () => {
  const question = {
    id: 'q-judge',
    type: 'judge',
    answer: 'A',
    options: [
      { key: 'A', text: '正确' },
      { key: 'B', text: '错误' },
    ],
  };

  const shuffled = randomizeQuestionOptions(question, () => 0);

  assert.deepEqual(shuffled.options, question.options);
  assert.equal(shuffled.answer, 'A');
});

test('calculateScore requires exact answers and totals to 100', () => {
  const questions = [
    ...Array.from({ length: 60 }, (_, index) => makeQuestion('single', index, 'A')),
    ...Array.from({ length: 15 }, (_, index) => makeQuestion('multiple', index, 'AC')),
    ...Array.from({ length: 20 }, (_, index) => makeQuestion('judge', index, 'B')),
  ];
  const answers = Object.fromEntries(questions.map((question) => [question.id, question.answer]));

  assert.equal(calculateScore(questions, answers).score, 100);

  answers['multiple-0'] = 'CA';
  assert.equal(calculateScore(questions, answers).score, 98);
});

test('maskName and maskPhone hide middle values', () => {
  assert.equal(maskName('张三'), '张*');
  assert.equal(maskName('刘海军'), '刘*军');
  assert.equal(maskPhone('19812349997'), '198****9997');
});

test('getDailyRanking sorts by score desc then duration asc and filters by date', () => {
  const records = [
    { name: '张三', phone: '19812349997', score: 99, durationMs: 120000, submittedAt: '2026-06-09T12:00:00.000Z' },
    { name: '刘海军', phone: '13511112182', score: 100, durationMs: 532000, submittedAt: '2026-06-09T12:10:00.000Z' },
    { name: '侯明', phone: '13599990099', score: 100, durationMs: 399000, submittedAt: '2026-06-09T12:20:00.000Z' },
    { name: '旧成绩', phone: '15112346282', score: 100, durationMs: 1, submittedAt: '2026-06-08T12:00:00.000Z' },
  ];

  const ranking = getDailyRanking(records, '2026-06-09');

  assert.deepEqual(ranking.map((record) => record.name), ['侯*', '刘*军', '张*']);
  assert.deepEqual(ranking.map((record) => record.phone), ['135****0099', '135****2182', '198****9997']);
});

test('formatDuration renders hh:mm:ss', () => {
  assert.equal(formatDuration(399000), '00:06:39');
});

test('generated question bank contains enough questions for the exam', () => {
  assert.equal(QUESTION_BANK.length, 604);
  assert.equal(QUESTION_BANK.filter((question) => question.type === 'single').length, 328);
  assert.equal(QUESTION_BANK.filter((question) => question.type === 'multiple').length, 136);
  assert.equal(QUESTION_BANK.filter((question) => question.type === 'judge').length, 140);
});

test('generated question bank splits option delimiters into labeled options', () => {
  const q9 = QUESTION_BANK.find((question) => question.sourceNo === 9);

  assert.deepEqual(q9.options.map((option) => option.key), ['A', 'B', 'C', 'D']);
  assert.deepEqual(q9.options.map((option) => option.text), [
    '资源保障能力',
    '风险防控能力',
    '价值创造能力',
    '行业带动能力',
  ]);

  for (const question of QUESTION_BANK) {
    const maxAnswerIndex = Math.max(...question.answer.split('').map((letter) => letter.charCodeAt(0) - 64));
    assert.ok(
      question.options.length >= maxAnswerIndex,
      `${question.sourceNo} has ${question.options.length} options but answer is ${question.answer}`,
    );
  }
});

test('generated question options do not show delimiter semicolons', () => {
  for (const question of QUESTION_BANK) {
    for (const option of question.options) {
      assert.equal(/[;；]/.test(option.text), false, `${question.sourceNo} ${option.key}: ${option.text}`);
    }
  }
});
