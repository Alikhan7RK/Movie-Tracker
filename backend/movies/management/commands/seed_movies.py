from django.core.management.base import BaseCommand

from movies.models import Genre, Movie


# Sample movies (they used to be hard-coded as mock data in the frontend MovieService)
MOVIES = [
    {
        'title': 'Inception',
        'genre': 'Sci-Fi',
        'rating': 8.8,
        'poster_url': 'https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg',
        'description': 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO.',
        'year': 2010,
        'director': 'Christopher Nolan',
        'actors': 'Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page, Tom Hardy',
        'country': 'USA',
        'duration': 148,
    },
    {
        'title': 'The Dark Knight',
        'genre': 'Action',
        'rating': 9.0,
        'poster_url': 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
        'description': 'Batman faces the Joker, a criminal mastermind who plunges Gotham into chaos.',
        'year': 2008,
        'director': 'Christopher Nolan',
        'actors': 'Christian Bale, Heath Ledger, Aaron Eckhart, Gary Oldman',
        'country': 'USA',
        'duration': 152,
    },
    {
        'title': 'Interstellar',
        'genre': 'Sci-Fi',
        'rating': 8.6,
        'poster_url': 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
        'description': 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity’s survival.',
        'year': 2014,
        'director': 'Christopher Nolan',
        'actors': 'Matthew McConaughey, Anne Hathaway, Jessica Chastain, Michael Caine',
        'country': 'USA',
        'duration': 169,
    },
    {
        'title': 'The Shawshank Redemption',
        'genre': 'Drama',
        'rating': 9.3,
        'poster_url': 'https://image.tmdb.org/t/p/w500/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg',
        'description': 'Two imprisoned men bond over a number of years, finding solace and redemption through acts of common decency.',
        'year': 1994,
        'director': 'Frank Darabont',
        'actors': 'Tim Robbins, Morgan Freeman, Bob Gunton',
        'country': 'USA',
        'duration': 142,
    },
    {
        'title': 'Pulp Fiction',
        'genre': 'Crime',
        'rating': 8.9,
        'poster_url': 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
        'description': 'The lives of two mob hitmen, a boxer, and others intertwine in tales of violence and redemption.',
        'year': 1994,
        'director': 'Quentin Tarantino',
        'actors': 'John Travolta, Uma Thurman, Samuel L. Jackson, Bruce Willis',
        'country': 'USA',
        'duration': 154,
    },
    {
        'title': 'The Godfather',
        'genre': 'Crime',
        'rating': 9.2,
        'poster_url': 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
        'description': 'The aging patriarch of an organized crime dynasty transfers control of his empire to his reluctant son.',
        'year': 1972,
        'director': 'Francis Ford Coppola',
        'actors': 'Marlon Brando, Al Pacino, James Caan, Robert Duvall',
        'country': 'USA',
        'duration': 175,
    },
    {
        'title': 'Fight Club',
        'genre': 'Drama',
        'rating': 8.8,
        'poster_url': 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
        'description': 'An insomniac office worker and a soap maker form an underground fight club.',
        'year': 1999,
        'director': 'David Fincher',
        'actors': 'Brad Pitt, Edward Norton, Helena Bonham Carter',
        'country': 'USA',
        'duration': 139,
    },
    {
        'title': 'Gladiator',
        'genre': 'Action',
        'rating': 8.5,
        'poster_url': 'https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg',
        'description': 'A former Roman general sets out to exact vengeance against the corrupt emperor.',
        'year': 2000,
        'director': 'Ridley Scott',
        'actors': 'Russell Crowe, Joaquin Phoenix, Connie Nielsen',
        'country': 'USA',
        'duration': 155,
    },
]


class Command(BaseCommand):
    help = 'Fill the database with genres and sample movies (safe to run more than once)'

    def handle(self, *args, **options):
        created_count = 0

        for data in MOVIES:
            genre, _ = Genre.objects.get_or_create(name=data['genre'])

            # Look the movie up by title, so running the command twice does not create duplicates
            movie, created = Movie.objects.update_or_create(
                title=data['title'],
                defaults={
                    'description': data['description'],
                    'year': data['year'],
                    'rating': data['rating'],
                    'poster_url': data['poster_url'],
                    'content_type': 'movie',
                    'director': data['director'],
                    'actors': data['actors'],
                    'country': data['country'],
                    'duration': data['duration'],
                },
            )
            movie.genres.add(genre)

            if created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done: {created_count} new movies, {Movie.objects.count()} movies and '
            f'{Genre.objects.count()} genres in the database.'
        ))
