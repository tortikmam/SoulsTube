import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import './styles/Upload.css';

const Upload = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      navigate('/login');
    }
  }, [navigate]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    console.log('Выбран файл:', selectedFile);

    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (selectedFile && !allowedTypes.includes(selectedFile.type)) {
      setError('Поддерживаются только файлы MP4, WebM и OGG');
      setFile(null);
      e.target.value = null;
      console.log('Ошибка типа файла.');
      return;
    }

    if (selectedFile && selectedFile.size > 500 * 1024 * 1024) {
      setError('Файл слишком большой. Максимальный размер: 500MB');
      setFile(null);
      e.target.value = null;
      console.log('Ошибка размера файла.');
      return;
    }

    setFile(selectedFile);
    setError('');
    console.log('Файл успешно выбран и прошел проверки.');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!file) {
      setError('Выберите файл для загрузки');
      setLoading(false);
      console.log('Попытка загрузки без выбранного файла.');
      return;
    }

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('description', description);

    console.log('Формирование FormData...');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
    console.log('Объект FormData:', formData);

    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        setError('Вы не авторизованы. Пожалуйста, войдите.');
        setLoading(false);
        navigate('/login');
        return;
      }

      console.log('Отправка запроса на загрузку...');
      const response = await axios.post('http://localhost:8000/api/videos/', formData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Прогресс загрузки: ${percentCompleted}%`);
        }
      });

      console.log('Видео успешно загружено:', response.data);
      navigate(`/video/${response.data.id}`);
    } catch (err) {
      console.error('Ошибка при загрузке видео:', err.response || err);
      let errorMessage = 'Ошибка загрузки видео';

      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = 'Сессия истекла или вы не авторизованы. Пожалуйста, войдите снова.';
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          navigate('/login');
        } else if (err.response.status === 415) {
          errorMessage = 'Неподдерживаемый формат видео. Используйте MP4, WebM или OGG';
        } else if (err.response.data && typeof err.response.data === 'object') {
          errorMessage = Object.entries(err.response.data)
            .map(([key, value]) => {
              const fieldName = {
                video: 'Видеофайл',
                title: 'Название',
                description: 'Описание',
                non_field_errors: 'Ошибка'
              }[key] || key;
              return `${fieldName}: ${Array.isArray(value) ? value.join(', ') : value}`;
            })
            .join('; ');
        } else {
          errorMessage = err.response.data?.detail || JSON.stringify(err.response.data) || errorMessage;
        }
      } else if (err.request) {
        errorMessage = 'Не удалось отправить запрос. Проверьте соединение с сервером.';
      } else {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header />
      <div className="upload-container">
        <div className="upload-form">
          <h2>Загрузить видео</h2>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleUpload}>
            <input
              type="text"
              placeholder="Название видео"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              placeholder="Описание видео"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <input
              type="file"
              accept="video/mp4,video/webm,video/ogg"
              onChange={handleFileChange}
              required
            />
            {file && (
              <div className="file-info">
                Выбран файл: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </div>
            )}
            <button type="submit" disabled={loading || !!error || !file}>
              {loading ? 'Идет загрузка...' : 'Загрузить видео'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Upload;