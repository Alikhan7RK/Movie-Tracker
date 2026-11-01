import { environment } from '../../environments/environment';

// Base URL of the Django REST API. Every service imports it from here.
// The value comes from src/environments: localhost for `ng serve`, the Render URL for `ng build`.
export const API_URL = environment.apiUrl;
