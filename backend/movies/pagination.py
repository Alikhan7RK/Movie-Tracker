from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class MoviePagination(PageNumberPagination):
    # /api/movies/?page=2 -> movies 13..24
    page_size = 12

    def get_paginated_response(self, data):
        # Same as DRF's default response, plus total_pages so the frontend can draw page buttons
        return Response({
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
        })
