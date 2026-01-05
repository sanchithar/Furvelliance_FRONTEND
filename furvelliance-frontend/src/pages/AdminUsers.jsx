import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchAllUsers, deleteUser, toggleUserStatus, updateUser } from '../slices/adminSlice';
import './AdminUsers.css';

const AdminUsers = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { users, currentPage, totalPages } = useSelector((state) => state.admin);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', role: 'user' });

    useEffect(() => {
        dispatch(fetchAllUsers({ page: currentPage, limit: 10 }));
    }, [dispatch, currentPage]);

    const handleDelete = async (id) => {
        if(window.confirm("Are you sure you want to delete this user? This will delete all associated data.")){
            await dispatch(deleteUser(id));
            dispatch(fetchAllUsers({ page: currentPage, limit: 10 }));
        }
    };

    const handleToggleStatus = async (id) => {
        await dispatch(toggleUserStatus(id));
    };

    const handleEdit = (user) => {
        setEditingUser(user._id);
        setFormData({ name: user.name, email: user.email, role: user.role });
    };

    const handleUpdate = async (id) => {
        await dispatch(updateUser({ id, data: formData }));
        setEditingUser(null);
        dispatch(fetchAllUsers({ page: currentPage, limit: 10 }));
    };

    const handlePageChange = (newPage) => {
        dispatch(fetchAllUsers({ page: newPage, limit: 10 }));
    };

    return (
        <div className="admin-users">
          <div className="admin-header">
            <button onClick={() => navigate('/admin')}>← Back to Dashboard</button>
            <h1>User Management</h1>
          </div>

          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Pets</th>
                  <th>Subscription</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>
                      {editingUser === user._id ? (
                        <input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      ) : (
                        user.name
                      )}
                    </td>
                    <td>
                      {editingUser === user._id ? (
                        <input
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      ) : (
                        user.email
                      )}
                    </td>
                    <td>
                      {editingUser === user._id ? (
                        <select
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`role-badge ${user.role}`}>{user.role}</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{user.pets?.length || 0}</td>
                    <td>{user.subscription?.planType || 'None'}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        {editingUser === user._id ? (
                          <>
                            <button className="btn-save" onClick={() => handleUpdate(user._id)}>Save</button>
                            <button className="btn-cancel" onClick={() => setEditingUser(null)}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className="btn-edit" onClick={() => handleEdit(user)}>Edit</button>
                            <button 
                              className={`btn-toggle ${user.isActive ? 'deactivate' : 'activate'}`}
                              onClick={() => handleToggleStatus(user._id)}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button className="btn-delete" onClick={() => handleDelete(user._id)}>Delete</button>
                          </>
                        )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button 
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button 
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
    );
};

export default AdminUsers;