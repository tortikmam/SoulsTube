// src/pages/Account.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './styles/Account.module.css'; // Импорт стилей из CSS модуля
import backgroundImage from './background.png'; // <-- Импортируем файл фонового изображения (Убедитесь, что имя файла правильное)

const Account = () => {
  const [userData, setUserData] = useState(null);
  const [userVideos, setUserVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // --- БЛОК ПРОВЕРКИ АВТОРИЗАЦИИ ---
    // Проверяем наличие токена перед попыткой загрузки данных
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // Если токена нет, перенаправляем на страницу входа
      navigate('/login');
      return; // Важно выйти из useEffect, чтобы не пытаться загружать данные
    }
    // --- КОНЕЦ БЛОКА ПРОВЕРКИ АВТОРИЗАЦИИ ---


    const fetchData = async () => {
      try {
        // Если токен есть, выполняем запросы
        const [userResponse, videosResponse] = await Promise.all([
          axios.get('http://localhost:8000/api/auth/me/', {
            headers: {
              Authorization: `Bearer ${accessToken}` // Используем полученный токен
            }
          }),
          axios.get('http://localhost:8000/api/videos/user/', {
            headers: {
              Authorization: `Bearer ${accessToken}` // Используем полученный токен
            }
          })
        ]);

        setUserData(userResponse.data);
        setUserVideos(videosResponse.data);
        setError(null); // Сбрасываем ошибки, если загрузка успешна

      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        setError('Не удалось загрузить данные аккаунта.'); // Устанавливаем сообщение об ошибке

        // Дополнительная обработка ошибки 401 (Не авторизован)
        if (err.response && err.response.status === 401) {
            // Если получили 401, токен, возможно, недействителен или истек
            localStorage.removeItem('access_token'); // Удаляем недействительный токен
            // localStorage.removeItem('refresh_token'); // Возможно, тоже нужно удалить refresh токен
            navigate('/login'); // Перенаправляем на страницу входа
        }
      } finally {
        setLoading(false); // В любом случае скрываем индикатор загрузки
      }
    };

    // Вызываем функцию загрузки данных только если токен был найден
    fetchData();
  }, [navigate]); // Добавляем navigate в зависимости useEffect

  // Удаление видео
  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Вы уверены, что хотите удалить это видео?')) return;

    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
        // На всякий случай проверяем токен и здесь перед удалением
        navigate('/login');
        return;
    }

    try {
      await axios.delete(`http://localhost:8000/api/videos/${videoId}/`, {
        headers: {
          Authorization: `Bearer ${accessToken}` // Используем полученный токен
        }
      });
      // Обновляем список видео в состоянии после успешного удаления
      setUserVideos(userVideos.filter(video => video.id !== videoId));
        // Опционально: показать сообщение об успешном удалении
        console.log(`Видео ${videoId} успешно удалено.`);
    } catch (err) {
      console.error('Ошибка удаления видео:', err);
        // Обработка ошибки 401 при удалении
        if (err.response && err.response.status === 401) {
             localStorage.removeItem('access_token');
             // localStorage.removeItem('refresh_token');
             navigate('/login');
        } else {
             // Опционально: показать сообщение об ошибке удаления пользователю
             alert('Произошла ошибка при удалении видео.');
        }
    }
  };

  // Условный рендеринг: показываем загрузку, ошибку или контент
  if (loading) {
    return <div className={styles.loading} style={{ textAlign: 'center', marginTop: '80px' }}>Загрузка данных аккаунта...</div>;
  }

  if (error) {
    return <div className={styles.error} style={{ textAlign: 'center', marginTop: '80px', color: 'red' }}>{error}</div>;
  }

  // Если данные успешно загружены, отображаем контент страницы
  return (
    // Применяем стили фонового изображения к основному контейнеру
    // Объединяем стили из CSS модуля и инлайн-стили
    <div className={styles.container} style={{
        // Стили фонового изображения
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed', // Фон не прокручивается с контентом
        minHeight: '100vh', // Минимальная высота
        width: '100vw', // Гарантируем ширину равную ширине окна
        boxSizing: 'border-box', // Учитываем padding в размере
        margin: 0, // Убираем возможные внешние отступы
        overflowX: 'hidden', // Скрываем горизонтальный перелив

        // Стили макета для центрирования контента
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center', // Центрируем блоки по горизонтали
        // justifyContent: 'flex-start', // Контент начинается сверху (по умолчанию flex-start)

        // Отступ сверху для фиксированной шапки
        // !!! ВАЖНО: Убедитесь, что это значение ТОЧНО соответствует ВЫСОТЕ вашей шапки (Header),
        // включая ее padding и border, если они есть. Используйте инструменты разработчика
        // браузера, чтобы измерить фактическую высоту шапки.
        paddingTop: '80px',

        // Важно: Если в Account.module.css для .container уже есть display/flex-direction/align-items,
        // эти инлайн-стили могут конфликтовать. Возможно, лучше перенести стили фона в CSS модуль,
        // а инлайн-стили использовать только для специфических переопределений или динамических значений.

    }}>
      <div className={styles.profileSection} style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)', // Полупрозрачный белый фон для секций
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px', // Отступ между секциями
        width: '100%', // Секции занимают всю доступную ширину контейнера
        maxWidth: '800px', // Ограничиваем максимальную ширину секций
        boxSizing: 'border-box',
        // Добавьте другие стили из Account.module.css, если они не переопределены
    }}>
        <h2>Профиль пользователя</h2>
        {/* Проверяем, что userData не null */}
        {userData && (
        <div className={styles.profileInfo}>
          <p>Имя: {userData.username}</p>
          <p>Email: {userData.email}</p>
          <p>Дата регистрации: {new Date(userData.date_joined).toLocaleDateString()}</p>
        </div>
        )}

        <Link to="/upload" className={styles.uploadButton}>
          Загрузить новое видео
        </Link>
      </div>

      <div className={styles.videosSection} style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)', // Полупрозрачный белый фон для секций
        padding: '20px',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '800px', // Ограничиваем максимальную ширину секций
        boxSizing: 'border-box',
        // Добавьте другие стили из Account.module.css, если они не переопределены
    }}>
        <h3>Мои видео ({userVideos.length})</h3>

        {userVideos.length === 0 ? (
          <p>У вас пока нет загруженных видео</p>
        ) : (
          <div className={styles.videoGrid}>
            {userVideos.map(video => (
              // Убедитесь, что у объекта video есть уникальное поле 'id'
              <div key={video.id} className={styles.videoCard}>
                <div className={styles.thumbnail}>
                  {/* Проверяем, что у video есть поле 'thumbnail' и оно не пустое */}
                  {video.thumbnail && (
                    <img src={video.thumbnail} alt={video.title || 'Видео без названия'} />
                  )}
                  {/* Опционально: добавить заглушку, если миниатюры нет */}
                  {!video.thumbnail && (
                      <div style={{ width: '100%', height: '180px', backgroundColor: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          Нет миниатюры
                      </div>
                  )}
                </div>
                <div className={styles.videoInfo}>
                  <h4>{video.title}</h4>
                  {/* Ограничиваем количество символов в описании, если оно длинное */}
                  <p>{video.description ? (video.description.length > 100 ? video.description.substring(0, 100) + '...' : video.description) : 'Без описания'}</p>
                  <div className={styles.meta}>
                    {/* Убедитесь, что у video есть поля 'views' и 'uploaded_at' (или 'created_at') */}
                    <span>Просмотры: {video.views !== undefined ? video.views : 'N/A'}</span>
                    {/* Используем uploaded_at или created_at в зависимости от структуры вашего API */}
                    <span>Дата: {video.uploaded_at ? new Date(video.uploaded_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className={styles.actions}>
                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      className={styles.deleteButton}
                    >
                      Удалить
                    </button>
                    <Link
                      to={`/video/${video.id}`}
                      className={styles.watchButton}
                    >
                      Смотреть
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;