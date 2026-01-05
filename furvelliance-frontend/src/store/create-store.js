import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../slices/authSlice";
import petReducer from "../slices/petSlice";
import notificationReducer from "../slices/notificationSlice";
import adminReducer from "../slices/adminSlice";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        pets: petReducer,
        notifications: notificationReducer,
        admin: adminReducer
    }
});