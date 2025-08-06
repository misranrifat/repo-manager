import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, AuthStatus } from '../../services/auth';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class HeaderComponent implements OnInit {
  authStatus$!: Observable<AuthStatus | null>;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authStatus$ = this.authService.authStatus$;
  }
}
