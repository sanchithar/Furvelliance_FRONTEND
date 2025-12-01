import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchPets, addPet } from '../slices/petSlice';
import './PetManagement.css';

const PetManagement = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { pets, loading } = useSelector(state => state.pets);

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        species: 'dog',
        breed: '',
        age: ''
    });

    useEffect(() => {
        dispatch(fetchPets());
    }, [dispatch]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        await dispatch(addPet(formData));
        setFormData({ name: '', species: 'dog', breed: '', age: '' });
        setShowForm(false);
    };
    return (
        <div className="pet-management">
          <div className="management-header">
            <button onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
            <h1>Manage Your Pets</h1>
            <button className="add-btn" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ Add Pet'}
             </button>
          </div>

          {showForm && (
            <div className="pet-form">
              <h2>Add New Pet</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
            </div>

            <div className="form-group">
              <label>Species</label>
              <select name="species" value={formData.species} onChange={handleChange}>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Breed</label>
              <input
                type="text"
                name="breed"
                value={formData.breed}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Age</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                min="0"
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Pet'}
            </button>
          </form>
        </div>
      )}

      <div className="pets-list">
        <h2>Your Pets ({pets.length})</h2>
        <div className="pets-grid">
          {pets.map(pet => (
            <div key={pet._id} className="pet-card-detail">
              <div className="pet-icon">
                {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
              </div>
              <h3>{pet.name}</h3>
              <p><strong>Species:</strong> {pet.species}</p>
              <p><strong>Breed:</strong> {pet.breed || 'N/A'}</p>
              <p><strong>Age:</strong> {pet.age || 'N/A'} years</p>
              <p><strong>Activities:</strong> {pet.activities?.length || 0}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
    );
};

export default PetManagement;

