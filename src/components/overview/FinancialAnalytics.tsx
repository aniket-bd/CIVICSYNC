import React, { useState, useMemo } from 'react';
import { Project, ProjectType } from '../../types/project';
import { formatINR } from '../../utils/formatters';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  CartesianGrid
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  ShieldCheck, 
  Percent,
  Sparkles
} from 'lucide-react';

interface FinancialAnalyticsProps {
  projects: Project[];
}

const F = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

export const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({ projects }) => {
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedType, setSelectedType] = useState<ProjectType | 'All'>('All');

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchYear = p.startDate.startsWith(selectedYear) || p.expectedCompletionDate.startsWith(selectedYear);
      const matchType = selectedType === 'All' || p.type === selectedType;
      return matchYear && matchType;
    });
  }, [projects, selectedYear, selectedType]);

  const totalBudget = filteredProjects.reduce((acc, p) => acc + p.budget, 0);
  const avoidableLossEstimated = Math.round(totalBudget * 0.125);
  const potentialSavings = filteredProjects.reduce((acc, p) => acc + p.potentialSaving, 0);
  const residualLoss = Math.max(0, avoidableLossEstimated - potentialSavings);

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, idx) => {
      const monthWeight = [0.04, 0.05, 0.08, 0.09, 0.07, 0.06, 0.08, 0.12, 0.16, 0.14, 0.07, 0.04][idx];
      const monthBudget = Math.round(totalBudget * monthWeight);
      const monthAvoidableLoss = Math.round(avoidableLossEstimated * monthWeight);
      const monthSavings = Math.round(potentialSavings * monthWeight);
      const monthResidualLoss = Math.max(0, monthAvoidableLoss - monthSavings);

      return {
        month,
        'Budget (Cr)': Number((monthBudget / 10000000).toFixed(2)),
        'Avoidable Loss': Number((monthAvoidableLoss / 10000000).toFixed(2)),
        'CivicSync Savings': Number((monthSavings / 10000000).toFixed(2)),
        'Residual Loss': Number((monthResidualLoss / 10000000).toFixed(2))
      };
    });
  }, [totalBudget, avoidableLossEstimated, potentialSavings]);

  return (
    <div className="glass-card" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      border: '1px solid rgba(255, 149, 0, 0.35)',
      boxShadow: '0 12px 36px -4px rgba(255, 149, 0, 0.12), 0 4px 16px -2px rgba(15, 23, 42, 0.06)',
      fontFamily: F
    }}>
      {/* Header with Frosted Orange Glass */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid rgba(255, 149, 0, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        background: 'linear-gradient(135deg, rgba(255, 159, 10, 0.14) 0%, rgba(255, 107, 0, 0.06) 100%)',
        backdropFilter: 'blur(16px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={16} color="#ff6b00" />
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
            Financial Loss & Municipal Savings Analytics
          </h3>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(255, 149, 0, 0.3)',
              color: '#ff6b00',
              fontSize: '11.5px',
              fontWeight: 600,
              borderRadius: '8px',
              padding: '4px 8px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="2026">Year 2026</option>
            <option value="2025">Year 2025</option>
            <option value="2027">Year 2027</option>
          </select>

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value as any)}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(255, 149, 0, 0.3)',
              color: '#ff6b00',
              fontSize: '11.5px',
              fontWeight: 600,
              borderRadius: '8px',
              padding: '4px 8px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Sectors</option>
            {['Water', 'Drainage', 'Road', 'Telecom', 'Electrical', 'Sewerage', 'Bridge'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* KPI Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {/* Total Budget */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(255, 149, 0, 0.25)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 2px 8px rgba(255, 149, 0, 0.04)'
          }}>
            <div style={{ fontSize: '11px', color: '#86868b', fontWeight: 600 }}>Total Budget</div>
            <div style={{ fontSize: '15.5px', fontWeight: 700, color: '#1d1d1f', marginTop: '3px', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
              {formatINR(totalBudget)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#ff6b00', marginTop: '2px', fontWeight: 600 }}>
              {filteredProjects.length} Projects in Scope
            </div>
          </div>

          {/* Avoidable Loss */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 242, 240, 0.9) 0%, rgba(255, 237, 213, 0.85) 100%)',
            border: '1px solid rgba(255, 107, 0, 0.35)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 2px 8px rgba(255, 107, 0, 0.06)'
          }}>
            <div style={{ fontSize: '11px', color: '#ff6b00', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <TrendingDown size={13} color="#ff6b00" />
              <span>Est. Avoidable Loss</span>
            </div>
            <div style={{ fontSize: '15.5px', fontWeight: 700, color: '#c2411b', marginTop: '3px', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
              {formatINR(avoidableLossEstimated)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#c2411b', marginTop: '2px', fontWeight: 500 }}>
              ~12.5% loss benchmark
            </div>
          </div>

          {/* Potential Savings */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 247, 237, 0.9) 0%, rgba(254, 243, 199, 0.85) 100%)',
            border: '1px solid rgba(255, 149, 0, 0.4)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 2px 8px rgba(255, 149, 0, 0.08)'
          }}>
            <div style={{ fontSize: '11px', color: '#ff6b00', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
              <Coins size={13} color="#ff6b00" />
              <span>CivicSync Savings</span>
            </div>
            <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#ff6b00', marginTop: '3px', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
              {formatINR(potentialSavings)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#1a7f37', marginTop: '2px', fontWeight: 600 }}>
              ~{totalBudget > 0 ? ((potentialSavings / totalBudget) * 100).toFixed(1) : 0}% Coordinated
            </div>
          </div>

          {/* Residual Loss */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(255, 149, 0, 0.25)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 2px 8px rgba(255, 149, 0, 0.04)'
          }}>
            <div style={{ fontSize: '11px', color: '#86868b', fontWeight: 600 }}>Residual Loss</div>
            <div style={{ fontSize: '15.5px', fontWeight: 700, color: '#515154', marginTop: '3px', fontFamily: 'SF Mono, ui-monospace, monospace' }}>
              {formatINR(residualLoss)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#1a7f37', marginTop: '2px', fontWeight: 600 }}>
              ↓ Net Loss Mitigated
            </div>
          </div>
        </div>

        {/* Charts Container */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 149, 0, 0.22)',
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 4px 16px rgba(255, 149, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d1d1f' }}>
              Monthly Expenditure vs. Coordinated Savings Projection (₹ in Crores)
            </div>
            <div style={{ fontSize: '11px', color: '#ff6b00', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> Live Fiscal Model
            </div>
          </div>

          <div style={{ width: '100%', height: '170px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 149, 0, 0.12)" />
                <XAxis dataKey="month" tick={{ fill: '#86868b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#86868b', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderColor: '#ff9f0a',
                    borderRadius: '10px',
                    fontSize: '11.5px',
                    boxShadow: '0 8px 24px rgba(255, 149, 0, 0.2)'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10.5px', paddingTop: '4px' }} />
                <Bar dataKey="Budget (Cr)" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Avoidable Loss" fill="#fb923c" radius={[3, 3, 0, 0]} />
                <Bar dataKey="CivicSync Savings" fill="#ff6b00" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Explainability Footer Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 247, 237, 0.85) 0%, rgba(255, 237, 213, 0.75) 100%)',
          border: '1px solid rgba(255, 149, 0, 0.3)',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '11.5px',
          color: '#515154',
          lineHeight: 1.45,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <ShieldCheck size={16} color="#ff6b00" style={{ flexShrink: 0 }} />
          <span>
            <strong style={{ color: '#ff6b00' }}>Deterministic Loss Metric:</strong> 12.5% avoidable municipal loss benchmark is calculated from historical trenching rework, traffic diversion delays, and uncoordinated contractor cuts.
          </span>
        </div>
      </div>
    </div>
  );
};
