import { QUESTION_BANK } from './questions.mjs?v=20260609h';
import {
  EXAM_COUNTS,
  TYPE_LABELS,
  calculateScore,
  formatDuration,
  getDailyRanking,
  getLocalDateKey,
  getScoreText,
  pickExamQuestions,
} from './examLogic.mjs?v=20260609h';

const STORAGE_KEY = 'supply-chain-exam-records-v1';

const state = {
  user: null,
  questions: [],
  answers: {},
  currentIndex: 0,
  startedAt: null,
  timerId: null,
  result: null,
  currentTab: 'all',
};

const els = {
  pageTitle: document.querySelector('#pageTitle'),
  backButton: document.querySelector('#backButton'),
  rankingShortcut: document.querySelector('#rankingShortcut'),
  loginView: document.querySelector('#loginView'),
  examView: document.querySelector('#examView'),
  resultView: document.querySelector('#resultView'),
  loginForm: document.querySelector('#loginForm'),
  nameInput: document.querySelector('#nameInput'),
  phoneInput: document.querySelector('#phoneInput'),
  queryPhoneInput: document.querySelector('#queryPhoneInput'),
  queryHistoryButton: document.querySelector('#queryHistoryButton'),
  historyList: document.querySelector('#historyList'),
  historyHint: document.querySelector('#historyHint'),
  progressText: document.querySelector('#progressText'),
  timerText: document.querySelector('#timerText'),
  progressBar: document.querySelector('#progressBar'),
  questionType: document.querySelector('#questionType'),
  questionScore: document.querySelector('#questionScore'),
  questionStem: document.querySelector('#questionStem'),
  selectAllButton: document.querySelector('#selectAllButton'),
  optionsList: document.querySelector('#optionsList'),
  nextQuestionButton: document.querySelector('#nextQuestionButton'),
  scoreText: document.querySelector('#scoreText'),
  durationText: document.querySelector('#durationText'),
  reviewList: document.querySelector('#reviewList'),
  rankingList: document.querySelector('#rankingList'),
  restartButton: document.querySelector('#restartButton'),
  homeButton: document.querySelector('#homeButton'),
  tabs: [...document.querySelectorAll('.tab')],
};

function readRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function writeRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function showView(viewName) {
  const titles = {
    login: '夏邑物资供应分中心模拟考试',
    exam: '夏邑物资供应分中心模拟考试',
    result: '考试结果',
  };
  els.pageTitle.textContent = titles[viewName];
  els.backButton.classList.toggle('hidden', viewName === 'login');
  for (const [name, element] of Object.entries({
    login: els.loginView,
    exam: els.examView,
    result: els.resultView,
  })) {
    element.classList.toggle('active', name === viewName);
  }
}

function validatePhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone);
}

function startExam(user) {
  state.user = user;
  state.questions = pickExamQuestions(QUESTION_BANK, EXAM_COUNTS);
  state.answers = {};
  state.currentIndex = 0;
  state.startedAt = null;
  state.result = null;
  stopTimer();
  els.timerText.textContent = '00:00:00';
  showView('exam');
  renderQuestion();
}

function renderQuestion() {
  const question = state.questions[state.currentIndex];
  const isLast = state.currentIndex === state.questions.length - 1;

  els.progressText.textContent = `第 ${state.currentIndex + 1} / ${state.questions.length} 题`;
  els.progressBar.style.width = `${(state.currentIndex / state.questions.length) * 100}%`;
  els.questionType.textContent = TYPE_LABELS[question.type];
  els.questionScore.textContent = `${question.score} 分`;
  els.questionStem.textContent = question.stem;
  renderSelectAllButton(question);
  els.optionsList.innerHTML = '';

  question.options.forEach((option) => {
    const item = document.createElement('button');
    item.className = 'option-item';
    item.type = 'button';
    item.dataset.key = option.key;
    item.innerHTML = `<span class="option-key">${option.key}</span><span>${option.text}</span>`;
    item.classList.toggle('selected', getSelectedKeys(question).includes(option.key));
    item.addEventListener('click', () => toggleOption(question, option.key));
    els.optionsList.append(item);
  });

  els.nextQuestionButton.textContent = isLast ? '提交试卷' : '下一题';
}

function getSelectedKeys(question) {
  return String(state.answers[question.id] ?? '').split('').filter(Boolean);
}

function renderSelectAllButton(question) {
  const isMultiple = question.type === 'multiple';
  els.selectAllButton.classList.toggle('hidden', !isMultiple);
  if (!isMultiple) return;

  const selectedCount = getSelectedKeys(question).length;
  const isAllSelected = selectedCount === question.options.length;
  els.selectAllButton.textContent = isAllSelected ? '取消全选' : '全选';
}

function toggleSelectAll() {
  const question = state.questions[state.currentIndex];
  if (question.type !== 'multiple') return;

  const selectedCount = getSelectedKeys(question).length;
  const isAllSelected = selectedCount === question.options.length;
  state.answers[question.id] = isAllSelected ? '' : question.options.map((option) => option.key).join('');
  renderQuestion();
}

function toggleOption(question, key) {
  if (question.type === 'multiple') {
    const selected = new Set(getSelectedKeys(question));
    if (selected.has(key)) {
      selected.delete(key);
    } else {
      selected.add(key);
    }
    state.answers[question.id] = [...selected].sort().join('');
  } else {
    state.answers[question.id] = key;
  }
  renderQuestion();
}

function ensureCurrentAnswered() {
  const question = state.questions[state.currentIndex];
  if (!state.answers[question.id]) {
    alert('请先选择答案');
    return false;
  }
  return true;
}

function startTimerAfterFirstAnswer() {
  if (!state.startedAt) {
    state.startedAt = Date.now();
    startTimer();
  }
}

