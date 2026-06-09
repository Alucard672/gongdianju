import { QUESTION_BANK } from './questions.mjs?v=20260609l';
import {
  EXAM_COUNTS,
  TYPE_LABELS,
  calculateScore,
  formatDuration,
  getLocalDateKey,
  getScoreText,
  pickExamQuestions,
} from './examLogic.mjs?v=20260609l';

const API_BASE = 'https://gongdianju-api.gongdianju.workers.dev';

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
  rankingView: document.querySelector('#rankingView'),
  loginForm: document.querySelector('#loginForm'),
  nameInput: document.querySelector('#nameInput'),
  phoneInput: document.querySelector('#phoneInput'),
  homeRankingButton: document.querySelector('#homeRankingButton'),
  progressText: document.querySelector('#progressText'),
  timerText: document.querySelector('#timerText'),
  progressBar: document.querySelector('#progressBar'),
  questionType: document.querySelector('#questionType'),
  questionScore: document.querySelector('#questionScore'),
  questionStem: document.querySelector('#questionStem'),
  selectAllButton: document.querySelector('#selectAllButton'),
  optionsList: document.querySelector('#optionsList'),
  previousQuestionButton: document.querySelector('#previousQuestionButton'),
  inlineNextQuestionButton: document.querySelector('#inlineNextQuestionButton'),
  questionCardButton: document.querySelector('#questionCardButton'),
  submitExamButton: document.querySelector('#submitExamButton'),
  questionSheet: document.querySelector('#questionSheet'),
  questionSheetBackdrop: document.querySelector('#questionSheetBackdrop'),
  closeQuestionSheetButton: document.querySelector('#closeQuestionSheetButton'),
  questionSheetSummary: document.querySelector('#questionSheetSummary'),
  questionSheetBody: document.querySelector('#questionSheetBody'),
  scoreText: document.querySelector('#scoreText'),
  durationText: document.querySelector('#durationText'),
  reviewList: document.querySelector('#reviewList'),
  rankingList: document.querySelector('#rankingList'),
  homeRankingList: document.querySelector('#homeRankingList'),
  restartButton: document.querySelector('#restartButton'),
  homeButton: document.querySelector('#homeButton'),
  tabs: [...document.querySelectorAll('.tab')],
};

if (!history.state) {
  history.replaceState({ view: 'login' }, '', '#login');
}

function showView(viewName) {
  const titles = {
    login: '夏邑物资供应分中心模拟考试',
    exam: '夏邑物资供应分中心模拟考试',
    result: '考试结果',
    ranking: '排行榜',
  };
  els.pageTitle.textContent = titles[viewName];
  els.backButton.classList.toggle('hidden', viewName === 'login');
  for (const [name, element] of Object.entries({
    login: els.loginView,
    exam: els.examView,
    result: els.resultView,
    ranking: els.rankingView,
  })) {
    element.classList.toggle('active', name === viewName);
  }
}

function setHistoryState(viewName, options = {}) {
  const payload = { view: viewName, ...options };
  const hash = viewName === 'exam' ? `#q-${options.index + 1}` : `#${viewName}`;
  history.pushState(payload, '', hash);
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
  setHistoryState('exam', { index: state.currentIndex });
}

function renderQuestion() {
  const question = state.questions[state.currentIndex];
  const isLast = state.currentIndex === state.questions.length - 1;

  els.progressText.textContent = `第 ${state.currentIndex + 1} / ${state.questions.length} 题`;
  els.progressBar.style.width = `${((state.currentIndex + 1) / state.questions.length) * 100}%`;
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

  els.previousQuestionButton.disabled = state.currentIndex === 0;
  els.inlineNextQuestionButton.disabled = isLast;
  els.inlineNextQuestionButton.textContent = isLast ? '最后一题' : '下一题';
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
  startTimerAfterFirstAnswer();

  const selectedCount = getSelectedKeys(question).length;
  const isAllSelected = selectedCount === question.options.length;
  state.answers[question.id] = isAllSelected ? '' : question.options.map((option) => option.key).join('');
  renderQuestion();
}

function toggleOption(question, key) {
  startTimerAfterFirstAnswer();
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

function startTimerAfterFirstAnswer() {
  if (!state.startedAt) {
    state.startedAt = Date.now();
    startTimer();
  }
}

function goNextQuestion() {
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex += 1;
    renderQuestion();
    setHistoryState('exam', { index: state.currentIndex });
    return;
  }
}

function goPreviousQuestion() {
  if (state.currentIndex > 0) {
    state.currentIndex -= 1;
    renderQuestion();
    setHistoryState('exam', { index: state.currentIndex });
  }
}

function getAnsweredCount() {
  return state.questions.filter((question) => Boolean(state.answers[question.id])).length;
}

function getUnansweredCount() {
  return state.questions.length - getAnsweredCount();
}

