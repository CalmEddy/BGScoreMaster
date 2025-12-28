import React from "react";

const Modal = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="inline" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="button ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div style={{ marginTop: 16 }}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;

