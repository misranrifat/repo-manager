import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export interface AuthStatus {
  authenticated: boolean;
  user?: string;
  message: string;
}

interface CachedAuth {
  status: AuthStatus;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8081/api';
  private authStatusSubject = new BehaviorSubject<AuthStatus | null>(null);
  public authStatus$ = this.authStatusSubject.asObservable();
  
  // Cache configuration
  private readonly CACHE_KEY = 'github_auth_cache';
  private readonly CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
  private cachedAuth: CachedAuth | null = null;

  constructor(private http: HttpClient) {
    this.loadCachedAuth();
  }

  checkAuthStatus(): Observable<AuthStatus> {
    // Check if we have valid cached authentication
    const cached = this.getCachedAuthStatus();
    if (cached) {
      console.log('Using cached GitHub authentication');
      this.authStatusSubject.next(cached);
      return of(cached);
    }

    console.log('Fetching fresh GitHub authentication status');
    return this.http.get<AuthStatus>(`${this.apiUrl}/auth/status`).pipe(
      tap(status => {
        this.authStatusSubject.next(status);
        if (status.authenticated) {
          this.setCachedAuth(status);
        }
      }),
      catchError(error => {
        console.error('Auth check failed:', error);
        this.clearCachedAuth();
        const failedStatus: AuthStatus = {
          authenticated: false,
          message: 'Authentication failed'
        };
        this.authStatusSubject.next(failedStatus);
        return of(failedStatus);
      })
    );
  }

  getAuthStatus(): AuthStatus | null {
    return this.authStatusSubject.value;
  }

  private loadCachedAuth(): void {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        this.cachedAuth = JSON.parse(cached);
        
        // Check if cache is still valid
        const validCached = this.getCachedAuthStatus();
        if (validCached) {
          this.authStatusSubject.next(validCached);
        }
      }
    } catch (error) {
      console.warn('Failed to load cached auth:', error);
      this.clearCachedAuth();
    }
  }

  private getCachedAuthStatus(): AuthStatus | null {
    if (!this.cachedAuth) {
      return null;
    }

    // Check if cache has expired
    if (Date.now() > this.cachedAuth.expiresAt) {
      console.log('GitHub auth cache expired, clearing...');
      this.clearCachedAuth();
      return null;
    }

    return this.cachedAuth.status;
  }

  private setCachedAuth(status: AuthStatus): void {
    this.cachedAuth = {
      status,
      expiresAt: Date.now() + this.CACHE_DURATION
    };

    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.cachedAuth));
      console.log(`GitHub auth cached for ${this.CACHE_DURATION / (60 * 60 * 1000)} hours`);
    } catch (error) {
      console.warn('Failed to cache auth:', error);
    }
  }

  private clearCachedAuth(): void {
    this.cachedAuth = null;
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear cached auth:', error);
    }
  }

  // Force refresh authentication (bypasses cache)
  forceRefreshAuth(): Observable<AuthStatus> {
    console.log('Force refreshing GitHub authentication');
    this.clearCachedAuth();
    return this.checkAuthStatus();
  }

  // Clear all auth data (logout equivalent)
  clearAuth(): void {
    this.clearCachedAuth();
    this.authStatusSubject.next({
      authenticated: false,
      message: 'Signed out'
    });
  }
}
