export const EXAM_COUNTS = {
  single: 60,
  multiple: 15,
  judge: 20,
};

export const TYPE_LABELS = {
  single: '单选题',
  multiple: '多选题',
  judge: '判断题',
};

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function pickExamQuestions(bank, counts = EXAM_COUNTS, random = Math.random) {
  const selected = Object.entries(counts).flatMap(([type, count]) => {
    const typedQuestions = bank.filter((question) => question.type === type);
    if (typedQuestions.length < count) {
      throw new Error(`${TYPE_LABELS[type] ?? type}数量不足，需要${count}题，当前${typedQuestions.length}题`);
    }
    return shuffle(typedQuestions, random).slice(0, count);
  });

  return selected.map((question, index) => ({
    ...randomizeQuestionOptions(question, random),
    examNo: index + 1,
  }));
}

export function normalizeAnswer(answer) {
  return String(answer ?? '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
    .join('');
}

export function randomizeQuestionOptions(question, random = Math.random) {
  if (question.type === 'judge') {
    return {
      ...question,
      options: question.options,
      answer: normalizeAnswer(question.answer),
      originalAnswer: normalizeAnswer(question.answer),
    };
  }

  if (!Array.isArray(question.options) || question.options.length === 0) {
    return {
      ...question,
      answer: normalizeAnswer(question.answer),
      originalAnswer: normalizeAnswer(question.answer),
    };
  }

  const originalAnswer = new Set(normalizeAnswer(question.answer).split(''));
  const shuffledOptions = shuffle(question.options, random);
  const nextOptions = shuffledOptions.map((option, index) => ({
    ...option,
    originalKey: option.originalKey ?? option.key,
    key: String.fromCharCode(65 + index),
  }));
  const nextAnswer = nextOptions
    .filter((option) => originalAnswer.has(option.originalKey))
    .map((option) => option.key)
    .sort()
    .join('');

  return {
    ...question,
    options: nextOptions,
    answer: nextAnswer,
    originalAnswer: normalizeAnswer(question.answer),
  };
}

export function calculateScore(questions, answers) {
  let score = 0;
  const details = questions.map((question) => {
    const userAnswer = normalizeAnswer(answers[question.id]);
    const correctAnswer = normalizeAnswer(question.answer);
    const isCorrect = userAnswer === correctAnswer;
    if (isCorrect) {
      score += question.score;
    }
    return {
      ...question,
      userAnswer,
      correctAnswer,
      isCorrect,
      earnedScore: isCorrect ? question.score : 0,
    };
  });

  return {
    score: Number(score.toFixed(1)),
    total: Number(questions.reduce((sum, question) => sum + question.score, 0).toFixed(1)),
    correctCount: details.filter((detail) => detail.isCorrect).length,
    details,
  };
}

export function maskName(name) {
  const value = String(name ?? '').trim();
  if (!value) return '';
  if (value.length === 1) return `${value}*`;
  if (value.length === 2) return `${value[0]}*`;
  return `${value[0]}*${value[value.length - 1]}`;
}

export function maskPhone(phone) {
  const value = String(phone ?? '').trim();
  if (value.length < 8) return value.replace(/.(?=.{2})/g, '*');
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

export function getLocalDateKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getRecordDateKey(record) {
  return record.dateKey ?? getLocalDateKey(record.submittedAt);
}

export function getDailyRanking(records, dateKey = getLocalDateKey()) {
  return records
    .filter((record) => getRecordDateKey(record) === dateKey)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (left.durationMs !== right.durationMs) return left.durationMs - right.durationMs;
      return new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime();
    })
    .map((record, index) => ({
      ...record,
      rank: index + 1,
      name: maskName(record.name),
      phone: maskPhone(record.phone),
    }));
}

export function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function getScoreText(score) {
  return Number(score).toFixed(2);
}
