import os

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    # The free Render plan has no SSH, so `createsuperuser` can't be typed on the server.
    # Instead, build.sh runs this command, which reads the admin login from environment variables
    # (same names Django's own createsuperuser --noinput uses). Safe to run on every deploy.
    help = 'Create an admin user from DJANGO_SUPERUSER_USERNAME / _PASSWORD / _EMAIL, if it does not exist yet.'

    def handle(self, *args, **options):
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME', '').strip()
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', '')
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', '').strip()

        if not username or not password:
            self.stdout.write('create_admin: DJANGO_SUPERUSER_USERNAME / DJANGO_SUPERUSER_PASSWORD not set, skipping.')
            return

        if User.objects.filter(username=username).exists():
            # Never overwrite: the password may have been changed on the site since then
            self.stdout.write(f'create_admin: user "{username}" already exists, nothing to do.')
            return

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f'create_admin: admin user "{username}" created.'))
