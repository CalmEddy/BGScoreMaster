import { useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import PlayerCard from "../components/PlayerCard";
import { createId } from "../lib/id";
import { computePlayerTotal, findWinners, getSessionEntries } from "../lib/calculations";
import { evaluateRules } from "../lib/ruleEngine";
import {
  AppAction,
  AppState,
  Category,
  Round,
  ScoreEntry,
  Session,
} from "../state/types";
import { buildSeatOrder, sortCategories, sortEntries, sortRounds, updateSession } from "../state/store";

const Scoreboard = ({
  state,
  session,
  dispatch,
  onHome,
  onOpenPlayer,
  onManageCategories,
  onManageRules,
}: {
  state: AppState;
  session: Session;
  dispatch: React.Dispatch<AppAction>;
  onHome: () => void;
  onOpenPlayer: (playerId: string) => void;
  onManageCategories: () => void;
  onManageRules?: () => void;
}) => {
  const players = buildSeatOrder(
    session.playerIds.map((id) => state.players[id]).filter(Boolean)
  );
  const categories = sortCategories(
    session.categoryIds.map((id) => state.categories[id]).filter(Boolean)
  );
  const rounds = sortRounds(session.roundIds.map((id) => state.rounds[id]).filter(Boolean));
  const [selectedRoundId, setSelectedRoundId] = useState<string | undefined>(
    rounds[rounds.length - 1]?.id
  );
  const [editingTitle, setEditingTitle] = useState(session.title);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [entryPlayerId, setEntryPlayerId] = useState<string | null>(null);
  const [entryValue, setEntryValue] = useState("0");
  const [entryCategoryId, setEntryCategoryId] = useState<string | undefined>(undefined);
  const [entryRoundId, setEntryRoundId] = useState<string | undefined>(selectedRoundId);
  const [entryNote, setEntryNote] = useState("");

  // Auto-evaluate rules when entries change
  useEffect(() => {
    if (!session) return;
    const sessionEntries = getSessionEntries(state, session.id);
    if (sessionEntries.length === 0) return;

    // Evaluate rules for all players
    session.playerIds.forEach((playerId) => {
      const ruleEntries = evaluateRules(state, session.id, playerId, selectedRoundId);
      // Only add rules that don't already exist (prevent duplicates)
      ruleEntries.forEach((ruleEntry) => {
        const existing = Object.values(state.entries).find(
          (e) =>
            e.sessionId === ruleEntry.sessionId &&
            e.playerId === ruleEntry.playerId &&
            e.value === ruleEntry.value &&
            e.categoryId === ruleEntry.categoryId &&
            e.note === ruleEntry.note &&
            Math.abs(e.createdAt - ruleEntry.createdAt) < 1000 // Within 1 second
        );
        if (!existing) {
          dispatch({ type: "entry/add", payload: ruleEntry });
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(state.entries).length, session?.id, selectedRoundId]);

  useEffect(() => {
    if (!session.settings.roundsEnabled || rounds.length > 0) return;
    const roundId = createId();
    const round: Round = {
      id: roundId,
      sessionId: session.id,
      index: 1,
      label: "Round 1",
    };
    dispatch({ type: "round/add", payload: round });
    dispatch({
      type: "session/update",
      payload: updateSession({ ...session, roundIds: [roundId] }),
    });
    setSelectedRoundId(roundId);
  }, [dispatch, rounds.length, session, session.id, session.settings.roundsEnabled]);

  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    players.forEach((player) => {
      result[player.id] = computePlayerTotal(state, session.id, player.id);
    });
    return result;
  }, [players, session.id, state, state.entries, state.variableValues]);

  const winners = useMemo(
    () => findWinners(totals, session.settings.scoreDirection),
    [totals, session.settings.scoreDirection]
  );

  const handleQuickAdd = (playerId: string, value: number) => {
    if (value < 0 && !session.settings.allowNegative) return;
    const entry: ScoreEntry = {
      id: createId(),
      sessionId: session.id,
      playerId,
      createdAt: Date.now(),
      value,
      roundId: session.settings.roundsEnabled ? selectedRoundId : undefined,
      source: "manual",
    };
    dispatch({ type: "entry/add", payload: entry });
  };

  const handleOpenEntryModal = (playerId: string) => {
    setEntryPlayerId(playerId);
    setEntryValue("0");
    setEntryCategoryId(undefined);
    setEntryRoundId(selectedRoundId);
    setEntryNote("");
  };

  const handleSaveEntry = () => {
    if (!entryPlayerId) return;
    const numericValue = Number(entryValue);
    if (Number.isNaN(numericValue)) return;
    if (numericValue < 0 && !session.settings.allowNegative) return;
    const entry: ScoreEntry = {
      id: createId(),
      sessionId: session.id,
      playerId: entryPlayerId,
      createdAt: Date.now(),
      value: numericValue,
      roundId: session.settings.roundsEnabled ? entryRoundId : undefined,
      categoryId: entryCategoryId,
      note: entryNote.trim() || undefined,
      source: "manual",
    };
    dispatch({ type: "entry/add", payload: entry });
    setEntryPlayerId(null);
  };

  // Auto-evaluate rules when entries change
  useEffect(() => {
    if (!session) return;
    const sessionEntries = getSessionEntries(state, session.id);
    if (sessionEntries.length === 0) return;

    // Evaluate rules for all players
    session.playerIds.forEach((playerId) => {
      const ruleEntries = evaluateRules(state, session.id, playerId, selectedRoundId);
      // Only add rules that don't already exist (prevent duplicates)
      ruleEntries.forEach((ruleEntry) => {
        const existing = Object.values(state.entries).find(
          (e) =>
            e.sessionId === ruleEntry.sessionId &&
            e.playerId === ruleEntry.playerId &&
            e.value === ruleEntry.value &&
            e.categoryId === ruleEntry.categoryId &&
            e.note === ruleEntry.note &&
            Math.abs(e.createdAt - ruleEntry.createdAt) < 1000 // Within 1 second
        );
        if (!existing) {
          dispatch({ type: "entry/add", payload: ruleEntry });
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(state.entries).length, Object.keys(state.variableValues).length, session?.id, selectedRoundId]);

  const handleUndo = () => {
    const entries = sortEntries(getSessionEntries(state, session.id));
    const lastEntry = entries[0];
    if (!lastEntry) return;
    dispatch({ type: "entry/remove", payload: { entryId: lastEntry.id } });
  };

  const handleNextRound = () => {
    const nextIndex = rounds.length + 1;
    const newRound: Round = {
      id: createId(),
      sessionId: session.id,
      index: nextIndex,
      label: `Round ${nextIndex}`,
    };
    dispatch({ type: "round/add", payload: newRound });
    dispatch({
      type: "session/update",
      payload: updateSession({
        ...session,
        roundIds: [...session.roundIds, newRound.id],
      }),
    });
    setSelectedRoundId(newRound.id);
  };

  const handleSettingsSave = () => {
    dispatch({
      type: "session/update",
      payload: updateSession({
        ...session,
        title: editingTitle.trim() || session.title,
      }),
    });
    setSettingsOpen(false);
  };

  return (
    <div className="app">
      <div className="topbar">
        <button className="button ghost" onClick={onHome}>
          Home
        </button>
        <input
          className="input"
          style={{ maxWidth: 280 }}
          value={editingTitle}
          onChange={(event) => setEditingTitle(event.target.value)}
          onBlur={handleSettingsSave}
        />
        <div className="inline">
          <button className="button secondary" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
          <button className="button secondary" onClick={onManageCategories}>
            Categories
          </button>
          {onManageRules && (
            <button className="button secondary" onClick={onManageRules}>
              Rules
            </button>
          )}
        </div>
      </div>
      <div className="container stack">
        {session.settings.roundsEnabled && (
          <div className="card inline" style={{ justifyContent: "space-between" }}>
            <div className="inline">
              <label className="label" style={{ margin: 0 }}>
                Round
              </label>
              <select
                value={selectedRoundId}
                onChange={(event) => setSelectedRoundId(event.target.value)}
              >
                {rounds.map((round) => (
                  <option key={round.id} value={round.id}>
                    {round.label}
                  </option>
                ))}
              </select>
            </div>
            <button className="button" onClick={handleNextRound}>
              Next Round
            </button>
          </div>
        )}

        <div className="inline" style={{ justifyContent: "space-between" }}>
          <div className="badge">
            {session.settings.scoreDirection === "higherWins" ? "Higher wins" : "Lower wins"}
          </div>
          <button className="button secondary" onClick={handleUndo}>
            Undo last entry
          </button>
        </div>

            {session.templateId && (
              <MechanicsPanel state={state} session={session} />
            )}

            {session.templateId && (() => {
              const sessionVars = getSessionVariables(state, session.id);
              return sessionVars.length > 0 ? (
                <div className="card stack">
                  <div className="card-title">Session Variables</div>
                  <div className="inline" style={{ gap: "8px", flexWrap: "wrap" }}>
                    {sessionVars.map((variable) => {
                      const template = state.templates[session.templateId!];
                      const varDef = template?.variableDefinitions.find((v) => v.id === variable.variableDefinitionId);
                      if (!varDef) return null;
                      return (
                        <div key={variable.id} className="inline" style={{ gap: "4px", padding: "4px 8px", background: "#f3f4f6", borderRadius: "4px" }}>
                          {varDef.icon && <span>{varDef.icon}</span>}
                          <strong>{varDef.name}:</strong>
                          <span>{String(variable.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}

            <div className="player-grid">
              {players.map((player) => (
                <PlayerCard
                  key={player.id}
                  name={player.name}
                  total={totals[player.id] ?? 0}
                  isWinner={winners.includes(player.id)}
                  allowNegative={session.settings.allowNegative}
                  onQuickAdd={(value) => handleQuickAdd(player.id, value)}
                  onAddEntry={() => handleOpenEntryModal(player.id)}
                  onOpenLedger={() => onOpenPlayer(player.id)}
                  playerId={player.id}
                  sessionId={session.id}
                  state={state}
                  onVariableUpdate={(variableValueId, value) => {
                    const variable = state.variableValues[variableValueId];
                    if (variable) {
                      dispatch({
                        type: "variable/update",
                        payload: {
                          ...variable,
                          value,
                          updatedAt: Date.now(),
                          updatedBy: "manual",
                        },
                      });
                    }
                  }}
                />
              ))}
            </div>
      </div>

      {entryPlayerId && (
        <Modal title="Add Entry" onClose={() => setEntryPlayerId(null)}>
          <div className="stack">
            <div>
              <label className="label">Value</label>
              <input
                className="input"
                type="number"
                value={entryValue}
                onChange={(event) => setEntryValue(event.target.value)}
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                value={entryCategoryId ?? ""}
                onChange={(event) =>
                  setEntryCategoryId(event.target.value ? event.target.value : undefined)
                }
              >
                <option value="">None</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button className="button ghost" onClick={onManageCategories}>
                Manage categories
              </button>
            </div>
            {session.settings.roundsEnabled && (
              <div>
                <label className="label">Round</label>
                <select
                  value={entryRoundId}
                  onChange={(event) => setEntryRoundId(event.target.value)}
                >
                  {rounds.map((round) => (
                    <option key={round.id} value={round.id}>
                      {round.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">Note</label>
              <input
                className="input"
                value={entryNote}
                onChange={(event) => setEntryNote(event.target.value)}
              />
            </div>
            <button className="button" onClick={handleSaveEntry}>
              Save entry
            </button>
          </div>
        </Modal>
      )}

      {settingsOpen && (
        <Modal title="Session Settings" onClose={() => setSettingsOpen(false)}>
          <div className="stack">
            <label className="label">Score direction</label>
            <select
              value={session.settings.scoreDirection}
              onChange={(event) =>
                dispatch({
                  type: "session/update",
                  payload: updateSession({
                    ...session,
                    settings: {
                      ...session.settings,
                      scoreDirection: event.target.value as "higherWins" | "lowerWins",
                    },
                  }),
                })
              }
            >
              <option value="higherWins">Higher wins</option>
              <option value="lowerWins">Lower wins</option>
            </select>
            <label className="inline">
              <input
                type="checkbox"
                checked={session.settings.allowNegative}
                onChange={(event) =>
                  dispatch({
                    type: "session/update",
                    payload: updateSession({
                      ...session,
                      settings: { ...session.settings, allowNegative: event.target.checked },
                    }),
                  })
                }
              />
              Allow negative scores
            </label>
            <label className="inline">
              <input
                type="checkbox"
                checked={session.settings.roundsEnabled}
                onChange={(event) =>
                  dispatch({
                    type: "session/update",
                    payload: updateSession({
                      ...session,
                      settings: { ...session.settings, roundsEnabled: event.target.checked },
                    }),
                  })
                }
              />
              Rounds enabled
            </label>
            <button className="button" onClick={handleSettingsSave}>
              Save settings
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Scoreboard;

