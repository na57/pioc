'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Descriptions,
  Typography,
  App,
  Spin,
  Empty,
  Tag,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import FriendlyTime from '@/components/FriendlyTime';
import ActionButton from '@/app/tags/components/ActionButton';
import type { ITAsset, DNSRecordDetail } from '@/lib/services/it-asset-center';
import { AssetDetailView } from '@/app/it-asset-center/components/AssetDetailView';

const { Title } = Typography;

export default function AssetDetailPage() {
  const params = useParams();
  const assetId = decodeURIComponent(params.assetId as string);
  const assetType = params.assetType as string;
  const { message } = App.useApp();
  const messageRef = useRef(message);
  messageRef.current = message;
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const handleUnauthorized = useCallback(() => {
    routerRef.current.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }, []);

  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<ITAsset | null>(null);
  const [dnsRecord, setDnsRecord] = useState<DNSRecordDetail | null>(null);
  const [systemInfo, setSystemInfo] = useState<{ id: string; name: string; code?: string } | null>(null);

  const isDNSRecord = assetType === 'dns_record';

  const fetchAsset = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({ action: 'asset-detail', id: assetId });
      queryParams.set('asset_type', assetType);
      const response = await fetch(`/api/it-asset-center?${queryParams.toString()}`);
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      const result = await response.json();
      if (result.success) {
        if (isDNSRecord) {
          setDnsRecord(result.data.asset as DNSRecordDetail);
        } else {
          setAsset(result.data.asset as ITAsset);
        }
      } else {
        console.error('[AssetDetailPage] 获取资产详情失败:', { assetType, assetId, error: result.error });
        messageRef.current.error(result.error || '获取资产详情失败');
      }
    } catch (err) {
      console.error('[AssetDetailPage] 获取资产详情异常:', { assetType, assetId, error: err });
      messageRef.current.error('获取资产详情失败');
    }
  }, [assetId, assetType, isDNSRecord, handleUnauthorized]);

  const fetchSystemInfo = useCallback(async (systemId: string) => {
    try {
      const response = await fetch(`/api/it-asset-center?action=system-detail&id=${systemId}`);
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      const result = await response.json();
      if (result.success && result.data.system) {
        setSystemInfo({
          id: result.data.system.id,
          name: result.data.system.name,
          code: result.data.system.code,
        });
      }
    } catch {
      // 静默失败
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    setLoading(true);
    fetchAsset().finally(() => {
      setLoading(false);
    });
  }, [fetchAsset]);

  useEffect(() => {
    if (asset?.system_id && !isDNSRecord) {
      fetchSystemInfo(asset.system_id);
    }
  }, [asset, fetchSystemInfo, isDNSRecord]);

  const renderDNSRecordDetails = () => {
    if (!dnsRecord) return null;

    const column = isMobile() ? 1 : 2;

    const items: Array<{ label: string; value: React.ReactNode; span?: number }> = [
      { label: '记录域名', value: dnsRecord.domain || '-' },
      { label: '记录类型', value: <Tag>{dnsRecord.record_type || '-'}</Tag> },
      { label: '记录值', value: dnsRecord.record_value || '-' },
      { label: 'TTL', value: dnsRecord.ttl || '-' },
      { label: '网络类别', value: dnsRecord.network_category || '-' },
      { label: '域名状态', value: dnsRecord.domain_status || '-' },
      { label: '审核状态', value: dnsRecord.audit_status || '-' },
      { label: '反向解析域名', value: dnsRecord.reverse_domain || '-' },
      { label: '到期策略', value: dnsRecord.expiry_policy || '-' },
      { label: '是否启用有效期', value: dnsRecord.enable_validity || '-' },
      { label: '过期时间', value: dnsRecord.expiry_date ? <FriendlyTime date={dnsRecord.expiry_date} /> : '-' },
      { label: '创建时间', value: dnsRecord.created_at ? <FriendlyTime date={dnsRecord.created_at} /> : '-' },
      { label: '更新时间', value: dnsRecord.updated_at ? <FriendlyTime date={dnsRecord.updated_at} /> : '-' },
      { label: '备注', value: dnsRecord.remark || '-' },
    ];

    fixSpan(items, column);

    return (
      <Descriptions bordered column={column}>
        {items.map((it, idx) => (
          <Descriptions.Item key={`${it.label}-${idx}`} label={it.label} span={it.span}>
            {it.value}
          </Descriptions.Item>
        ))}
      </Descriptions>
    );
  };

  const pageTitle = isDNSRecord
    ? dnsRecord
      ? `${dnsRecord.record_type} - ${dnsRecord.domain}`
      : 'DNS 记录详情'
    : asset?.name || '资产详情';
  const notFound = !loading && (isDNSRecord ? !dnsRecord : !asset);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/it-asset-center?tab=assets">
          <ActionButton icon={<ArrowLeftOutlined />} tooltip="返回资产列表" />
        </Link>
        <Title level={3} style={{ margin: 0 }}>
          {pageTitle}
        </Title>
      </div>

      <Spin spinning={loading} description="加载中...">
        {notFound ? (
          <Empty description="资产不存在" />
        ) : isDNSRecord ? (
          <Card title="基本信息">
            {renderDNSRecordDetails()}
          </Card>
        ) : asset ? (
          <AssetDetailView asset={asset} systemInfo={systemInfo} />
        ) : null}
      </Spin>
    </div>
  );
}

function fixSpan(items: Array<{ label: string; value: React.ReactNode; span?: number }>, column: number) {
  let rowSpan = 0;
  for (let i = 0; i < items.length; i++) {
    const span = items[i].span ?? 1;
    if (rowSpan + span > column && rowSpan > 0) {
      if (rowSpan < column) {
        const lastIdxOfPrevRow = i - 1;
        const cur = items[lastIdxOfPrevRow].span ?? 1;
        items[lastIdxOfPrevRow].span = cur + (column - rowSpan);
      }
      rowSpan = span;
    } else if (rowSpan + span === column) {
      rowSpan = 0;
    } else {
      rowSpan += span;
    }
  }
  if (rowSpan > 0 && rowSpan < column) {
    const lastIdx = items.length - 1;
    const cur = items[lastIdx].span ?? 1;
    items[lastIdx].span = cur + (column - rowSpan);
  }
}

function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}
