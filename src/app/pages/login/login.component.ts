import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

type Mode = 'login' | 'register' | 'forgot';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  mode: Mode = 'login';
  year = new Date().getFullYear();
  email = '';
  password = '';
  confirmPassword = '';
  loading = false;
  error = '';
  successMessage = '';
  showPassword = false;

  constructor(private supabase: SupabaseService, private router: Router) {}

  setMode(mode: Mode) {
    this.mode = mode;
    this.error = '';
    this.successMessage = '';
    this.password = '';
    this.confirmPassword = '';
  }

  async submit() {
    this.error = '';
    this.successMessage = '';

    if (!this.email || (!this.password && this.mode !== 'forgot')) {
      this.error = 'Vui lòng điền đầy đủ thông tin.';
      return;
    }

    if (this.mode === 'register' && this.password !== this.confirmPassword) {
      this.error = 'Mật khẩu xác nhận không khớp.';
      return;
    }

    if (this.password.length < 6 && this.mode !== 'forgot') {
      this.error = 'Mật khẩu phải có ít nhất 6 ký tự.';
      return;
    }

    this.loading = true;
    try {
      if (this.mode === 'login') {
        const { error } = await this.supabase.signIn(this.email, this.password);
        if (error) throw error;
        this.router.navigate(['/dashboard']);
      } else if (this.mode === 'register') {
        const { error } = await this.supabase.signUp(this.email, this.password);
        if (error) throw error;
        this.successMessage = 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản (check thư mục spam nếu không thấy).';
        this.mode = 'login';
      } else {
        const { error } = await this.supabase.resetPassword(this.email);
        if (error) throw error;
        this.successMessage = 'Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn.';
      }
    } catch (err: any) {
      const msgMap: Record<string, string> = {
        'Invalid login credentials': 'Email hoặc mật khẩu không đúng.',
        'Email not confirmed': 'Tài khoản chưa xác nhận email. Vui lòng kiểm tra hộp thư.',
        'User already registered': 'Email này đã được đăng ký.',
      };
      this.error = msgMap[err.message] || err.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
    } finally {
      this.loading = false;
    }
  }
}
