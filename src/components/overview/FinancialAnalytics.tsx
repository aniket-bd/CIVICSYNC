import React, { useState, useMemo } from 'react';
import { Project, ProjectType } from '../../types/project';
import { formatINR } from '../../utils/formatters';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid
} from 'recharts';
import { 
  TrendingDown, 
  TrendingUp,
  ShieldCheck, 
  Sparkles
} from 'lucide-react';

interface FinancialAnalyticsProps {
  projects: Project[];
}

const F = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

export const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({ projects }) => {
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      return p.startDate.startsWith(selectedYear) || p.expectedCompletionDate.startsWith(selectedYear);
    });
  }, [projects, selectedYear]);

  const totalBudget = filteredProjects.reduce((acc, p) => acc + p.budget, 0);
  const potentialSavings = filteredProjects.reduce((acc, p) => acc + p.potentialSaving, 0);

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    return months.map((month, idx) => {
      const monthWeight = [0.04, 0.05, 0.08, 0.09, 0.07, 0.06, 0.08, 0.12, 0.16, 0.14][idx];
      const monthSavings = Math.round(potentialSavings * monthWeight);
      return {
        month,
        'Savings (Cr)': Number((monthSavings / 10000000).toFixed(2))
      };
    });
  }, [potentialSavings]);

  return (
    <div className="glass-card" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      gap: '12px',
      fontFamily: F
    }}>
      {/* Upper Tracker & Action Icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-tracker">FINANCIAL SAVINGS</div>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'rgba(0, 113, 227, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <TrendingDown size={15} color="#0071e3" />
        </div>
      </div>

      {/* Large Apple Metric */}
      <div>
        <div style={{ fontSize: '32px', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.03em', fontFamily: F }}>
          {formatINR(potentialSavings)}
        </div>
        <div style={{ fontSize: '12.5px', color: '#86868b', marginTop: '2px', fontWeight: 500 }}>
          modeled lifecycle savings across portfolio
        </div>
      </div>

      {/* Blue Bar Chart + Percentage Badge (Matching Image 1) */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flex: 1, marginTop: '8px' }}>
        <div style={{ flex: 1, height: '100px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <Bar dataKey="Savings (Cr)" fill="#0071e3" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0071e3', whiteSpace: 'nowrap', marginBottom: '8px' }}>
          +12.8% vs FY25
        </div>
      </div>
    </div>
  );
};
