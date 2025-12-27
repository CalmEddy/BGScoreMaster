import { useMemo } from "react";
import { AppState, Session, GameMechanic } from "../state/types";

const MechanicsPanel = ({
  state,
  session,
}: {
  state: AppState;
  session: Session;
}) => {
  const template = session.templateId ? state.templates[session.templateId] : undefined;
  const activeMechanics = useMemo(() => {
    if (!template || !session.activeMechanicIds) return [];
    return session.activeMechanicIds
      .map((id) => template.mechanics.find((m) => m.id === id))
      .filter((m): m is GameMechanic => m !== undefined && m.enabled);
  }, [template, session.activeMechanicIds]);

  if (!activeMechanics.length) return null;

  return (
    <div className="card stack">
      <div className="card-title">Active Mechanics</div>
      <div className="list">
        {activeMechanics.map((mechanic) => (
          <div key={mechanic.id} className="card">
            <div className="inline" style={{ justifyContent: "space-between" }}>
              <div>
                <strong>{mechanic.name}</strong>
                <span className="badge" style={{ marginLeft: "8px", fontSize: "0.75rem" }}>
                  {mechanic.type}
                </span>
              </div>
            </div>
            {mechanic.type === "turnOrder" && (
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "4px" }}>
                Turn order management (coming soon)
              </p>
            )}
            {mechanic.type === "phase" && (
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "4px" }}>
                Phase system (coming soon)
              </p>
            )}
            {mechanic.type === "resourceManagement" && (
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "4px" }}>
                Resource management (coming soon)
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MechanicsPanel;