function goNextQuestion() {
  if (!ensureCurrentAnswered()) return;
  startTimerAfterFirstAnswer();

  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex += 1;
    renderQuestion();
    return;
  }
  finishExam();
}

function startTimer() {
  stopTimer();
  state.timerId = window.setInterval(() => {
    els.timerText.textContent = formatDuration(Date.now() - state.startedAt);
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function finishExam() {
  stopTimer();
  const submittedAt = new Date();
  const durationMs = Math.max(0, Date.now() - state.startedAt);
  const result = calculateScore(state.questions, state.answers);
  const record = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name: state.user.name,
    phone: state.user.phone,
    score: result.score,
    total: result.total,
    correctCount: result.correctCount,
    questionCount: state.questions.length,
    durationMs,
    submittedAt: submittedAt.toISOString(),
    dateKey: getLocalDateKey(submittedAt),
    details: result.details,
  };
  const records = readRecords();
  records.push(record);
  writeRecords(records);
  state.result = record;
  state.currentTab = 'all';
  showView('result');
  renderResult();
}

function renderResult() {
  els.scoreText.textContent = getScoreText(state.result.score);
  els.durationText.textContent = formatDuration(state.result.durationMs);
  setActiveTab(state.currentTab);
}

function setActiveTab(tabName) {
  state.currentTab = tabName;
  els.tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === tabName));
  const isRanking = tabName === 'ranking';
  els.reviewList.classList.toggle('hidden', isRanking);
  els.rankingList.classList.toggle('hidden', !isRanking);
  if (isRanking) {
    renderRanking();
  } else {
    renderReview(tabName);
  }
}

function renderReview(tabName) {
  let details = state.result.details;
  if (tabName === 'correct') details = details.filter((detail) => detail.isCorrect);
  if (tabName === 'wrong') details = details.filter((detail) => !detail.isCorrect);

  if (!details.length) {
    els.reviewList.innerHTML = '<div class="empty-state">暂无题目</div>';
    return;
  }

  els.reviewList.innerHTML = details.map((detail, index) => `
    <article class="review-item">
      <div class="review-head">
        <span>${index + 1}. ${TYPE_LABELS[detail.type]} · ${detail.score}分</span>
        <span class="${detail.isCorrect ? 'correct' : 'wrong'}">${detail.isCorrect ? '答对' : '答错'}</span>
      </div>
      <p class="review-stem">${escapeHtml(detail.stem)}</p>
      <div class="review-answer">
        我的答案：${detail.userAnswer || '未作答'}<br>
        正确答案：${detail.correctAnswer}
      </div>
    </article>
  `).join('');
}

function renderRanking() {
  const ranking = getDailyRanking(readRecords());
  if (!ranking.length) {
    els.rankingList.innerHTML = '<div class="empty-state">今日暂无排行</div>';
    return;
  }

  els.rankingList.innerHTML = ranking.map((record) => {
    const badgeClass = record.rank === 1 ? 'top gold' : record.rank === 2 ? 'top silver' : record.rank === 3 ? 'top bronze' : '';
    const meClass = state.result && record.id === state.result.id ? '<span class="me-flag">我</span>' : '';
    return `
      <article class="ranking-row">
        <div class="rank-badge ${badgeClass}">${record.rank}</div>
        <div class="rank-person">
          <div class="rank-name">${meClass}${escapeHtml(record.name)}</div>
          <div class="rank-meta">用时：${formatDuration(record.durationMs)}<br>手机号码：${record.phone}</div>
        </div>
        <div class="rank-score">${getScoreText(record.score)}<br>分</div>
      </article>
    `;
  }).join('');
}

function renderHistory(phone) {
  const records = readRecords()
    .filter((record) => record.phone === phone)
    .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime());

  els.historyHint.textContent = records.length ? `共 ${records.length} 次` : '暂无记录';
  if (!records.length) {
    els.historyList.className = 'empty-state';
    els.historyList.textContent = '暂无考试记录';
    return;
  }

  els.historyList.className = '';
  els.historyList.innerHTML = records.map((record) => `
    <div class="history-item">
      <div>
        <strong>${getScoreText(record.score)} 分</strong><br>
        <span>${new Date(record.submittedAt).toLocaleString()} · 用时 ${formatDuration(record.durationMs)}</span>
      </div>
      <span>${record.correctCount}/${record.questionCount}</span>
    </div>
  `).join('');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

els.loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = els.nameInput.value.trim();
  const phone = els.phoneInput.value.trim();
  if (!name) {
    alert('请输入姓名');
    return;
  }
  if (!validatePhone(phone)) {
    alert('请输入正确的 11 位手机号');
    return;
  }
  startExam({ name, phone });
});

els.queryHistoryButton.addEventListener('click', () => {
  const phone = els.queryPhoneInput.value.trim();
  if (!validatePhone(phone)) {
    alert('请输入正确的 11 位手机号');
    return;
  }
  renderHistory(phone);
});

els.selectAllButton.addEventListener('click', toggleSelectAll);
els.nextQuestionButton.addEventListener('click', goNextQuestion);
els.restartButton.addEventListener('click', () => startExam(state.user));
els.homeButton.addEventListener('click', () => showView('login'));
els.backButton.addEventListener('click', () => {
  if (els.resultView.classList.contains('active')) {
    showView('login');
  } else if (confirm('考试尚未完成，确定返回首页吗？')) {
    stopTimer();
    showView('login');
  }
});
els.rankingShortcut.addEventListener('click', () => {
  if (!state.result) {
    state.result = {
      score: 0,
      durationMs: 0,
      details: [],
    };
  }
  showView('result');
  setActiveTab('ranking');
});
els.tabs.forEach((tab) => {
  tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
});

window.addEventListener('beforeunload', stopTimer);
