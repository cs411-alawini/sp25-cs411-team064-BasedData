import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
  const [formMode, setFormMode] = useState('login');
  const [formData, setFormData] = useState({
    name: '',
    netid: '',
    majorid: '',
    egrad: 1,
  });
  const [majors, setMajors] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const numbers = Array.from({ length: 7 }, (_, i) => 1 + i * 0.5);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/majors')
      .then((response) => response.json())
      .then((data) => setMajors(data))
      .catch((error) => console.error('Error fetching majors:', error));
  }, []);

  const toggleForm = (mode) => {
    setFormMode(mode);
    setMessage('');
    setMessageType('');
    setFormData({
      name: '',
      netid: '',
      majorid: '',
      egrad: 1,
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let endpoint = '';
    let method = '';

    if (formMode === 'login') {
      endpoint = 'http://127.0.0.1:5000/api/login';
      method = 'POST';
    } else if (formMode === 'create') {
      endpoint = 'http://127.0.0.1:5000/api/create-account';
      method = 'POST';
    } else if (formMode === 'update') {
      endpoint = 'http://127.0.0.1:5000/api/update-account';
      method = 'PUT';
    }

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (response.ok) {
        const successMessage =
          formMode === 'login'
            ? 'Login successful!'
            : formMode === 'create'
            ? 'Account created successfully!'
            : 'Information updated successfully!';
        setMessage(successMessage);
        setMessageType('success');

        if (formMode === 'login') {
          localStorage.setItem('netid', formData.netid);
          setTimeout(() => navigate('/combinedpage'), 2000);
        }
      } else {
        setMessage(result.error || 'Something went wrong.');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Error connecting to the server.');
      setMessageType('error');
    }
  };

  return (
    <div id="form-container">
      <div className="toggle-container">
        <button
          onClick={() => toggleForm('login')}
          className={`toggle-button ${formMode === 'login' ? 'active' : ''}`}
        >
          Login
        </button>
        <button
          onClick={() => toggleForm('create')}
          className={`toggle-button ${formMode === 'create' ? 'active' : ''}`}
        >
          Create Account
        </button>
        <button
          onClick={() => toggleForm('update')}
          className={`toggle-button ${formMode === 'update' ? 'active' : ''}`}
        >
          Update Information
        </button>
      </div>
      <h1>
        {formMode === 'login'
          ? 'Login'
          : formMode === 'create'
          ? 'Create Account'
          : 'Update Information'}
      </h1>

      <form onSubmit={handleSubmit}>
        {formMode !== 'create' && (
          <>
            <label htmlFor="login-netid">NetID</label>
            <input
              type="text"
              id="login-netid"
              name="netid"
              value={formData.netid}
              onChange={handleInputChange}
              placeholder="Enter your NetID"
              required
            />

            <label htmlFor="update-name">Name</label>
            <input
              type="text"
              id="update-name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your name"
            />
          </>
        )}

        {formMode === 'update' && (
          <>
            <label htmlFor="update-majorid">Major Name</label>
            <select
              id="update-majorid"
              name="majorid"
              value={formData.majorid}
              onChange={handleInputChange}
            >
              <option value="">Select a major</option>
              {majors.map((major) => (
                <option key={major.MajorID} value={major.MajorID}>
                  {major.MajorID}
                </option>
              ))}
            </select>

            <label htmlFor="update-egrad">Expected Graduation (in no. years) </label>
            <select
              id="update-egrad"
              name="egrad"
              value={formData.egrad}
              onChange={handleInputChange}
            >
              {numbers.map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </>
        )}

        {formMode === 'create' && (
          <>
            <label htmlFor="login-netid">NetID</label>
            <input
              type="text"
              id="login-netid"
              name="netid"
              value={formData.netid}
              onChange={handleInputChange}
              placeholder="Enter your NetID"
              required
            />

            <label htmlFor="update-name">Name</label>
            <input
              type="text"
              id="update-name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your name"
            />

            <label htmlFor="update-majorid">Major Name</label>
            <select
              id="update-majorid"
              name="majorid"
              value={formData.majorid}
              onChange={handleInputChange}
            >
              <option value="">Select a major</option>
              {majors.map((major) => (
                <option key={major.MajorID} value={major.MajorID}>
                  {major.MajorID}
                </option>
              ))}
            </select>

            <label htmlFor="update-egrad">Expected Graduation (in no. years) </label>
            <select
              id="update-egrad"
              name="egrad"
              value={formData.egrad}
              onChange={handleInputChange}
            >
              {numbers.map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </>
        )}

        <input
          type="submit"
          value={
            formMode === 'login'
              ? 'Login'
              : formMode === 'create'
              ? 'Create Account'
              : 'Update Information'
          }
        />
      </form>

      {message && <p className={`message ${messageType}`}>{message}</p>}
    </div>
  );
}

export default Login;
