import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService, TaxReport } from '../../services/supabase.service';
import { TaxService, TaxCalculationResult } from '../../services/tax.service';
import { Subscription } from 'rxjs';
import { User } from '@supabase/supabase-js';

type Step = 'imap' | 'params' | 'result';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Auth
  currentUser: User | null = null;
  private sub?: Subscription;

  // Step
  step: Step = 'imap';

  // IMAP form
  gmailAddress = '';
  appPassword = '';
  year = new Date().getFullYear() - 1;
  fetchLoading = false;
  fetchError = '';
  emailCount = 0;

  // Params step
  totalIncome = 0;
  dependents = 0;
  customIncome = false;
  manualIncome = 0;

  // Result
  taxResult: TaxCalculationResult | null = null;
  savedReports: TaxReport[] = [];
  saveLoading = false;
  saveSuccess = false;
  saveError = '';

  // Sidebar
  sidebarOpen = false;
  reportsLoading = false;

  // Print
  currentDate = new Date().toLocaleDateString('vi-VN');

  constructor(
    private supabase: SupabaseService,
    private taxService: TaxService,
    private router: Router
  ) {}

  ngOnInit() {
    this.sub = this.supabase.user$.subscribe(u => {
      this.currentUser = u;
      if (!u) this.router.navigate(['/dang-nhap']);
    });
    this.loadSavedReports();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  get userEmail(): string {
    return this.currentUser?.email ?? '';
  }

  // ─────────────────────────────────────────────
  // STEP 1: FETCH EMAILS
  // ─────────────────────────────────────────────

  async fetchEmails() {
    this.fetchError = '';
    if (!this.gmailAddress || !this.appPassword) {
      this.fetchError = 'Vui lòng điền đầy đủ địa chỉ Gmail và Mật khẩu ứng dụng.';
      return;
    }
    if (this.year < 2010 || this.year > new Date().getFullYear()) {
      this.fetchError = 'Năm không hợp lệ.';
      return;
    }
    this.fetchLoading = true;
    try {
      const result = await this.supabase.fetchSalaryEmails(this.gmailAddress, this.appPassword, this.year);
      this.totalIncome = result.totalIncome;
      this.emailCount = result.emailCount;
      this.appPassword = ''; // clear from memory immediately
      this.step = 'params';
    } catch (err: any) {
      this.fetchError = err.message || 'Không thể kết nối đến hộp thư. Kiểm tra lại email/mật khẩu ứng dụng.';
    } finally {
      this.fetchLoading = false;
    }
  }

  // ─────────────────────────────────────────────
  // STEP 2: CALCULATE
  // ─────────────────────────────────────────────

  useCustomIncome(use: boolean) {
    this.customIncome = use;
    if (!use) this.manualIncome = 0;
  }

  calculateTax() {
    const income = this.customIncome ? this.manualIncome : this.totalIncome;
    this.taxResult = this.taxService.calculateTax(income, this.dependents);
    this.step = 'result';
    this.saveSuccess = false;
    this.saveError = '';
  }

  // ─────────────────────────────────────────────
  // STEP 3: RESULT / SAVE
  // ─────────────────────────────────────────────

  async saveReport() {
    if (!this.taxResult) return;
    this.saveLoading = true;
    this.saveError = '';
    try {
      await this.supabase.saveTaxReport({
        year: this.year,
        total_income: this.taxResult.totalIncome,
        dependents: this.dependents,
        taxable_income: this.taxResult.taxableIncome,
        tax_amount: this.taxResult.totalTax,
      });
      this.saveSuccess = true;
      await this.loadSavedReports();
    } catch (err: any) {
      this.saveError = err.message || 'Lưu báo cáo thất bại.';
    } finally {
      this.saveLoading = false;
    }
  }

  async loadSavedReports() {
    this.reportsLoading = true;
    try {
      this.savedReports = await this.supabase.getTaxReports();
    } catch (_) {}
    this.reportsLoading = false;
  }

  async deleteReport(id: string) {
    if (!confirm('Bạn có chắc muốn xóa báo cáo này?')) return;
    await this.supabase.deleteTaxReport(id);
    await this.loadSavedReports();
  }

  loadReport(report: TaxReport) {
    this.year = report.year;
    this.dependents = report.dependents;
    this.totalIncome = report.total_income;
    this.taxResult = this.taxService.calculateTax(report.total_income, report.dependents);
    this.step = 'result';
    this.sidebarOpen = false;
  }

  printReport() {
    window.print();
  }

  resetAll() {
    this.step = 'imap';
    this.gmailAddress = '';
    this.appPassword = '';
    this.totalIncome = 0;
    this.dependents = 0;
    this.taxResult = null;
    this.fetchError = '';
    this.saveSuccess = false;
    this.customIncome = false;
    this.manualIncome = 0;
  }

  async signOut() {
    await this.supabase.signOut();
    this.router.navigate(['/dang-nhap']);
  }

  // Formatter shortcuts
  fmt(n: number) { return this.taxService.formatCurrency(n); }
  fmtN(n: number) { return this.taxService.formatNumber(n); }
  fmtP(r: number) { return this.taxService.formatPercent(r); }

  Math = Math;
  decreaseDependents() { this.dependents = Math.max(0, this.dependents - 1); }
}
