import { useState } from "react";

type HelpSection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

const HelpPanel = ({ onClose }: { onClose: () => void }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections: HelpSection[] = [
    {
      id: "scope",
      title: "Scope & Focus",
      content: (
        <div>
          <h4>Scoring Only</h4>
          <p>
            This app is a scoring assistant. It does not manage turn order, enforce game rules,
            or act as an arbiter. Use it to track variables, apply formulas, and adjust totals.
          </p>
          <h4>What You Control</h4>
          <ul>
            <li>Which sessions and templates are used</li>
            <li>Which variables and categories are shown</li>
            <li>Manual adjustments or overrides for corrections</li>
          </ul>
        </div>
      ),
    },
    {
      id: "quick-start",
      title: "Quick Start",
      content: (
        <div>
          <h4>Getting Started</h4>
          <ol>
            <li>Click "New Session" to create a scoring session</li>
            <li>Add players by entering their names</li>
            <li>Configure settings (rounds, score direction, etc.)</li>
            <li>Start adding scores using the quick buttons or "Add..." for detailed entries</li>
          </ol>
          <h4>Basic Scoring</h4>
          <p>Use the quick buttons (+1, +5, +10, etc.) for fast scoring, or click "Add..." for entries with categories, rounds, and notes.</p>
        </div>
      ),
    },
    {
      id: "categories",
      title: "Categories",
      content: (
        <div>
          <h4>What are Categories?</h4>
          <p>Categories help organize scores into different types (e.g., "Victory Points", "Resources", "Territories").</p>
          <h4>Using Categories</h4>
          <ul>
            <li>Create categories in the "Categories" page</li>
            <li>Assign entries to categories when adding scores</li>
            <li>View category totals in player detail view</li>
            <li>Use nested categories for complex scoring systems</li>
          </ul>
          <h4>Nested Categories</h4>
          <p>Create subcategories by nesting them under parent categories. Parent categories automatically sum their children.</p>
        </div>
      ),
    },
    {
      id: "formulas",
      title: "Formulas",
      content: (
        <div>
          <h4>Formula-Based Scoring</h4>
          <p>Categories can use formulas instead of simple sums. Formulas support:</p>
          <ul>
            <li><strong>Variables:</strong> Use <code>{`{categoryName}`}</code> to reference category totals by name</li>
            <li><strong>Math operations:</strong> +, -, *, /, ()</li>
            <li><strong>Functions:</strong> max(), min(), sum(), avg(), round()</li>
          </ul>
          <h4>Examples</h4>
          <ul>
            <li><code>{`{Victory Points} + {Bonus Points}`}</code> - Simple addition using category names</li>
            <li><code>{`{Territory} * 2 + {Resources} * 0.5`}</code> - Weighted calculation</li>
            <li><code>{`max({Category 1}, {Category 2}) + 10`}</code> - Using functions</li>
          </ul>
        </div>
      ),
    },
    {
      id: "rules",
      title: "Scoring Rules",
      content: (
        <div>
          <h4>Conditional Scoring</h4>
          <p>Create rules that automatically apply score adjustments based on conditions. These are scoring helpers only.</p>
          <h4>Rule Examples</h4>
          <ul>
            <li>"If player has 10+ territories, add 5 bonus points"</li>
            <li>"If round is 3, multiply victory points by 1.5"</li>
            <li>"If total score &gt;= 50, set final score to 50"</li>
          </ul>
          <h4>Creating Rules</h4>
          <p>Go to Settings → Rules to create and manage scoring rules. Rules are evaluated automatically after each score entry.</p>
        </div>
      ),
    },
    {
      id: "keyboard",
      title: "Keyboard Shortcuts",
      content: (
        <div>
          <h4>Navigation</h4>
          <ul>
            <li><kbd>H</kbd> - Go to Home</li>
            <li><kbd>N</kbd> - New Session</li>
            <li><kbd>?</kbd> - Open Help</li>
            <li><kbd>Esc</kbd> - Close modals/panels</li>
          </ul>
          <h4>Scoring</h4>
          <ul>
            <li><kbd>1-6</kbd> - Quick add values (when player card focused)</li>
            <li><kbd>+</kbd> - Add entry</li>
            <li><kbd>Z</kbd> - Undo last entry</li>
          </ul>
        </div>
      ),
    },
    {
      id: "tips",
      title: "Tips & Tricks",
      content: (
        <div>
          <h4>Efficient Scoring</h4>
          <ul>
            <li>Use quick buttons for common values</li>
            <li>Create categories for different score types</li>
            <li>Use rounds to track scores per game round</li>
            <li>Add notes to entries for context</li>
          </ul>
          <h4>Advanced Features</h4>
          <ul>
            <li>Export/Import sessions to share or backup</li>
            <li>Use formulas for complex calculations</li>
            <li>Create rules for automatic scoring</li>
            <li>Use adjustment entries to override totals</li>
            <li>Nest categories for hierarchical scoring</li>
          </ul>
        </div>
      ),
    },
  ];

  const filteredSections = sections.filter(
    (section) =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="help-panel">
      <div className="help-panel-header">
        <h2>Help & Guide</h2>
        <button className="button ghost" onClick={onClose} aria-label="Close help">
          ×
        </button>
      </div>
      <div className="help-panel-search">
        <input
          className="input"
          type="text"
          placeholder="Search help..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="help-panel-content">
        {filteredSections.length === 0 ? (
          <p>No results found.</p>
        ) : (
          filteredSections.map((section) => (
            <div key={section.id} className="help-section">
              <button
                className="help-section-title"
                onClick={() =>
                  setActiveSection(activeSection === section.id ? null : section.id)
                }
              >
                {section.title}
                <span className="help-section-toggle">
                  {activeSection === section.id ? "−" : "+"}
                </span>
              </button>
              {activeSection === section.id && (
                <div className="help-section-content">{section.content}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HelpPanel;

