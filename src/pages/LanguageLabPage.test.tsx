import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import LanguageLabPage from './LanguageLabPage';

function renderLab() {
  render(
    <MemoryRouter initialEntries={['/language-lab']}>
      <LanguageLabPage />
    </MemoryRouter>,
  );
}

function startPinyinRound() {
  fireEvent.click(screen.getByRole('button', { name: '开始今天的研究' }));
  expect(screen.getByRole('heading', { name: '本轮研究资料' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '我准备好了' }));
  expect(screen.getByRole('heading', { name: '把拼音和伙伴连起来' })).toBeInTheDocument();
}

function completeFirstPinyinRound() {
  for (const [pinyin, monster] of [
    ['pào pào zhū', '伙伴 泡泡猪'],
    ['huǒ yì lóng', '伙伴 火翼龙'],
    ['dòng yuán é', '伙伴 冻原鹅'],
  ]) {
    fireEvent.click(screen.getByRole('button', { name: new RegExp(pinyin) }));
    fireEvent.click(screen.getByRole('button', { name: monster }));
  }
  fireEvent.click(screen.getByRole('button', { name: '去做属性英语' }));
}

describe('语言研究所完整课程', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.setState({ currentTrainer: null });
  });

  it('完成一局 3 个拼音配对和 3 道英语题', () => {
    renderLab();
    expect(screen.getByText('18 个正式属性分 4 组学习')).toBeInTheDocument();
    startPinyinRound();
    completeFirstPinyinRound();

    expect(screen.getByRole('heading', { name: '选出属性的英文单词' })).toBeInTheDocument();
    for (const answer of ['Fire', 'Water', 'Grass']) {
      fireEvent.click(screen.getByRole('button', { name: answer }));
      fireEvent.click(screen.getByRole('button', { name: answer === 'Grass' ? '完成研究' : '下一题' }));
    }

    expect(screen.getByRole('heading', { name: '6 份资料都整理好了！' })).toBeInTheDocument();
    expect(screen.getByText('研究章 +1；创建训练师后还能领取精灵球。')).toBeInTheDocument();
  });

  it('英语选项只有英文文字，连续答错两次后直接教学', () => {
    renderLab();
    startPinyinRound();
    completeFirstPinyinRound();

    const fireButton = screen.getByRole('button', { name: 'Fire' });
    expect(fireButton).toHaveTextContent(/^Fire$/);
    expect(screen.queryByRole('button', { name: /火属性/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Water' }));
    expect(screen.getByText('再试一次：正确单词以“F”开头。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Grass' }));
    expect(screen.getByText(/就是火属性/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下一题' })).toBeInTheDocument();
  });

  it('可以查看 24 位伙伴的学习图鉴和家长概览', () => {
    renderLab();
    fireEvent.click(screen.getByRole('button', { name: '查看学习图鉴' }));
    expect(screen.getByRole('heading', { name: '学习图鉴' })).toBeInTheDocument();
    expect(screen.getAllByText('未学习').length).toBeGreaterThan(20);

    fireEvent.click(screen.getByRole('button', { name: '返回研究所' }));
    fireEvent.click(screen.getByRole('button', { name: '家长概览' }));
    expect(screen.getByRole('heading', { name: '家长概览' })).toBeInTheDocument();
    expect(screen.getByText('本周完成局数')).toBeInTheDocument();
  });

  it('可以从研究所返回游戏首页', () => {
    renderLab();
    expect(screen.getByRole('link', { name: '返回游戏首页' })).toHaveAttribute('href', '/');
  });
});
