import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Login } from './login';
import { API_URL } from '../../../core/api.config';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => httpMock.verify());

  it('asks to fill in empty fields without calling the API', () => {
    component.onSubmit();

    expect(component.error()).toBe('Please fill in all fields.');
  });

  it('shows an error for a wrong password', () => {
    component.username = 'alice';
    component.password = 'wrong';
    component.onSubmit();
    expect(component.loading()).toBe(true);

    httpMock.expectOne(`${API_URL}/login/`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(component.error()).toBe('Invalid username or password.');
    expect(component.loading()).toBe(false);
  });

  it('shows a throttle message instead of "wrong password" for 429', () => {
    component.username = 'alice';
    component.password = 'secret123';
    component.onSubmit();

    httpMock
      .expectOne(`${API_URL}/login/`)
      .flush({ detail: 'Request was throttled. Expected available in 60 seconds.' }, { status: 429, statusText: 'Too Many Requests' });

    expect(component.error()).toBe('Too many login attempts. Please wait a minute and try again.');
    expect(component.loading()).toBe(false);
  });
});
