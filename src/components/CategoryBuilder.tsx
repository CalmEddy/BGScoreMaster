import { useState } from "react";
import { createId } from "../lib/id";
import { CategoryTemplate } from "../state/types";

type CategoryNode = CategoryTemplate & {
  children: CategoryNode[];
  level: number;
};

const CategoryBuilder = ({
  categories,
  onChange,
  onEdit,
}: {
  categories: CategoryTemplate[];
  onChange: (categories: CategoryTemplate[]) => void;
  onEdit?: (category: CategoryTemplate) => void;
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [parentForNew, setParentForNew] = useState<string | undefined>(undefined);

  const buildTree = (parentId: string | undefined, level: number): CategoryNode[] => {
    return categories
      .filter((cat) => cat.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((cat) => ({
        ...cat,
        children: buildTree(cat.id, level + 1),
        level,
      }));
  };

  const categoryTree = buildTree(undefined, 0);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    const maxSortOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sortOrder)) : 0;
    const newCategory: CategoryTemplate = {
      id: createId(),
      name: newName.trim(),
      sortOrder: maxSortOrder + 1,
      parentId: parentForNew,
      displayType: "sum",
      required: false,
    };
    onChange([...categories, newCategory]);
    setNewName("");
    setParentForNew(undefined);
    if (parentForNew) {
      setExpanded((prev) => new Set(prev).add(parentForNew));
    }
  };

  const handleUpdate = (id: string, updates: Partial<CategoryTemplate>) => {
    onChange(
      categories.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat))
    );
  };

  const handleRemove = (id: string) => {
    if (!window.confirm("Delete this category template?")) return;
    // Remove category and all children
    const toRemove = new Set<string>([id]);
    const findChildren = (parentId: string) => {
      categories.forEach((cat) => {
        if (cat.parentId === parentId) {
          toRemove.add(cat.id);
          findChildren(cat.id);
        }
      });
    };
    findChildren(id);
    onChange(categories.filter((cat) => !toRemove.has(cat.id)));
  };

  const renderNode = (node: CategoryNode) => {
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children.length > 0;
    const indent = node.level * 24;
    const isEditing = editing === node.id;

    return (
      <div key={node.id} className="category-node">
        <div
          className="inline"
          style={{
            justifyContent: "space-between",
            paddingLeft: `${indent}px`,
            alignItems: "center",
          }}
        >
          <div className="inline" style={{ flex: 1, gap: 8 }}>
            {hasChildren && (
              <button
                className="button ghost"
                onClick={() => toggleExpand(node.id)}
                style={{ padding: "4px 8px", minWidth: "auto" }}
              >
                {isExpanded ? "−" : "+"}
              </button>
            )}
            {!hasChildren && <span style={{ width: "24px" }} />}
            {isEditing ? (
              <input
                className="input"
                style={{ flex: 1 }}
                value={node.name}
                onChange={(e) => handleUpdate(node.id, { name: e.target.value })}
                onBlur={() => setEditing(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setEditing(null);
                  if (e.key === "Escape") setEditing(null);
                }}
                autoFocus
              />
            ) : (
              <span
                style={{ flex: 1, cursor: "pointer" }}
                onClick={() => setEditing(node.id)}
              >
                {node.name}
              </span>
            )}
            {node.displayType !== "sum" && (
              <span className="badge" style={{ fontSize: "0.75rem" }}>
                {node.displayType === "formula" ? "Formula" : `${node.defaultWeight ?? 1}x`}
              </span>
            )}
            {node.required && (
              <span className="badge" style={{ fontSize: "0.75rem", background: "#fef3c7" }}>
                Required
              </span>
            )}
          </div>
          <div className="inline">
            <button
              className="button secondary"
              onClick={() => {
                setParentForNew(node.id);
                setExpanded((prev) => new Set(prev).add(node.id));
              }}
              title="Add subcategory"
            >
              + Sub
            </button>
            {onEdit && (
              <button
                className="button secondary"
                onClick={() => onEdit(node)}
                title="Edit category"
              >
                Edit
              </button>
            )}
            <button className="button danger" onClick={() => handleRemove(node.id)}>
              Delete
            </button>
          </div>
        </div>
        {isExpanded && hasChildren && (
          <div className="category-children">
            {node.children.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="stack">
      <div className="card stack">
        <label className="label">
          {parentForNew
            ? `Add subcategory to "${categories.find((c) => c.id === parentForNew)?.name}"`
            : "Add category template"}
        </label>
        <div className="inline">
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") {
                setParentForNew(undefined);
                setNewName("");
              }
            }}
            placeholder="Category name"
          />
          {parentForNew && (
            <button
              className="button secondary"
              onClick={() => {
                setParentForNew(undefined);
                setNewName("");
              }}
            >
              Cancel
            </button>
          )}
          <button className="button" onClick={handleAdd}>
            Add
          </button>
        </div>
      </div>
      <div className="card stack">
        <div className="card-title">Category Templates</div>
        {categoryTree.length === 0 ? (
          <p>No categories yet. Add one to get started.</p>
        ) : (
          <div className="category-tree">{categoryTree.map((node) => renderNode(node))}</div>
        )}
      </div>
    </div>
  );
};

export default CategoryBuilder;
