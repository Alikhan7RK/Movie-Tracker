import { Pipe, PipeTransform } from '@angular/core';

// Shows a movie rating (out of 10) the same way everywhere: "★ 8.8/10"
@Pipe({
  name: 'rating',
  standalone: true
})
export class RatingPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    const rating = Number(value);
    if (value === null || value === undefined || isNaN(rating)) {
      return '★ –/10';
    }
    return `★ ${rating.toFixed(1)}/10`;
  }
}
