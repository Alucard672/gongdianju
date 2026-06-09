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
