from rest_framework import viewsets
from .models import Video
from .serializers import VideoSerializer
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework import generics, permissions
from rest_framework.response import Response
from .serializers import RegistrationSerializer
from rest_framework import status


from rest_framework.generics import RetrieveAPIView, ListAPIView, DestroyAPIView, ListCreateAPIView # <--- ДОБАВЬТЕ ListCreateAPIView сюда
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny, IsAuthenticated
from django.contrib.auth.models import User
from .models import Video, Comment
from .serializers import UserSerializer, VideoSerializer, CommentSerializer
from .permissions import IsVideoOwner

MOVIEPY_INSTALLED = False

from django.shortcuts import get_object_or_404

# Импорты, необходимые для работы с файлами и генерации миниатюры
from django.core.files import File # Для работы с файлами Django
import os # Для работы с путями и временными файлами
from django.conf import settings # Для доступа к MEDIA_ROOT
import sys # Для отладки путей импорта

# --- ИСПРАВЛЕНИЕ NameError: Объявляем переменную ДО блока try ---
MOVIEPY_INSTALLED = False
# --- Конец исправления ---

# --- ОТЛАДКА ИМПОРТА MOVIEPY ---
print("\n--- Debugging moviepy import ---") # <-- Добавлено для отладки
print(f"sys.executable: {sys.executable}") # <-- Показывает, какой Python используется
print(f"sys.path: {sys.path}") # <-- Показывает пути поиска модулей Python
print("Attempting to import moviepy.editor...") # <-- Добавлено для отладки

try:
    from moviepy import VideoFileClip
    # --- ИСПРАВЛЕНИЕ NameError: Устанавливаем True ВНУТРИ try ---
    MOVIEPY_INSTALLED = True
    # --- Конец исправления ---
    print("moviepy.editor imported successfully!") # <-- Добавлено для отладки
    print("Thumbnail generation is enabled.")
except ImportError as e: # <-- Ловим специфическую ошибку ImportError
    print(f"Error importing moviepy.editor: {e}") # <-- Выводим текст ошибки импорта
    print("Warning: moviepy not installed or not found in sys.path. Thumbnail generation will be skipped.")
    print("Please ensure moviepy is installed (pip install moviepy) in the correct environment.")
    print("Also ensure ffmpeg is in your system's PATH.")
except Exception as e: # <-- Ловим любые другие ошибки при импорте
    print(f"An unexpected error occurred during moviepy import: {type(e).__name__}: {e}") # <-- Выводим тип и текст ошибки
    print("Warning: moviepy import failed. Thumbnail generation will be skipped.")
    print("Please ensure moviepy is installed and ffmpeg is in your system's PATH.")

print("--- End debugging moviepy import ---\n") # <-- Добавлено для отладки
# --- КОНЕЦ ОТЛАДКИ ИМПОРТА MOVIEPY ---

