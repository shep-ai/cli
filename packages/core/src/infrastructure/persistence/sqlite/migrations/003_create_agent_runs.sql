CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,
  agent_type TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL,
  prompt TEXT NOT NULL,
  result TEXT,
  session_id TEXT,
  thread_id TEXT NOT NULL,
  pid INTEGER,
  last_heartbeat INTEGER,
  started_at INTEGER,
  completed_at INTEGER,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_pid ON agent_runs(pid) WHERE pid IS NOT NULL;
CREATE INDEX idx_agent_runs_thread_id ON agent_runs(thread_id);
