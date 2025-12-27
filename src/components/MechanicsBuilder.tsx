import { useState } from "react";
import { createId } from "../lib/id";
import { GameMechanic } from "../state/types";

const MechanicsBuilder = ({
  mechanics,
  onChange,
}: {
  mechanics: GameMechanic[];
  onChange: (mechanics: GameMechanic[]) => void;
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newMechanic, setNewMechanic] = useState<Partial<GameMechanic>>({
    type: "turnOrder",
    enabled: true,
    config: {},
  });

  const mechanicTypes: GameMechanic["type"][] = [
    "turnOrder",
    "phase",
    "resourceManagement",
    "territoryControl",
    "cardHand",
    "diceRoll",
    "custom",
  ];

  const handleAdd = () => {
    if (!newMechanic.name?.trim()) {
      alert("Please enter a mechanic name");
      return;
    }
    if (!newMechanic.type) {
      alert("Please select a mechanic type");
      return;
    }
    const mechanic: GameMechanic = {
      id: createId(),
      name: newMechanic.name.trim(),
      type: newMechanic.type,
      config: newMechanic.config || {},
      enabled: newMechanic.enabled ?? true,
    };
    onChange([...mechanics, mechanic]);
    setNewMechanic({ type: "turnOrder", enabled: true, config: {} });
    setShowAdd(false);
  };

  const handleUpdate = (id: string, updates: Partial<GameMechanic>) => {
    onChange(mechanics.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const handleRemove = (id: string) => {
    if (!window.confirm("Remove this mechanic?")) return;
    onChange(mechanics.filter((m) => m.id !== id));
  };

  const getMechanicConfigUI = (type: GameMechanic["type"]) => {
    switch (type) {
      case "turnOrder":
        return (
          <div className="stack">
            <label className="label">Rotation Type</label>
            <select
              className="input"
              value={newMechanic.config?.rotationType || "clockwise"}
              onChange={(e) =>
                setNewMechanic({
                  ...newMechanic,
                  config: { ...newMechanic.config, rotationType: e.target.value },
                })
              }
            >
              <option value="clockwise">Clockwise</option>
              <option value="counterclockwise">Counter-clockwise</option>
              <option value="random">Random</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        );
      case "phase":
        return (
          <div className="stack">
            <label className="label">Phases (comma-separated)</label>
            <input
              className="input"
              value={newMechanic.config?.phases?.join(", ") || ""}
              onChange={(e) =>
                setNewMechanic({
                  ...newMechanic,
                  config: {
                    ...newMechanic.config,
                    phases: e.target.value.split(",").map((p) => p.trim()).filter(Boolean),
                  },
                })
              }
              placeholder="e.g., Setup, Action, Scoring, End"
            />
          </div>
        );
      case "resourceManagement":
        return (
          <div className="stack">
            <label className="label">Resource Types (comma-separated)</label>
            <input
              className="input"
              value={newMechanic.config?.resourceTypes?.join(", ") || ""}
              onChange={(e) =>
                setNewMechanic({
                  ...newMechanic,
                  config: {
                    ...newMechanic.config,
                    resourceTypes: e.target.value.split(",").map((r) => r.trim()).filter(Boolean),
                  },
                })
              }
              placeholder="e.g., Wood, Stone, Gold"
            />
          </div>
        );
      case "territoryControl":
        return (
          <div className="stack">
            <label className="label">Territory Count</label>
            <input
              className="input"
              type="number"
              min="1"
              value={newMechanic.config?.territoryCount || ""}
              onChange={(e) =>
                setNewMechanic({
                  ...newMechanic,
                  config: { ...newMechanic.config, territoryCount: parseInt(e.target.value) || 0 },
                })
              }
              placeholder="Number of territories"
            />
          </div>
        );
      case "cardHand":
        return (
          <div className="stack">
            <div className="inline">
              <div style={{ flex: 1 }}>
                <label className="label">Hand Size</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={newMechanic.config?.handSize || ""}
                  onChange={(e) =>
                    setNewMechanic({
                      ...newMechanic,
                      config: { ...newMechanic.config, handSize: parseInt(e.target.value) || 0 },
                    })
                  }
                  placeholder="Default hand size"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Deck Size</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={newMechanic.config?.deckSize || ""}
                  onChange={(e) =>
                    setNewMechanic({
                      ...newMechanic,
                      config: { ...newMechanic.config, deckSize: parseInt(e.target.value) || 0 },
                    })
                  }
                  placeholder="Default deck size"
                />
              </div>
            </div>
          </div>
        );
      case "diceRoll":
        return (
          <div className="stack">
            <label className="label">Dice Type</label>
            <select
              className="input"
              value={newMechanic.config?.diceType || "d6"}
              onChange={(e) =>
                setNewMechanic({
                  ...newMechanic,
                  config: { ...newMechanic.config, diceType: e.target.value },
                })
              }
            >
              <option value="d6">D6 (1-6)</option>
              <option value="d10">D10 (1-10)</option>
              <option value="d20">D20 (1-20)</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        );
      default:
        return (
          <div className="stack">
            <label className="label">Custom Config (JSON)</label>
            <textarea
              className="input"
              rows={4}
              value={JSON.stringify(newMechanic.config || {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setNewMechanic({ ...newMechanic, config: parsed });
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              placeholder='{"key": "value"}'
              style={{ fontFamily: "monospace" }}
            />
          </div>
        );
    }
  };

  return (
    <div className="stack">
      <div className="card stack">
        <div className="card-title">Game Mechanics</div>
        {mechanics.length === 0 ? (
          <p>No mechanics defined yet. Add one to get started.</p>
        ) : (
          <div className="list">
            {mechanics.map((mechanic) => (
              <div key={mechanic.id} className="card inline" style={{ justifyContent: "space-between" }}>
                <div>
                  <strong>{mechanic.name}</strong>
                  <span className="badge" style={{ marginLeft: "8px", fontSize: "0.75rem" }}>
                    {mechanic.type}
                  </span>
                  <label className="inline" style={{ marginLeft: "12px" }}>
                    <input
                      type="checkbox"
                      checked={mechanic.enabled}
                      onChange={(e) => handleUpdate(mechanic.id, { enabled: e.target.checked })}
                    />
                    <span style={{ fontSize: "0.875rem" }}>Enabled</span>
                  </label>
                </div>
                <button className="button danger" onClick={() => handleRemove(mechanic.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        {!showAdd && (
          <button className="button" onClick={() => setShowAdd(true)}>
            + Add Mechanic
          </button>
        )}
      </div>

      {showAdd && (
        <div className="card stack">
          <div className="card-title">Add New Mechanic</div>
          <div className="stack">
            <div>
              <label className="label">Name *</label>
              <input
                className="input"
                value={newMechanic.name || ""}
                onChange={(e) => setNewMechanic({ ...newMechanic, name: e.target.value })}
                placeholder="e.g., Turn Order, Resource Management"
              />
            </div>
            <div>
              <label className="label">Type *</label>
              <select
                className="input"
                value={newMechanic.type || "turnOrder"}
                onChange={(e) =>
                  setNewMechanic({ ...newMechanic, type: e.target.value as GameMechanic["type"] })
                }
              >
                {mechanicTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            {getMechanicConfigUI(newMechanic.type || "turnOrder")}
            <div className="inline">
              <button className="button secondary" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button className="button" onClick={handleAdd}>
                Add Mechanic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MechanicsBuilder;

