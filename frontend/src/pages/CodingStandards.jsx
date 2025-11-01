import { useState, useEffect } from "react";
import { Settings, Plus, Trash2, Edit, Save, X } from "lucide-react";
import axios from "axios";
import "./CodingStandards.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function CodingStandards() {
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    language: "javascript",
    rules: {},
  });

  useEffect(() => {
    fetchStandards();
  }, []);

  const fetchStandards = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/standards`);
      setStandards(response.data.standards);
    } catch (err) {
      console.error("Failed to fetch standards:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedStandards = async () => {
    try {
      await axios.post(`${API_URL}/api/standards/seed`);
      alert("Built-in standards seeded successfully!");
      fetchStandards();
    } catch (err) {
      alert("Failed to seed standards: " + err.message);
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      await axios.put(`${API_URL}/api/standards/${id}`, {
        isActive: !isActive,
      });
      fetchStandards();
    } catch (err) {
      alert("Failed to update standard: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this standard?")) return;

    try {
      await axios.delete(`${API_URL}/api/standards/${id}`);
      fetchStandards();
    } catch (err) {
      alert("Failed to delete standard: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editing) {
        await axios.put(`${API_URL}/api/standards/${editing}`, formData);
      } else {
        await axios.post(`${API_URL}/api/standards`, formData);
      }

      setShowForm(false);
      setEditing(null);
      setFormData({
        name: "",
        description: "",
        language: "javascript",
        rules: {},
      });
      fetchStandards();
    } catch (err) {
      alert("Failed to save standard: " + err.message);
    }
  };

  const handleEdit = (standard) => {
    setFormData({
      name: standard.name,
      description: standard.description || "",
      language: standard.language,
      rules: standard.rules,
    });
    setEditing(standard.id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="standards-container">
      <div className="gh-container">
        {/* Header */}
        <div className="standards-header">
          <div className="standards-header-content">
            <h1 className="standards-title">
              <Settings style={{ width: "32px", height: "32px" }} />
              Coding Standards
            </h1>
            <p className="standards-subtitle">
              Manage coding standards and rules for code reviews
            </p>
          </div>
          <div className="standards-actions">
            <button onClick={handleSeedStandards} className="btn-seed">
              Seed Built-in Standards
            </button>
            <button
              onClick={() => {
                setShowForm(true);
                setEditing(null);
                setFormData({
                  name: "",
                  description: "",
                  language: "javascript",
                  rules: {},
                });
              }}
              className="btn-new-standard"
            >
              <Plus style={{ width: "20px", height: "20px" }} />
              New Standard
            </button>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">
                  {editing ? "Edit Standard" : "New Standard"}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                  className="modal-close"
                >
                  <X style={{ width: "24px", height: "24px" }} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="standard-form">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="form-textarea"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Language *</label>
                  <select
                    required
                    value={formData.language}
                    onChange={(e) =>
                      setFormData({ ...formData, language: e.target.value })
                    }
                    className="form-select"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="csharp">C#</option>
                    <option value="go">Go</option>
                    <option value="rust">Rust</option>
                    <option value="all">All Languages</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Rules (JSON) *</label>
                  <textarea
                    required
                    value={JSON.stringify(formData.rules, null, 2)}
                    onChange={(e) => {
                      try {
                        setFormData({
                          ...formData,
                          rules: JSON.parse(e.target.value),
                        });
                      } catch (err) {
                        // Invalid JSON, keep editing
                      }
                    }}
                    className="form-textarea"
                    rows="8"
                    placeholder='{"maxLineLength": 80, "indentation": 2}'
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-submit">
                    {editing ? "Update" : "Create"} Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditing(null);
                    }}
                    className="btn-cancel"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Standards List */}
        <div className="standards-grid">
          {standards.map((standard) => (
            <div key={standard.id} className="standard-card">
              <div className="standard-header">
                <div className="standard-info">
                  <div className="standard-title-row">
                    <h3 className="standard-name">{standard.name}</h3>
                    <span
                      className={
                        standard.isActive ? "badge-active" : "badge-inactive"
                      }
                    >
                      {standard.isActive ? "Active" : "Inactive"}
                    </span>
                    {standard.isBuiltIn && (
                      <span className="badge-builtin">Built-in</span>
                    )}
                    <span className="badge-language">{standard.language}</span>
                  </div>
                  {standard.description && (
                    <p className="standard-description">
                      {standard.description}
                    </p>
                  )}
                  <details className="rules-details">
                    <summary className="rules-summary">View Rules</summary>
                    <pre className="rules-code">
                      {JSON.stringify(standard.rules, null, 2)}
                    </pre>
                  </details>
                </div>

                <div className="standard-actions">
                  <button
                    onClick={() =>
                      handleToggleActive(standard.id, standard.isActive)
                    }
                    className={`btn-toggle ${
                      standard.isActive
                        ? "btn-toggle-active"
                        : "btn-toggle-inactive"
                    }`}
                  >
                    {standard.isActive ? "Deactivate" : "Activate"}
                  </button>
                  {!standard.isBuiltIn && (
                    <>
                      <button
                        onClick={() => handleEdit(standard)}
                        className="btn-icon btn-icon-edit"
                      >
                        <Edit style={{ width: "20px", height: "20px" }} />
                      </button>
                      <button
                        onClick={() => handleDelete(standard.id)}
                        className="btn-icon btn-icon-delete"
                      >
                        <Trash2 style={{ width: "20px", height: "20px" }} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {standards.length === 0 && (
          <div className="standards-empty">
            <Settings
              className="empty-icon"
              style={{ width: "64px", height: "64px" }}
            />
            <h3 className="empty-title">No Standards Yet</h3>
            <p className="empty-description">
              Get started by seeding built-in standards or creating custom ones
            </p>
            <button onClick={handleSeedStandards} className="btn-empty-action">
              Seed Built-in Standards
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
