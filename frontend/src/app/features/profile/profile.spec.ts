import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Profile } from './profile';
import { API_URL } from '../../core/api.config';

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let httpMock: HttpTestingController;

  const profileData = { id: 1, username: 'alice', email: 'a@example.com', is_staff: false, reviews: [] };

  beforeEach(async () => {
    localStorage.setItem('access_token', 'token');

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(`${API_URL}/profile/`).flush(profileData);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('loads the profile', () => {
    expect(component.profile()?.username).toBe('alice');
  });

  it('saves a new username and updates localStorage', () => {
    component.startEditing();
    component.editUsername = 'alice2';
    component.saveProfile();

    const req = httpMock.expectOne(`${API_URL}/profile/`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ username: 'alice2', email: 'a@example.com' });
    req.flush({ ...profileData, username: 'alice2' });

    expect(component.profile()?.username).toBe('alice2');
    expect(component.editing()).toBe(false);
    expect(localStorage.getItem('username')).toBe('alice2');
  });

  it('shows the backend error when the username is taken', () => {
    component.startEditing();
    component.editUsername = 'bob';
    component.saveProfile();

    httpMock
      .expectOne(`${API_URL}/profile/`)
      .flush({ username: ['A user with that username already exists.'] }, { status: 400, statusText: 'Bad Request' });

    expect(component.profileError()).toBe('A user with that username already exists.');
    expect(component.editing()).toBe(true);
  });

  it('does not send the password request when the new passwords differ', () => {
    component.togglePasswordForm();
    component.oldPassword = 'secret123';
    component.newPassword = 'newpass1';
    component.confirmPassword = 'other';
    component.changePassword();

    httpMock.expectNone(`${API_URL}/profile/password/`);
    expect(component.passwordError()).toBe('New passwords do not match.');
  });

  it('sends old and new password to the backend', () => {
    component.togglePasswordForm();
    component.oldPassword = 'secret123';
    component.newPassword = 'newpass1';
    component.confirmPassword = 'newpass1';
    component.changePassword();

    const req = httpMock.expectOne(`${API_URL}/profile/password/`);
    expect(req.request.body).toEqual({ old_password: 'secret123', new_password: 'newpass1' });
    req.flush({ message: 'Password changed successfully' });

    expect(component.passwordMessage()).toBe('Password changed.');
    expect(component.showPasswordForm()).toBe(false);
  });
});
