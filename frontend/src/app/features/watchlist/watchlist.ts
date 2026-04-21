import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Navbar } from '../../shared/navbar/navbar';
import { WatchlistService } from '../../services/watchlist.service';
import { WatchlistItem } from '../../models/watchlist.model';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './watchlist.html',
  styleUrl: './watchlist.css'
})
export class Watchlist {
  items: WatchlistItem[] = [];
  loading = true;
  error = '';

  constructor(
    private watchlistService: WatchlistService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.url.subscribe(() => {
      this.loadWatchlist();
    });
  }

  loadWatchlist(): void {
    this.loading = true;
    this.error = '';

    this.watchlistService.getWatchlist().subscribe({
      next: (data) => {
        this.items = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load watchlist. Make sure you are logged in.';
        this.loading = false;
      }
    });
  }
}