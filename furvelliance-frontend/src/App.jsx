import React, {useEffect} from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { account } from './slices/authSlice';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CameraStation from './pages/CameraStation';
import PetManagement from './pages/PetManagement';
import Notifications from './pages/Notifications';
import './App.css'

function App() {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if(token && !user){
      dispatch(account());
    }
  },[token, user, dispatch]);

  const PrivateRoute = ({ children }) => {
      return token ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route 
            path="/person-station/:roomId"
            element={
              <PrivateRoute>
                <CameraStation stationType="person"/>
              </PrivateRoute>
            }
          />
          <Route 
            path="/dog-station/:roomId"
            element={
              <PrivateRoute>
                <CameraStation stationType="dog"/>
              </PrivateRoute>
            }
          />
          <Route
            path="/pets"
            element={
              <PrivateRoute>
                <PetManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <PrivateRoute>
                <Notifications />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
