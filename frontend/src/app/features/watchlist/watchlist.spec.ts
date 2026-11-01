import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Watchlist } from './watchlist';

describe('Watchlist', () => {
  let component: Watchlist;
  let fixture: ComponentFixture<Watchlist>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Watchlist],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Watchlist);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
