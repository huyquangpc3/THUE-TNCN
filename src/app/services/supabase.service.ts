import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

export interface TaxReport {
  id?: string;
  user_id?: string;
  year: number;
  total_income: number;
  dependents: number;
  taxable_income: number;
  tax_amount: number;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;
  private _session = new BehaviorSubject<Session | null>(null);
  private _user = new BehaviorSubject<User | null>(null);

  session$: Observable<Session | null> = this._session.asObservable();
  user$: Observable<User | null> = this._user.asObservable();

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);

    // Init session
    this.supabase.auth.getSession().then(({ data }) => {
      this._session.next(data.session);
      this._user.next(data.session?.user ?? null);
    });

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this._session.next(session);
      this._user.next(session?.user ?? null);
    });
  }

  get currentUser(): User | null {
    return this._user.getValue();
  }

  get currentSession(): Session | null {
    return this._session.getValue();
  }

  // ──────────────── AUTH ────────────────

  async signUp(email: string, password: string) {
    return this.supabase.auth.signUp({ email, password });
  }

  async signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return this.supabase.auth.signOut();
  }

  async resetPassword(email: string) {
    return this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
  }

  // ──────────────── EMAIL READING (IMAP via Edge Function) ────────────────

  async fetchSalaryEmails(gmailAddress: string, appPassword: string, year: number): Promise<{ totalIncome: number, emailCount: number }> {
    const session = this._session.getValue();
    if (!session) throw new Error('Bạn chưa đăng nhập.');

    const { data, error } = await this.supabase.functions.invoke('fetch-salary-emails', {
      body: { email: gmailAddress, appPassword, year },
    });

    if (error) {
      // Supabase FunctionsHttpError thường chứa chi tiết lỗi trong body
      // @ts-ignore
      const detail = await error.context?.json?.() || {};
      throw new Error(detail.error || error.message || 'Lỗi không xác định từ máy chủ.');
    }

    if (data?.error) throw new Error(data.error);
    return data;
  }

  // ──────────────── TAX REPORTS (CRUD) ────────────────

  async saveTaxReport(report: TaxReport) {
    const user = this._user.getValue();
    if (!user) throw new Error('Bạn chưa đăng nhập.');

    return this.supabase
      .from('tax_reports')
      .insert({ ...report, user_id: user.id });
  }

  async getTaxReports(): Promise<TaxReport[]> {
    const { data, error } = await this.supabase
      .from('tax_reports')
      .select('*')
      .order('year', { ascending: false });

    if (error) throw error;
    return data as TaxReport[];
  }

  async deleteTaxReport(id: string) {
    return this.supabase.from('tax_reports').delete().eq('id', id);
  }
}
