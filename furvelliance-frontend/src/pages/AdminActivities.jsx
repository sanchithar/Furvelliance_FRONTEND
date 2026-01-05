import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from '../config/axios';
import './AdminActivities.css';

const AdminActivities = () => {
    const navigate = useNavigate();
    const { token } = useSelector((state) => state.auth);
    const [activities, setActivities] = useState([]);
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchActivities();
        fetchStats();
    }, [currentPage]);

    const fetchActivities = async () => {
        try{
            setLoading(true);
            const response = await axios.get(`/api/admin/activities?page=${currentPage}&limit=50`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setActivities(response.data.activities);
            setTotalPages(response.data.totalPages);
        }catch(err){
            console.error('Failed to fetch activities:', err);
        }finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try{
            const response = await axios.get('/api/admin/activities/stats', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setStats(response.data);
        }catch(err){
            console.error('Failed to fetch stats:', err);
        }
    };

    const getActivityIcon = (type) => {
        const icons = {
            barking: '🔊',
            motion: '🏃',
            eating: '🍖',
            sleeping: '😴',
            unusual_behavior: '⚠️',
            pose_detected: '🤸'
        };
        return icons[type] || '📊';
    };

    return (
        <div className="admin-activities">
            <div className="admin-header">
                <button onClick={() => navigate('/admin')}>← Back to Dashboard</button>
                <h1>Activity Monitoring</h1>
            </div>

            <div className="activity-stats">
                <h3>Activity Statistics</h3>
                <div className="stats-grid">
                  {stats.map((stat, idx) => (
                    <div key={idx} className="stat-card">
                      <div className="stat-icon">{getActivityIcon(stat._id)}</div>
                      <div className="stat-info">
                        <h4>{stat._id.replace('_', ' ').toUpperCase()}</h4>
                        <p className="stat-count">{stat.count}</p>
                        <span className="stat-confidence">
                          Avg Confidence: {Math.round(stat.avgConfidence * 100)}%
                        </span>
                  </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activities Table */}
      <div className="activities-table-container">
        <h3>Recent Activities</h3>
        {loading ? (
          <div className="loading">Loading activities...</div>
        ) : (
          <table className="activities-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Pet</th>
                <th>Owner</th>
                <th>Confidence</th>
                <th>Description</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {activities.map(activity => (
                <tr key={activity._id}>
                  <td>
                    <span className="activity-type">
                      {getActivityIcon(activity.type)} {activity.type}
                    </span>
                  </td>
                  <td>{activity.pet?.name || 'N/A'}</td>
                  <td>{activity.pet?.owner?.email || 'N/A'}</td>
                  <td>
                    <div className="confidence-bar">
                      <div 
                        className="confidence-fill"
                        style={{ width: `${(activity.confidence || 0) * 100}%` }}
                      />
                      <span>{Math.round((activity.confidence || 0) * 100)}%</span>
                    </div>
                  </td>
                  <td className="description">{activity.description || '-'}</td>
                  <td>{new Date(activity.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="pagination">
        <button 
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button 
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
    );
};

export default AdminActivities;