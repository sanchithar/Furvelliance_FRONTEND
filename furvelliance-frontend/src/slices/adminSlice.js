import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../config/axios";

export const fetchDashboardStats = createAsyncThunk("admin/fetchDashboardStats", async (_, { rejectWithValue }) => {
    try{
        const response = await axios.get('/api/admin/dashboard/stats', {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    }catch(err){
        return rejectWithValue(err.response?.data?.error || 'Failed to fetch dashboard stats');
    }
});

export const fetchAllUsers = createAsyncThunk("admin/fetchAllUsers", async ({ page = 1, limit = 10 }, { rejectWithValue }) => {
    try{
        const response = await axios.get(`/api/admin/users?page=${page}&limit=${limit}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    }catch(err){
        return rejectWithValue(err.response?.data?.error || 'Failed to fetch users');
    }
});

export const updateUser = createAsyncThunk("admin/updateUser", async ({ id, data }, { rejectWithValue }) => {
    try{
        const response = await axios.put(`/api/admin/users/${id}`, data, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    }catch(err){
        return rejectWithValue(err.response?.data?.error || 'Failed to update user');
    }
});

export const deleteUser = createAsyncThunk("admin/deleteUser", async (id, { rejectWithValue }) => {
    try{
        await axios.delete(`/api/admin/users/${id}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return id;
    }catch(err){
        return rejectWithValue(err.response?.data?.error || 'Failed to delete user');
    }
});

export const toggleUserStatus = createAsyncThunk("admin/toggleUserStatus", async (id, { rejectWithValue }) => {
    try{
        const response = await axios.patch(`/api/admin/users/${id}/toggle-active`, {}, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    }catch(err){
        return rejectWithValue(err.response?.data?.error || 'Failed to toggle user status');
    }
});

export const fetchAllSubscriptions = createAsyncThunk("admin/fetchAllSubscriptions", async ({ page = 1, limit = 10 }, { rejectWithValue }) => {
    try{
        const response = await axios.get(`/api/admin/subscriptions?page=${page}&limit=${limit}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    }catch(err){
        return rejectWithValue(err.response?.data?.error || 'Failed to fetch subscriptions');
    }
});

export const broadcastNotification = createAsyncThunk("admin/broadcastNotification", async ({ message, alertType }, { rejectWithValue }) => {
    try{
        const response = await axios.post('/api/admin/notifications/broadcast', { message, alertType }, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    }catch(err){
        return rejectWithValue(err.response?.data?.error || 'Failed to broadcast notification');
    }
});

const adminSlice = createSlice({
    name: 'admin',
    initialState: {
        stats: null,
        users: [],
        subscriptions: [],
        currentPage: 1,
        totalPages: 1,
        loading: false,
        error: null
    },
    reducers: {
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDashboardStats.fulfilled, (state, action) => {
                state.stats = action.payload;
            })
            .addCase(fetchAllUsers.fulfilled, (state, action) => {
                state.users = action.payload.users;
                state.currentPage = action.payload.currentPage;
                state.totalPages = action.payload.totalPages;
            })
            .addCase(deleteUser.fulfilled, (state, action) => {
                state.users = state.users.filter(user => user._id !== action.payload);
            })
            .addCase(toggleUserStatus.fulfilled, (state, action) => {
                const index = state.users.findIndex(user => user._id === action.payload._id);
                if(index !== -1){
                    state.users[index].isActive = action.payload.user.isActive;
                }
            })
            .addCase(fetchAllSubscriptions.fulfilled, (state, action) => {
                state.subscriptions = action.payload.subscriptions;
            });         
    }
});

export const { clearError } = adminSlice.actions;
export default adminSlice.reducer;