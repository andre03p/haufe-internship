import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileCode,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import axios from "axios";
import "./Dashboard.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userId = 3; // TODO: Get from auth context (using Default Developer for now)

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, reviewsRes] = await Promise.all([
        axios.get(`${API_URL}/api/reviews/stats/${userId}`),
        axios.get(`${API_URL}/api/reviews?userId=${userId}&limit=10`),
      ]);

      setStats(statsRes.data.stats);
      setReviews(reviewsRes.data.reviews);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      CRITICAL: "text-red-600 bg-red-50",
      MAJOR: "text-yellow-600 bg-yellow-50",
      MINOR: "text-blue-600 bg-blue-50",
      INFO: "text-gray-600 bg-gray-50",
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

  if (error) {
    return (
      <div className="error-container">
        <div>
          <AlertCircle
            className="error-icon"
            style={{ width: "64px", height: "64px", margin: "0 auto 16px" }}
          />
          <h2 className="error-title">Error Loading Dashboard</h2>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="gh-container">
        {/* Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">Code Review Dashboard</h1>
          <p className="dashboard-subtitle">
            AI-powered automated code review insights
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="stats-grid">
            <StatCard
              title="Total Reviews"
              value={stats.totalReviews}
              icon={<FileCode style={{ width: "24px", height: "24px" }} />}
              color="blue"
            />
            <StatCard
              title="Issues Found"
              value={stats.totalIssues}
              icon={<AlertCircle style={{ width: "24px", height: "24px" }} />}
              color="red"
              subtitle={`${stats.totalCritical} critical`}
            />
            <StatCard
              title="Avg Analysis Time"
              value={`${stats.avgAnalysisTime}s`}
              icon={<Clock style={{ width: "24px", height: "24px" }} />}
              color="green"
            />
            <StatCard
              title="Tokens Used"
              value={stats.totalTokens.toLocaleString()}
              icon={<Activity style={{ width: "24px", height: "24px" }} />}
              color="purple"
            />
          </div>
        )}

        {/* Recent Reviews */}
        <div className="reviews-section">
          <div className="reviews-header">
            <h2 className="reviews-title">Recent Reviews</h2>
          </div>
          <div className="reviews-list">
            {reviews.length === 0 ? (
              <div className="empty-state">
                <FileCode
                  className="empty-state-icon"
                  style={{ width: "48px", height: "48px" }}
                />
                <p className="empty-state-text">
                  No reviews yet. Start by analyzing your code!
                </p>
              </div>
            ) : (
              reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onClick={() => navigate(`/review/${review.id}`)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, subtitle }) {
  const colorClasses = {
    blue: "stat-icon-blue",
    red: "stat-icon-red",
    green: "stat-icon-green",
    purple: "stat-icon-purple",
  };

  return (
    <div className="stat-card">
      <div className={`stat-icon-wrapper ${colorClasses[color]}`}>{icon}</div>
      <h3 className="stat-label">{title}</h3>
      <p className="stat-value">{value}</p>
      {subtitle && <p className="stat-subtitle">{subtitle}</p>}
    </div>
  );
}

function ReviewCard({ review, onClick }) {
  const getStatusClass = (status) => {
    const classes = {
      COMPLETED: "status-completed",
      IN_PROGRESS: "status-in-progress",
      PENDING: "status-pending",
      FAILED: "status-failed",
    };
    return classes[status] || classes.PENDING;
  };

  return (
    <div className="review-card" onClick={onClick}>
      <div className="review-card-header">
        <div className="review-info">
          <div className="review-title-row">
            <h3 className="review-branch">{review.branch}</h3>
            <span
              className={`review-status-badge ${getStatusClass(review.status)}`}
            >
              {review.status}
            </span>
          </div>
          <p className="review-path">{review.repositoryPath}</p>
        </div>
        <span className="review-time">
          {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
        </span>
      </div>

      <div className="review-stats">
        <div className="review-stat">
          <span className="review-stat-value">{review.filesAnalyzed}</span>
          <span className="review-stat-label">Files</span>
        </div>
        <div className="review-stat">
          <span className="review-stat-value critical">
            {review.criticalIssues}
          </span>
          <span className="review-stat-label">Critical</span>
        </div>
        <div className="review-stat">
          <span className="review-stat-value major">{review.majorIssues}</span>
          <span className="review-stat-label">Major</span>
        </div>
        <div className="review-stat">
          <span className="review-stat-value minor">{review.minorIssues}</span>
          <span className="review-stat-label">Minor</span>
        </div>
      </div>

      {review.estimatedEffort && (
        <div className="review-effort">
          <TrendingUp style={{ width: "16px", height: "16px" }} />
          <span>
            Estimated effort: {review.estimatedEffort.toFixed(1)} hours
          </span>
        </div>
      )}
    </div>
  );
}
