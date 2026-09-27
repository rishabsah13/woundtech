PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS clinicians (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  specialty  TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS patients (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS visits (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  clinician_id INTEGER NOT NULL REFERENCES clinicians(id) ON DELETE RESTRICT,
  patient_id   INTEGER NOT NULL REFERENCES patients(id)   ON DELETE RESTRICT,
  visited_at   TEXT NOT NULL,
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_clinician  ON visits(clinician_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_patient    ON visits(patient_id, visited_at DESC);