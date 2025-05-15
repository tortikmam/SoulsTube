// src/components/VideoComments.js
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import './VideoComments.css';

const VideoComments = ({ videoId, isLoggedIn }) => {
    const [comments, setComments] = useState([]);
    const [newCommentText, setNewCommentText] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [posting, setPosting] = useState(false);
    const commentsListRef = useRef(null);

    useEffect(() => {
        const fetchComments = async () => {
            try {
                const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
                const response = await axios.get(`${apiUrl}/videos/${videoId}/comments/`);
                setComments(response.data);
            } catch (err) {
                console.error("Ошибка загрузки комментариев:", err.response || err);
                if (comments.length === 0) {
                    setError('Не удалось загрузить комментарии.');
                }
            } finally {
                if (loading) setLoading(false);
            }
        };

        fetchComments();
        const pollingInterval = setInterval(fetchComments, 5000);

        return () => {
            clearInterval(pollingInterval);
        };
    }, [videoId]);

    useEffect(() => {
        if (commentsListRef.current) {
            commentsListRef.current.scrollTop = commentsListRef.current.scrollHeight;
        }
    }, [comments]);

    const handlePostComment = async (e) => {
        e.preventDefault();
        const trimmedComment = newCommentText.trim();
        if (!trimmedComment) {
            setError('Комментарий не может быть пустым.');
            setTimeout(() => setError(''), 3000);
            return;
        }

        if (!isLoggedIn) {
            setError('Вы не авторизованы. Пожалуйста, войдите, чтобы оставить комментарий.');
            return;
        }

        setPosting(true);
        setError('');

        try {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
            const response = await axios.post(`${apiUrl}/videos/${videoId}/comments/`, { text: trimmedComment }, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            setComments(prevComments => [...prevComments, response.data]);
            setNewCommentText('');
        } catch (err) {
            console.error("Ошибка отправки комментария:", err.response || err);
            let errorMessage = 'Не удалось отправить комментарий.';
            if (err.response) {
                if (err.response.status === 401 || err.response.status === 403) {
                    errorMessage = 'Вы не авторизованы или ваш токен истек.';
                } else if (err.response.data && err.response.data.text) {
                    errorMessage = `Ошибка: ${err.response.data.text.join(', ')}`;
                } else if (err.response.data) {
                    errorMessage = `Ошибка сервера: ${JSON.stringify(err.response.data)}`;
                } else {
                    errorMessage = `Ошибка HTTP: ${err.response.status}`;
                }
            }
            setError(errorMessage);
        } finally {
            setPosting(false);
        }
    };

    if (loading) {
        return <div className="comments-loading">Загрузка комментариев...</div>;
    }

    return (
        <div className="video-comments-container">
            <h3 className="comments-title">Комментарии ({comments.length})</h3>
            <div className="comments-list" ref={commentsListRef}>
                {comments.length === 0 && !loading && !error && (
                    <p className="no-comments">Комментариев пока нет.</p>
                )}
                {comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                        <strong className="comment-author">{comment.author || 'Аноним'}:</strong> {comment.text}
                        <div className="comment-timestamp">
                            {new Date(comment.created_at).toLocaleString()}
                        </div>
                    </div>
                ))}
                {error && !comments.length && <div className="comments-error-list">{error}</div>}
            </div>
            {isLoggedIn ? (
                <form onSubmit={handlePostComment} className="comment-form">
                    {error && !posting && <div className="comment-post-error">{error}</div>}
                    <textarea
                        className="comment-textarea"
                        placeholder="Оставьте комментарий..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        required
                        rows="3"
                        disabled={posting}
                    />
                    <button
                        type="submit"
                        className="comment-button"
                        disabled={posting || !newCommentText.trim()}
                    >
                        {posting ? 'Отправка...' : 'Отправить'}
                    </button>
                </form>
            ) : (
                <div className="login-prompt">
                    <p>Войдите, чтобы оставить комментарий.</p>
                </div>
            )}
        </div>
    );
};

export default VideoComments;