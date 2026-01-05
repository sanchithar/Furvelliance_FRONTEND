import axios from 'axios';
export default axios.create({
    baseURL: 'http://localhost:3030'
    // baseURL: 'http://192.168.29.191:3030'
    // baseURL: 'http://192.168.0.109:3030'
})