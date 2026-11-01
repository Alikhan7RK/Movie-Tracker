import json
import os
from decimal import Decimal
from io import StringIO
from unittest import mock
from urllib.error import URLError

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from . import tmdb
from .models import Genre, Movie, Review, Watchlist


def make_movie(title='Test Movie', base_rating='8.0', **extra):
    # Helper: a movie whose rating starts at its base_rating, like seed_movies does
    return Movie.objects.create(
        title=title,
        description='A test movie.',
        year=2010,
        base_rating=Decimal(base_rating),
        rating=Decimal(base_rating),
        **extra,
    )


class AuthTests(APITestCase):
    def test_register_creates_user(self):
        response = self.client.post('/api/register/', {'username': 'alice', 'password': 'secret123'})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='alice').exists())

    def test_register_rejects_duplicate_username(self):
        User.objects.create_user('alice', password='secret123')

        response = self.client.post('/api/register/', {'username': 'alice', 'password': 'other123'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_register_rejects_short_password(self):
        response = self.client.post('/api/register/', {'username': 'bob', 'password': '123'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_login_returns_tokens(self):
        User.objects.create_user('alice', password='secret123')

        response = self.client.post('/api/login/', {'username': 'alice', 'password': 'secret123'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_with_wrong_password_fails(self):
        User.objects.create_user('alice', password='secret123')

        response = self.client.post('/api/login/', {'username': 'alice', 'password': 'wrong'})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_needs_login(self):
        response = self.client.get('/api/profile/')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_with_jwt_returns_is_staff(self):
        User.objects.create_user('admin', password='secret123', is_staff=True)
        tokens = self.client.post('/api/login/', {'username': 'admin', 'password': 'secret123'}).data

        # Use the real JWT, like the Angular interceptor does
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        response = self.client.get('/api/profile/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'admin')
        self.assertTrue(response.data['is_staff'])

    def test_invalid_token_is_rejected_even_on_public_endpoint(self):
        # This is why the frontend interceptor logs the user out on 401
        self.client.credentials(HTTP_AUTHORIZATION='Bearer not-a-real-token')

        response = self.client.get('/api/movies/')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_blacklists_refresh_token(self):
        User.objects.create_user('alice', password='secret123')
        tokens = self.client.post('/api/login/', {'username': 'alice', 'password': 'secret123'}).data
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        first = self.client.post('/api/logout/', {'refresh': tokens['refresh']})
        second = self.client.post('/api/logout/', {'refresh': tokens['refresh']})

        self.assertEqual(first.status_code, status.HTTP_205_RESET_CONTENT)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)


class TokenRefreshTests(APITestCase):
    def setUp(self):
        User.objects.create_user('alice', password='secret123')
        self.tokens = self.client.post('/api/login/', {'username': 'alice', 'password': 'secret123'}).data

    def test_refresh_returns_new_working_access_token(self):
        response = self.client.post('/api/token/refresh/', {'refresh': self.tokens['refresh']})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        self.assertEqual(self.client.get('/api/profile/').status_code, status.HTTP_200_OK)

    def test_refresh_with_invalid_token_fails(self):
        response = self.client.post('/api/token/refresh/', {'refresh': 'not-a-real-token'})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_works_even_with_a_broken_access_token_header(self):
        # The interceptor calls refresh when the access token has already expired
        self.client.credentials(HTTP_AUTHORIZATION='Bearer expired-or-broken')

        response = self.client.post('/api/token/refresh/', {'refresh': self.tokens['refresh']})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_refresh_fails_after_logout(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['access']}")
        self.client.post('/api/logout/', {'refresh': self.tokens['refresh']})
        self.client.credentials()

        response = self.client.post('/api/token/refresh/', {'refresh': self.tokens['refresh']})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ProfileEditTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user('alice', email='alice@example.com', password='secret123')
        User.objects.create_user('bob', password='secret123')

    def test_profile_edit_needs_login(self):
        edit = self.client.patch('/api/profile/', {'username': 'x'})
        password = self.client.post('/api/profile/password/', {'old_password': 'a', 'new_password': 'bbbb'})

        self.assertEqual(edit.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(password.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_can_change_username_and_email(self):
        self.client.force_authenticate(self.alice)

        response = self.client.patch('/api/profile/', {'username': 'alice2', 'email': 'new@example.com'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'alice2')
        self.assertEqual(response.data['email'], 'new@example.com')
        self.alice.refresh_from_db()
        self.assertEqual(self.alice.username, 'alice2')

    def test_only_email_can_be_changed(self):
        self.client.force_authenticate(self.alice)

        response = self.client.patch('/api/profile/', {'email': 'other@example.com'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'alice')

    def test_keeping_own_username_is_allowed(self):
        self.client.force_authenticate(self.alice)

        response = self.client.patch('/api/profile/', {'username': 'alice'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cannot_take_another_users_username(self):
        self.client.force_authenticate(self.alice)

        response = self.client.patch('/api/profile/', {'username': 'bob'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_invalid_email_is_rejected(self):
        self.client.force_authenticate(self.alice)

        response = self.client.patch('/api/profile/', {'email': 'not-an-email'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_change_password_with_correct_old_password(self):
        self.client.force_authenticate(self.alice)

        response = self.client.post('/api/profile/password/', {'old_password': 'secret123', 'new_password': 'newpass1'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.force_authenticate(None)
        new_login = self.client.post('/api/login/', {'username': 'alice', 'password': 'newpass1'})
        old_login = self.client.post('/api/login/', {'username': 'alice', 'password': 'secret123'})
        self.assertEqual(new_login.status_code, status.HTTP_200_OK)
        self.assertEqual(old_login.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_change_password_with_wrong_old_password_fails(self):
        self.client.force_authenticate(self.alice)

        response = self.client.post('/api/profile/password/', {'old_password': 'wrong', 'new_password': 'newpass1'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('old_password', response.data)
        self.alice.refresh_from_db()
        self.assertTrue(self.alice.check_password('secret123'))

    def test_change_password_rejects_short_new_password(self):
        self.client.force_authenticate(self.alice)

        response = self.client.post('/api/profile/password/', {'old_password': 'secret123', 'new_password': '123'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('new_password', response.data)


class MovieListQueryTests(APITestCase):
    def setUp(self):
        self.drama = Genre.objects.create(name='Drama')
        self.action = Genre.objects.create(name='Action')

        inception = make_movie('Inception', '8.8', director='Christopher Nolan', actors='Leonardo DiCaprio')
        inception.genres.add(self.action)

        godfather = make_movie('The Godfather', '9.2', director='Francis Ford Coppola', actors='Al Pacino')
        godfather.year = 1972
        godfather.save()
        godfather.genres.add(self.drama)

        naruto = make_movie('Naruto', '8.0', content_type='anime', actors='Junko Takeuchi')
        naruto.year = 2002
        naruto.save()
        naruto.genres.add(self.action, self.drama)

    def titles(self, query=''):
        response = self.client.get(f'/api/movies/{query}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return [m['title'] for m in response.data['results']]

    def test_list_is_paginated_by_12(self):
        for i in range(14):
            make_movie(f'Extra {i}')

        first = self.client.get('/api/movies/')
        second = self.client.get('/api/movies/?page=2')

        self.assertEqual(first.data['count'], 17)
        self.assertEqual(first.data['total_pages'], 2)
        self.assertEqual(len(first.data['results']), 12)
        self.assertIsNotNone(first.data['next'])
        self.assertIsNone(first.data['previous'])
        self.assertEqual(len(second.data['results']), 5)
        self.assertIsNone(second.data['next'])

    def test_page_out_of_range_returns_404(self):
        self.assertEqual(self.client.get('/api/movies/?page=99').status_code, status.HTTP_404_NOT_FOUND)

    def test_default_order_is_newest_first(self):
        self.assertEqual(self.titles(), ['Naruto', 'The Godfather', 'Inception'])

    def test_search_by_title_is_case_insensitive(self):
        self.assertEqual(self.titles('?search=incep'), ['Inception'])

    def test_search_by_director(self):
        self.assertEqual(self.titles('?search=nolan'), ['Inception'])

    def test_search_by_actor(self):
        self.assertEqual(self.titles('?search=pacino'), ['The Godfather'])

    def test_search_with_no_match_returns_empty_page(self):
        response = self.client.get('/api/movies/?search=zzz')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)
        self.assertEqual(response.data['results'], [])

    def test_filter_by_genre(self):
        self.assertEqual(sorted(self.titles(f'?genre={self.drama.id}')), ['Naruto', 'The Godfather'])

    def test_filter_by_content_type(self):
        self.assertEqual(self.titles('?content_type=anime'), ['Naruto'])

    def test_filters_can_be_combined(self):
        self.assertEqual(self.titles(f'?genre={self.action.id}&content_type=movie'), ['Inception'])

    def test_ordering_by_rating(self):
        self.assertEqual(self.titles('?ordering=-rating'), ['The Godfather', 'Inception', 'Naruto'])
        self.assertEqual(self.titles('?ordering=rating'), ['Naruto', 'Inception', 'The Godfather'])

    def test_ordering_by_year(self):
        self.assertEqual(self.titles('?ordering=year'), ['The Godfather', 'Naruto', 'Inception'])
        self.assertEqual(self.titles('?ordering=-year'), ['Inception', 'Naruto', 'The Godfather'])

    def test_ordering_by_title(self):
        self.assertEqual(self.titles('?ordering=title'), ['Inception', 'Naruto', 'The Godfather'])
        self.assertEqual(self.titles('?ordering=-title'), ['The Godfather', 'Naruto', 'Inception'])

    def test_invalid_parameters_return_400(self):
        for query in ['?ordering=description', '?genre=drama', '?content_type=podcast']:
            with self.subTest(query=query):
                self.assertEqual(self.client.get(f'/api/movies/{query}').status_code, status.HTTP_400_BAD_REQUEST)


class GenreTests(APITestCase):
    def test_genres_are_public_and_sorted(self):
        Genre.objects.create(name='Drama')
        Genre.objects.create(name='Action')

        response = self.client.get('/api/genres/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([g['name'] for g in response.data], ['Action', 'Drama'])


class MoviePermissionTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('user', password='secret123')
        self.admin = User.objects.create_user('admin', password='secret123', is_staff=True)
        self.movie = make_movie()
        self.new_movie = {'title': 'New', 'description': 'Desc', 'year': 2020}

    def test_anyone_can_list_and_read_movies(self):
        list_response = self.client.get('/api/movies/')
        detail_response = self.client.get(f'/api/movies/{self.movie.id}/')

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data['count'], 1)
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data['title'], 'Test Movie')

    def test_missing_movie_returns_404(self):
        response = self.client.get('/api/movies/9999/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_guest_cannot_create_edit_or_delete(self):
        url = f'/api/movies/{self.movie.id}/'

        self.assertEqual(self.client.post('/api/movies/', self.new_movie).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.put(url, self.new_movie).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(Movie.objects.filter(id=self.movie.id).exists())

    def test_normal_user_cannot_create_edit_or_delete(self):
        self.client.force_authenticate(self.user)
        url = f'/api/movies/{self.movie.id}/'

        self.assertEqual(self.client.post('/api/movies/', self.new_movie).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.put(url, self.new_movie).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Movie.objects.filter(id=self.movie.id).exists())

    def test_admin_can_create_movie_without_genres(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post('/api/movies/', {**self.new_movie, 'base_rating': '7.5'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['genres'], [])
        # A new movie has no reviews, so rating = base_rating
        self.assertEqual(response.data['rating'], '7.5')

    def test_admin_cannot_set_rating_directly(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post('/api/movies/', {**self.new_movie, 'rating': '10.0'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['rating'], '0.0')

    def test_admin_can_create_movie_with_genres(self):
        genre = Genre.objects.create(name='Drama')
        self.client.force_authenticate(self.admin)

        response = self.client.post('/api/movies/', {**self.new_movie, 'genre_ids': [genre.id]}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['genres'], [{'id': genre.id, 'name': 'Drama'}])

    def test_admin_can_edit_and_delete(self):
        self.client.force_authenticate(self.admin)
        url = f'/api/movies/{self.movie.id}/'

        edit = self.client.put(url, {**self.new_movie, 'title': 'Renamed'}, format='json')
        self.assertEqual(edit.status_code, status.HTTP_200_OK)
        self.assertEqual(edit.data['title'], 'Renamed')

        delete = self.client.delete(url)
        self.assertEqual(delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Movie.objects.filter(id=self.movie.id).exists())

    def test_invalid_movie_data_is_rejected(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post('/api/movies/', {
            'title': 'Bad',
            'description': 'Desc',
            'year': 1500,
            'base_rating': '11',
            'poster_url': 'not a url',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        for field in ('year', 'base_rating', 'poster_url'):
            self.assertIn(field, response.data)


class ReviewTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user('alice', password='secret123')
        self.bob = User.objects.create_user('bob', password='secret123')
        self.movie = make_movie(base_rating='8.5')
        self.other_movie = make_movie(title='Other')

    def post_review(self, user, stars, text='Nice', movie=None):
        self.client.force_authenticate(user)
        return self.client.post('/api/reviews/', {
            'movie': (movie or self.movie).id,
            'text': text,
            'stars': stars,
        }, format='json')

    def rating(self):
        self.movie.refresh_from_db()
        return self.movie.rating

    def test_guest_can_read_reviews_filtered_by_movie(self):
        Review.objects.create(user=self.alice, movie=self.movie, text='A', stars=4)
        Review.objects.create(user=self.alice, movie=self.other_movie, text='B', stars=2)

        response = self.client.get(f'/api/reviews/?movie={self.movie.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['text'], 'A')
        self.assertEqual(response.data[0]['user'], 'alice')

    def test_movie_filter_must_be_a_number(self):
        response = self.client.get('/api/reviews/?movie=abc')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_guest_cannot_post_review(self):
        response = self.client.post('/api/reviews/', {'movie': self.movie.id, 'text': 'Hi', 'stars': 4})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_stars_must_be_between_1_and_5(self):
        self.assertEqual(self.post_review(self.alice, 0).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.post_review(self.alice, 6).status_code, status.HTTP_400_BAD_REQUEST)

    def test_first_review_sets_rating_to_stars_times_two(self):
        response = self.post_review(self.alice, 4)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.rating(), Decimal('8.0'))

    def test_second_review_by_same_user_updates_the_first(self):
        first = self.post_review(self.alice, 4, text='Good')
        second = self.post_review(self.alice, 5, text='Great')

        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data['id'], first.data['id'])
        self.assertEqual(Review.objects.filter(user=self.alice, movie=self.movie).count(), 1)
        self.assertEqual(Review.objects.get(id=first.data['id']).text, 'Great')
        self.assertEqual(self.rating(), Decimal('10.0'))

    def test_rating_is_average_of_all_reviews(self):
        self.post_review(self.alice, 5)
        self.post_review(self.bob, 2)

        # (5 + 2) / 2 * 2 = 7.0
        self.assertEqual(self.rating(), Decimal('7.0'))

    def test_deleting_last_review_falls_back_to_base_rating(self):
        review_id = self.post_review(self.alice, 2).data['id']
        self.assertEqual(self.rating(), Decimal('4.0'))

        response = self.client.delete(f'/api/reviews/{review_id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.rating(), Decimal('8.5'))

    def test_user_cannot_delete_someone_elses_review(self):
        review_id = self.post_review(self.alice, 4).data['id']

        self.client.force_authenticate(self.bob)
        response = self.client.delete(f'/api/reviews/{review_id}/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Review.objects.filter(id=review_id).exists())

    def test_deleting_missing_review_returns_404(self):
        self.client.force_authenticate(self.alice)

        response = self.client.delete('/api/reviews/9999/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class WatchlistTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user('alice', password='secret123')
        self.bob = User.objects.create_user('bob', password='secret123')
        self.movie = make_movie()
        self.other_movie = make_movie(title='Other')
        self.alice_item = Watchlist.objects.create(user=self.alice, movie=self.movie)

    def test_watchlist_needs_login(self):
        self.assertEqual(self.client.get('/api/watchlist/').status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            self.client.patch(f'/api/watchlist/{self.alice_item.id}/', {'status': 'watching'}).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_user_sees_only_own_items(self):
        Watchlist.objects.create(user=self.bob, movie=self.other_movie)
        self.client.force_authenticate(self.alice)

        response = self.client.get('/api/watchlist/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item['id'] for item in response.data], [self.alice_item.id])

    def test_add_movie_and_reject_duplicate(self):
        self.client.force_authenticate(self.alice)

        added = self.client.post('/api/watchlist/', {'movie': self.other_movie.id}, format='json')
        duplicate = self.client.post('/api/watchlist/', {'movie': self.other_movie.id}, format='json')

        self.assertEqual(added.status_code, status.HTTP_201_CREATED)
        self.assertEqual(added.data['status'], 'planned')
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)

    def test_owner_can_change_status(self):
        self.client.force_authenticate(self.alice)

        response = self.client.patch(f'/api/watchlist/{self.alice_item.id}/', {'status': 'watching'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.alice_item.refresh_from_db()
        self.assertEqual(self.alice_item.status, 'watching')

    def test_invalid_status_is_rejected(self):
        self.client.force_authenticate(self.alice)

        response = self.client.patch(f'/api/watchlist/{self.alice_item.id}/', {'status': 'nope'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_cannot_change_the_movie(self):
        self.client.force_authenticate(self.alice)

        self.client.patch(
            f'/api/watchlist/{self.alice_item.id}/',
            {'status': 'completed', 'movie': self.other_movie.id},
            format='json',
        )

        self.alice_item.refresh_from_db()
        self.assertEqual(self.alice_item.movie, self.movie)
        self.assertEqual(self.alice_item.status, 'completed')

    def test_other_user_cannot_change_or_delete_item(self):
        self.client.force_authenticate(self.bob)
        url = f'/api/watchlist/{self.alice_item.id}/'

        self.assertEqual(self.client.patch(url, {'status': 'completed'}, format='json').status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)

        self.alice_item.refresh_from_db()
        self.assertEqual(self.alice_item.status, 'planned')

    def test_owner_can_remove_item(self):
        self.client.force_authenticate(self.alice)

        response = self.client.delete(f'/api/watchlist/{self.alice_item.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Watchlist.objects.filter(id=self.alice_item.id).exists())


class SeedMoviesTests(APITestCase):
    def test_seed_creates_movies_once(self):
        call_command('seed_movies', stdout=StringIO())
        call_command('seed_movies', stdout=StringIO())

        self.assertEqual(Movie.objects.count(), 8)
        self.assertEqual(Genre.objects.count(), 4)
        inception = Movie.objects.get(title='Inception')
        self.assertEqual(inception.base_rating, Decimal('8.8'))
        self.assertEqual(inception.rating, Decimal('8.8'))
        self.assertEqual(inception.director, 'Christopher Nolan')

    def test_seed_keeps_review_based_rating(self):
        call_command('seed_movies', stdout=StringIO())
        user = User.objects.create_user('alice', password='secret123')
        inception = Movie.objects.get(title='Inception')
        Review.objects.create(user=user, movie=inception, text='Meh', stars=3)
        inception.update_rating()

        call_command('seed_movies', stdout=StringIO())

        inception.refresh_from_db()
        self.assertEqual(inception.rating, Decimal('6.0'))


class CreateAdminTests(APITestCase):
    env = {
        'DJANGO_SUPERUSER_USERNAME': 'boss',
        'DJANGO_SUPERUSER_PASSWORD': 'strong-pass-123',
        'DJANGO_SUPERUSER_EMAIL': 'boss@example.com',
    }

    def test_creates_admin_from_environment(self):
        with mock.patch.dict(os.environ, self.env):
            call_command('create_admin', stdout=StringIO())

        user = User.objects.get(username='boss')
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.check_password('strong-pass-123'))
        self.assertEqual(user.email, 'boss@example.com')

    def test_running_again_keeps_the_existing_admin(self):
        with mock.patch.dict(os.environ, self.env):
            call_command('create_admin', stdout=StringIO())
        User.objects.filter(username='boss').update(email='changed@example.com')

        with mock.patch.dict(os.environ, {**self.env, 'DJANGO_SUPERUSER_PASSWORD': 'other-pass-456'}):
            call_command('create_admin', stdout=StringIO())

        user = User.objects.get(username='boss')
        self.assertEqual(User.objects.filter(username='boss').count(), 1)
        self.assertTrue(user.check_password('strong-pass-123'))  # password is not overwritten
        self.assertEqual(user.email, 'changed@example.com')

    def test_skips_when_variables_are_missing(self):
        clean_env = {k: v for k, v in os.environ.items() if not k.startswith('DJANGO_SUPERUSER_')}
        out = StringIO()

        with mock.patch.dict(os.environ, clean_env, clear=True):
            call_command('create_admin', stdout=out)

        self.assertEqual(User.objects.count(), 0)
        self.assertIn('skipping', out.getvalue())


class BackdropTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user('admin', password='secret123', is_staff=True)
        self.new_movie = {'title': 'New', 'description': 'Desc', 'year': 2020}

    def test_admin_can_save_backdrop_url(self):
        self.client.force_authenticate(self.admin)
        url = 'https://image.tmdb.org/t/p/w1280/abc.jpg'

        response = self.client.post('/api/movies/', {**self.new_movie, 'backdrop_url': url}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['backdrop_url'], url)
        self.assertEqual(self.client.get(f"/api/movies/{response.data['id']}/").data['backdrop_url'], url)

    def test_backdrop_is_optional(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post('/api/movies/', self.new_movie, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data['backdrop_url'])

    def test_invalid_backdrop_url_is_rejected(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post('/api/movies/', {**self.new_movie, 'backdrop_url': 'not a link'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('backdrop_url', response.data)

    def test_seed_gives_every_movie_a_wide_backdrop(self):
        call_command('seed_movies', stdout=StringIO())

        for movie in Movie.objects.all():
            with self.subTest(movie=movie.title):
                self.assertTrue(movie.backdrop_url.startswith('https://image.tmdb.org/t/p/w1280/'))
                self.assertNotEqual(movie.backdrop_url, movie.poster_url)


# ---------- API docs + TMDB import (TMDB is always mocked: no real network calls) ----------

FAKE_SEARCH = {
    'results': [
        {'id': 157336, 'title': 'Interstellar', 'release_date': '2014-11-05', 'overview': 'Space.',
         'poster_path': '/poster.jpg', 'vote_average': 8.46},
        {'id': 999, 'title': 'No Date Movie', 'release_date': '', 'overview': '', 'poster_path': None, 'vote_average': 0},
    ]
}

FAKE_DETAILS = {
    'id': 157336,
    'title': 'Interstellar',
    'overview': 'A team of explorers travel through a wormhole in space.',
    'release_date': '2014-11-05',
    'poster_path': '/poster.jpg',
    'backdrop_path': '/backdrop.jpg',
    'runtime': 169,
    'vote_average': 8.46,
    'genres': [{'id': 1, 'name': 'Adventure'}, {'id': 2, 'name': 'Drama'}],
    'production_countries': [{'iso_3166_1': 'US', 'name': 'United States of America'},
                             {'iso_3166_1': 'GB', 'name': 'United Kingdom'}],
    'credits': {
        'crew': [{'name': 'Hans Zimmer', 'job': 'Original Music Composer'},
                 {'name': 'Christopher Nolan', 'job': 'Director'}],
        # Deliberately out of order: the import must use TMDB's "order" (top billing), not the list order
        'cast': [
            {'name': 'Actor 6', 'order': 5}, {'name': 'Matthew McConaughey', 'order': 0},
            {'name': 'Jessica Chastain', 'order': 2}, {'name': 'Actor 7', 'order': 6},
            {'name': 'Anne Hathaway', 'order': 1}, {'name': 'Bill Irwin', 'order': 3},
            {'name': 'Ellen Burstyn', 'order': 4},
        ],
    },
    'videos': {
        'results': [
            {'site': 'YouTube', 'type': 'Teaser', 'key': 'teaser123', 'official': True},
            {'site': 'Vimeo', 'type': 'Trailer', 'key': 'vimeo456', 'official': True},
            {'site': 'YouTube', 'type': 'Trailer', 'key': 'zSWdZVtXT7E', 'official': True},
        ]
    },
}


def fake_tmdb_get(path, params=None):
    # Stands in for movies.tmdb._get in tests
    if path == '/search/movie':
        return FAKE_SEARCH
    if path == '/movie/157336':
        return FAKE_DETAILS
    if path == '/movie/999':
        return {**FAKE_DETAILS, 'id': 999, 'title': 'No Date Movie', 'release_date': ''}
    raise tmdb.TmdbError('Movie not found on TMDB.', status=404)


class ApiDocsTests(APITestCase):
    def test_schema_is_generated(self):
        response = self.client.get('/api/schema/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        content = response.content.decode()
        self.assertIn('CineTrack API', content)
        self.assertIn('/api/movies/', content)
        self.assertIn('/api/tmdb/import/', content)

    def test_swagger_ui_page_loads(self):
        response = self.client.get('/api/docs/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('swagger', response.content.decode().lower())


@override_settings(TMDB_API_KEY='test-key')
@mock.patch('movies.tmdb._get', side_effect=fake_tmdb_get)
class TmdbImportTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user('admin', password='secret123', is_staff=True)
        self.user = User.objects.create_user('user', password='secret123')

    def test_search_and_import_are_admin_only(self, fake_get):
        guest_search = self.client.get('/api/tmdb/search/?q=interstellar')
        self.client.force_authenticate(self.user)
        user_search = self.client.get('/api/tmdb/search/?q=interstellar')
        user_import = self.client.post('/api/tmdb/import/', {'tmdb_id': 157336})

        self.assertEqual(guest_search.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(user_search.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(user_import.status_code, status.HTTP_403_FORBIDDEN)
        fake_get.assert_not_called()

    def test_search_returns_short_results(self, fake_get):
        self.client.force_authenticate(self.admin)

        response = self.client.get('/api/tmdb/search/?q=interstellar')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        first = response.data[0]
        self.assertEqual(first['tmdb_id'], 157336)
        self.assertEqual(first['year'], 2014)
        self.assertEqual(first['poster_url'], 'https://image.tmdb.org/t/p/w500/poster.jpg')
        self.assertEqual(first['rating'], 8.5)
        self.assertIsNone(first['imported_movie_id'])
        self.assertIsNone(response.data[1]['year'])
        self.assertIsNone(response.data[1]['poster_url'])
        fake_get.assert_called_once()
        self.assertEqual(fake_get.call_args.args[1]['query'], 'interstellar')

    def test_search_marks_already_imported_movies(self, fake_get):
        movie = make_movie('Interstellar', tmdb_id=157336)
        self.client.force_authenticate(self.admin)

        response = self.client.get('/api/tmdb/search/?q=interstellar')

        self.assertEqual(response.data[0]['imported_movie_id'], movie.id)

    def test_search_needs_a_query(self, fake_get):
        self.client.force_authenticate(self.admin)

        response = self.client.get('/api/tmdb/search/?q=%20')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        fake_get.assert_not_called()

    def test_import_creates_movie_with_all_fields(self, fake_get):
        Genre.objects.create(name='Drama')  # existing genre is reused, Adventure is created
        self.client.force_authenticate(self.admin)

        response = self.client.post('/api/tmdb/import/', {'tmdb_id': 157336}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        movie = Movie.objects.get(tmdb_id=157336)
        self.assertEqual(response.data['id'], movie.id)
        self.assertEqual(movie.title, 'Interstellar')
        self.assertEqual(movie.description, 'A team of explorers travel through a wormhole in space.')
        self.assertEqual(movie.year, 2014)
        self.assertEqual(movie.poster_url, 'https://image.tmdb.org/t/p/w500/poster.jpg')
        self.assertEqual(movie.backdrop_url, 'https://image.tmdb.org/t/p/w1280/backdrop.jpg')
        self.assertEqual(movie.director, 'Christopher Nolan')
        self.assertEqual(
            movie.actors,
            'Matthew McConaughey, Anne Hathaway, Jessica Chastain, Bill Irwin, Ellen Burstyn',
        )
        self.assertEqual(movie.country, 'United States of America, United Kingdom')
        self.assertEqual(movie.duration, 169)
        self.assertEqual(movie.trailer_url, 'https://www.youtube.com/watch?v=zSWdZVtXT7E')
        self.assertEqual(movie.base_rating, Decimal('8.5'))
        self.assertEqual(movie.rating, Decimal('8.5'))  # no reviews yet -> TMDB rating
        self.assertEqual(sorted(g.name for g in movie.genres.all()), ['Adventure', 'Drama'])
        self.assertEqual(Genre.objects.filter(name='Drama').count(), 1)

    def test_importing_again_updates_instead_of_duplicating(self, fake_get):
        self.client.force_authenticate(self.admin)
        first = self.client.post('/api/tmdb/import/', {'tmdb_id': 157336}, format='json')
        Movie.objects.filter(id=first.data['id']).update(title='Old title', duration=1)

        second = self.client.post('/api/tmdb/import/', {'tmdb_id': 157336}, format='json')

        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data['id'], first.data['id'])
        self.assertEqual(Movie.objects.count(), 1)
        movie = Movie.objects.get()
        self.assertEqual(movie.title, 'Interstellar')
        self.assertEqual(movie.duration, 169)

    def test_import_links_a_seeded_movie_with_the_same_title_and_year(self, fake_get):
        seeded = make_movie('Interstellar')  # make_movie uses year 2010
        seeded.year = 2014
        seeded.save()
        self.client.force_authenticate(self.admin)

        response = self.client.post('/api/tmdb/import/', {'tmdb_id': 157336}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], seeded.id)
        self.assertEqual(Movie.objects.count(), 1)
        seeded.refresh_from_db()
        self.assertEqual(seeded.tmdb_id, 157336)

    def test_import_keeps_the_review_based_rating(self, fake_get):
        self.client.force_authenticate(self.admin)
        movie_id = self.client.post('/api/tmdb/import/', {'tmdb_id': 157336}, format='json').data['id']
        Review.objects.create(user=self.user, movie_id=movie_id, text='Ok', stars=3)

        self.client.post('/api/tmdb/import/', {'tmdb_id': 157336}, format='json')

        self.assertEqual(Movie.objects.get(id=movie_id).rating, Decimal('6.0'))

    def test_import_errors(self, fake_get):
        self.client.force_authenticate(self.admin)

        not_found = self.client.post('/api/tmdb/import/', {'tmdb_id': 12345}, format='json')
        no_date = self.client.post('/api/tmdb/import/', {'tmdb_id': 999}, format='json')
        bad_id = self.client.post('/api/tmdb/import/', {'tmdb_id': 'abc'}, format='json')

        self.assertEqual(not_found.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(no_date.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('release date', no_date.data['error'])
        self.assertEqual(bad_id.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Movie.objects.count(), 0)


class TmdbClientTests(APITestCase):
    # Tests for the low-level request in movies.tmdb._get; urlopen is mocked, so nothing leaves the computer

    @override_settings(TMDB_API_KEY='')
    @mock.patch('movies.tmdb.urlopen')
    def test_missing_key_gives_503_without_calling_tmdb(self, fake_urlopen):
        self.client.force_authenticate(User.objects.create_user('admin', password='secret123', is_staff=True))

        response = self.client.get('/api/tmdb/search/?q=interstellar')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn('TMDB_API_KEY', response.data['error'])
        fake_urlopen.assert_not_called()

    def _fake_response(self, body):
        response = mock.MagicMock()
        response.read.return_value = json.dumps(body).encode()
        response.__enter__.return_value = response
        return response

    @override_settings(TMDB_API_KEY='v3key123')
    @mock.patch('movies.tmdb.urlopen')
    def test_v3_api_key_goes_in_the_url(self, fake_urlopen):
        fake_urlopen.return_value = self._fake_response({'results': []})

        tmdb.search_movies('dune')

        request = fake_urlopen.call_args.args[0]
        self.assertTrue(request.full_url.startswith('https://api.themoviedb.org/3/search/movie?'))
        self.assertIn('api_key=v3key123', request.full_url)
        self.assertIn('query=dune', request.full_url)
        self.assertIsNone(request.get_header('Authorization'))

    @override_settings(TMDB_API_KEY='eyJv4-read-access-token')
    @mock.patch('movies.tmdb.urlopen')
    def test_v4_token_goes_in_the_header(self, fake_urlopen):
        fake_urlopen.return_value = self._fake_response({'results': []})

        tmdb.search_movies('dune')

        request = fake_urlopen.call_args.args[0]
        self.assertEqual(request.get_header('Authorization'), 'Bearer eyJv4-read-access-token')
        self.assertNotIn('api_key', request.full_url)

    @override_settings(TMDB_API_KEY='v3key123')
    @mock.patch('movies.tmdb.urlopen')
    def test_network_problems_become_a_clear_error(self, fake_urlopen):
        fake_urlopen.side_effect = URLError('no internet')

        with self.assertRaises(tmdb.TmdbError) as raised:
            tmdb.search_movies('dune')

        self.assertEqual(raised.exception.status, 502)


class SeedTmdbIdTests(APITestCase):
    def test_seeded_movies_have_their_tmdb_ids(self):
        call_command('seed_movies', stdout=StringIO())

        self.assertEqual(Movie.objects.get(title='Interstellar').tmdb_id, 157336)
        self.assertFalse(Movie.objects.filter(tmdb_id__isnull=True).exists())
