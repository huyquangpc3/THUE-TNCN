import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { map, take } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private supabase: SupabaseService, private router: Router) {}

  canActivate() {
    return this.supabase.session$.pipe(
      take(1),
      map(session => {
        if (session) return true;
        this.router.navigate(['/dang-nhap']);
        return false;
      })
    );
  }
}
