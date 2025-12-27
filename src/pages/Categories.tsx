import { useMemo, useState } from "react";
import { createId } from "../lib/id";
import { AppAction, AppState, Category, Session } from "../state/types";
import { sortCategories, updateSession } from "../state/store";
import CategoryConfigModal from "../components/CategoryConfigModal";

type CategoryNode = Category & {
  children: CategoryNode[];
  level: number;
};

const Categories = ({
  state,
  session,
  dispatch,
  onBack,
}: {
  state: AppState;
  session: Session;
  dispatch: React.Dispatch<AppAction>;
  onBack: () => void;
}) => {
  const allCategories = useMemo(
    () => session.categoryIds.map((id) => state.categories[id]).filter(Boolean),
    [session.categoryIds, state.categories]
  );

  const categoryTree = useMemo(() => {
    const buildTree = (parentId: string | undefined, level: number): CategoryNode[] => {
      return allCategories
        .filter((cat) => cat.parentCategoryId === parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((cat) => ({
          ...cat,
          children: buildTree(cat.id, level + 1),
          level,
        }));
    };
    return buildTree(undefined, 0);
  }, [allCategories]);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [parentForNew, setParentForNew] = useState<string | undefined>(undefined);
  const [configCategory, setConfigCategory] = useState<Category | null>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const maxSortOrder = allCategories.length > 0
      ? Math.max(...allCategories.map((c) => c.sortOrder))
      : 0;
    const category: Category = {
      id: createId(),
      sessionId: session.id,
      name: newName.trim(),
      sortOrder: maxSortOrder + 1,
      parentCategoryId: parentForNew,
      displayType: "sum",
      weight: 1.0,
    };
    dispatch({ type: "category/add", payload: category });
    dispatch({
      type: "session/update",
      payload: updateSession({
        ...session,
        categoryIds: [...session.categoryIds, category.id],
      }),
    });
    setNewName("");
    setParentForNew(undefined);
    if (parentForNew) {
      setExpandedCategories((prev) => new Set(prev).add(parentForNew));
    }
  };

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleCreateSubcategory = (parentId: string) => {
    setParentForNew(parentId);
    setExpandedCategories((prev) => new Set(prev).add(parentId));
  };

  const handleUpdate = (category: Category, name: string) => {
    dispatch({ type: "category/update", payload: { ...category, name } });
  };

  const handleRemove = (category: Category) => {
    if (!window.confirm("Delete this category?")) return;
    dispatch({ type: "category/remove", payload: { sessionId: session.id, categoryId: category.id } });
  };

  const swapOrder = (category: Category, direction: number) => {
    const siblings = allCategories.filter(
      (c) => c.parentCategoryId === category.parentCategoryId && c.id !== category.id
    );
    const sortedSiblings = sortCategories(siblings);
    const currentIndex = sortedSiblings.findIndex((c) => c.sortOrder >= category.sortOrder);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= sortedSiblings.length) return;
    const target = sortedSiblings[targetIndex];
    const current = { ...category, sortOrder: target.sortOrder };
    const targetUpdated = { ...target, sortOrder: category.sortOrder };
    dispatch({ type: "category/update", payload: current });
    dispatch({ type: "category/update", payload: targetUpdated });
  };

  const renderCategoryNode = (node: CategoryNode) => {
    const isExpanded = expandedCategories.has(node.id);
    const hasChildren = node.children.length > 0;
    const indent = node.level * 24;

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
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? "−" : "+"}
              </button>
            )}
            {!hasChildren && <span style={{ width: "24px" }} />}
            <input
              className="input"
              style={{ flex: 1 }}
              value={node.name}
              onChange={(event) => handleUpdate(node, event.target.value)}
            />
            {node.displayType !== "sum" && (
              <span className="badge" style={{ fontSize: "0.75rem" }}>
                {node.displayType === "formula" ? "Formula" : `${node.weight}x`}
              </span>
            )}
          </div>
          <div className="inline">
            <button
              className="button secondary"
              onClick={() => setConfigCategory(node)}
              title="Configure category"
            >
              ⚙
            </button>
            <button
              className="button secondary"
              onClick={() => handleCreateSubcategory(node.id)}
              title="Create subcategory"
            >
              + Sub
            </button>
            <button
              className="button secondary"
              onClick={() => swapOrder(node, -1)}
              disabled={node.level === 0 && allCategories.filter((c) => !c.parentCategoryId).indexOf(node) === 0}
            >
              ↑
            </button>
            <button
              className="button secondary"
              onClick={() => swapOrder(node, 1)}
              disabled={
                node.level === 0 &&
                allCategories.filter((c) => !c.parentCategoryId).indexOf(node) ===
                  allCategories.filter((c) => !c.parentCategoryId).length - 1
              }
            >
              ↓
            </button>
            <button className="button danger" onClick={() => handleRemove(node)}>
              Delete
            </button>
          </div>
        </div>
        {isExpanded && hasChildren && (
          <div className="category-children">
            {node.children.map((child) => renderCategoryNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app">
      <div className="topbar">
        <button className="button ghost" onClick={onBack}>
          Back
        </button>
        <h1>Categories</h1>
        <span />
      </div>
      <div className="container stack">
        <div className="card stack">
          <label className="label">
            {parentForNew ? `Add subcategory to "${allCategories.find((c) => c.id === parentForNew)?.name}"` : "Add category"}
          </label>
          <div className="inline">
            <input
              className="input"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
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
          <div className="card-title">Categories</div>
          {categoryTree.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px" }}>
              <p style={{ marginBottom: "12px" }}>No categories yet.</p>
              <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                Categories help organize scores. Create one to get started!
              </p>
            </div>
          ) : (
            <div className="category-tree">
              {categoryTree.map((node) => renderCategoryNode(node))}
            </div>
          )}
        </div>
      </div>
      {configCategory && (
        <CategoryConfigModal
          category={configCategory}
          state={state}
          onClose={() => setConfigCategory(null)}
          onSave={(updated) => {
            dispatch({ type: "category/update", payload: updated });
            setConfigCategory(null);
          }}
        />
      )}
    </div>
  );
};

export default Categories;

