import { useMemo } from "react";
import { computeCategoryTotals, formatCategoryName } from "../lib/calculations";
import { AppAction, AppState, Session } from "../state/types";
import { sortEntries } from "../state/store";

const PlayerDetail = ({
  state,
  session,
  playerId,
  dispatch,
  onBack,
}: {
  state: AppState;
  session: Session;
  playerId: string;
  dispatch: React.Dispatch<AppAction>;
  onBack: () => void;
}) => {
  const player = state.players[playerId];
  const entries = useMemo(
    () =>
      sortEntries(
        Object.values(state.entries).filter(
          (entry) => entry.sessionId === session.id && entry.playerId === playerId
        )
      ),
    [state.entries, session.id, playerId]
  );
  const totalsByCategory = computeCategoryTotals(state, session.id, playerId);

  return (
    <div className="app">
      <div className="topbar">
        <button className="button ghost" onClick={onBack}>
          Back
        </button>
        <h1>{player?.name ?? "Player"} Ledger</h1>
        <span />
      </div>
      <div className="container stack">
        {Object.keys(totalsByCategory).length > 0 && (
          <div className="card stack">
            <div className="card-title">Totals by category</div>
            {Object.entries(totalsByCategory).map(([categoryId, total]) => (
              <div key={categoryId} className="inline" style={{ justifyContent: "space-between" }}>
                <span>{formatCategoryName(state.categories, categoryId)}</span>
                <strong>{total}</strong>
              </div>
            ))}
          </div>
        )}
        <div className="card stack">
          <div className="card-title">Entries</div>
          {entries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px" }}>
              <p>No entries yet.</p>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "8px" }}>
                Scores will appear here as you add them.
              </p>
            </div>
          ) : (
            <div className="list">
              {entries.map((entry) => (
                <div key={entry.id} className="entry">
                  <div className="inline" style={{ justifyContent: "space-between" }}>
                    <strong>{entry.value > 0 ? `+${entry.value}` : entry.value}</strong>
                    <button
                      className="button ghost"
                      onClick={() => {
                        if (window.confirm("Delete this entry?")) {
                          dispatch({ type: "entry/remove", payload: { entryId: entry.id } });
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  <small>
                    {entry.categoryId
                      ? formatCategoryName(state.categories, entry.categoryId)
                      : "Uncategorized"}
                    {entry.roundId
                      ? ` • ${state.rounds[entry.roundId]?.label ?? "(deleted)"}`
                      : ""}
                  </small>
                  {entry.note && <em>{entry.note}</em>}
                  <small>{new Date(entry.createdAt).toLocaleString()}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerDetail;

