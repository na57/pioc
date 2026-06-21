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
  message,
  Spin,
  Progress,
  Modal,
  Switch,
  InputNumber,
  Form,
  Divider,
} from 'antd';
import {
  SoundOutlined,
  ReloadOutlined,
  BookOutlined,
  CheckCircleOutlined,
  QuestionCircleOutlined,
  EyeOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { App } from 'antd';

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
  const [activeTab, setActiveTab] = useState<'practice' | 'vocabulary' | 'wordbooks' | 'settings'>('practice');
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([]);
  const [selectedWordbook, setSelectedWordbook] = useState<string>('');
  const [practiceItems, setPracticeItems] = useState<PracticeItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [completedToday, setCompletedToday] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioCache, setAudioCache] = useState<Record<string, string>>({});

  // 词本相关
  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItem[]>([]);
  const [vocabularyStatus, setVocabularyStatus] = useState<string>('all');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VocabularyItem | null>(null);

  // 词书管理相关
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  // 在线编辑词书
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
  // 设置编辑状态（用于本地修改，点击保存后才提交）
  const [settingsForm, setSettingsForm] = useState<UserSettings>(userSettings);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsChanged, setSettingsChanged] = useState(false);

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

  // 获取待复习词条
  const fetchPracticeItems = useCallback(async () => {
    if (!selectedWordbook) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/listening-training/items/practice?wordbook_id=${selectedWordbook}`);
      const data = await response.json();
      if (data.success) {
        setPracticeItems(data.data.items);
        setCompletedToday(data.data.completed_today);
        setCurrentIndex(0);
      }
    } catch (error) {
      messageApi.error('获取待复习词条失败');
    } finally {
      setLoading(false);
    }
  }, [selectedWordbook, messageApi]);

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
      }
    } catch (error) {
      messageApi.error('获取词本失败');
    } finally {
      setLoading(false);
    }
  }, [selectedWordbook, vocabularyStatus, messageApi]);

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
    }
  }, [activeTab, selectedWordbook, fetchPracticeItems, fetchVocabulary]);

  // 练习页面加载后，自动播放第一个词条
  useEffect(() => {
    if (activeTab === 'practice' && practiceItems.length > 0 && currentIndex === 0 && userSettings.auto_play) {
      const firstItem = practiceItems[0];
      if (firstItem) {
        // 延迟一点播放，确保页面已渲染
        const timer = setTimeout(() => {
          playAudio(firstItem.content);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [activeTab, practiceItems, currentIndex, userSettings.auto_play]);

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

  // 播放音频（支持多次播放）
  const playAudio = async (text: string, count?: number, interval?: number) => {
    const playCount = count ?? userSettings.play_count ?? 1;
    const playInterval = (interval ?? userSettings.play_interval ?? 1) * 1000;
    
    const audioData = await generateAudio(text);
    if (!audioData) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    // 播放多次
    for (let i = 0; i < playCount; i++) {
      await new Promise<void>((resolve) => {
        audioRef.current = new Audio(audioData);
        audioRef.current.onended = () => {
          resolve();
        };
        audioRef.current.play();
      });
      
      // 如果不是最后一次播放，等待间隔时间
      if (i < playCount - 1 && playInterval > 0) {
        await new Promise(resolve => setTimeout(resolve, playInterval));
      }
    }
  };

  // 提交复习结果
  const submitReview = async (choice: string) => {
    if (practiceItems.length === 0 || currentIndex >= practiceItems.length) return;
    const item = practiceItems[currentIndex];
    try {
      const response = await fetch(`/api/listening-training/items/${item.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice }),
      });
      const data = await response.json();
      if (data.success) {
        setCompletedToday(prev => prev + 1);
        if (currentIndex < practiceItems.length - 1) {
          const nextIndex = currentIndex + 1;
          setCurrentIndex(nextIndex);
          // 根据用户设置决定是否自动播放下一个词条的语音
          if (userSettings.auto_play) {
            const nextItem = practiceItems[nextIndex];
            if (nextItem) {
              // 等待状态更新后再播放
              setTimeout(() => {
                playAudio(nextItem.content);
              }, 500);
            }
          }
        } else {
          // 复习完成
          messageApi.success('今日复习完成！');
          fetchPracticeItems();
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

  const currentItem = practiceItems[currentIndex];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>听力训练</Title>
      
      {/* 顶部选择栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <Select
            style={{ width: 200 }}
            placeholder="选择词书"
            value={selectedWordbook || undefined}
            onChange={setSelectedWordbook}
          >
            {wordbooks.map(wb => (
              <Option key={wb.id} value={wb.id}>{wb.name} ({wb.total_items}词)</Option>
            ))}
          </Select>
          
          <Space>
            <Button 
              type={activeTab === 'practice' ? 'primary' : 'default'}
              icon={<SoundOutlined />}
              onClick={() => setActiveTab('practice')}
            >
              练习
            </Button>
            <Button 
              type={activeTab === 'vocabulary' ? 'primary' : 'default'}
              icon={<BookOutlined />}
              onClick={() => setActiveTab('vocabulary')}
            >
              词本
            </Button>
            <Button 
              type={activeTab === 'wordbooks' ? 'primary' : 'default'}
              icon={<EyeOutlined />}
              onClick={() => setActiveTab('wordbooks')}
            >
              词书管理
            </Button>
            <Button 
              type={activeTab === 'settings' ? 'primary' : 'default'}
              icon={<SettingOutlined />}
              onClick={() => setActiveTab('settings')}
            >
              设置
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 练习页面 */}
      {activeTab === 'practice' && (
        <Card>
          <Spin spinning={loading} description="加载中...">
            {practiceItems.length > 0 && currentItem ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
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

                <div style={{ marginBottom: 40 }}>
                  <Text type="secondary">
                    当前: 第 {currentIndex + 1}/{practiceItems.length} 个 | 今日已复习: {completedToday}
                  </Text>
                  <Progress 
                    percent={Math.round((currentIndex / practiceItems.length) * 100)} 
                    showInfo={false}
                    style={{ marginTop: 8, maxWidth: 400, margin: '8px auto' }}
                  />
                </div>

                <Row justify="center" gutter={24}>
                  <Col>
                    <Button
                      size="large"
                      danger
                      style={{ width: 120, height: 50, fontSize: 15 }}
                      onClick={() => submitReview('unknown')}
                    >
                      没懂
                    </Button>
                  </Col>
                  <Col>
                    <Button
                      size="large"
                      type="primary"
                      style={{ width: 120, height: 50, fontSize: 15 }}
                      onClick={() => submitReview('known')}
                    >
                      懂了
                    </Button>
                  </Col>
                  <Col>
                    <Button
                      size="large"
                      style={{ width: 120, height: 50, backgroundColor: '#52c41a', color: '#fff', fontSize: 15 }}
                      onClick={() => submitReview('familiar')}
                    >
                      熟识
                    </Button>
                  </Col>
                </Row>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
                <Title level={4}>今日复习完成</Title>
                <Text type="secondary">当前没有需要复习的词条，请稍后再来</Text>
              </div>
            )}
          </Spin>
        </Card>
      )}

      {/* 词本页面 */}
      {activeTab === 'vocabulary' && (
        <Card>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button type={vocabularyStatus === 'all' ? 'primary' : 'default'} onClick={() => setVocabularyStatus('all')}>
                全部
              </Button>
              <Button type={vocabularyStatus === 'unknown' ? 'primary' : 'default'} onClick={() => setVocabularyStatus('unknown')}>
                没懂
              </Button>
              <Button type={vocabularyStatus === 'known' ? 'primary' : 'default'} onClick={() => setVocabularyStatus('known')}>
                懂了
              </Button>
              <Button type={vocabularyStatus === 'familiar' ? 'primary' : 'default'} onClick={() => setVocabularyStatus('familiar')}>
                熟识
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
      )}

      {/* 词书管理页面 */}
      {activeTab === 'wordbooks' && (
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
      )}

      {/* 设置页面 */}
      {activeTab === 'settings' && (
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
      )}

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
    </div>
  );
}
