// TypeScript interfaces for the Dashboard API endpoint

// Main dashboard response interface
export interface DashboardResponse {
  visibility: VisibilityData;
  sentiment: SentimentData;
  competitorPosition: CompetitorPositionData;
}

// Historical visibility data
export interface VisibilityData {
  currentVisibility: number; // Current overall visibility percentage (0-100)
  trend: 'up' | 'down' | 'static'; // Trend compared to previous day
  history: VisibilityHistoryPoint[];
}

export interface VisibilityHistoryPoint {
  date: string; // Format: 'YYYY-MM-DD'
  visibility: number; // Visibility percentage for this date (0-100)
  totalRuns: number; // Total prompt runs on this date
  mentionRuns: number; // Runs where company was mentioned on this date
}

// Historical sentiment data
export interface SentimentData {
  currentSentiment: number; // Current average sentiment (-1 to 1)
  trend: 'up' | 'down' | 'static'; // Trend compared to previous day
  history: SentimentHistoryPoint[];
}

export interface SentimentHistoryPoint {
  date: string; // Format: 'YYYY-MM-DD'
  sentiment: number; // Average sentiment for this date (-1 to 1)
  count: number; // Number of mentions on this date
}

// Competitor position data
export interface CompetitorPositionData {
  currentPosition: number | null; // Current rank (1-based), null if not found
  totalCompanies: number; // Total number of companies in the ranking
  competitors: CompetitorEntry[];
}

export interface CompetitorEntry {
  position: number; // Rank position (1-based)
  companyId: string; // Company ID
  companyName: string; // Company name
  companyDomain: string; // Company domain
  visibility: number; // Visibility percentage (0-100)
  averageSentiment: number; // Average sentiment (-1 to 1)
  isCurrentCompany: boolean; // True if this is the logged-in user's company
}

// Usage Examples:

// 1. Fetch dashboard data
const fetchDashboardData = async (days: number = 30): Promise<DashboardResponse> => {
  const response = await fetch(`/api/dashboard?days=${days}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }

  return response.json();
};

// 2. Usage in a React component
import React, { useState, useEffect } from 'react';

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeSpan, setTimeSpan] = useState(30); // days

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const data = await fetchDashboardData(timeSpan);
        setDashboardData(data);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [timeSpan]);

  if (loading) return <div>Loading dashboard...</div>;
  if (!dashboardData) return <div>Failed to load dashboard data</div>;

  return (
    <div className="dashboard">
      {/* Visibility Section */}
      <section className="visibility-section">
        <h2>Visibility Metrics</h2>
        <div className="current-visibility">
          <span className="value">{dashboardData.visibility.currentVisibility}%</span>
          <span className={`trend ${dashboardData.visibility.trend}`}>
            {dashboardData.visibility.trend === 'up' ? '↗️' : 
             dashboardData.visibility.trend === 'down' ? '↘️' : '➡️'}
          </span>
        </div>
        
        {/* Visibility Chart */}
        <div className="visibility-chart">
          {dashboardData.visibility.history.map((point) => (
            <div key={point.date} className="chart-point">
              <div className="date">{point.date}</div>
              <div className="visibility">{point.visibility}%</div>
              <div className="runs">{point.mentionRuns}/{point.totalRuns}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Sentiment Section */}
      <section className="sentiment-section">
        <h2>Sentiment Analysis</h2>
        <div className="current-sentiment">
          <span className="value">{dashboardData.sentiment.currentSentiment}</span>
          <span className={`trend ${dashboardData.sentiment.trend}`}>
            {dashboardData.sentiment.trend === 'up' ? '↗️' : 
             dashboardData.sentiment.trend === 'down' ? '↘️' : '➡️'}
          </span>
        </div>
        
        {/* Sentiment Chart */}
        <div className="sentiment-chart">
          {dashboardData.sentiment.history.map((point) => (
            <div key={point.date} className="chart-point">
              <div className="date">{point.date}</div>
              <div className="sentiment">{point.sentiment}</div>
              <div className="count">{point.count} mentions</div>
            </div>
          ))}
        </div>
      </section>

      {/* Competitor Position Section */}
      <section className="competitor-position-section">
        <h2>Competitive Position</h2>
        {dashboardData.competitorPosition.currentPosition ? (
          <div className="position-info">
            <div className="current-rank">
              Rank #{dashboardData.competitorPosition.currentPosition} of {dashboardData.competitorPosition.totalCompanies}
            </div>
            
            <div className="competitor-list">
              {dashboardData.competitorPosition.competitors.map((competitor) => (
                <div 
                  key={competitor.companyId} 
                  className={`competitor-item ${competitor.isCurrentCompany ? 'current-company' : ''}`}
                >
                  <div className="position">#{competitor.position}</div>
                  <div className="company-info">
                    <div className="name">{competitor.companyName}</div>
                    <div className="domain">{competitor.companyDomain}</div>
                  </div>
                  <div className="metrics">
                    <div className="visibility">{competitor.visibility}%</div>
                    <div className="sentiment">{competitor.averageSentiment}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="no-position">Company not found in rankings</div>
        )}
      </section>

      {/* Time Span Controls */}
      <div className="time-controls">
        <button 
          onClick={() => setTimeSpan(7)} 
          className={timeSpan === 7 ? 'active' : ''}
        >
          7 days
        </button>
        <button 
          onClick={() => setTimeSpan(30)} 
          className={timeSpan === 30 ? 'active' : ''}
        >
          30 days
        </button>
        <button 
          onClick={() => setTimeSpan(90)} 
          className={timeSpan === 90 ? 'active' : ''}
        >
          90 days
        </button>
      </div>
    </div>
  );
};

export default Dashboard;

// 3. Chart.js/Recharts integration examples

// For Chart.js
const createVisibilityChartData = (history: VisibilityHistoryPoint[]) => ({
  labels: history.map(point => point.date),
  datasets: [
    {
      label: 'Visibility %',
      data: history.map(point => point.visibility),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.1,
    },
  ],
});

const createSentimentChartData = (history: SentimentHistoryPoint[]) => ({
  labels: history.map(point => point.date),
  datasets: [
    {
      label: 'Sentiment',
      data: history.map(point => point.sentiment),
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      tension: 0.1,
    },
  ],
});

// For Recharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const VisibilityChart: React.FC<{ data: VisibilityHistoryPoint[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="visibility" stroke="#8884d8" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

const SentimentChart: React.FC<{ data: SentimentHistoryPoint[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis domain={[-1, 1]} />
      <Tooltip />
      <Line type="monotone" dataKey="sentiment" stroke="#82ca9d" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

// 4. API Endpoint URL
// GET /api/dashboard?days=30
// Headers: Cookie with authentication
// Returns: DashboardResponse

// 5. Error Handling
interface ApiError {
  error: string;
  message: string;
}

const handleDashboardError = (error: any) => {
  if (error.status === 404) {
    console.error('Company not found');
  } else if (error.status === 401) {
    console.error('Authentication required');
    // Redirect to login
  } else {
    console.error('Dashboard API error:', error);
  }
};