function submitExam() {
  const unansweredCount = getUnansweredCount();
  const message = unansweredCount
    ? `还有 ${unansweredCount} 题未作答，确定交卷吗？`
    : '确定交卷吗？';
  if (!confirm(message)) return;
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

async function finishExam() {
  stopTimer();
  const submittedAt = new Date();
  const durationMs = state.startedAt ? Math.max(0, Date.now() - state.startedAt) : 0;
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
  state.result = record;
  state.currentTab = 'all';
  showView('result');
  renderResult();
  setHistoryState('result');

  try {
    const saved = await saveResult(record);
    state.result.remoteId = saved.record?.id;
  } catch (error) {
    alert(`成绩已在本机显示，但云端保存失败：${error.message}`);
  }
}

async function saveResult(record) {
  const response = await fetch(`${API_BASE}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: record.name,
      phone: record.phone,
      score: record.score,
      total: record.total,
      correctCount: record.correctCount,
      questionCount: record.questionCount,
      durationMs: record.durationMs,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || '网络异常');
  }
  return payload;
}

function openQuestionSheet() {
  renderQuestionSheet();
  els.questionSheet.classList.remove('hidden');
}

function closeQuestionSheet() {
  els.questionSheet.classList.add('hidden');
}

function renderQuestionSheet() {
  const answeredCount = getAnsweredCount();
  els.questionSheetSummary.textContent = `已答 ${answeredCount} / ${state.questions.length}，未答 ${state.questions.length - answeredCount}`;
  const groups = [
    ['single', '单选题'],
    ['multiple', '多选题'],
    ['judge', '判断题'],
  ];

  els.questionSheetBody.innerHTML = groups.map(([type, title]) => {
    const questions = state.questions
      .map((question, index) => ({ question, index }))
      .filter((item) => item.question.type === type);
    return `
      <section class="question-sheet-group">
        <h3>${title}</h3>
        <div class="question-sheet-grid">
          ${questions.map(({ question, index }) => {
            const isAnswered = Boolean(state.answers[question.id]);
            const isCurrent = index === state.currentIndex;
            return `
              <button
                class="question-sheet-item ${isAnswered ? 'answered' : ''} ${isCurrent ? 'current' : ''}"
                type="button"
                data-index="${index}"
              >
                <strong>${index + 1}</strong>
                <span>${isAnswered ? '已答' : '未答'}</span>
              </button>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }).join('');
}

function jumpToQuestion(index) {
  state.currentIndex = index;
  closeQuestionSheet();
  renderQuestion();
  setHistoryState('exam', { index: state.currentIndex });
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

async function renderRanking(target = els.rankingList) {
  target.innerHTML = '<div class="empty-state">排行榜加载中...</div>';
  let ranking = [];
  try {
    const response = await fetch(`${API_BASE}/ranking`);
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || '加载失败');
    ranking = payload.ranking || [];
  } catch (error) {
    target.innerHTML = `<div class="empty-state">排行榜加载失败：${escapeHtml(error.message)}</div>`;
    return;
  }

  if (!ranking.length) {
    target.innerHTML = '<div class="empty-state">今日暂无排行</div>';
    return;
  }

  target.innerHTML = ranking.map((record) => {
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

function openRankingView() {
  showView('ranking');
  renderRanking(els.homeRankingList);
  setHistoryState('ranking');
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

els.homeRankingButton.addEventListener('click', openRankingView);
els.selectAllButton.addEventListener('click', toggleSelectAll);
els.questionCardButton.addEventListener('click', openQuestionSheet);
els.previousQuestionButton.addEventListener('click', goPreviousQuestion);
els.inlineNextQuestionButton.addEventListener('click', goNextQuestion);
els.submitExamButton.addEventListener('click', submitExam);
els.questionSheetBackdrop.addEventListener('click', closeQuestionSheet);
els.closeQuestionSheetButton.addEventListener('click', closeQuestionSheet);
els.questionSheetBody.addEventListener('click', (event) => {
  const button = event.target.closest('.question-sheet-item');
  if (!button) return;
  jumpToQuestion(Number(button.dataset.index));
});
els.restartButton.addEventListener('click', () => startExam(state.user));
els.homeButton.addEventListener('click', () => showView('login'));
els.backButton.addEventListener('click', () => {
  if (els.resultView.classList.contains('active') || els.rankingView.classList.contains('active')) {
    showView('login');
  } else if (confirm('考试尚未完成，确定返回首页吗？')) {
    stopTimer();
    showView('login');
  }
});
els.rankingShortcut.addEventListener('click', () => {
  if (els.examView.classList.contains('active')) {
    openQuestionSheet();
    return;
  }
  openRankingView();
});
els.tabs.forEach((tab) => {
  tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
});

window.addEventListener('beforeunload', stopTimer);
window.addEventListener('popstate', (event) => {
  const payload = event.state;
  if (!payload) return;

  if (payload.view === 'exam' && state.questions.length) {
    state.currentIndex = Math.min(Math.max(Number(payload.index) || 0, 0), state.questions.length - 1);
    showView('exam');
    renderQuestion();
    return;
  }

  if (payload.view === 'ranking') {
    showView('ranking');
    renderRanking(els.homeRankingList);
    return;
  }

  if (payload.view === 'result' && state.result) {
    showView('result');
    renderResult();
    return;
  }

  showView('login');
});
