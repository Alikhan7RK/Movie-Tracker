import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Register } from './register';
import { API_URL } from '../../../core/api.config';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => httpMock.verify());

  it('requires username and password', () => {
    component.onSubmit();

    expect(component.error()).toBe('Username and password are required.');
  });

  it('shows the backend message when the username is taken', () => {
    component.username = 'alice';
    component.password = 'secret123';
    component.onSubmit();

    httpMock
      .expectOne(`${API_URL}/register/`)
      .flush({ username: ['Username already exists.'] }, { status: 400, statusText: 'Bad Request' });

    expect(component.error()).toBe('Username already exists.');
    expect(component.loading()).toBe(false);
  });

  it('shows the backend message when the password is too weak', () => {
    component.username = 'bob';
    component.password = 'password';
    component.onSubmit();

    httpMock
      .expectOne(`${API_URL}/register/`)
      .flush({ password: ['This password is too common.'] }, { status: 400, statusText: 'Bad Request' });

    expect(component.error()).toBe('This password is too common.');
    expect(component.loading()).toBe(false);
  });

  it('shows a throttle message for 429', () => {
    component.username = 'bob';
    component.password = 'Popcorn-Reel-42';
    component.onSubmit();

    httpMock
      .expectOne(`${API_URL}/register/`)
      .flush({ detail: 'Request was throttled. Expected available in 3600 seconds.' }, { status: 429, statusText: 'Too Many Requests' });

    expect(component.error()).toBe('Too many sign-up attempts. Please try again later.');
    expect(component.loading()).toBe(false);
  });
});
