import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../config/axios';

export const fetchNotifications = createAsyncThunk("notifications/fetchNotifications", async (_, { rejectWithValue }) => {
    try{
        const response = await axios.get('/api/notifications', {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response?.data;
    }catch(err){
        return rejectWithValue(err.response?.data?.error || 'Failed to fetch notifications');
    }
});

export const markAsRead = createAsyncThunk("notifications/markAsRead", async (id, { rejectWithValue }) => {
    try{
        const response = await axios.put(`/api/notifications/${id}/read`, {}, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    }catch(err){
        return rejectWithValue(err.response?.data?.error || 'Failed to mark notification as read');
    }
});

const notificationSlice = createSlice({
    name: 'notifications',
    initialState: {
        notifications: [],
        unreadCount: 0,
        loading: false
    },
    reducers: {
        addNotification: (state, action) => {
            state.notifications.unshift(action.payload);
            if(!action.payload.read){
                state.unreadCount += 1;
            }
        },
        clearNotifications: (state) => {
            state.notifications = [];
            state.unreadCount = 0;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchNotifications.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.loading = false;
                state.notifications = action.payload;
                state.unreadCount = action.payload.filter(n => !n.read).length;
            })
            .addCase(markAsRead.fulfilled, (state, action) => {
                const index = state.notifications.findIndex(n => n._id === action.payload._id);
                if(index !== -1 && !state.notifications[index].read){
                    state.notifications[index].read = true;
                    state.unreadCount -= 1;     
                }
            });
    }
});

export const { addNotification, clearNotifications } = notificationSlice.actions;

export default notificationSlice.reducer;