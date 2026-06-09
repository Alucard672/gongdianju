CREATE TABLE IF NOT EXISTS exam_results (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  score REAL NOT NULL,
  total REAL NOT NULL,
  correct_count INTEGER NOT NULL,
  question_count INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  submitted_at TEXT NOT NULL,
  date_key TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exam_results_date_rank
ON exam_results (date_key, score DESC, duration_ms ASC, submitted_at ASC);

-- 题目维度统计：每题被抽到次数 / 答错次数（用于管理员「最常错的题」排行）
CREATE TABLE IF NOT EXISTS question_stats (
  question_no INTEGER PRIMARY KEY,
  type TEXT,
  asked INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0
);

-- 逐条记录每个人的错题
CREATE TABLE IF NOT EXISTS wrong_answers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  question_no INTEGER NOT NULL,
  user_answer TEXT,
  correct_answer TEXT,
  date_key TEXT NOT NULL,
  submitted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wrong_answers_q ON wrong_answers (question_no);
CREATE INDEX IF NOT EXISTS idx_wrong_answers_phone ON wrong_answers (phone, submitted_at);
