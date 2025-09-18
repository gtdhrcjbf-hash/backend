import React, { useState } from 'react';
import { registerUser, loginUser } from './api';

function AuthForm() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [message, setMessage] = useState('');

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRegister = async () => {
    try {
      const res = await registerUser(form);
      setMessage('Registration successful!');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Registration failed');
    }
  };

  const handleLogin = async () => {
    try {
      const res = await loginUser(form);
      setMessage('Login successful!');
      localStorage.setItem('token', res.data.token); // Save JWT token
    } catch (err) {
      setMessage(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Auth Form</h2>
      <input name="username" placeholder="Username" value={form.username} onChange={handleChange} style={{ width: '100%', marginBottom: 8 }} />
      <input name="email" placeholder="Email" value={form.email} onChange={handleChange} style={{ width: '100%', marginBottom: 8 }} />
      <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} style={{ width: '100%', marginBottom: 8 }} />
      <button onClick={handleRegister} style={{ width: '48%', marginRight: '4%' }}>Register</button>
      <button onClick={handleLogin} style={{ width: '48%' }}>Login</button>
      <div style={{ marginTop: 16, color: 'green' }}>{message}</div>
    </div>
  );
}

export default AuthForm;
