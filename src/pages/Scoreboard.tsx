import { useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import PlayerCard from "../components/PlayerCard";
import { createId } from "../lib/id";
import { computePlayerTotal, findWinners, getSessionEntries } from "../lib/calculations";
import { getObjectValue } from "../lib/objectStorage";
import { evaluateRules } from "../lib/ruleEngine";
import { getSessionObjects } from "../lib/objectStorage";
import { applyTemplateToExistingSession, validateTemplateCompatibility, getSessionTemplateCategories } from "../lib/templateApplication";
import { evaluateFormula } from "../lib/formulaParser";
import {
  AppAction,
  AppState,
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
  
  // Always get fresh template from state - don't cache it
  const template = useMemo(() => {
    return session.templateId ? state.templates[session.templateId] : undefined;
  }, [session.templateId, state.templates]);
  
  const categories = useMemo(() => {
    if (!template) return [];
    const templateCategories = getSessionTemplateCategories(state, session);
    // Convert CategoryTemplate to a format compatible with sortCategories
    // We'll create a simple adapter that matches the expected structure
    return templateCategories.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [state.templates, session.templateId, session.categoryTemplateIds, template]);
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
  const displaySettings = {
    showRoundControls: session.settings.showRoundControls ?? true,
    showSessionObjects: session.settings.showSessionObjects ?? true,
    showPlayerObjects: session.settings.showPlayerObjects ?? true,
    showQuickAdd: session.settings.showQuickAdd ?? true,
  };

  // Auto-evaluate rules when entries change, but only for entries that are manual (not from rules)
  // This prevents rule entries from triggering more rule evaluations (infinite loop)
  useEffect(() => {
    if (!session) return;
    const sessionEntries = getSessionEntries(state, session.id);
    if (sessionEntries.length === 0) return;

    // Find the most recent manual entry (not from rules)
    const recentManualEntries = sessionEntries
      .filter((e) => e.source === "manual")
      .sort((a, b) => b.createdAt - a.createdAt);
    
    if (recentManualEntries.length === 0) return;
    
    // Only evaluate rules for the player who made the most recent manual entry
    const mostRecentEntry = recentManualEntries[0];
    const playerId = mostRecentEntry.playerId;
    
    // Only evaluate if this entry was created very recently (within last 1 second)
    // This prevents re-evaluating rules for old entries
    const timeSinceEntry = Date.now() - mostRecentEntry.createdAt;
    if (timeSinceEntry > 1000) {
      console.debug(`Manual entry too old (${timeSinceEntry}ms), skipping rule evaluation`);
      return;
    }
    
    // Check if we've already processed this entry by looking for rule entries created right after it
    // This prevents the useEffect from running multiple times for the same manual entry
    const ruleEntriesForThisEntry = sessionEntries.filter(
      (e) => 
        e.source === "ruleEngine" && 
        e.playerId === playerId &&
        e.createdAt > mostRecentEntry.createdAt &&
        e.createdAt < mostRecentEntry.createdAt + 2000 // Within 2 seconds of manual entry
    );
    
    // If we already have rule entries for this manual entry, skip evaluation
    if (ruleEntriesForThisEntry.length > 0) {
      console.debug(`Already processed rules for manual entry (found ${ruleEntriesForThisEntry.length} rule entries), skipping`);
      return;
    }
    
    console.debug(`Evaluating rules for player ${playerId} after manual entry`);
    const ruleEntries = evaluateRules(state, session.id, playerId, selectedRoundId);
    
    console.debug(`Found ${ruleEntries.length} rule entries for player ${playerId}`);
    
    // Only add rules that don't already exist (prevent duplicates)
    ruleEntries.forEach((ruleEntry) => {
      console.debug(`Rule entry: playerId=${ruleEntry.playerId}, value=${ruleEntry.value}, categoryId=${ruleEntry.categoryId}, note=${ruleEntry.note}`);
      // Only add if it's for the same player and doesn't already exist
      if (ruleEntry.playerId === playerId) {
        const existing = state.entries ? Object.values(state.entries).find(
          (e) =>
            e.sessionId === ruleEntry.sessionId &&
            e.playerId === ruleEntry.playerId &&
            e.value === ruleEntry.value &&
            e.categoryId === ruleEntry.categoryId &&
            e.note === ruleEntry.note &&
            Math.abs(e.createdAt - ruleEntry.createdAt) < 1000 // Within 1 second
        ) : undefined;
        if (!existing) {
          console.debug(`Adding rule entry for player ${ruleEntry.playerId}`);
          dispatch({ type: "entry/add", payload: ruleEntry });
        } else {
          console.debug(`Rule entry already exists, skipping`);
        }
      } else {
        console.warn(`Rule entry has wrong playerId: expected ${playerId}, got ${ruleEntry.playerId} - skipping`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.entries ? Object.keys(state.entries).length : 0,
    state.templates, // Include templates so rules are re-evaluated when template changes
    session?.id,
    session?.templateId, // Include templateId so rules are re-evaluated when template changes
    selectedRoundId
  ]);

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

  // Create a stable key for entries to ensure useMemo recalculates when entries change
  const entriesKey = useMemo(() => {
    if (!state.entries) return "0";
    const sessionEntryIds = getSessionEntries(state, session.id)
      .map(e => e.id)
      .sort()
      .join(",");
    return `${Object.keys(state.entries).length}:${sessionEntryIds}`;
  }, [state.entries, session.id]);

  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    // Debug: Log entry count to verify state.entries is updating
    const entryCount = state.entries ? Object.keys(state.entries).length : 0;
    const sessionEntryCount = getSessionEntries(state, session.id).length;
    console.debug(`Computing totals: ${entryCount} total entries in state, ${sessionEntryCount} for this session`);
    
    players.forEach((player) => {
      // Debug: Log entries for this player
      const playerEntries = getSessionEntries(state, session.id).filter(e => e.playerId === player.id);
      console.debug(`Player ${player.name} (${player.id}): ${playerEntries.length} entries`);
      if (playerEntries.length > 0) {
        const entryValues = playerEntries.map(e => `${e.categoryId || 'uncat'}:${e.value}`).join(", ");
        console.debug(`  Entry values: ${entryValues}`);
      }
      
      const total = computePlayerTotal(state, session.id, player.id);
      result[player.id] = total;
      console.debug(`Computed total for player ${player.name} (${player.id}): ${total}`);
    });
    return result;
  }, [
    players,
    session.id,
    session.templateId, // Include templateId so totals recalculate when template changes
    entriesKey, // Use entriesKey to ensure recalculation when entries change
    state.objectValues,
    state.templates, // Include templates so totals recalculate when template data changes
  ]);

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

  const handleCategoryAction = (playerId: string, categoryId: string, mode: "add" | "subtract") => {
    // Debug: Log the playerId being used
    console.debug(`handleCategoryAction called: playerId=${playerId}, categoryId=${categoryId}, mode=${mode}`);
    
    // Always get fresh template from state - don't use cached template
    const currentTemplate = session.templateId ? state.templates[session.templateId] : undefined;
    if (!currentTemplate) {
      console.warn(`No template found for session ${session.id}`);
      return;
    }
    const category = currentTemplate.categoryTemplates.find((cat) => cat.id === categoryId);
    if (!category) {
      console.warn(`Category ${categoryId} not found in template`);
      return;
    }
    
    let value = 1; // Default value
    
    // If category has a formula, evaluate it as a simple expression
    // For formulas like "3+3", "+3", "5", etc., this will evaluate correctly
    if (category.defaultFormula) {
      try {
        // First, try to parse as a simple number (handles cases like "+3", "-5", "10")
        const trimmedFormula = category.defaultFormula.trim();
        const numericValue = Number(trimmedFormula);
        if (!isNaN(numericValue) && isFinite(numericValue)) {
          value = numericValue;
        } else {
          // If not a simple number, try to evaluate as a formula
          // Get base category totals (sum of entries only, without formulas) to avoid circular references
          // This ensures category references like {Test} resolve to actual entry values
          const baseTotals: Record<string, number> = {};
          getSessionEntries(state, session.id)
            .filter((entry) => entry.playerId === playerId)
            .forEach((entry) => {
              const key = entry.categoryId ?? "uncategorized";
              baseTotals[key] = (baseTotals[key] ?? 0) + entry.value;
            });
          
          // Build getCategoryValue function to resolve category references
          const getCategoryValue = (categoryNameOrId: string): number => {
            // Handle special objects
            if (categoryNameOrId === "total") {
              return Object.values(baseTotals).reduce((sum, val) => sum + val, 0);
            }
            // Try to find category by name first, then by ID in template
            // Always use fresh template from state
            const currentTemplate = session.templateId ? state.templates[session.templateId] : undefined;
            if (!currentTemplate) return 0;
            const foundCategory = currentTemplate.categoryTemplates.find(
              (cat) => cat.name.toLowerCase() === categoryNameOrId.toLowerCase() || cat.id === categoryNameOrId
            );
            if (foundCategory) {
              // Return base total (entries only) for the referenced category
              // categoryId in entries is now a template category ID
              return baseTotals[foundCategory.id] ?? 0;
            }
            // If not found, try direct lookup (categoryId in entries is template category ID)
            return baseTotals[categoryNameOrId] ?? 0;
          };
          
          // Build resolveObject function for game object references
          // Always get fresh template from state
          const currentTemplate = session.templateId ? state.templates[session.templateId] : undefined;
          const resolveObject = (objectName: string): number | undefined => {
            // Try to find object by name from template
            if (currentTemplate) {
              const varDef = currentTemplate.objectDefinitions.find(
                (v) => v.name.toLowerCase() === objectName.toLowerCase() || v.id === objectName
              );
              if (varDef) {
                // Try player object first
                const playerVar = getObjectValue(state, session.id, varDef.id, playerId);
                if (playerVar !== undefined) {
                  // Handle set types - convert to number for formulas
                  if (varDef.type === "set") {
                    if (varDef.setType === "identical") {
                      return typeof playerVar === "number" ? playerVar : 0;
                    } else if (varDef.setType === "elements") {
                      // For elements sets, return total count
                      if (Array.isArray(playerVar)) {
                        return (playerVar as any[]).reduce((sum, el) => sum + (el.quantity || 0), 0);
                      }
                      return 0;
                    }
                  }
                  if (typeof playerVar === "number") {
                    return playerVar;
                  }
                }
                // Try session object
                const sessionVar = getObjectValue(state, session.id, varDef.id);
                if (sessionVar !== undefined) {
                  // Handle set types - convert to number for formulas
                  if (varDef.type === "set") {
                    if (varDef.setType === "identical") {
                      return typeof sessionVar === "number" ? sessionVar : 0;
                    } else if (varDef.setType === "elements") {
                      // For elements sets, return total count
                      if (Array.isArray(sessionVar)) {
                        return (sessionVar as any[]).reduce((sum, el) => sum + (el.quantity || 0), 0);
                      }
                      return 0;
                    }
                  }
                  if (typeof sessionVar === "number") {
                    return sessionVar;
                  }
                }
              }
            }
            return undefined;
          };
          
          // Get round index for context
          const roundIndex = selectedRoundId ? (state.rounds[selectedRoundId]?.index || 0) : 0;
          
          value = evaluateFormula(
            category.defaultFormula,
            {
              categories: baseTotals,
              total: Object.values(baseTotals).reduce((sum, val) => sum + val, 0),
              round: roundIndex,
            },
            getCategoryValue,
            resolveObject
          );
        }
      } catch (error) {
        console.error(`Failed to evaluate formula for category ${category.name} (formula: "${category.defaultFormula}"):`, error);
        value = 1; // Fallback to default
      }
    }
    
    // Apply mode (add or subtract)
    const finalValue = mode === "subtract" ? -value : value;
    
    // Check if negative values are allowed
    if (finalValue < 0 && !session.settings.allowNegative) {
      return;
    }
    
    // Create entry directly without opening modal
    const entry: ScoreEntry = {
      id: createId(),
      sessionId: session.id,
      playerId, // Make sure we're using the correct playerId
      createdAt: Date.now(),
      value: finalValue,
      roundId: session.settings.roundsEnabled ? selectedRoundId : undefined,
      categoryId,
      source: "manual",
    };
    console.debug(`Creating entry: playerId=${entry.playerId}, value=${entry.value}, categoryId=${entry.categoryId}, entryId=${entry.id}`);
    dispatch({ type: "entry/add", payload: entry });
    
    // Evaluate rules only for the player who made this action (not all players)
    // Use a ref to track if we're already evaluating rules to prevent infinite loops
    // Rules will be evaluated after state updates via the useEffect below
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

  // Note: Rules are now evaluated in the useEffect above (lines 66-138)
  // which only evaluates rules for the player who made the manual entry.
  // This old useEffect that evaluated for all players has been removed to prevent
  // rules from firing for all players when one player makes an action.

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
        {session.settings.roundsEnabled && displaySettings.showRoundControls && (
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

        {session.templateId && displaySettings.showSessionObjects && (() => {
          const sessionObjects = getSessionObjects(state, session.id);
          // Always get fresh template from state
          const currentTemplate = session.templateId ? state.templates[session.templateId] : undefined;
          if (!currentTemplate) return null;
          return sessionObjects.length > 0 ? (
            <div className="card stack">
              <div className="card-title">Session Objects</div>
              <div className="inline" style={{ gap: "8px", flexWrap: "wrap" }}>
                {sessionObjects.map((objectValue) => {
                  const varDef = currentTemplate?.objectDefinitions.find((v) => v.id === objectValue.objectDefinitionId);
                  if (!varDef) return null;
                  // For sets, show a summary
                  let displayValue: string;
                  if (varDef.type === "set") {
                    if (varDef.setType === "identical") {
                      const count = typeof objectValue.value === "number" ? objectValue.value : 0;
                      const elementName = varDef.setElementTemplate?.name || "items";
                      displayValue = `${count} ${elementName}`;
                    } else {
                      const elements = Array.isArray(objectValue.value) ? objectValue.value : [];
                      const total = elements.reduce((sum: number, el: any) => sum + (el.quantity || 0), 0);
                      displayValue = `${total} element${total !== 1 ? "s" : ""}`;
                    }
                  } else {
                    displayValue = String(objectValue.value);
                  }
                  return (
                    <div key={objectValue.id} className="inline" style={{ gap: "4px", padding: "4px 8px", background: "#f3f4f6", borderRadius: "4px" }}>
                      {varDef.icon && <span>{varDef.icon}</span>}
                      <strong>{varDef.name}:</strong>
                      <span>{displayValue}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null;
        })()}

        <div className="player-grid">
          {players.map((player) => {
            // Create a stable callback for this specific player to avoid closure issues
            const handlePlayerCategoryAction = (categoryId: string, mode: "add" | "subtract") => {
              console.debug(`PlayerCard callback: playerId=${player.id}, playerName=${player.name}, categoryId=${categoryId}, mode=${mode}`);
              handleCategoryAction(player.id, categoryId, mode);
            };
            
            const playerTotal = totals[player.id] ?? 0;
            console.debug(`Rendering PlayerCard: player=${player.name} (id=${player.id}), total=${playerTotal}`);
            
            return (
            <PlayerCard
              key={player.id}
              name={player.name}
              total={playerTotal}
              isWinner={winners.includes(player.id)}
              allowNegative={session.settings.allowNegative}
              onQuickAdd={(value) => handleQuickAdd(player.id, value)}
              onAddEntry={() => handleOpenEntryModal(player.id)}
              onOpenLedger={() => onOpenPlayer(player.id)}
              onCategoryAction={handlePlayerCategoryAction}
              playerId={player.id}
              sessionId={session.id}
              state={state}
              showQuickAdd={displaySettings.showQuickAdd}
              showObjects={displaySettings.showPlayerObjects}
              onObjectUpdate={(objectValueId, value) => {
                const objectValue = state.objectValues?.[objectValueId];
                if (objectValue) {
                  dispatch({
                    type: "object/update",
                    payload: {
                      ...objectValue,
                      value,
                      updatedAt: Date.now(),
                      updatedBy: "manual",
                    },
                  });
                }
              }}
            />
            );
          })}
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
            {session.settings.roundsEnabled && displaySettings.showRoundControls && (
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
            <div className="card" style={{ background: "#f9fafb" }}>
              <div className="card-title">Template</div>
              {template ? (
                <>
                  <div className="inline" style={{ gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                    {template.icon && (
                      <span style={{ fontSize: "1.5rem" }}>{template.icon}</span>
                    )}
                    <div style={{ flex: 1 }}>
                      <strong>{template.name}</strong>
                      <span className="badge" style={{ marginLeft: "8px" }}>
                        {template.gameType}
                      </span>
                    </div>
                  </div>
                  {template?.description && (
                    <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "8px 0" }}>
                      {template.description}
                    </p>
                  )}
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "8px" }}>
                    {template?.categoryTemplates?.length || 0} categories •{" "}
                    {template?.ruleTemplates?.length || 0} rules •{" "}
                    {template?.objectDefinitions?.length || 0} objects
                  </div>
                </>
              ) : (
                <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "8px 0" }}>
                  No template assigned
                </p>
              )}
              <div>
                <label className="label">Change Template</label>
                <select
                  className="input"
                  value=""
                  onChange={(event) => {
                    const templateId = event.target.value;
                    if (!templateId) return;
                    
                    const template = state.templates[templateId];
                    if (!template) return;

                    // Validate compatibility
                    const playerCount = session.playerIds.length;
                    const validation = validateTemplateCompatibility(template, playerCount);
                    if (!validation.compatible) {
                      alert(validation.errors.join("\n"));
                      return;
                    }

                    // Confirm before applying
                    if (window.confirm(
                      `Apply template "${template.name}" to this session? This will add categories, rules, and objects from the template. Existing data will be preserved.`
                    )) {
                      applyTemplateToExistingSession(template, session, state, dispatch);
                      setSettingsOpen(false);
                    }
                  }}
                >
                  <option value="">Select a template...</option>
                  {Object.values(state.templates).map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.icon ? `${template.icon} ` : ""}
                      {template.name}
                    </option>
                  ))}
                </select>
                <small style={{ display: "block", marginTop: "4px", color: "#6b7280" }}>
                  Applying a template will add its categories, rules, and objects to this session.
                </small>
              </div>
            </div>
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
            <div className="card" style={{ background: "#f9fafb" }}>
              <div className="card-title">Display options</div>
              <label className="inline">
                <input
                  type="checkbox"
                  checked={displaySettings.showRoundControls}
                  onChange={(event) =>
                    dispatch({
                      type: "session/update",
                      payload: updateSession({
                        ...session,
                        settings: {
                          ...session.settings,
                          showRoundControls: event.target.checked,
                        },
                      }),
                    })
                  }
                />
                Show round controls
              </label>
              <label className="inline">
                <input
                  type="checkbox"
                  checked={displaySettings.showSessionObjects}
                  onChange={(event) =>
                    dispatch({
                      type: "session/update",
                      payload: updateSession({
                        ...session,
                        settings: {
                          ...session.settings,
                          showSessionObjects: event.target.checked,
                        },
                      }),
                    })
                  }
                />
                Show session objects
              </label>
              <label className="inline">
                <input
                  type="checkbox"
                  checked={displaySettings.showPlayerObjects}
                  onChange={(event) =>
                    dispatch({
                      type: "session/update",
                      payload: updateSession({
                        ...session,
                        settings: {
                          ...session.settings,
                          showPlayerObjects: event.target.checked,
                        },
                      }),
                    })
                  }
                />
                Show player objects on cards
              </label>
              <label className="inline">
                <input
                  type="checkbox"
                  checked={displaySettings.showQuickAdd}
                  onChange={(event) =>
                    dispatch({
                      type: "session/update",
                      payload: updateSession({
                        ...session,
                        settings: {
                          ...session.settings,
                          showQuickAdd: event.target.checked,
                        },
                      }),
                    })
                  }
                />
                Show quick add buttons
              </label>
            </div>
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
