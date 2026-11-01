import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../shared/navbar/navbar';
import { RatingPipe } from '../../shared/rating.pipe';
import { WatchlistService } from '../../services/watchlist.service';
import { WATCHLIST_STATUSES, WatchlistItem, WatchlistStatus } from '../../models/watchlist.model';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, RouterLink, Navbar, RatingPipe],
  templateUrl: './watchlist.html',
  styleUrl: './watchlist.css'
})
export class Watchlist {
  statuses = WATCHLIST_STATUSES;

  items = signal<WatchlistItem[]>([]);
  loading = signal(true);
  error = signal('');
  actionError = signal('');

  // Selected filter tab: 'all' or one of the statuses
  activeFilter = signal<'all' | WatchlistStatus>('all');

  // Recalculated automatically when items or activeFilter change
  filteredItems = computed(() => {
    const filter = this.activeFilter();
    return filter === 'all' ? this.items() : this.items().filter(item => item.status === filter);
  });

  constructor(private watchlistService: WatchlistService) {}

  ngOnInit(): void {
    this.loadWatchlist();
  }

  loadWatchlist(): void {
    this.loading.set(true);
    this.error.set('');

    this.watchlistService.getWatchlist().subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load watchlist. Make sure you are logged in.');
        this.loading.set(false);
      }
    });
  }

  countByStatus(status: 'all' | WatchlistStatus): number {
    return status === 'all' ? this.items().length : this.items().filter(i => i.status === status).length;
  }

  changeStatus(item: WatchlistItem, select: HTMLSelectElement): void {
    this.actionError.set('');

    this.watchlistService.updateStatus(item.id, select.value as WatchlistStatus).subscribe({
      next: (updated) => {
        // Replace the old item with the updated one from the server
        this.items.update(items => items.map(i => (i.id === updated.id ? updated : i)));
      },
      error: () => {
        this.actionError.set(`Failed to change status of "${item.movie_title}".`);
        // Put the dropdown back to the status that is really saved
        select.value = item.status;
      }
    });
  }

  remove(item: WatchlistItem): void {
    this.actionError.set('');

    this.watchlistService.removeFromWatchlist(item.id).subscribe({
      next: () => {
        this.items.update(items => items.filter(i => i.id !== item.id));
      },
      error: () => {
        this.actionError.set(`Failed to remove "${item.movie_title}".`);
      }
    });
  }
}
