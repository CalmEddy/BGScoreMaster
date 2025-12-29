import { useMemo, useState } from "react";
import { createId } from "../lib/id";
import { AppAction, AppState, CategoryTemplate, Session } from "../state/types";
import { getSessionTemplateCategories } from "../lib/templateApplication";
import CategoryConfigModal from "../components/CategoryConfigModal";

type CategoryNode = CategoryTemplate & {
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
  // Always get fresh template from state - don't cache it
  const template = useMemo(() => {
    return session.templateId ? state.templates[session.templateId] : undefined;
  }, [session.templateId, state.templates]);
  
  const allCategories = useMemo(() => {
    if (!template) return [];
    return getSessionTemplateCategories(state, session);
  }, [state.templates, session.templateId, session.categoryTemplateIds, template]);

  const categoryTree = useMemo(() => {
    const buildTree = (parentId: string | undefined, level: number): CategoryNode[] => {
      return allCategories
        .filter((cat) => cat.parentId === parentId)
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
  const [configCategory, setConfigCategory] = useState<CategoryTemplate | null>(null);

  const handleAdd = () => {
    if (!newName.trim() || !template) return;
    const maxSortOrder = allCategories.length > 0
      ? Math.max(...allCategories.map((c) => c.sortOrder))
      : 0;
    const category: CategoryTemplate = {
      id: createId(),
      name: newName.trim(),
      sortOrder: maxSortOrder + 1,
      parentId: parentForNew,
      displayType: "sum",
      defaultWeight: 1.0,
      required: false,
    };
    const updatedTemplate = {
      ...template,
      categoryTemplates: [...template.categoryTemplates, category],
      updatedAt: Date.now(),
    };
    dispatch({ type: "template/update", payload: updatedTemplate });
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

  const handleUpdate = (category: CategoryTemplate, name: string) => {
    if (!template) return;
    const updatedTemplate = {
      ...template,
      categoryTemplates: template.categoryTemplates.map((cat) =>
        cat.id === category.id ? { ...cat, name } : cat
      ),
      updatedAt: Date.now(),
    };
    dispatch({ type: "template/update", payload: updatedTemplate });
  };

  const handleRemove = (category: CategoryTemplate) => {
    if (!window.confirm("Delete this category?")) return;
    if (!template) return;
    const updatedTemplate = {
      ...template,
      categoryTemplates: template.categoryTemplates.filter((cat) => cat.id !== category.id),
      updatedAt: Date.now(),
    };
    dispatch({ type: "template/update", payload: updatedTemplate });
  };

  const swapOrder = (category: CategoryTemplate, direction: number) => {
    if (!template) return;
    const siblings = allCategories.filter(
      (c) => c.parentId === category.parentId && c.id !== category.id
    );
    const sortedSiblings = [...siblings].sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIndex = sortedSiblings.findIndex((c) => c.sortOrder >= category.sortOrder);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= sortedSiblings.length) return;
    const target = sortedSiblings[targetIndex];
    const updatedTemplate = {
      ...template,
      categoryTemplates: template.categoryTemplates.map((cat) => {
        if (cat.id === category.id) return { ...cat, sortOrder: target.sortOrder };
        if (cat.id === target.id) return { ...cat, sortOrder: category.sortOrder };
        return cat;
      }),
      updatedAt: Date.now(),
    };
    dispatch({ type: "template/update", payload: updatedTemplate });
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
                {node.displayType === "formula" ? "Formula" : `${node.defaultWeight}x`}
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
              disabled={node.level === 0 && allCategories.filter((c) => !c.parentId).indexOf(node) === 0}
            >
              ↑
            </button>
            <button
              className="button secondary"
              onClick={() => swapOrder(node, 1)}
              disabled={
                node.level === 0 &&
                allCategories.filter((c) => !c.parentId).indexOf(node) ===
                  allCategories.filter((c) => !c.parentId).length - 1
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
          sessionId={session.id}
          onClose={() => setConfigCategory(null)}
          onSave={(updated) => {
            if (!template) return;
            const updatedTemplate = {
              ...template,
              categoryTemplates: template.categoryTemplates.map((cat) =>
                cat.id === updated.id ? updated : cat
              ),
              updatedAt: Date.now(),
            };
            dispatch({ type: "template/update", payload: updatedTemplate });
            setConfigCategory(null);
          }}
        />
      )}
    </div>
  );
};

export default Categories;