class CurrentUserView(RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

class UserVideoListView(ListAPIView):
    serializer_class = VideoSerializer
    #permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Video.objects.filter(author=self.request.user)


class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.all()
    serializer_class = VideoSerializer

    # Определение разрешений
    def get_permissions(self):
        """
        Определяет разрешения для каждого действия во ViewSet.
        """
        if self.action == 'list' or self.action == 'retrieve':
            # Разрешить доступ любому пользователю (авторизованному или нет)
            permission_classes = [permissions.AllowAny]
        elif self.action == 'create':
            # Разрешить доступ только авторизованным пользователям для создания видео
            permission_classes = [permissions.IsAuthenticated]
        elif self.action == 'destroy':
             # Разрешить доступ только авторизованному пользователю (и, возможно, только автору видео)
             # Для простоты пока оставим IsAuthenticated. Если нужно только автору, это сложнее.
             permission_classes = [permissions.IsAuthenticated]
        elif self.action == 'user':
            # Разрешить доступ только авторизованному пользователю для просмотра своих видео
            permission_classes = [permissions.IsAuthenticated]
        else:
            # Разрешения по умолчанию для других действий (update, partial_update и т.д.)
            permission_classes = [permissions.IsAuthenticated] # Например, требуют авторизации

        # Возвращаем список объектов разрешений
        return [permission() for permission in permission_classes]

    # Переопределение метода perform_create для генерации миниатюры
    def perform_create(self, serializer):
        # Сначала сохраняем сам объект Video, чтобы получить его id и сохранить файл видео
        instance = serializer.save(author=self.request.user) # Устанавливаем автора и сохраняем

        # Генерируем миниатюру только если moviepy установлен И видеофайл загружен
        # Теперь MOVIEPY_INSTALLED всегда определена
        if MOVIEPY_INSTALLED and instance.video:
            print(f"Attempting to generate thumbnail for video {instance.pk}...") # <-- Добавлено для отладки
            try:
                # Получаем полный путь к сохраненному видеофайлу
                video_path = instance.video.path
                # Формируем путь для временного файла миниатюры
                # Используем PK объекта Video для уникальности имени временного файла
                temp_thumbnail_path = os.path.join(settings.MEDIA_ROOT, f'temp_thumbnail_{instance.pk}.jpg')

                # Создаем видеоклип из файла
                clip = VideoFileClip(video_path)

                # Устанавливаем время для кадра (например, 0.5 секунды или середина)
                # Убедитесь, что видео длиннее этого времени
                frame_time = 0.5 # Попробуем взять кадр на 0.5 секунде
                if clip.duration is not None and clip.duration > 0:
                    frame_time = min(frame_time, clip.duration / 2) # Берем кадр на 0.5с или в середине
                else:
                     print(f"Warning: Video {instance.pk} has zero or unknown duration. Skipping thumbnail generation.")
                     clip.close() # Закрываем клип, если не можем определить длительность
                     return # Выходим из функции, если не можем определить длительность

                # Сохраняем кадр как временный файл
                clip.save_frame(temp_thumbnail_path, t=frame_time)

                # Закрываем клип для освобождения ресурсов
                clip.close()

                # Открываем временный файл миниатюры и сохраняем его в поле thumbnail модели
                with open(temp_thumbnail_path, 'rb') as f:
                    # Генерируем уникальное имя файла для миниатюры
                    # Используем PK и базовое имя видеофайла для уникальности
                    thumbnail_filename = f'thumbnail_{instance.pk}_{os.path.splitext(os.path.basename(video_path))[0]}.jpg'
                    # Сохраняем файл в поле thumbnail модели. save=True вызывает сохранение объекта в базу.
                    instance.thumbnail.save(thumbnail_filename, File(f), save=True)
                    print(f"Thumbnail generated and saved for video {instance.pk}.") # <-- Добавлено для отладки


                # Удаляем временный файл после сохранения
                os.remove(temp_thumbnail_path)
                print(f"Temporary thumbnail file {temp_thumbnail_path} removed.") # <-- Добавлено для отладки


            except Exception as e:
                # Если произошла ошибка при генерации миниатюры, логируем ее
                # Видео будет сохранено, но без миниатюры
                print(f"Error generating thumbnail for video {instance.pk}: {e}")
                # Убеждаемся, что thumbnail остается None или пустой строкой в случае ошибки
                instance.thumbnail = None # Явно устанавливаем None
                instance.save(update_fields=['thumbnail']) # Сохраняем только это поле


        # Если moviepy не установлен или нет видеофайла, этот блок пропускается
        elif not MOVIEPY_INSTALLED:
             print(f"Skipping thumbnail generation for video {instance.pk}: moviepy not installed.")
        elif not instance.video:
             print(f"Skipping thumbnail generation for video {instance.pk}: no video file.")


class RegistrationAPIView(generics.GenericAPIView):
    serializer_class = RegistrationSerializer
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            "user": RegistrationSerializer(user, context=self.get_serializer_context()).data,
            "message": "Пользователь успешно зарегистрирован.",
        }, status=status.HTTP_201_CREATED)
class VideoCommentsListCreateView(ListCreateAPIView):
    """
    API View для списка комментариев к видео (GET) и создания нового комментария (POST).
    GET доступен всем, POST - только авторизованным.
    """
    serializer_class = CommentSerializer
    # Устанавливаем разрешения: для чтения (GET, HEAD, OPTIONS) разрешено всем (AllowAny),
    # для записи (POST, PUT, PATCH, DELETE) - только авторизованным (IsAuthenticated).
    # IsAuthenticatedOrReadOnly не подойдет, т.к. нам нужен разный уровень доступа.
    permission_classes = [AllowAny] # Начальное разрешение

    # Получаем видео по ID из URL (например, из <int:video_id>)
    def get_queryset(self):
        video_id = self.kwargs['video_id']
        # Убедитесь, что видео существует, прежде чем пытаться получить комментарии
        video = Video.objects.filter(pk=video_id).first()
        if video:
            return Comment.objects.filter(video=video)
        return Comment.objects.none() # Возвращаем пустой QuerySet, если видео нет

    # Переопределяем perform_create для автоматического связывания комментария с видео и пользователем
    def perform_create(self, serializer):
         video_id = self.kwargs['video_id']
         video = Video.objects.get(pk=video_id) # Получаем объект видео
         # Сохраняем комментарий, связывая его с видео и текущим авторизованным пользователем
         serializer.save(video=video, author=self.request.user)

    # Устанавливаем разные разрешения для GET и POST
    def get_permissions(self):
        if self.request.method == 'POST':
            # Для POST запросов требуется аутентификация
            return [IsAuthenticated()]
        # Для всех остальных методов (GET, HEAD, OPTIONS) разрешено всем
        return [AllowAny()]