import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header';
import { RepositoryListComponent } from './components/repository-list/repository-list';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    RepositoryListComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit {
  
  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.checkAuthStatus().subscribe();
  }
}
