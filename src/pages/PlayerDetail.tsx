import { useMemo, useState } from "react";
import { computeCategoryTotals, computePlayerTotal, formatCategoryName } from "../lib/calculations";
import { createId } from "../lib/id";
import { AppAction, AppState, ScoreEntry, Session } from "../state/types";
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
  const currentTotal = useMemo(
    () => computePlayerTotal(state, session.id, playerId),
    [state, session.id, playerId]
  );
  const [adjustmentValue, setAdjustmentValue] = useState("0");
  const [overrideTotalValue, setOverrideTotalValue] = useState("");
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);

  const applyAdjustment = (value: number, note: string) => {
    if (Number.isNaN(value)) return;
    if (value < 0 && !session.settings.allowNegative) {
      setAdjustmentError("Negative adjustments are disabled for this session.");
      return;
    }
    const entry: ScoreEntry = {
      id: createId(),
      sessionId: session.id,
      playerId,
      createdAt: Date.now(),
      value,
      note,
      source: "manual",
    };
    dispatch({ type: "entry/add", payload: entry });
    setAdjustmentError(null);
  };

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
        <div className="card stack">
          <div className="card-title">Adjustments</div>
          <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            Apply a manual adjustment or override the calculated total. Overrides are saved as an adjustment entry.
          </p>
          <div className="inline" style={{ gap: "12px", flexWrap: "wrap" }}>
            <div style={{ minWidth: "180px" }}>
              <label className="label">Adjustment (+/-)</label>
              <input
                className="input"
                type="number"
                value={adjustmentValue}
                onChange={(event) => setAdjustmentValue(event.target.value)}
              />
            </div>
            <div className="inline" style={{ alignItems: "flex-end" }}>
              <button
                className="button secondary"
                onClick={() => {
                  const numericValue = Number(adjustmentValue);
                  applyAdjustment(numericValue, "Manual adjustment");
                }}
              >
                Apply adjustment
              </button>
            </div>
          </div>
          <div className="inline" style={{ gap: "12px", flexWrap: "wrap" }}>
            <div style={{ minWidth: "180px" }}>
              <label className="label">Override total</label>
              <input
                className="input"
                type="number"
                placeholder={`Current: ${currentTotal}`}
                value={overrideTotalValue}
                onChange={(event) => setOverrideTotalValue(event.target.value)}
              />
            </div>
            <div className="inline" style={{ alignItems: "flex-end" }}>
              <button
                className="button secondary"
                onClick={() => {
                  const desiredTotal = Number(overrideTotalValue);
                  if (Number.isNaN(desiredTotal)) return;
                  const delta = desiredTotal - currentTotal;
                  applyAdjustment(delta, `Override total to ${desiredTotal}`);
                }}
                disabled={!overrideTotalValue.trim()}
              >
                Apply override
              </button>
            </div>
          </div>
          {adjustmentError && (
            <p style={{ color: "#e11d48" }}>{adjustmentError}</p>
          )}
        </div>
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

