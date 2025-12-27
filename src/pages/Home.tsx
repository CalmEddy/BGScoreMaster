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
}: {
  state: AppState;
  onNewSession: () => void;
  onOpenSession: (sessionId: string) => void;
  onImportState: (next: AppState) => void;
  onShowHelp?: () => void;
  onOpenBuilder?: () => void;
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
                  <button
                    key={session.id}
                    className="card"
                    onClick={() => onOpenSession(session.id)}
                    style={{ textAlign: "left" }}
                  >
                    <div className="inline" style={{ justifyContent: "space-between" }}>
                      <strong>{session.title}</strong>
                      <span className="badge">{playerCount} players</span>
                    </div>
                    <small>
                      Updated {new Date(session.updatedAt).toLocaleString()}
                    </small>
                  </button>
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

