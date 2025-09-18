import axios from 'axios';

const API_BASE = 'https://backend-1-r6ga.onrender.com/api';

export function registerUser(data) {
  return axios.post(`${API_BASE}/auth/register`, data);
}

export function loginUser(data) {
  return axios.post(`${API_BASE}/auth/login`, data);
}
