import { useMemo, useState } from "react";
import { AppState } from "../state/types";
import { exportState, importState } from "../lib/storage";
import Tooltip from "../components/Tooltip";

const Home = ({
  state,
  onNewSession,
  onOpenSession,
  onImportState,
  onShowHelp,
  onOpenBuilder,
  onDeleteSession,
}: {
  state: AppState;
  onNewSession: () => void;
  onOpenSession: (sessionId: string) => void;
  onImportState: (next: AppState) => void;
  onShowHelp?: () => void;
  onOpenBuilder?: () => void;
  onDeleteSession?: (sessionId: string) => void;
}) => {
  const sessions = useMemo(
    () =>
      Object.values(state.sessions).sort((a, b) => b.updatedAt - a.updatedAt),
    [state.sessions]
  );
  const [exportText, setExportText] = useState("");
  const [importText, setImportText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleExport = () => {
    setExportText(exportState(state));
  };

  const handleImport = () => {
    const parsed = importState(importText);
    if (!parsed) {
      setError("Could not import. Please check the JSON format.");
      return;
    }
    setError(null);
    onImportState(parsed);
  };

  return (
    <div className="app">
      <div className="topbar">
        <h1>Universal Score Keeper</h1>
        <div className="inline">
          {onShowHelp && (
            <Tooltip content="Press ? for help" position="bottom">
              <button className="button secondary" onClick={onShowHelp} aria-label="Help" title="Help (?)">
                ?
              </button>
            </Tooltip>
          )}
          {onOpenBuilder && (
            <button className="button secondary" onClick={onOpenBuilder} title="Template Builder">
              Builder
            </button>
          )}
          <button
            className="button"
            onClick={onNewSession}
            data-onboarding="new-session"
          >
            New Session
          </button>
        </div>
      </div>
      <div className="container stack">
        <section className="card stack">
          <div className="card-title">Scoring-only assistant</div>
          <p style={{ fontSize: "0.95rem", color: "#4b5563" }}>
            Universal Score Keeper is built for fast, accurate score tracking. It does not manage turn order,
            enforce rules, or adjudicate gameplay. You supply the scoring data; the app calculates totals from
            your template formulas and adjustments.
          </p>
          <ul style={{ margin: 0, paddingLeft: "18px", color: "#6b7280" }}>
            <li>Create or open a session with players and a scoring template.</li>
            <li>Enter objects and scoring entries each round or turn as needed.</li>
            <li>Use manual adjustments or overrides when you need to correct totals.</li>
          </ul>
        </section>
        <section className="card stack" data-onboarding="sessions">
          <div className="card-title">Sessions</div>
          {sessions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px" }}>
              <p style={{ fontSize: "1.1rem", marginBottom: "16px" }}>
                No sessions yet. Create one to start scoring!
              </p>
              <button className="button" onClick={onNewSession}>
                Create Your First Session
              </button>
            </div>
          ) : (
            <div className="list">
              {sessions.map((session) => {
                const playerCount = session.playerIds.length;
                return (
                  <div
                    key={session.id}
                    className="card"
                    style={{ textAlign: "left" }}
                  >
                    <button
                      onClick={() => onOpenSession(session.id)}
                      style={{ 
                        width: "100%", 
                        textAlign: "left", 
                        background: "none", 
                        border: "none", 
                        padding: 0,
                        cursor: "pointer"
                      }}
                    >
                      <div className="inline" style={{ justifyContent: "space-between" }}>
                        <strong>{session.title}</strong>
                        <span className="badge">{playerCount} players</span>
                      </div>
                      <small>
                        Updated {new Date(session.updatedAt).toLocaleString()}
                      </small>
                    </button>
                    {onDeleteSession && (
                      <button
                        className="button ghost"
                        style={{ 
                          marginTop: "8px", 
                          color: "#e11d48",
                          fontSize: "0.875rem"
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete "${session.title}"? This action cannot be undone.`)) {
                            onDeleteSession(session.id);
                          }
                        }}
                        title="Delete session"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card stack">
          <div className="card-title">Export / Import</div>
          <div className="stack">
            <button className="button secondary" onClick={handleExport}>
              Export JSON
            </button>
            {exportText && (
              <textarea
                className="input"
                rows={6}
                value={exportText}
                readOnly
              />
            )}
          </div>
          <div className="stack">
            <textarea
              className="input"
              rows={6}
              placeholder="Paste JSON here to import"
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
            />
            <button className="button" onClick={handleImport}>
              Import JSON
            </button>
            {error && <p style={{ color: "#e11d48" }}>{error}</p>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
