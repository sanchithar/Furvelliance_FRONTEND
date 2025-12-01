import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../config/axios';

export const register = createAsyncThunk("users/register", async(userData, { rejectWithValue }) => {
    try{
        const response = await axios.post('/api/register', userData);
        localStorage.setItem('token', response.data.token);
        return response.data;
    }catch(err){
        return rejectWithValue(err.response?.data?.error || 'Registration failed');
    }
});

export const login = createAsyncThunk("users/login", async(credentials, { rejectWithValue }) => {
    try{
        const response = await axios.post('/api/login', credentials);
        localStorage.setItem('token', response.data.token);
        return response.data;
    }catch(err){
        return rejectWithValue(err.response?.data?.error || 'Login failed');
    }
});

export const account = createAsyncThunk("users/account", async(_, { rejectWithValue }) => {
    try{
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/account', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    }catch(err){
        return rejectWithValue(err.response?.data?.error || 'Fetching account failed');
    }
});

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        token: localStorage.getItem('token'),
        loading: false,
        error: null
    },
    reducers: {
        logout: (state) => {
            state.user = null;
            state.token = null;
            localStorage.removeItem('token');   
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(register.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(register.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
                state.token = action.payload.token;
            })
            .addCase(register.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(login.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
                state.token = action.payload.token;
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(account.fulfilled, (state, action) => {
                state.user = action.payload;
            });
    }
});

export const { logout, clearError } = authSlice.actions;

export default authSlice.reducer;