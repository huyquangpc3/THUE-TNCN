import { Injectable } from '@angular/core';

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
  description: string;
}

export interface TaxCalculationResult {
  totalIncome: number;
  personalDeduction: number;
  dependentDeduction: number;
  totalDeduction: number;
  taxableIncome: number;
  taxBreakdown: { bracket: string; amount: number; rate: number; tax: number }[];
  totalTax: number;
  effectiveRate: number;
  monthlyTax: number;
  netIncome: number;
}

@Injectable({ providedIn: 'root' })
export class TaxService {
  // Biểu thuế lũy tiến từng phần (theo Luật Thuế TNCN Việt Nam hiện hành)
  private readonly TAX_BRACKETS: TaxBracket[] = [
    { min: 0,          max: 60_000_000,   rate: 0.05, description: 'Bậc 1: Đến 60 triệu' },
    { min: 60_000_000, max: 120_000_000,  rate: 0.10, description: 'Bậc 2: Trên 60 đến 120 triệu' },
    { min: 120_000_000,max: 216_000_000,  rate: 0.15, description: 'Bậc 3: Trên 120 đến 216 triệu' },
    { min: 216_000_000,max: 384_000_000,  rate: 0.20, description: 'Bậc 4: Trên 216 đến 384 triệu' },
    { min: 384_000_000,max: 624_000_000,  rate: 0.25, description: 'Bậc 5: Trên 384 đến 624 triệu' },
    { min: 624_000_000,max: 960_000_000,  rate: 0.30, description: 'Bậc 6: Trên 624 đến 960 triệu' },
    { min: 960_000_000,max: Infinity,     rate: 0.35, description: 'Bậc 7: Trên 960 triệu' },
  ];

  // Mức giảm trừ gia cảnh (năm 2020 trở đi theo Nghị quyết 954/2020/UBTVQH14)
  private readonly PERSONAL_DEDUCTION = 11_000_000 * 12; // 132 triệu/năm
  private readonly DEPENDENT_DEDUCTION = 4_400_000 * 12;  // 52.8 triệu/người/năm

  calculateTax(totalAnnualIncome: number, dependents: number): TaxCalculationResult {
    const personalDeduction = this.PERSONAL_DEDUCTION;
    const dependentDeduction = this.DEPENDENT_DEDUCTION * dependents;
    const totalDeduction = personalDeduction + dependentDeduction;
    const taxableIncome = Math.max(0, totalAnnualIncome - totalDeduction);

    let remainingIncome = taxableIncome;
    let totalTax = 0;
    const breakdown: { bracket: string; amount: number; rate: number; tax: number }[] = [];

    for (const bracket of this.TAX_BRACKETS) {
      if (remainingIncome <= 0) break;

      const bracketSize = bracket.max === Infinity
        ? remainingIncome
        : Math.min(remainingIncome, bracket.max - bracket.min);

      const taxForBracket = bracketSize * bracket.rate;
      totalTax += taxForBracket;

      if (bracketSize > 0) {
        breakdown.push({
          bracket: bracket.description,
          amount: bracketSize,
          rate: bracket.rate,
          tax: taxForBracket,
        });
      }

      remainingIncome -= bracketSize;
    }

    const effectiveRate = totalAnnualIncome > 0 ? (totalTax / totalAnnualIncome) : 0;
    const monthlyTax = totalTax / 12;
    const netIncome = totalAnnualIncome - totalTax;

    return {
      totalIncome: totalAnnualIncome,
      personalDeduction,
      dependentDeduction,
      totalDeduction,
      taxableIncome,
      taxBreakdown: breakdown,
      totalTax,
      effectiveRate,
      monthlyTax,
      netIncome,
    };
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  formatNumber(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(amount);
  }

  formatPercent(rate: number): string {
    return (rate * 100).toFixed(0) + '%';
  }
}
