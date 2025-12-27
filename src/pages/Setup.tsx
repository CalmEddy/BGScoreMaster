import { useEffect, useMemo, useState } from "react";
import { createId } from "../lib/id";
import { AppAction, AppState, Player, Session } from "../state/types";
import { applyTemplate, validateTemplateCompatibility } from "../lib/templateApplication";

const buildDefaultTitle = () => {
  const date = new Date();
  return `Game Night ${date.toLocaleDateString()}`;
};

const Setup = ({
  onBack,
  onCreate,
  dispatch,
  templateId,
  state,
  onSelectTemplate,
}: {
  onBack: () => void;
  onCreate: (sessionId: string) => void;
  dispatch: React.Dispatch<AppAction>;
  templateId?: string;
  state?: AppState;
  onSelectTemplate?: () => void;
}) => {
  const template = templateId && state ? state.templates[templateId] : undefined;

  const [title, setTitle] = useState(template?.name || buildDefaultTitle());
  const [players, setPlayers] = useState<string[]>(
    template?.defaultSettings.defaultPlayerCount
      ? Array(template.defaultSettings.defaultPlayerCount).fill("").map((_, i) => `Player ${i + 1}`)
      : ["Player 1", "Player 2"]
  );
  const [roundsEnabled, setRoundsEnabled] = useState(
    template?.defaultSettings.roundsEnabled ?? true
  );
  const [scoreDirection, setScoreDirection] = useState<"higherWins" | "lowerWins">(
    template?.defaultSettings.scoreDirection || "higherWins"
  );
  const [allowNegative, setAllowNegative] = useState(
    template?.defaultSettings.allowNegative ?? true
  );

  const canCreate = useMemo(
    () => players.filter((name) => name.trim()).length >= 2,
    [players]
  );

  const handlePlayerChange = (index: number, value: string) => {
    setPlayers((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const handleRemove = (index: number) => {
    setPlayers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAdd = () => {
    setPlayers((prev) => [...prev, `Player ${prev.length + 1}`]);
  };

  const handleCreate = () => {
    if (template && state) {
      // Validate template compatibility
      const playerCount = players.filter((name) => name.trim()).length;
      const validation = validateTemplateCompatibility(template, playerCount);
      if (!validation.compatible) {
        alert(validation.errors.join("\n"));
        return;
      }

      // Apply template
      const sessionId = applyTemplate(
        template,
        state,
        dispatch,
        players.filter((name) => name.trim()),
        title.trim() || template.name
      );

      setTimeout(() => {
        onCreate(sessionId);
      }, 0);
    } else {
      // Create session from scratch (existing logic)
      const sessionId = createId();
      const now = Date.now();
      const session: Session = {
        id: sessionId,
        title: title.trim() || buildDefaultTitle(),
        createdAt: now,
        updatedAt: now,
        settings: {
          roundsEnabled,
          scoreDirection,
          allowNegative,
          showRoundControls: true,
          showSessionVariables: true,
          showPlayerVariables: true,
          showQuickAdd: true,
        },
        playerIds: [],
        categoryIds: [],
        roundIds: [],
        ruleIds: [],
      };
      dispatch({ type: "session/create", payload: session });

      const playerObjects: Player[] = players
        .map((name, index) => ({
          id: createId(),
          sessionId,
          name: name.trim() || `Player ${index + 1}`,
          seatOrder: index + 1,
        }))
        .filter((player) => player.name.trim());

      playerObjects.forEach((player) => {
        dispatch({ type: "player/add", payload: player });
      });

      dispatch({
        type: "session/update",
        payload: {
          ...session,
          playerIds: playerObjects.map((player) => player.id),
        },
      });

      if (roundsEnabled) {
        const roundId = createId();
        dispatch({
          type: "round/add",
          payload: {
            id: roundId,
            sessionId,
            index: 1,
            label: "Round 1",
          },
        });
        dispatch({
          type: "session/update",
          payload: {
            ...session,
            playerIds: playerObjects.map((player) => player.id),
            roundIds: [roundId],
          },
        });
      }

      setTimeout(() => {
        onCreate(sessionId);
      }, 0);
    }
  };

  return (
    <div className="app">
      <div className="topbar">
        <button className="button ghost" onClick={onBack}>
          Home
        </button>
        <h1>{template ? `New Session: ${template.name}` : "New Session"}</h1>
        <span />
      </div>
      <div className="container stack">
        <div className="card stack">
          <div className="card-title">Template</div>
          {template ? (
            <div>
              <div className="inline" style={{ gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                {template.icon && <span style={{ fontSize: "1.5rem" }}>{template.icon}</span>}
                <div style={{ flex: 1 }}>
                  <strong>{template.name}</strong>
                  <span className="badge" style={{ marginLeft: "8px" }}>{template.gameType}</span>
                </div>
              </div>
              {template.description && (
                <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "8px 0" }}>
                  {template.description}
                </p>
              )}
              <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "12px" }}>
                {template.categoryTemplates?.length || 0} categories • {template.ruleTemplates?.length || 0} rules • {template.variableDefinitions?.length || 0} variables
              </div>
              {onSelectTemplate && (
                <button
                  className="button secondary"
                  onClick={onSelectTemplate}
                >
                  Change Template
                </button>
              )}
            </div>
          ) : (
            <div>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "12px" }}>
                No template selected. Creating session from scratch.
              </p>
              {onSelectTemplate && (
                <button
                  className="button secondary"
                  onClick={onSelectTemplate}
                >
                  Select Template
                </button>
              )}
            </div>
          )}
        </div>
        <div className="card stack">
          <label className="label" htmlFor="title">
            Session title
          </label>
          <input
            id="title"
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="card stack">
          <div className="card-title">Players</div>
          <div className="stack">
            {players.map((player, index) => (
              <div key={index} className="inline">
                <input
                  className="input"
                  value={player}
                  onChange={(event) => handlePlayerChange(index, event.target.value)}
                />
                <button className="button secondary" onClick={() => handleRemove(index)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button className="button secondary" onClick={handleAdd}>
            Add Player
          </button>
        </div>

        <div className="card stack">
          <div className="card-title">Settings</div>
          <label className="inline">
            <input
              type="checkbox"
              checked={roundsEnabled}
              onChange={(event) => setRoundsEnabled(event.target.checked)}
            />
            Rounds enabled
          </label>
          <label className="inline">
            <input
              type="checkbox"
              checked={allowNegative}
              onChange={(event) => setAllowNegative(event.target.checked)}
            />
            Allow negative scores
          </label>
          <label className="label">Score direction</label>
          <select
            value={scoreDirection}
            onChange={(event) =>
              setScoreDirection(event.target.value as "higherWins" | "lowerWins")
            }
          >
            <option value="higherWins">Higher wins</option>
            <option value="lowerWins">Lower wins</option>
          </select>
        </div>

        <button className="button full" onClick={handleCreate} disabled={!canCreate}>
          Create session
        </button>
      </div>
    </div>
  );
};

export default Setup;

