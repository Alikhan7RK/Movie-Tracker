import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { MovieForm } from './movie-form';

describe('MovieForm', () => {
  let component: MovieForm;
  let fixture: ComponentFixture<MovieForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovieForm],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MovieForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should report required fields when empty', () => {
    expect(component.errors.title).toBeTruthy();
    expect(component.errors.description).toBeTruthy();
    expect(component.errors.year).toBeTruthy();
  });
});
