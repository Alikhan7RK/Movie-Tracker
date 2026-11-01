from django.contrib.auth import authenticate
from django.db.models import Q
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser, SAFE_METHODS
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User


from .models import Genre, Movie, Review, Watchlist
from .pagination import MoviePagination
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    ProfileUpdateSerializer,
    ChangePasswordSerializer,
    GenreSerializer,
    MovieSerializer,
    ReviewSerializer,
    WatchlistSerializer,
)

# Allowed values for /api/movies/?ordering= ('-' = descending)
MOVIE_ORDERING_FIELDS = ['rating', '-rating', 'year', '-year', 'title', '-title', 'created_at', '-created_at']


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()
        return Response(
            {
                'message': 'User registered successfully',
                'user_id': user.id,
                'username': user.username,
            },
            status=status.HTTP_201_CREATED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)

    if serializer.is_valid():
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']

        user = authenticate(username=username, password=password)

        if user is not None:
            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    'message': 'Login successful',
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                status=status.HTTP_200_OK
            )

        return Response(
            {'error': 'Invalid username or password'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    # PATCH /api/profile/ {"username": ..., "email": ...} -> change your own username / email
    if request.method == 'PATCH':
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()

    reviews = Review.objects.filter(user=request.user).select_related('movie').order_by('-created_at')
    reviews_data = [
        {
            'id': r.id,
            'movie': r.movie.id,
            'movie_title': r.movie.title,
            'text': r.text,
            'stars': r.stars,
            'created_at': r.created_at,
        }
        for r in reviews
    ]
    return Response(
        {
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'is_staff': request.user.is_staff,
            'reviews': reviews_data,
        },
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})

    if serializer.is_valid():
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def genre_list_view(request):
    genres = Genre.objects.all().order_by('name')
    serializer = GenreSerializer(genres, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


#@api_view(['POST'])
#@permission_classes([IsAuthenticated])
#def logout_view(request):
    #return Response(
        #{'message': 'Logout successful'},
        #status=status.HTTP_200_OK
    #)


class MovieListCreateView(APIView):
    # Anyone can read movies, only admins (is_staff) can create them
    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [IsAdminUser()]

    def get(self, request):
        movies = Movie.objects.prefetch_related('genres')
        params = request.query_params

        # ?search=nolan -> title, director or actors contain the text
        search = params.get('search', '').strip()
        if search:
            movies = movies.filter(
                Q(title__icontains=search) | Q(director__icontains=search) | Q(actors__icontains=search)
            )

        # ?genre=3 -> only movies with genre id 3
        genre = params.get('genre')
        if genre:
            if not genre.isdigit():
                return Response({'error': 'genre must be a genre id'}, status=status.HTTP_400_BAD_REQUEST)
            movies = movies.filter(genres__id=genre)

        # ?content_type=anime
        content_type = params.get('content_type')
        if content_type:
            if content_type not in dict(Movie.CONTENT_TYPES):
                return Response({'error': 'Unknown content_type'}, status=status.HTTP_400_BAD_REQUEST)
            movies = movies.filter(content_type=content_type)

        # ?ordering=-rating -> best first; no ordering -> newest added first
        ordering = params.get('ordering') or '-created_at'
        if ordering not in MOVIE_ORDERING_FIELDS:
            return Response(
                {'error': f"ordering must be one of: {', '.join(MOVIE_ORDERING_FIELDS)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        # 'id' as a tie-breaker, so movies with the same rating/year keep a stable order between pages
        movies = movies.order_by(ordering, 'id')

        paginator = MoviePagination()
        page = paginator.paginate_queryset(movies, request, view=self)
        serializer = MovieSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = MovieSerializer(data=request.data)

        if serializer.is_valid():
            movie = serializer.save()
            movie.update_rating()  # new movie has no reviews -> rating = base_rating
            return Response(MovieSerializer(movie).data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MovieDetailView(APIView):
    # Anyone can read a movie, only admins (is_staff) can edit or delete it
    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [IsAdminUser()]

    def get_object(self, pk):
        try:
            return Movie.objects.get(pk=pk)
        except Movie.DoesNotExist:
            return None

    def get(self, request, pk):
        movie = self.get_object(pk)
        if not movie:
            return Response({'error': 'Movie not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = MovieSerializer(movie)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        movie = self.get_object(pk)
        if not movie:
            return Response({'error': 'Movie not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = MovieSerializer(movie, data=request.data)
        if serializer.is_valid():
            movie = serializer.save()
            movie.update_rating()  # base_rating may have changed
            return Response(MovieSerializer(movie).data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        movie = self.get_object(pk)
        if not movie:
            return Response({'error': 'Movie not found'}, status=status.HTTP_404_NOT_FOUND)

        movie.delete()
        return Response({'message': 'Movie deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


class ReviewListCreateView(APIView):
    # Anyone can read reviews, only logged-in users can write them
    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request):
        reviews = Review.objects.select_related('user', 'movie').all().order_by('-created_at')

        # /api/reviews/?movie=3 -> only reviews of movie 3
        movie_id = request.query_params.get('movie')
        if movie_id:
            if not movie_id.isdigit():
                return Response({'error': 'movie must be a number'}, status=status.HTTP_400_BAD_REQUEST)
            reviews = reviews.filter(movie_id=movie_id)

        serializer = ReviewSerializer(reviews, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = ReviewSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # One review per user per movie: if the user already reviewed this movie, update that review
        movie = serializer.validated_data['movie']
        existing = Review.objects.filter(user=request.user, movie=movie).first()

        if existing:
            serializer = ReviewSerializer(existing, data=request.data)
            serializer.is_valid(raise_exception=True)

        review = serializer.save(user=request.user)
        review.movie.update_rating()
        return Response(
            serializer.data,
            status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED
        )


class ReviewDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            review = Review.objects.select_related('movie').get(pk=pk)
        except Review.DoesNotExist:
            return Response({'error': 'Review not found'}, status=status.HTTP_404_NOT_FOUND)

        if review.user != request.user:
            return Response({'error': 'You can only delete your own review'}, status=status.HTTP_403_FORBIDDEN)

        movie = review.movie
        review.delete()
        movie.update_rating()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WatchlistListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        watchlist = Watchlist.objects.select_related('user', 'movie').filter(user=request.user).order_by('-added_at')
        serializer = WatchlistSerializer(watchlist, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = WatchlistSerializer(data=request.data, context={'request': request})

        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class WatchlistDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        # Only look in the current user's own watchlist, so nobody can touch another user's items
        try:
            return Watchlist.objects.select_related('movie').get(pk=pk, user=request.user)
        except Watchlist.DoesNotExist:
            return None

    def patch(self, request, pk):
        item = self.get_object(request, pk)
        if not item:
            return Response({'error': 'Watchlist item not found'}, status=status.HTTP_404_NOT_FOUND)

        # Only the status can be changed
        serializer = WatchlistSerializer(item, data={'status': request.data.get('status')}, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        item = self.get_object(request, pk)
        if not item:
            return Response({'error': 'Watchlist item not found'}, status=status.HTTP_404_NOT_FOUND)

        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response({"message": "Logged out successfully"}, status=status.HTTP_205_RESET_CONTENT)

        except Exception:
            return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)

