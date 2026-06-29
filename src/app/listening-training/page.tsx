'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Button,
  Select,
  Space,
  Typography,
  Row,
  Col,
  Badge,
  Spin,
  Progress,
  Modal,
  Switch,
  InputNumber,
  Form,
  Divider,
  List,
  Checkbox,
  Tag,
  Alert,
  Tabs,
} from 'antd';
import {
  SoundOutlined,
  ReloadOutlined,
  BookOutlined,
  CheckCircleOutlined,
  QuestionCircleOutlined,
  EyeOutlined,
  SettingOutlined,
  CalendarOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { App } from 'antd';
import ActionButton from '@/app/tags/components/ActionButton';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

interface Wordbook {
  id: string;
  name: string;
  total_items: number;
  source: string;
  created_at: string;
}

interface PracticeItem {
  id: string;
  content: string;
  status: string;
  review_count: number;
  wordbook_id: string;
  wordbook_name: string;
  item_type: 'review' | 'new';
}

interface VocabularyItem {
  id: string;
  content: string;
  status: string;
  review_count: number;
  last_review_at: string | null;
}

interface UserSettings {
  daily_limit: number;
  item_order: 'sequential' | 'random';
  auto_play: boolean;
  review_unknown_first: boolean;
  play_count: number;
  play_interval: number;
}

export default function ListeningTrainingPage() {
  const { message: messageApi } = App.useApp();
  const [activeTab, setActiveTab] = useState<'practice' | 'vocabulary' | 'wordbooks' | 'schedule' | 'settings'>('practice');
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([]);
  const [selectedWordbook, setSelectedWordbook] = useState<string>('');
  const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [completedToday, setCompletedToday] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(20);
  const [pendingCount, setPendingCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [isExtraMode, setIsExtraMode] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioCache, setAudioCache] = useState<Record<string, string>>({});
  const isPlayingRef = useRef(false);

  // 词本相关
  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItem[]>([]);
  const [vocabularyStatus, setVocabularyStatus] = useState<string>('all');
  const [vocabularyCounts, setVocabularyCounts] = useState({
    all: 0,
    unknown: 0,
    known: 0,
    familiar: 0,
  });
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VocabularyItem | null>(null);

  // 词书管理相关
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editWordbookName, setEditWordbookName] = useState('');
  const [editWordbookItems, setEditWordbookItems] = useState('');

  // 用户设置
  const [userSettings, setUserSettings] = useState<UserSettings>({
    daily_limit: 20,
    item_order: 'sequential',
    auto_play: true,
    review_unknown_first: true,
    play_count: 1,
    play_interval: 1,
  });
  const [settingsForm, setSettingsForm] = useState<UserSettings>(userSettings);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsChanged, setSettingsChanged] = useState(false);

  // 复习计划相关
  const [scheduleDays, setScheduleDays] = useState<number>(30);
  const [scheduleData, setScheduleData] = useState<Array<{ date: string; count: number; newItems: number; reviewItems: number }>>([]);
  const [scheduleSummary, setScheduleSummary] = useState<{ totalNewItems: number; todayCompleted: number; dailyLimit: number } | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // 自选词条弹窗
  const [selectItemsModalVisible, setSelectItemsModalVisible] = useState(false);
  const [selectableItems, setSelectableItems] = useState<Array<{ id: string; content: string; status: string; select_status: 'available' | 'selected' | 'learned'; wordbook_id?: string; wordbook_name?: string }>>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectItemsLoading, setSelectItemsLoading] = useState(false);
  const [selectableWordbooks, setSelectableWordbooks] = useState<Array<{ id: string; name: string; total_items: number }>>([]);
  const [selectedWordbookForSelect, setSelectedWordbookForSelect] = useState<string>('');

  // 需要补充词条的状态
  const [needMoreItems, setNeedMoreItems] = useState(false);
  const [neededCount, setNeededCount] = useState(0);
  const [totalNeeded, setTotalNeeded] = useState(0);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [showSelectPrompt, setShowSelectPrompt] = useState(true);

  // 显示/隐藏原文
  const [showOriginal, setShowOriginal] = useState(false);

  // 获取词书列表
  const fetchWordbooks = useCallback(async () => {
    try {
      const response = await fetch('/api/listening-training/wordbooks');
      const data = await response.json();
      if (data.success) {
        setWordbooks(data.data.list);
        if (data.data.list.length > 0 && !selectedWordbook) {
          setSelectedWordbook(data.data.list[0].id);
        }
      }
    } catch (error) {
      messageApi.error('获取词书列表失败');
    }
  }, [selectedWordbook, messageApi]);

  // 获取今日学习清单
  const fetchPracticeItems = useCallback(async (extraMode = false) => {
    setLoading(true);
    setIsExtraMode(extraMode);
    try {
      const mode = extraMode ? 'extra' : 'daily';
      const response = await fetch(`/api/listening-training/items/practice?mode=${mode}`);
      const data = await response.json();
      if (data.success) {
        setPracticeItems(data.data.items);
        setCompletedToday(data.data.completed_today);
        setDailyLimit(data.data.daily_limit);
        setPendingCount(data.data.pending_count);
        setReviewCount(data.data.review_count);
        setNewCount(data.data.new_count);
        setNeedMoreItems(data.data.need_more_items);
        setNeededCount(data.data.needed_count);
        setTotalNeeded(data.data.total_needed);
        setReviewTotal(data.data.review_total);
        setCurrentIndex(0);
      }
    } catch (error) {
      messageApi.error('获取学习清单失败');
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  // 获取词本
  const fetchVocabulary = useCallback(async () => {
    if (!selectedWordbook) return;
    setLoading(true);
    try {
      const statusParam = vocabularyStatus !== 'all' ? `&status=${vocabularyStatus}` : '';
      const response = await fetch(`/api/listening-training/items?wordbook_id=${selectedWordbook}${statusParam}`);
      const data = await response.json();
      if (data.success) {
        setVocabularyItems(data.data.list);
        if (data.data.counts) {
          setVocabularyCounts(data.data.counts);
        }
      }
    } catch (error) {
      messageApi.error('获取词本失败');
    } finally {
      setLoading(false);
    }
  }, [selectedWordbook, vocabularyStatus, messageApi]);

  // 获取复习计划数据
  const fetchSchedule = useCallback(async () => {
    setScheduleLoading(true);
    try {
      const response = await fetch(`/api/listening-training/review-schedule?days=${scheduleDays}`);
      const data = await response.json();
      if (data.success) {
        setScheduleData(data.data.schedule);
        setScheduleSummary(data.data.summary || null);
      } else {
        messageApi.error(data.message || '获取复习计划失败');
      }
    } catch (error) {
      messageApi.error('获取复习计划失败');
    } finally {
      setScheduleLoading(false);
    }
  }, [scheduleDays, messageApi]);

  // 获取用户设置
  const fetchUserSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/listening-training/settings');
      const data = await response.json();
      if (data.success) {
        const settings = {
          daily_limit: data.data.daily_limit,
          item_order: data.data.item_order,
          auto_play: data.data.auto_play,
          review_unknown_first: data.data.review_unknown_first,
          play_count: data.data.play_count ?? 1,
          play_interval: data.data.play_interval ?? 1,
        };
        setUserSettings(settings);
        setSettingsForm(settings);
        setSettingsChanged(false);
      }
    } catch (error) {
      messageApi.error('获取设置失败');
    }
  }, [messageApi]);

  // 保存用户设置到服务器
  const saveUserSettings = async () => {
    setSettingsLoading(true);
    try {
      const response = await fetch('/api/listening-training/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyLimit: settingsForm.daily_limit,
          itemOrder: settingsForm.item_order,
          autoPlay: settingsForm.auto_play,
          reviewUnknownFirst: settingsForm.review_unknown_first,
          playCount: settingsForm.play_count,
          playInterval: settingsForm.play_interval,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setUserSettings({
          daily_limit: data.data.daily_limit,
          item_order: data.data.item_order,
          auto_play: data.data.auto_play,
          review_unknown_first: data.data.review_unknown_first,
          play_count: data.data.play_count ?? 1,
          play_interval: data.data.play_interval ?? 1,
        });
        setSettingsChanged(false);
        messageApi.success('设置已保存');
      } else {
        messageApi.error(data.message || '保存失败');
      }
    } catch (error) {
      messageApi.error('保存设置失败');
    } finally {
      setSettingsLoading(false);
    }
  };

  // 更新本地设置表单
  const updateSettingsForm = (values: Partial<UserSettings>) => {
    setSettingsForm(prev => ({ ...prev, ...values }));
    setSettingsChanged(true);
  };

  useEffect(() => {
    fetchWordbooks();
    fetchUserSettings();
  }, [fetchWordbooks, fetchUserSettings]);

  useEffect(() => {
    if (activeTab === 'practice') {
      fetchPracticeItems();
    } else if (activeTab === 'vocabulary') {
      fetchVocabulary();
    } else if (activeTab === 'schedule') {
      fetchSchedule();
    }
  }, [activeTab, selectedWordbook, fetchPracticeItems, fetchVocabulary, fetchSchedule]);

  // 练习页面加载后，自动播放第一个词条
  useEffect(() => {
    if (activeTab === 'practice' &&
        practiceItems.length > 0 &&
        currentIndex === 0 &&
        userSettings.auto_play &&
        pendingCount > 0) {
      const firstItem = practiceItems[0];
      if (firstItem) {
        const timer = setTimeout(() => {
          playAudio(firstItem.content);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [activeTab, practiceItems, currentIndex, userSettings.auto_play, pendingCount]);

  // 生成音频
  const generateAudio = async (text: string) => {
    if (audioCache[text]) {
      return audioCache[text];
    }
    setAudioLoading(true);
    try {
      const response = await fetch('/api/listening-training/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (data.success) {
        setAudioCache(prev => ({ ...prev, [text]: data.data.audio_base64 }));
        return data.data.audio_base64;
      } else {
        messageApi.error(data.message || '生成音频失败');
        return null;
      }
    } catch (error) {
      messageApi.error('生成音频失败');
      return null;
    } finally {
      setAudioLoading(false);
    }
  };

  // 播放音频
  const playAudio = async (text: string, count?: number, interval?: number) => {
    if (isPlayingRef.current && audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (e) {
        // 忽略暂停错误
      }
    }
    
    isPlayingRef.current = true;
    
    const playCount = count ?? userSettings.play_count ?? 1;
    const playInterval = (interval ?? userSettings.play_interval ?? 1) * 1000;
    
    const audioData = await generateAudio(text);
    if (!audioData) {
      isPlayingRef.current = false;
      return;
    }

    for (let i = 0; i < playCount; i++) {
      try {
        await new Promise<void>((resolve, reject) => {
          audioRef.current = new Audio(audioData);
          audioRef.current.onended = () => {
            resolve();
          };
          audioRef.current.onerror = (e) => {
            reject(e);
          };
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((e) => {
              resolve();
            });
          }
        });
      } catch (e) {
        console.log('Audio play error:', e);
      }
      
      if (i < playCount - 1 && playInterval > 0) {
        await new Promise(resolve => setTimeout(resolve, playInterval));
      }
    }
    
    isPlayingRef.current = false;
  };

  // 提交复习结果
  const submitReview = async (choice: string) => {
    if (practiceItems.length === 0 || currentIndex >= practiceItems.length) return;
    const item = practiceItems[currentIndex];
    try {
      // 获取用户时区偏移（分钟）
      const timezoneOffset = new Date().getTimezoneOffset();
      const response = await fetch(`/api/listening-training/items/${item.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice, timezoneOffset }),
      });
      const data = await response.json();
      if (data.success) {
        setCompletedToday(prev => prev + 1);
        setPendingCount(prev => Math.max(0, prev - 1));
        
        // 更新当前词条在学习清单中的状态
        setPracticeItems(prev => {
          const newItems = [...prev];
          if (newItems[currentIndex]) {
            newItems[currentIndex] = { ...newItems[currentIndex], status: 'completed' };
          }
          return newItems;
        });

        if (currentIndex < practiceItems.length - 1) {
          const nextIndex = currentIndex + 1;
          setCurrentIndex(nextIndex);
          // 切换到下一个词条时隐藏原文
          setShowOriginal(false);
          if (userSettings.auto_play) {
            const nextItem = practiceItems[nextIndex];
            if (nextItem) {
              setTimeout(() => {
                playAudio(nextItem.content);
              }, 500);
            }
          }
        } else {
          messageApi.success(isExtraMode ? '加练完成！' : '今日学习完成！');
          fetchPracticeItems(isExtraMode);
        }
      } else {
        messageApi.error(data.message || '提交失败');
      }
    } catch (error) {
      messageApi.error('提交复习结果失败');
    }
  };

  // 捞回词条
  const restoreItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/listening-training/items/${itemId}/restore`, {
        method: 'PATCH',
      });
      const data = await response.json();
      if (data.success) {
        messageApi.success('词条已捞回');
        fetchVocabulary();
      } else {
        messageApi.error(data.message || '捞回失败');
      }
    } catch (error) {
      messageApi.error('捞回词条失败');
    }
  };

  // 上传词书
  const uploadWordbook = async () => {
    if (!uploadFile) {
      messageApi.error('请选择文件');
      return;
    }
    const formData = new FormData();
    formData.append('file', uploadFile);
    if (uploadName) {
      formData.append('name', uploadName);
    }
    try {
      const response = await fetch('/api/listening-training/wordbooks', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        messageApi.success('词书上传成功');
        setUploadModalVisible(false);
        setUploadFile(null);
        setUploadName('');
        fetchWordbooks();
      } else {
        messageApi.error(data.message || '上传失败');
      }
    } catch (error) {
      messageApi.error('上传词书失败');
    }
  };

  // 在线创建词书
  const createWordbookOnline = async () => {
    if (!editWordbookName.trim()) {
      messageApi.error('请输入词书名称');
      return;
    }
    const items = editWordbookItems.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (items.length === 0) {
      messageApi.error('请输入至少一个词条');
      return;
    }
    try {
      const response = await fetch('/api/listening-training/wordbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editWordbookName.trim(),
          items,
        }),
      });
      const data = await response.json();
      if (data.success) {
        messageApi.success('词书创建成功');
        setEditModalVisible(false);
        setEditWordbookName('');
        setEditWordbookItems('');
        fetchWordbooks();
      } else {
        messageApi.error(data.message || '创建失败');
      }
    } catch (error) {
      messageApi.error('创建词书失败');
    }
  };

  // 删除词书
  const deleteWordbook = async (id: string) => {
    try {
      const response = await fetch(`/api/listening-training/wordbooks/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        messageApi.success('词书删除成功');
        fetchWordbooks();
        if (selectedWordbook === id) {
          setSelectedWordbook('');
        }
      } else {
        messageApi.error(data.message || '删除失败');
      }
    } catch (error) {
      messageApi.error('删除词书失败');
    }
  };

  // 获取可选词条
  const fetchSelectableItems = async (wordbookId?: string) => {
    setSelectItemsLoading(true);
    try {
      const url = wordbookId 
        ? `/api/listening-training/selectable-items?wordbook_id=${wordbookId}`
        : '/api/listening-training/selectable-items';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setSelectableWordbooks(data.data.wordbooks);
        setSelectableItems(data.data.items);
        // 如果有指定词书，使用指定的；否则使用第一个词书
        const defaultWordbookId = wordbookId || data.data.wordbooks[0]?.id || '';
        setSelectedWordbookForSelect(defaultWordbookId);
        setSelectedItemIds([]);
        setSelectItemsModalVisible(true);
      } else {
        messageApi.error(data.message || '获取词条失败');
      }
    } catch (error) {
      messageApi.error('获取词条失败');
    } finally {
      setSelectItemsLoading(false);
    }
  };

  // 切换选择的词书
  const handleWordbookChangeForSelect = async (wordbookId: string) => {
    setSelectedWordbookForSelect(wordbookId);
    setSelectItemsLoading(true);
    try {
      const response = await fetch(`/api/listening-training/selectable-items?wordbook_id=${wordbookId}`);
      const data = await response.json();
      if (data.success) {
        setSelectableItems(data.data.items);
        setSelectedItemIds([]);
      } else {
        messageApi.error(data.message || '获取词条失败');
      }
    } catch (error) {
      messageApi.error('获取词条失败');
    } finally {
      setSelectItemsLoading(false);
    }
  };

  // 添加选中词条到学习清单
  const addSelectedItemsToPlan = async () => {
    if (selectedItemIds.length === 0) {
      messageApi.error('请至少选择一个词条');
      return;
    }
    try {
      const response = await fetch('/api/listening-training/daily-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: selectedItemIds }),
      });
      const data = await response.json();
      if (data.success) {
        messageApi.success(`成功添加 ${data.data.addedCount} 个词条`);
        setSelectItemsModalVisible(false);
        fetchPracticeItems(isExtraMode);
      } else {
        messageApi.error(data.message || '添加失败');
      }
    } catch (error) {
      messageApi.error('添加词条失败');
    }
  };

  const currentItem = practiceItems[currentIndex];
  const hasPendingItems = pendingCount > 0;

  // 渲染练习页面内容
  const renderPracticeContent = () => (
    <Card>
      <Spin spinning={loading} description="加载中...">
        {!isExtraMode && !hasPendingItems && practiceItems.length > 0 ? (
          // 今日任务完成界面
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 80, color: '#52c41a', marginBottom: 24 }} />
            <Title level={3} style={{ marginBottom: 16 }}>
              🎉 今日任务已完成！
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24, fontSize: 16 }}>
              已完成 {completedToday} / {dailyLimit} 个词条
            </Text>
            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: 16, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
              <Text style={{ color: '#52c41a', fontWeight: 500 }}>
                太棒了！今日学习目标已达成
              </Text>
            </div>
            <Space size="large">
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => fetchSelectableItems()}
              >
                自选词条加练
              </Button>
              <Button
                size="large"
                onClick={() => setActiveTab('vocabulary')}
              >
                查看词本
              </Button>
            </Space>
          </div>
        ) : !isExtraMode && needMoreItems && showSelectPrompt ? (
          // 需要补充新词条的提示界面
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Title level={3} style={{ marginBottom: 16 }}>
              今日学习清单
            </Title>
            <div style={{ marginBottom: 24 }}>
              <Space orientation="vertical" size="small">
                <Text type="secondary">
                  每日目标: {dailyLimit} 个词条
                </Text>
                <Text type="secondary">
                  待复习词条: {reviewTotal} 个
                </Text>
                <Text type="secondary">
                  已选新词条: {newCount} 个
                </Text>
              </Space>
            </div>
            {neededCount > 0 ? (
              <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 8, padding: 16, marginTop: 0, marginRight: 'auto', marginBottom: 24, marginLeft: 'auto', maxWidth: 500 }}>
                <Text style={{ color: '#1890ff', fontWeight: 500 }}>
                  还可以选择 {neededCount} 个新词条（选几个都行）
                </Text>
              </div>
            ) : (
              <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: 16, marginTop: 0, marginRight: 'auto', marginBottom: 24, marginLeft: 'auto', maxWidth: 500 }}>
                <Text style={{ color: '#52c41a', fontWeight: 500 }}>
                  词条数量已达到每日目标，可以开始学习啦！
                </Text>
              </div>
            )}
            <Space size="large">
              {neededCount > 0 && (
                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={() => fetchSelectableItems()}
                >
                  选择新词条
                </Button>
              )}
              <Button
                type={neededCount > 0 ? 'default' : 'primary'}
                size="large"
                onClick={() => setShowSelectPrompt(false)}
              >
                开始学习
              </Button>
            </Space>
          </div>
        ) : isExtraMode && !hasPendingItems ? (
          // 加练模式，但没有选择词条
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Title level={3} style={{ marginBottom: 16 }}>
              加练模式
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24, fontSize: 16 }}>
              请选择要加练的词条
            </Text>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => fetchSelectableItems()}
            >
              选择加练词条
            </Button>
            <div style={{ marginTop: 16 }}>
              <Button onClick={() => fetchPracticeItems(false)}>
                返回日常学习
              </Button>
            </div>
          </div>
        ) : practiceItems.length > 0 && currentItem ? (
          // 正常练习界面
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            {/* 显示词书来源和词条类型 */}
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Text type="secondary">
                  来自词书: {currentItem.wordbook_name}
                </Text>
                <Tag color={currentItem.item_type === 'review' ? 'blue' : 'green'}>
                  {currentItem.item_type === 'review' ? '待复习' : '新词条'}
                </Tag>
              </Space>
            </div>
            
            <Row justify="center" style={{ marginBottom: 40 }}>
              <Col>
                <Button
                  type="primary"
                  size="large"
                  icon={<SoundOutlined />}
                  onClick={() => playAudio(currentItem.content)}
                  loading={audioLoading}
                  style={{ width: 200, height: 60, fontSize: 18 }}
                >
                  播放音频
                </Button>
              </Col>
            </Row>

            {/* 显示原文按钮或原文 */}
            <div style={{ marginBottom: 24, minHeight: 24 }}>
              {!showOriginal ? (
                <Button
                  type="link"
                  size="small"
                  onClick={() => setShowOriginal(true)}
                >
                  显示原文
                </Button>
              ) : (
                <Text style={{ fontSize: 18, color: '#52c41a' }}>
                  {currentItem.content}
                </Text>
              )}
            </div>

            <div style={{ marginBottom: 40 }}>
              <Text type="secondary">
                {isExtraMode ? '加练模式' : `今日学习: ${completedToday} / ${dailyLimit}`}
                {!isExtraMode && (
                  <span style={{ marginLeft: 16 }}>
                    (待复习: {reviewCount}, 新词条: {newCount})
                  </span>
                )}
              </Text>
              {!isExtraMode && (
                <Progress 
                  percent={Math.min(Math.round((completedToday / dailyLimit) * 100), 100)} 
                  showInfo={false}
                  style={{ marginTop: 8, maxWidth: 400, margin: '8px auto' }}
                />
              )}
            </div>

            <Row justify="center" gutter={[16, 16]}>
              <Col xs={8} sm={8} md={8} lg={8}>
                <Button
                  size="large"
                  danger
                  block
                  style={{ height: 50, fontSize: 15 }}
                  onClick={() => submitReview('unknown')}
                >
                  没懂
                </Button>
              </Col>
              <Col xs={8} sm={8} md={8} lg={8}>
                <Button
                  size="large"
                  type="primary"
                  block
                  style={{ height: 50, fontSize: 15 }}
                  onClick={() => submitReview('known')}
                >
                  懂了
                </Button>
              </Col>
              <Col xs={8} sm={8} md={8} lg={8}>
                <Button
                  size="large"
                  block
                  style={{ height: 50, backgroundColor: '#52c41a', color: '#fff', fontSize: 15 }}
                  onClick={() => submitReview('familiar')}
                >
                  熟识
                </Button>
              </Col>
            </Row>

            {isExtraMode && (
              <div style={{ marginTop: 24 }}>
                <Button onClick={() => fetchPracticeItems(false)}>
                  结束加练，返回日常学习
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
            <Title level={4}>
              暂无学习清单
            </Title>
            <Text type="secondary">
              请先创建词书并添加词条
            </Text>
          </div>
        )}
      </Spin>
    </Card>
  );

  // 渲染词本页面内容
  const renderVocabularyContent = () => (
    <Card>
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            style={{ width: 200 }}
            placeholder="选择词书"
            value={selectedWordbook || undefined}
            onChange={setSelectedWordbook}
          >
            {wordbooks.map(wb => (
              <Option key={wb.id} value={wb.id}>{wb.name}</Option>
            ))}
          </Select>
          <Button type={vocabularyStatus === 'all' ? 'primary' : 'default'} onClick={() => setVocabularyStatus('all')}>
            全部 ({vocabularyCounts.all})
          </Button>
          <Button type={vocabularyStatus === 'unknown' ? 'primary' : 'default'} onClick={() => setVocabularyStatus('unknown')}>
            没懂 ({vocabularyCounts.unknown})
          </Button>
          <Button type={vocabularyStatus === 'known' ? 'primary' : 'default'} onClick={() => setVocabularyStatus('known')}>
            懂了 ({vocabularyCounts.known})
          </Button>
          <Button type={vocabularyStatus === 'familiar' ? 'primary' : 'default'} onClick={() => setVocabularyStatus('familiar')}>
            熟识 ({vocabularyCounts.familiar})
          </Button>
        </Space>
      </div>

      <Spin spinning={loading} description="加载中...">
        <Row gutter={[16, 16]}>
          {vocabularyItems.map((item) => (
            <Col key={item.id} xs={24} sm={12} md={8} lg={6} xl={6} xxl={4}>
              <Card
                size="small"
                hoverable
                onClick={() => {
                  setSelectedItem(item);
                  setDetailModalVisible(true);
                }}
                extra={
                  <Badge
                    status={item.status === 'unknown' ? 'error' : item.status === 'known' ? 'warning' : 'success'}
                    text={item.status === 'unknown' ? '没懂' : item.status === 'known' ? '懂了' : '熟识'}
                  />
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SoundOutlined />
                  <Text ellipsis style={{ flex: 1 }}>{item.content}</Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>
    </Card>
  );

  // 渲染词书管理页面内容
  const renderWordbooksContent = () => (
    <Card>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" onClick={() => setUploadModalVisible(true)}>
            上传词书
          </Button>
          <Button onClick={() => setEditModalVisible(true)}>
            在线创建
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {wordbooks.map((wb) => (
          <Col key={wb.id} xs={24} sm={12} md={8} lg={8} xl={6} xxl={6}>
            <Card
              size="small"
              hoverable
              actions={[
                <Button key="practice" type="link" onClick={() => {
                  setSelectedWordbook(wb.id);
                  setActiveTab('practice');
                }}>练习</Button>,
                <Button key="delete" danger type="link" onClick={() => deleteWordbook(wb.id)}>删除</Button>,
              ]}
            >
              <Card.Meta
                title={wb.name}
                description={`${wb.total_items} 词条 · ${new Date(wb.created_at).toLocaleDateString()}`}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );

  // 渲染设置页面内容
  const renderSettingsContent = () => (
    <Card
      title="学习设置"
      loading={settingsLoading}
      extra={
        <Button
          type="primary"
          onClick={saveUserSettings}
          disabled={!settingsChanged}
        >
          保存设置
        </Button>
      }
    >
      <Form layout="vertical" style={{ maxWidth: 600 }}>
        <Form.Item label="每日学习数量">
          <InputNumber
            min={1}
            max={100}
            value={settingsForm.daily_limit}
            onChange={(value) => {
              if (value) {
                updateSettingsForm({ daily_limit: value });
              }
            }}
            style={{ width: 200 }}
          />
          <Text type="secondary" style={{ marginLeft: 8 }}>
            每天最多学习 {settingsForm.daily_limit} 个词条
          </Text>
        </Form.Item>

        <Divider />

        <Form.Item label="词条出现顺序">
          <Select
            value={settingsForm.item_order}
            onChange={(value) => updateSettingsForm({ item_order: value })}
            style={{ width: 200 }}
          >
            <Option value="sequential">顺序出现</Option>
            <Option value="random">随机出现</Option>
          </Select>
        </Form.Item>

        <Divider />

        <Form.Item label="自动播放">
          <Space>
            <Switch
              checked={settingsForm.auto_play}
              onChange={(checked) => updateSettingsForm({ auto_play: checked })}
            />
            <Text type="secondary">
              {settingsForm.auto_play ? '提交后自动播放下一个词条' : '手动点击播放'}
            </Text>
          </Space>
        </Form.Item>

        <Divider />

        <Form.Item label="优先复习">
          <Space>
            <Switch
              checked={settingsForm.review_unknown_first}
              onChange={(checked) => updateSettingsForm({ review_unknown_first: checked })}
            />
            <Text type="secondary">
              {settingsForm.review_unknown_first ? '优先复习"没懂"的词条' : '按默认顺序复习'}
            </Text>
          </Space>
        </Form.Item>

        <Divider />

        <Form.Item label="播放次数">
          <InputNumber
            min={1}
            max={10}
            value={settingsForm.play_count}
            onChange={(value) => {
              if (value) {
                updateSettingsForm({ play_count: value });
              }
            }}
            style={{ width: 200 }}
          />
          <Text type="secondary" style={{ marginLeft: 8 }}>
            每个词条播放 {settingsForm.play_count} 次
          </Text>
        </Form.Item>

        <Divider />

        <Form.Item label="播放间隔">
          <InputNumber
            min={0}
            max={10}
            step={0.5}
            value={settingsForm.play_interval}
            onChange={(value) => {
              if (value !== null) {
                updateSettingsForm({ play_interval: value });
              }
            }}
            style={{ width: 200 }}
          />
          <Text type="secondary" style={{ marginLeft: 8 }}>
            多次播放之间的间隔时间（秒）
          </Text>
        </Form.Item>
      </Form>
    </Card>
  );

  // 渲染复习计划页面内容
  const renderScheduleContent = () => (
    <Spin spinning={scheduleLoading} description="加载中...">
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <CalendarOutlined />
            <Text>时间范围:</Text>
            <Select
              value={scheduleDays}
              onChange={(value) => setScheduleDays(value)}
              style={{ width: 120 }}
              options={[
                { value: 7, label: '未来7天' },
                { value: 14, label: '未来14天' },
                { value: 30, label: '未来30天' },
                { value: 60, label: '未来60天' },
                { value: 90, label: '未来90天' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchSchedule} loading={scheduleLoading}>
              刷新
            </Button>
          </Space>
        </div>

        {scheduleData.length > 0 ? (
          <>
            {/* 统计摘要 */}
            {scheduleSummary && (
              <Card style={{ marginBottom: 16, backgroundColor: '#f6ffed' }}>
                <Space size="large" wrap>
                  <div>
                    <Text type="secondary">每日学习上限</Text>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                      {scheduleSummary.dailyLimit} 个
                    </div>
                  </div>
                  <div>
                    <Text type="secondary">待学习新词条</Text>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                      {scheduleSummary.totalNewItems} 个
                    </div>
                  </div>
                  <div>
                    <Text type="secondary">今日已完成</Text>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                      {scheduleSummary.todayCompleted} 个
                    </div>
                  </div>
                </Space>
              </Card>
            )}

            <ReactECharts
              option={{
                title: {
                  text: `未来${scheduleDays}天复习计划统计`,
                  left: 'center',
                  textStyle: { fontSize: 18, fontWeight: 'normal' },
                },
                tooltip: {
                  trigger: 'axis',
                  formatter: (params: any) => {
                    const data = params[0];
                    const dateIndex = data.dataIndex;
                    const item = scheduleData[dateIndex];
                    if (!item) return '';
                    return `${item.date}<br/>总计: <b>${item.count}</b> 个词条<br/>新词条: ${item.newItems} 个<br/>复习: ${item.reviewItems} 个`;
                  },
                },
                legend: {
                  data: ['新词条', '复习词条'],
                  bottom: 0,
                },
                grid: {
                  left: '3%',
                  right: '4%',
                  bottom: '15%',
                  top: '15%',
                  containLabel: true,
                },
                xAxis: {
                  type: 'category',
                  data: scheduleData.map((item) => dayjs(item.date).format('MM-DD')),
                  axisLabel: {
                    rotate: 45,
                    interval: Math.floor(scheduleData.length / 10),
                  },
                },
                yAxis: {
                  type: 'value',
                  name: '词条数量',
                  minInterval: 1,
                },
                series: [
                  {
                    name: '新词条',
                    type: 'bar',
                    stack: 'total',
                    data: scheduleData.map((item) => item.newItems),
                    itemStyle: { color: '#1890ff' },
                  },
                  {
                    name: '复习词条',
                    type: 'bar',
                    stack: 'total',
                    data: scheduleData.map((item) => item.reviewItems),
                    itemStyle: { color: '#52c41a' },
                  },
                ],
              }}
              style={{ height: 400, width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />


          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Text type="secondary">暂无复习计划数据</Text>
          </div>
        )}
      </Card>
    </Spin>
  );

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>听力训练</Title>
      
      {/* 顶部 Tabs 导航 */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as typeof activeTab)}
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'practice',
            label: (
              <span>
                <SoundOutlined />
                练习
              </span>
            ),
            children: renderPracticeContent(),
          },
          {
            key: 'vocabulary',
            label: (
              <span>
                <BookOutlined />
                词本
              </span>
            ),
            children: renderVocabularyContent(),
          },
          {
            key: 'wordbooks',
            label: (
              <span>
                <EyeOutlined />
                词书管理
              </span>
            ),
            children: renderWordbooksContent(),
          },
          {
            key: 'schedule',
            label: (
              <span>
                <CalendarOutlined />
                复习计划
              </span>
            ),
            children: renderScheduleContent(),
          },
          {
            key: 'settings',
            label: (
              <span>
                <SettingOutlined />
                设置
              </span>
            ),
            children: renderSettingsContent(),
          },
        ]}
      />

      {/* 词条详情弹窗 */}
      <Modal
        title="词条详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          selectedItem?.status === 'familiar' && (
            <Button key="restore" type="primary" onClick={() => {
              if (selectedItem) {
                restoreItem(selectedItem.id);
                setDetailModalVisible(false);
              }
            }}>
              捞回重新练习
            </Button>
          ),
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {selectedItem && (
          <div>
            <p><strong>内容:</strong> {selectedItem.content}</p>
            <p><strong>状态:</strong>
              <Badge
                status={selectedItem.status === 'unknown' ? 'error' : selectedItem.status === 'known' ? 'warning' : 'success'}
                text={selectedItem.status === 'unknown' ? '没懂' : selectedItem.status === 'known' ? '懂了' : '熟识'}
                style={{ marginLeft: 8 }}
              />
            </p>
            <p><strong>复习次数:</strong> {selectedItem.review_count}</p>
            <Button 
              icon={<SoundOutlined />} 
              onClick={() => playAudio(selectedItem.content)}
              loading={audioLoading}
            >
              播放音频
            </Button>
          </div>
        )}
      </Modal>

      {/* 上传词书弹窗 */}
      <Modal
        title="上传词书"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          setUploadFile(null);
          setUploadName('');
        }}
        onOk={uploadWordbook}
      >
        <div style={{ marginBottom: 16 }}>
          <p>词书名称（可选）:</p>
          <input
            type="text"
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            placeholder="默认使用文件名"
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d9d9d9' }}
          />
        </div>
        <div>
          <p>选择txt文件:</p>
          <input
            type="file"
            accept=".txt"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            style={{ width: '100%' }}
          />
          <p style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
            格式要求：每行一个词条（单词或句子），UTF-8编码
          </p>
        </div>
      </Modal>

      {/* 在线创建词书弹窗 */}
      <Modal
        title="在线创建词书"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditWordbookName('');
          setEditWordbookItems('');
        }}
        onOk={createWordbookOnline}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <p>词书名称:</p>
          <input
            type="text"
            value={editWordbookName}
            onChange={(e) => setEditWordbookName(e.target.value)}
            placeholder="请输入词书名称"
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d9d9d9' }}
          />
        </div>
        <div>
          <p>词条列表（每行一个）:</p>
          <textarea
            value={editWordbookItems}
            onChange={(e) => setEditWordbookItems(e.target.value)}
            placeholder="例如：&#10;Hello&#10;Good morning&#10;How are you"
            style={{
              width: '100%',
              minHeight: 200,
              padding: 8,
              borderRadius: 4,
              border: '1px solid #d9d9d9',
              resize: 'vertical',
              fontFamily: 'monospace',
            }}
          />
          <p style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
            提示：每行输入一个词条（单词或句子），空行会被自动忽略
          </p>
        </div>
      </Modal>

      {/* 自选词条弹窗 */}
      <Modal
        title={`选择词条 (还需要 ${neededCount} 个)`}
        open={selectItemsModalVisible}
        onCancel={() => setSelectItemsModalVisible(false)}
        onOk={addSelectedItemsToPlan}
        width={700}
        confirmLoading={selectItemsLoading}
      >
        <Spin spinning={selectItemsLoading}>
          {selectableWordbooks.length === 0 ? (
            // 没有词书时的提示
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <BookOutlined style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 16 }} />
              <Title level={4} style={{ marginBottom: 8 }}>
                还没有词书
              </Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                请先创建或上传一个词书，然后才能选择词条进行学习
              </Text>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setSelectItemsModalVisible(false);
                  setActiveTab('wordbooks');
                }}
              >
                去创建词书
              </Button>
            </div>
          ) : (
            <>
              <Space orientation="vertical" style={{ width: '100%', marginBottom: 16 }}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="选择词书"
                  value={selectedWordbookForSelect}
                  onChange={handleWordbookChangeForSelect}
                >
                  {selectableWordbooks.map(wb => (
                    <Option key={wb.id} value={wb.id}>
                      {wb.name} ({wb.total_items} 词条)
                    </Option>
                  ))}
                </Select>
                
                {/* 一键选择按钮 */}
                <Space wrap>
                  <Button 
                    onClick={() => {
                      // 顺序选择：选择前 neededCount 个可用词条
                      const availableItems = selectableItems.filter(item => item.select_status === 'available');
                      const itemsToSelect = availableItems.slice(0, neededCount);
                      setSelectedItemIds(itemsToSelect.map(item => item.id));
                    }}
                    disabled={neededCount <= 0}
                  >
                    顺序选择 {neededCount} 个
                  </Button>
                  <Button 
                    onClick={() => {
                      // 随机选择：随机选择 neededCount 个可用词条
                      const availableItems = selectableItems.filter(item => item.select_status === 'available');
                      const shuffled = [...availableItems].sort(() => Math.random() - 0.5);
                      const itemsToSelect = shuffled.slice(0, neededCount);
                      setSelectedItemIds(itemsToSelect.map(item => item.id));
                    }}
                    disabled={neededCount <= 0}
                  >
                    随机选择 {neededCount} 个
                  </Button>
                  <Button 
                    onClick={() => setSelectedItemIds([])}
                    disabled={selectedItemIds.length === 0}
                  >
                    清空选择
                  </Button>
                </Space>

                <Alert
                  title={`已选择 ${selectedItemIds.length} 个词条 (还需要 ${Math.max(0, neededCount - selectedItemIds.length)} 个)`}
                  type="info"
                />
              </Space>
              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                {selectableItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Text type="secondary">该词书没有词条</Text>
                  </div>
                ) : (
                  <Row gutter={[0, 0]}>
                    {selectableItems.map((item: any) => {
                      const isSelected = selectedItemIds.includes(item.id);
                      const isAlreadySelected = item.select_status === 'selected';
                      const isLearned = item.select_status === 'learned';
                      
                      return (
                        <Col key={item.id} span={24}>
                          <div style={{ 
                            opacity: isAlreadySelected || isLearned ? 0.5 : 1,
                            backgroundColor: isAlreadySelected ? '#f6ffed' : isLearned ? '#fff7e6' : 'transparent',
                            padding: '8px 16px',
                            borderBottom: '1px solid #f0f0f0'
                          }}>
                            <Checkbox
                              checked={isSelected || isAlreadySelected}
                              disabled={isAlreadySelected || isLearned}
                              onChange={(e) => {
                                if (isAlreadySelected || isLearned) return;
                                if (e.target.checked) {
                                  setSelectedItemIds(prev => [...prev, item.id]);
                                } else {
                                  setSelectedItemIds(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                            >
                              <Space>
                                <span style={{ 
                                  textDecoration: isLearned ? 'line-through' : 'none'
                                }}>
                                  {item.content}
                                </span>
                                {isAlreadySelected && (
                                  <Tag color="green">已加入今日清单</Tag>
                                )}
                                {isLearned && (
                                  <Tag color="orange">已学习</Tag>
                                )}
                              </Space>
                            </Checkbox>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                )}
              </div>
            </>
          )}
        </Spin>
      </Modal>
    </div>
  );
}
