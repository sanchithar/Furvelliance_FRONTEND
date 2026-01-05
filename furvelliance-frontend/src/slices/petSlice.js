import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../config/axios";


export const fetchPets = createAsyncThunk("pets/fetchPets", async (_, { rejectWithValue }) => {
    try{
        const response = await axios.get('/api/pets',{
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    }catch(err){
        return rejectWithValue(err.response?.data?.error || 'Failed to fetch pets');
    }
});

export const addPet = createAsyncThunk("pets/addPet", async (petData, { rejectWithValue }) => {
    try{
        const response = await axios.post('/api/pets', petData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    }catch(err){
        return rejectWithValue(err.response?.data?.error || 'Failed to add pet');
    }
});

export const logActivity = createAsyncThunk("pets/logActivity", async (activityData, { rejectWithValue }) => {
    try{
        // // Add validation for required fields
        // if (!activityData.petId || !activityData.type) {
        //     throw new Error('Missing required activity data');
        // }

        const response = await axios.post('/api/activity', activityData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            timeout: 5000, // Add timeout to prevent hanging
        });
        return response.data;
    }catch(err){
        // console.error('Activity logging failed:', err.response?.data || err.message);
        
        // // Don't reject with value for network errors to prevent breaking the UI
        // if (err.code === 'NETWORK_ERROR' || err.response?.status >= 500) {
        //     console.warn('Server error, activity will not be logged but app continues');
        //     return null; // Return null instead of rejecting
        // }
        
        return rejectWithValue(err.response?.data?.error || 'Failed to log activity');
    }
});

const petSlice = createSlice({
    name: 'pets',
    initialState: {
        pets: [],
        selectedPet: null,
        loading: false,
        error: null
    },
    reducers: {
        setSelectedPet: (state, action) => {
            state.selectedPet = action.payload;
        },
        clearErrors: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPets.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchPets.fulfilled, (state, action) => {
                state.loading = false;
                state.pets = action.payload;
            })
            .addCase(fetchPets.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(addPet.fulfilled, (state, action) => {
                state.pets.push(action.payload);
            })
            .addCase(logActivity.fulfilled, (state, action) => {
                // Activity logged successfully, no state change needed here
            });
    }
});

export const { setSelectedPet, clearErrors } = petSlice.actions;
export default petSlice.reducer;

