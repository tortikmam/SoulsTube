// src/pages/VideoPage.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactPlayer from 'react-player';
import axios from 'axios';
import Header from '../components/Header';
import VideoComments from '../components/VideoComments';
import './styles/VideoPage.css';

const VideoPage = () => {
    const { id } = useParams();
    const [video, setVideo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const isLoggedIn = !!localStorage.getItem('access_token');

    useEffect(() => {
        const fetchVideo = async () => {
            try {
                const response = await axios.get(`http://localhost:8000/api/videos/${id}/`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                });
                setVideo(response.data);
            } catch (err) {
                setError('Ошибка загрузки видео');
                if (err.response && err.response.status === 404) {
                    setVideo(null);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchVideo();
    }, [id]);

    if (loading) return <div className="page-message">Загрузка...</div>;
    if (error && !video) return <div className="page-message">{error}</div>;
    if (!video && !loading) return <div className="page-message">Видео не найдено</div>;

    return (
        <div>
            <Header />
            <div className="content-layout">
                <div className="video-and-info">
                    <div className="player-wrapper">
                        <ReactPlayer
                            className="react-player"
                            url={video.file_url}
                            controls
                            width="100%"
                            height="100%"
                            config={{
                                file: {
                                    attributes: {
                                        controlsList: 'nodownload'
                                    }
                                }
                            }}
                        />
                    </div>
                    <div className="video-info">
                        <h1>{video.title}</h1>
                        <p>{video.author_username} • {new Date(video.uploaded_at).toLocaleDateString()}</p>
                        <p>{video.description}</p>
                    </div>
                    {/* Перемещаем комментарии под видео */}
                    <div className="comments-section">
                        <VideoComments videoId={id} isLoggedIn={isLoggedIn} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoPage;