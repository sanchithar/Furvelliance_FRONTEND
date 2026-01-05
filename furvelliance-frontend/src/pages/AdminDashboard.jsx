import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardStats } from '../slices/adminSlice';
import { logout } from "../slices/authSlice";
import './AdminDashboard.css';

const AdminDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const { stats } = useSelector((state) => state.admin);

    useEffect(() => {
        if(user?.role !== 'admin'){
            navigate('/dashboard');
            return;
        }
        dispatch(fetchDashboardStats());
    },[dispatch, user, navigate]);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <div className="admin-dashboard">
            <nav className="admin-nav">
                <h1>Admin Dashboard</h1>
                <div className="nav-actions">
                    <button onClick={() => navigate('/admin/users')}>Users</button>
                    {/* <button onClick={() => navigate('/admin/subscriptions')}>Subscriptions</button> */}
                    <button onClick={() => navigate('/admin/activities')}>Activities</button>
                    <button onClick={() => navigate('/admin/broadcast')}>Broadcast</button>
                    <button onClick={() => navigate('/dashboard')}>User View</button>
                    <button onClick={handleLogout}>Logout</button>
                </div>
            </nav>

            <div className="admin-content">
                <div className="welcome-section">
                    <h2>Welcome, {user?.name}!</h2>
                    <p>Administrator Control Panel</p>
                </div>

                {stats && (
                    <div className="stats-grid">
                        <div className="stat-card">
                          <div className="stat-icon">👥</div>
                              <div className="stat-info">
                                <h3>Total Users</h3>
                                <p className="stat-number">{stats.totalUsers}</p>
                                <span className="stat-detail">Active: {stats.activeUsers}</span>
                              </div>
                        </div>

                        <div className="stat-card">
                        <div className="stat-icon">🐾</div>
                            <div className="stat-info">
                                <h3>Total Pets</h3>
                                <p className="stat-number">{stats.totalPets}</p>
                            </div>
                        </div>

                        <div className="stat-card">
                        <div className="stat-icon">📊</div>
                            <div className="stat-info">
                                <h3>Activities</h3>
                                <p className="stat-number">{stats.totalActivities}</p>
                            </div>
                        </div>

                        <div className="stat-card">
                          <div className="stat-icon">💳</div>
                              <div className="stat-info">
                                <h3>Active Subscriptions</h3>
                                <p className="stat-number">{stats.activeSubscriptions}</p>
                         </div>
                        </div>

                        <div className="stat-card revenue">
                          <div className="stat-icon">💰</div>
                              <div className="stat-info">
                                <h3>Monthly Revenue</h3>
                                <p className="stat-number">${stats.monthlyRevenue}</p>
                         </div>
                        </div>

                        <div className="stat-card">
                          <div className="stat-icon">📈</div>
                              <div className="stat-info">
                                <h3>New Users (7 days)</h3>
                                <p className="stat-number">{stats.newUsersThisWeek}</p>
                         </div>
                        </div>
                  </div>
                )}

                <div className="quick-actions">
                  <h3>Quick Actions</h3>
                      <div className="actions-grid">
                        <button className="action-btn" onClick={() => navigate('/admin/users')}>
                          <span>👥</span>
                          <span>Manage Users</span>
                        </button>
                        {/* <button className="action-btn" onClick={() => navigate('/admin/subscriptions')}>
                          <span>💳</span>
                          <span>View Subscriptions</span>
                        </button> */}
                        <button className="action-btn" onClick={() => navigate('/admin/activities')}>
                          <span>📊</span>
                          <span>Activity Logs</span>
                        </button>
                        <button className="action-btn" onClick={() => navigate('/admin/broadcast')}>
                          <span>📢</span>
                          <span>Send Broadcast</span>
                        </button>
                      </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;