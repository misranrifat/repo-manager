import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Repository, VisibilityFilter } from '../models/repository.model';

@Injectable({
  providedIn: 'root'
})
export class GithubService {
  private apiUrl = 'http://localhost:8081/api';

  constructor(private http: HttpClient) {}

  getRepositories(visibility?: VisibilityFilter, search?: string): Observable<Repository[]> {
    let params = new HttpParams();
    
    if (visibility && visibility !== 'all') {
      params = params.set('visibility', visibility);
    }
    
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<Repository[]>(`${this.apiUrl}/repositories`, { params });
  }

  toggleRepositoryVisibility(repoId: number, makePrivate: boolean): Observable<Repository> {
    return this.http.patch<Repository>(
      `${this.apiUrl}/repositories/${repoId}/visibility`,
      { private: makePrivate }
    );
  }
}
