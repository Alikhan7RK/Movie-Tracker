from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Genre, Movie, Review, Watchlist


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=4)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"]
        )
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ['id', 'name']


class MovieSerializer(serializers.ModelSerializer):
    genres = GenreSerializer(many=True, read_only=True)
    genre_ids = serializers.PrimaryKeyRelatedField(
        queryset=Genre.objects.all(),
        many=True,
        write_only=True,
        source='genres'
    )

    class Meta:
        model = Movie
        fields = [
            'id',
            'title',
            'description',
            'year',
            'rating',
            'trailer_url',
            'poster_url',
            'content_type',
            'genres',
            'genre_ids',
            'created_at',
        ]


class ReviewSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    movie_title = serializers.CharField(source='movie.title', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id',
            'user',
            'movie',
            'movie_title',
            'text',
            'stars',
            'created_at',
        ]

    def validate_stars(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Stars must be between 1 and 5.")
        return value


class WatchlistSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    movie_title = serializers.CharField(source='movie.title', read_only=True)

    class Meta:
        model = Watchlist
        fields = [
            'id',
            'user',
            'movie',
            'movie_title',
            'status',
            'added_at',
        ]