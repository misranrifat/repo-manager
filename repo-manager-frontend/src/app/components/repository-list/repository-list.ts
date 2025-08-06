import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GithubService } from '../../services/github';
import { AuthService } from '../../services/auth';
import { Repository, VisibilityFilter } from '../../models/repository.model';
import { catchError, debounceTime, distinctUntilChanged, Subject, of } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

export interface SortConfig {
  field: keyof Repository;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-repository-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './repository-list.html',
  styleUrl: './repository-list.scss'
})
export class RepositoryListComponent implements OnInit, OnDestroy {
  repositories: Repository[] = [];
  filteredRepositories: Repository[] = [];
  paginatedRepositories: Repository[] = [];
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  updatingRepoIds: Set<number> = new Set();
  
  searchTerm = '';
  visibilityFilter: VisibilityFilter = 'all';
  sortConfig: SortConfig = { field: 'name', direction: 'asc' };
  
  // Pagination
  currentPage = 1;
  pageSize = 50;
  pageSizeOptions = [25, 50, 100, 200];
  totalPages = 1;
  
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private githubService: GithubService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRepositories();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.searchTerm = searchTerm;
      this.loadRepositories();
    });
  }

  loadRepositories(): void {
    this.loading = true;
    this.error = null;
    this.successMessage = null;
    
    this.githubService.getRepositories(this.visibilityFilter, this.searchTerm)
      .pipe(
        catchError(error => {
          this.error = 'Failed to load repositories. Please check your connection and try again.';
          return of([]);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(repos => {
        this.repositories = repos;
        this.applySorting();
        this.loading = false;
      });
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  onVisibilityFilterChange(filter: VisibilityFilter): void {
    this.visibilityFilter = filter;
    this.loadRepositories();
  }

  toggleRepositoryVisibility(repo: Repository): void {
    const makePrivate = !repo.isPrivate;
    
    console.log(`Toggling repository "${repo.name}" from ${repo.isPrivate ? 'private' : 'public'} to ${makePrivate ? 'private' : 'public'}`);
    
    // Add to updating set to show loading state
    this.updatingRepoIds.add(repo.id);
    this.error = null;
    this.successMessage = null;
    
    this.githubService.toggleRepositoryVisibility(repo.id, makePrivate)
      .pipe(
        catchError(error => {
          console.error('Error toggling repository visibility:', error);
          this.error = `Failed to update "${repo.name}" visibility: ${error.message}`;
          this.updatingRepoIds.delete(repo.id);
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(updatedRepo => {
        console.log('Backend response:', updatedRepo);
        this.updatingRepoIds.delete(repo.id);
        
        // Find the repository index
        const index = this.repositories.findIndex(r => r.id === repo.id);
        console.log(`Repository index: ${index}, Original isPrivate: ${repo.isPrivate}, Target makePrivate: ${makePrivate}`);
        
        if (index !== -1) {
          if (updatedRepo && typeof updatedRepo === 'object') {
            // Use backend response
            console.log(`Using backend response. Backend says isPrivate: ${updatedRepo.isPrivate}`);
            this.repositories[index] = { ...updatedRepo };
          } else {
            // Fallback to manual update
            console.log('Using fallback manual update');
            this.repositories[index] = { ...this.repositories[index], isPrivate: makePrivate };
          }
          
          // Force immediate re-render
          this.repositories = [...this.repositories];
          this.applySorting();
          this.cdr.markForCheck();
          this.cdr.detectChanges();
          
          console.log(`Final repository state - isPrivate: ${this.repositories[index].isPrivate}`);
          
          // Show success message
          this.successMessage = `Repository "${repo.name}" is now ${this.repositories[index].isPrivate ? 'private' : 'public'}`;
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = null;
            this.cdr.detectChanges();
          }, 3000);
        } else {
          console.error('Repository not found in array');
        }
      });
  }

  onSort(field: keyof Repository): void {
    if (this.sortConfig.field === field) {
      // Toggle direction if same field
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new field with ascending direction
      this.sortConfig = { field, direction: 'asc' };
    }
    this.applySorting();
  }

  private applySorting(): void {
    const sorted = [...this.repositories].sort((a, b) => {
      const aValue = a[this.sortConfig.field];
      const bValue = b[this.sortConfig.field];
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      let comparison = 0;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        comparison = aValue === bValue ? 0 : aValue ? 1 : -1;
      } else {
        comparison = String(aValue).toLowerCase().localeCompare(String(bValue).toLowerCase());
      }
      
      return this.sortConfig.direction === 'asc' ? comparison : -comparison;
    });
    
    this.filteredRepositories = sorted;
    this.updatePagination();
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredRepositories.length / this.pageSize);
    
    // Reset to first page if current page is out of bounds
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
    
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedRepositories = this.filteredRepositories.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  onPageSizeChange(newPageSize: number): void {
    this.pageSize = newPageSize;
    this.currentPage = 1;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  getSortIcon(field: keyof Repository): string {
    if (this.sortConfig.field !== field) return '';
    return this.sortConfig.direction === 'asc' ? '↑' : '↓';
  }

  isUpdating(repoId: number): boolean {
    return this.updatingRepoIds.has(repoId);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  forceRefresh(): void {
    console.log('Force refreshing repositories and clearing auth cache');
    this.authService.forceRefreshAuth().subscribe(() => {
      this.loadRepositories();
    });
  }

  getPublicCount(): number {
    return this.repositories.filter(repo => !repo.isPrivate).length;
  }

  getPrivateCount(): number {
    return this.repositories.filter(repo => repo.isPrivate).length;
  }

  // Make Math available in template
  Math = Math;
}
