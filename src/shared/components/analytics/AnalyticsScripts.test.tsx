import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnalyticsScripts from './AnalyticsScripts';
import { useUIStore } from '../../store/uiStore';

// Mock Next/Vercel components to verify their presence in DOM
vi.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => <div data-testid="speed-insights" />,
  __esModule: true,
}));
vi.mock('@vercel/analytics/react', () => ({
  Analytics: () => <div data-testid="vercel-analytics" />,
  __esModule: true,
}));
vi.mock('next/script', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ id }: any) => <div data-testid={`next-script-${id || 'cloudflare'}`} />,
  __esModule: true,
}));

describe('AnalyticsScripts 分析脚本组件 (条件渲染)', () => {
  beforeEach(() => {
    // 每次测试前重置 Store 状态
    useUIStore.setState({
      isAdmin: false,
      adminStatusChecked: false,
    });
  });

  it('如果 [身份核实尚未完成]，则由于竞态防护，不应渲染任何脚本', () => {
    const { queryByTestId } = render(<AnalyticsScripts />);

    expect(queryByTestId('speed-insights')).not.toBeInTheDocument();
    expect(queryByTestId('vercel-analytics')).not.toBeInTheDocument();
    expect(queryByTestId('next-script-microsoft-clarity')).not.toBeInTheDocument();
  });

  it('如果 [已核实为管理员]，则不应渲染任何分析脚本', () => {
    useUIStore.setState({
      isAdmin: true,
      adminStatusChecked: true,
    });

    const { queryByTestId } = render(<AnalyticsScripts />);

    expect(queryByTestId('speed-insights')).not.toBeInTheDocument();
    expect(queryByTestId('vercel-analytics')).not.toBeInTheDocument();
  });

  it('如果 [已核实非管理员]，则应正常渲染所有分析脚本', () => {
    useUIStore.setState({
      isAdmin: false,
      adminStatusChecked: true,
    });

    const { getByTestId } = render(<AnalyticsScripts />);

    expect(getByTestId('speed-insights')).toBeInTheDocument();
    expect(getByTestId('vercel-analytics')).toBeInTheDocument();
    expect(getByTestId('next-script-microsoft-clarity')).toBeInTheDocument();
    expect(getByTestId('next-script-cloudflare')).toBeInTheDocument();
  });
});
