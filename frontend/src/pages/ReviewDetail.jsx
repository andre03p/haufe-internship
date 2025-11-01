import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileCode,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  ThumbsUp,
  Wrench,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Book,
  TestTube,
  Layers,
  GitBranch,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { formatDistanceToNow } from "date-fns";
import axios from "axios";
import "./ReviewDetail.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [comment, setComment] = useState("");
  const [expandedIssues, setExpandedIssues] = useState(new Set());
  const userId = 3; // TODO: Get from auth context (using Default Developer for now)

  useEffect(() => {
    fetchReview();
  }, [id]);

  const fetchReview = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/reviews/${id}`);
      setReview(response.data.review);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveIssue = async (issueId, resolved) => {
    try {
      await axios.put(`${API_URL}/api/reviews/issues/${issueId}/resolve`, {
        resolved,
      });
      fetchReview();
    } catch (err) {
      console.error("Failed to resolve issue:", err);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;

    try {
      await axios.post(`${API_URL}/api/reviews/${id}/comments`, {
        userId,
        content: comment,
        issueId: selectedIssue,
      });
      setComment("");
      setSelectedIssue(null);
      fetchReview();
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleGenerateFix = async (issueId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/reviews/issues/${issueId}/fix`,
        { repositoryPath: review.repositoryPath }
      );
      alert("Fix generated! Check the issue details.");
      fetchReview();
    } catch (err) {
      alert("Failed to generate fix: " + err.message);
    }
  };

  const toggleIssueExpand = (issueId) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(issueId)) {
      newExpanded.delete(issueId);
    } else {
      newExpanded.add(issueId);
    }
    setExpandedIssues(newExpanded);
  };

  const getSeverityColor = (severity) => {
    const colors = {
      CRITICAL: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
      },
      MAJOR: {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
      },
      MINOR: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
      },
      INFO: {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
      },
    };
    return colors[severity] || colors.INFO;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="error-container">
        <div>
          <AlertCircle
            className="error-icon"
            style={{ width: "64px", height: "64px", margin: "0 auto 16px" }}
          />
          <h2 className="error-title">Error Loading Review</h2>
          <p className="error-message">{error || "Review not found"}</p>
        </div>
      </div>
    );
  }

  const issuesByFile = review.issues.reduce((acc, issue) => {
    if (!acc[issue.filePath]) {
      acc[issue.filePath] = [];
    }
    acc[issue.filePath].push(issue);
    return acc;
  }, {});

  return (
    <div className="review-detail-container">
      {/* Header */}
      <div className="review-header">
        <div className="review-header-content">
          <button onClick={() => navigate("/")} className="back-button">
            <ArrowLeft style={{ width: "16px", height: "16px" }} />
            Back to Dashboard
          </button>

          <div className="review-header-main">
            <div className="review-header-info">
              <h1>{review.branch}</h1>
              <p className="review-path">{review.repositoryPath}</p>
            </div>
            <div className="review-header-meta">
              <p className="review-time">
                {formatDistanceToNow(new Date(review.createdAt), {
                  addSuffix: true,
                })}
              </p>
              <div className="review-analysis-time">
                <Clock style={{ width: "16px", height: "16px" }} />
                <span>{review.analysisTime?.toFixed(2)}s</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-row">
            <StatBadge
              label="Files"
              value={review.filesAnalyzed}
              color="gray"
            />
            <StatBadge
              label="Critical"
              value={review.criticalIssues}
              color="red"
            />
            <StatBadge
              label="Major"
              value={review.majorIssues}
              color="yellow"
            />
            <StatBadge label="Minor" value={review.minorIssues} color="blue" />
            <StatBadge
              label="Effort"
              value={`${review.estimatedEffort?.toFixed(1) || 0}h`}
              color="purple"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="review-content">
        <div className="review-layout">
          {/* Issues List */}
          <div className="issues-section">
            <h2 className="section-title">Issues Found</h2>

            {Object.entries(issuesByFile).map(([filePath, issues]) => (
              <div key={filePath} className="file-group">
                <div className="file-header">
                  <div className="file-header-content">
                    <FileCode
                      className="file-icon"
                      style={{ width: "20px", height: "20px" }}
                    />
                    <h3 className="file-path">{filePath}</h3>
                    <span className="file-issue-count">
                      ({issues.length} issues)
                    </span>
                  </div>
                </div>

                <div className="file-issues">
                  {issues.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      expanded={expandedIssues.has(issue.id)}
                      onToggle={() => toggleIssueExpand(issue.id)}
                      onResolve={handleResolveIssue}
                      onGenerateFix={handleGenerateFix}
                      onComment={(issueId) => setSelectedIssue(issueId)}
                      getSeverityColor={getSeverityColor}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="sidebar">
            {/* Recommendations */}
            {review.recommendations && (
              <RecommendationsCard recommendations={review.recommendations} />
            )}

            {/* Comment Box */}
            <div className="sidebar-card">
              <h3 className="sidebar-title">
                <MessageSquare style={{ width: "20px", height: "20px" }} />
                Add Comment
              </h3>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  selectedIssue
                    ? "Comment on selected issue..."
                    : "General comment..."
                }
                className="comment-textarea"
                rows="4"
              />
              <button onClick={handleAddComment} className="comment-submit">
                Post Comment
              </button>
            </div>

            {/* Comments */}
            <div className="sidebar-card">
              <h3 className="sidebar-title">Comments</h3>
              <div className="comments-list">
                {review.comments && review.comments.length > 0 ? (
                  review.comments.map((comment) => (
                    <div key={comment.id} className="comment-item">
                      <p className="comment-author">{comment.user.name}</p>
                      <p className="comment-content">{comment.content}</p>
                      <p className="comment-time">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="no-comments">No comments yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }) {
  const colorClasses = {
    gray: "stat-badge-gray",
    red: "stat-badge-red",
    yellow: "stat-badge-yellow",
    blue: "stat-badge-blue",
    purple: "stat-badge-purple",
  };

  return (
    <div className="stat-badge">
      <span className={`stat-badge-value ${colorClasses[color]}`}>{value}</span>
      <span className="stat-badge-label">{label}</span>
    </div>
  );
}

function IssueCard({
  issue,
  expanded,
  onToggle,
  onResolve,
  onGenerateFix,
  onComment,
  getSeverityColor,
}) {
  return (
    <div className={`issue-card severity-${issue.severity.toLowerCase()}`}>
      <div className="issue-header">
        <div style={{ flex: 1 }}>
          <div className="issue-badges">
            <span
              className={`severity-badge severity-${issue.severity.toLowerCase()}`}
            >
              {issue.severity}
            </span>
            <span className="category-badge">{issue.category}</span>
            <span className="line-number">Line {issue.lineNumber}</span>
          </div>
          <h4 className="issue-title">{issue.title}</h4>
          <p className="issue-description">{issue.description}</p>
        </div>
        <button onClick={onToggle} className="toggle-button">
          {expanded ? (
            <ChevronUp style={{ width: "20px", height: "20px" }} />
          ) : (
            <ChevronDown style={{ width: "20px", height: "20px" }} />
          )}
        </button>
      </div>

      {expanded && (
        <div className="issue-details">
          {issue.codeSnippet && (
            <div className="code-snippet">
              <SyntaxHighlighter
                language="javascript"
                style={vscDarkPlus}
                customStyle={{ margin: 0, fontSize: "0.875rem" }}
              >
                {issue.codeSnippet}
              </SyntaxHighlighter>
            </div>
          )}

          {issue.suggestion && (
            <div className="suggestion-box">
              <p className="suggestion-title">💡 Suggestion</p>
              <p className="suggestion-content">{issue.suggestion}</p>
            </div>
          )}

          {issue.fixCode && (
            <div className="fix-box">
              <p className="fix-title">🔧 Auto-generated Fix</p>
              <SyntaxHighlighter
                language="javascript"
                style={vscDarkPlus}
                customStyle={{ margin: 0, fontSize: "0.875rem" }}
              >
                {issue.fixCode}
              </SyntaxHighlighter>
            </div>
          )}

          <div className="issue-actions">
            <button
              onClick={() => onResolve(issue.id, !issue.resolved)}
              className={`action-btn action-btn-resolve ${
                issue.resolved ? "resolved" : ""
              }`}
            >
              <CheckCircle style={{ width: "16px", height: "16px" }} />
              {issue.resolved ? "Resolved" : "Mark Resolved"}
            </button>

            {issue.autoFixable && !issue.fixCode && (
              <button
                onClick={() => onGenerateFix(issue.id)}
                className="action-btn action-btn-fix"
              >
                <Wrench style={{ width: "16px", height: "16px" }} />
                Generate Fix
              </button>
            )}

            <button
              onClick={() => onComment(issue.id)}
              className="action-btn action-btn-comment"
            >
              <MessageSquare style={{ width: "16px", height: "16px" }} />
              Comment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendationsCard({ recommendations }) {
  const hasRecommendations =
    (recommendations.documentation &&
      recommendations.documentation.length > 0) ||
    (recommendations.testing && recommendations.testing.length > 0) ||
    (recommendations.architecture && recommendations.architecture.length > 0) ||
    (recommendations.cicd && recommendations.cicd.length > 0);

  if (!hasRecommendations) {
    return null;
  }

  const icons = {
    documentation: <Book style={{ width: "16px", height: "16px" }} />,
    testing: <TestTube style={{ width: "16px", height: "16px" }} />,
    architecture: <Layers style={{ width: "16px", height: "16px" }} />,
    cicd: <GitBranch style={{ width: "16px", height: "16px" }} />,
  };

  const labels = {
    documentation: "Documentation",
    testing: "Testing",
    architecture: "Architecture",
    cicd: "CI/CD",
  };

  return (
    <div className="recommendations-card">
      <h3 className="recommendations-title">
        <Lightbulb
          style={{
            width: "20px",
            height: "20px",
            color: "var(--gh-success-fg)",
          }}
        />
        Recommendations
      </h3>

      {Object.entries(recommendations).map(([key, items]) => {
        if (!items || items.length === 0) return null;

        return (
          <div key={key} className="recommendation-section">
            <div className="recommendation-heading">
              {icons[key]}
              {labels[key]}
            </div>
            <ul className="recommendation-list">
              {items.map((item, index) => (
                <li key={index} className="recommendation-item">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
