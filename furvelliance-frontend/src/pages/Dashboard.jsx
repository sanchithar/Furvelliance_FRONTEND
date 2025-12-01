import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchPets, setSelectedPet } from "../slices/petSlice";
import { fetchNotifications } from "../slices/notificationSlice";
import { logout } from "../slices/authSlice";
import './Dashboard.css';

const Dashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const { pets, selectedPet } = useSelector((state) => state.pets);
    const { unreadCount } = useSelector((state) => state.notifications);
    const [roomId, setRoomId] = useState('');

    useEffect(() => {
        dispatch(fetchPets());
        dispatch(fetchNotifications());
    }, [dispatch]);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    const handleStartCamera = (stationType) => {
        if(!roomId){
            alert("Please enter a Room ID");
            return;
        }
        if(!selectedPet && stationType === 'dog'){
            alert("Please select a pet first");
            return;
        }
        navigate(`/${stationType}-station/${roomId}`);
    };

    const generateRoomId = () => {
        const id = Math.random().toString(36).substring(2, 10);
        setRoomId(id);
    };

    return (
        <div className="dashboard">
            <nav className="dashboard-nav">
                <h1>Furvelliance</h1>
                <div className="nav-actions">
                    <button onClick={() => navigate('/notifications')}>
                        Notifications { unreadCount > 0 && `(${unreadCount})` }
                    </button>
                    <button onClick={() => navigate('/pets')}>Manage pets</button>
                    {/* <button onClick={() => navigate('pricing')}>Subscription</button> */}
                    <button onClick={handleLogout}>Logout</button>
                </div>
            </nav>

            <div className="dashboard-content">
                <div className="welcome-section">
                    <h2>Welcome, {user?.name}!</h2>
                    <p>Monitor your pets with AI - powered detection</p>
                </div>

                <div className="pets-section">
                    <h3>Your Pets</h3>
                    <div className="pets-grid">
                        {pets.map(pet => (
                            <div
                                key={pet._id}
                                className={`pet-card ${selectedPet?._id === pet._id ? 'selected' : ''}`}
                                onClick={() => dispatch(setSelectedPet(pet))}
                            >
                                <h4>{pet.name}</h4>
                                <p>{pet.species} - {pet.breed}</p>
                                <p>Age: {pet.age}</p>
                        </div>
                        ))}
                        <div className="pet-card add-pet" onClick={() => navigate('/pets')}>
                            <span>+ Add pet</span>
                        </div>
                    </div>
                </div>

                <div className="camera-section">
                    <h3>Camera Station</h3>
                    <div className="room-setup">
                        <div className="form-group">
                            <label>Room ID:</label>
                            <input 
                                type="text"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                placeholder="Enter room Id"
                            />
                            <button onClick={generateRoomId}>Generate Id</button>
                        </div>

                        <div className="station-buttons">
                            <button 
                                className="station-btn person"
                                onClick={() => handleStartCamera('person')}
                                disabled={!roomId}
                            >
                                Start Person Station
                            </button>
                            <button 
                                className="station-btn dog"
                                onClick={() => handleStartCamera('dog')}
                                disabled={!roomId || !selectedPet}
                            >
                                Start Dog Station
                            </button>
                        </div>
                        {selectedPet && (
                            <p className="selected-pet-info">
                                Monitoring: {selectedPet.name}
                            </p>
                        )}
                    </div>
                </div>
                
                <div className="info-section">
                    <h3>How it works</h3>
                    <ol>
                        <li>Add your pet information in Manage pets</li>
                        <li>Generate or enter a room Id</li>
                        <li>Select your pet</li>
                        <li>Start Dog station on device near your pet</li>
                        <li>Start Person station on your mobile or computer</li>
                        <li>Monitor real-time activities of your pet with Ai detection and receive alerts</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;