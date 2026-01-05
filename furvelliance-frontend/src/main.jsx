import React from 'react'
import ReactDom from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store/create-store.js'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  // Remove StrictMode to prevent component re-mounting issues with WebRTC
  <Provider store={store}>
    <App />
  </Provider>
)
