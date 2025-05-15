// src/pages/Login.js
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import './styles/Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      navigate('/');
    }
  }, [navigate]);

  const handleError = (err) => {
    let errorMessage = 'Произошла ошибка';
    if (err.response && err.response.data) {
      if (err.response.data.detail) {
        errorMessage = err.response.data.detail;
      } else if (typeof err.response.data === 'object') {
        errorMessage = Object.entries(err.response.data)
          .map(([key, value]) => {
            const fieldName = {
              username: 'Имя пользователя',
              email: 'Email',
              password: 'Пароль',
              password2: 'Подтверждение пароля',
              access_code: 'Код доступа',
              non_field_errors: 'Ошибка'
            }[key] || key;
            return `${fieldName}: ${Array.isArray(value) ? value.join(', ') : value}`;
          })
          .join('; ');
      } else {
        errorMessage = JSON.stringify(err.response.data);
      }
    }
    setError(errorMessage);
    setTimeout(() => setError(''), 7000);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      setTimeout(() => setError(''), 7000);
      return;
    }

    try {
      await axios.post('http://localhost:8000/api/register/', {
        username,
        email,
        password,
        password2: confirmPassword,
        access_code: accessCode
      });

      alert('Регистрация успешна! Теперь вы можете войти.');
      setIsRegistering(false);
      setError('');
      setEmail('');
      setConfirmPassword('');
      setAccessCode('');
    } catch (err) {
      handleError(err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await axios.post('http://localhost:8000/api/token/', { username, password });
      localStorage.setItem('access_token', res.data.access);
      if (res.data.refresh) {
        localStorage.setItem('refresh_token', res.data.refresh);
      }
      navigate('/');
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div>
      <Header />
      <div className="login-container">
        <div className="login-form">
          <h2>{isRegistering ? 'Регистрация' : 'Вход'}</h2>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={isRegistering ? handleRegister : handleLogin}>
            <input
              type="text"
              placeholder="Имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            {isRegistering && (
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {isRegistering && (
              <input
                type="password"
                placeholder="Повторите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            )}
            {isRegistering && (
              <input
                type="text"
                placeholder="Код доступа"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                required
              />
            )}
            <button type="submit">{isRegistering ? 'Зарегистрироваться' : 'Войти'}</button>
          </form>
          <button
            className="toggle-button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setEmail('');
              setPassword('');
              setUsername('');
              setConfirmPassword('');
              setAccessCode('');
            }}
          >
            {isRegistering ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;