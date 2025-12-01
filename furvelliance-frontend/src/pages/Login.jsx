import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { login, clearError } from '../slices/authSlice';
import './Auth.css';

const Login = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error } = useSelector((state) => state.auth);

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch(clearError());

        const result = await dispatch(login(formData));
        if(result.type === "users/login/fulfilled"){
            navigate('/dashboard');
        }
    };

    return (
        <div className="auth-container"> 
        <div className="auth-card">
            <h1>Furvelliance</h1>
            <h2>Login</h2>
            { error && <div className="error-message">{error}</div> }
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required />   
                </div>

                <div className="form-group">
                    <label>Password</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} required />   
                </div>

                <button type="submit" disabled={loading}>
                    { loading ? 'Logging in...' : 'Login' }
                </button>
            </form>
            <p className="auth-Link">
                Don't have an account? <Link to="/register">Register here</Link>
            </p>
        </div>
    </div>
    );
};

export default Login;
