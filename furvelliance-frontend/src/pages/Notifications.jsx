import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications, markAsRead } from '../slices/notificationSlice';
import './Notifications.css';

const Notifications = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { notifications, loading } = useSelector(state => state.notifications);

    useEffect(() => {
        dispatch(fetchNotifications());
    },[dispatch]);

    const handleMarkAsRead = (id) => {
        dispatch(markAsRead(id));
    };

    const getAlertIcon = (alertType) => {
        switch (alertType) {
          case 'barking':
            return '🔊';
          case 'motion':
            return '🏃';
          case 'unusual_activity':
            return '⚠️';
          case 'warning':
            return '⚡';
          default:
            return 'ℹ️';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if(diffMins < 1) return 'Just now';
        if(diffMins < 60) return `${diffMins} mins ago`;
        if(diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    return (
        <div className="notifications-page">
          <div className="notifications-header">
            <button onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
            <h1>Notifications</h1>
          </div>

          {loading && <div className="loading">Loading notifications...</div>}

          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification._id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => !notification.read && handleMarkAsRead(notification._id)}
                >
                  <div className="notification-icon">
                    {getAlertIcon(notification.alertType)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-header">
                      <span className="alert-type">{notification.alertType}</span>
                      <span className="timestamp">{formatDate(notification.timestamp)}</span>
                    </div>
                    <p className="notification-message">{notification.message}</p>
                    {notification.pet && (
                      <span className="pet-name">Pet: {notification.pet.name}</span>
                    )}
                  </div>
                  {!notification.read && <div className="unread-indicator"></div>}
                </div>
              ))
            )}
          </div>
        </div>
    );
};

export default Notifications;