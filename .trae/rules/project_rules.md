# PIOC 项目开发规范

## 组件使用规范

### 1. 操作按钮必须使用 ActionButton 组件

**规则**: 所有页面中的操作按钮（如编辑、删除、查看等）必须使用 `ActionButton` 组件，保持统一的样式和交互体验。

**示例**:
```tsx
import ActionButton from '@/app/tags/components/ActionButton';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';

// ✅ 正确用法
<ActionButton
  icon={<EditOutlined />}
  tooltip="编辑"
  onClick={() => handleEdit(record.id)}
/>

<ActionButton
  icon={<DeleteOutlined />}
  tooltip="删除"
  danger
  confirmTitle="确认删除"
  confirmDescription="确定要删除吗？"
  onConfirm={() => handleDelete(record.id)}
/>

// ❌ 错误用法 - 直接使用 Ant Design Button
<Button icon={<EditOutlined />} onClick={() => handleEdit(record.id)}>编辑</Button>
```

**ActionButton 组件特性**:
- `icon`: 按钮图标（必需）
- `tooltip`: 鼠标悬停提示文字
- `danger`: 是否为危险操作（红色样式）
- `confirmTitle` / `confirmDescription`: 确认对话框标题和描述（设置后会显示确认弹窗）
- `onClick`: 点击回调（无确认对话框时使用）
- `onConfirm`: 确认回调（有确认对话框时使用）

---

### 2. 时间显示必须使用 FriendlyTime 组件

**规则**: 所有页面中显示时间的地方必须使用 `FriendlyTime` 组件，提供友好的相对时间显示。

**示例**:
```tsx
import FriendlyTime from '@/components/FriendlyTime';

// ✅ 正确用法 - 在表格列中使用
{
  title: '创建时间',
  dataIndex: 'created_at',
  key: 'created_at',
  width: 120,
  render: (text: string) => <FriendlyTime date={text} />,
}

// ✅ 正确用法 - 直接使用
<FriendlyTime date={task.created_at} />

// ✅ 正确用法 - 使用格式化函数
import { formatFriendlyTime } from '@/components/FriendlyTime';
const timeText = formatFriendlyTime(created_at);

// ❌ 错误用法 - 直接显示完整时间
<span>{new Date(created_at).toLocaleString()}</span>
```

**FriendlyTime 组件特性**:
- `date`: 日期时间（支持 string 或 Date 类型）
- `className`: 自定义 CSS 类名
- `style`: 自定义样式
- 显示规则：
  - 小于 60 秒：显示"刚刚"
  - 小于 60 分钟：显示"xx分钟前"
  - 小于 24 小时：显示"xx小时前"
  - 小于 7 天：显示"xx天前"
  - 超过 7 天：显示 `yyyy/m/d` 格式
- 鼠标悬停显示完整时间

---

### 3. Ant Design Alert 组件必须使用 title 属性

**规则**: 使用 Ant Design 的 `Alert` 组件时，必须使用 `title` 属性，不要使用已弃用的 `message` 属性。

**示例**:
```tsx
import { Alert } from 'antd';

// ✅ 正确用法 - 使用 title 属性
<Alert
  title="提示信息"
  type="info"
/>

<Alert
  title={`显示模板: ${template} | 主键字段: ${pk}`}
  type="info"
  style={{ marginBottom: 16 }}
/>

// ❌ 错误用法 - 使用已弃用的 message 属性
<Alert
  message="提示信息"
  type="info"
/>
```

**原因**: Ant Design v6 中 `Alert` 组件的 `message` 属性已被弃用，使用 `title` 替代。

---

## 检查清单

在提交代码前，请检查：

- [ ] 所有操作按钮是否使用了 ActionButton 组件
- [ ] 所有时间显示是否使用了 FriendlyTime 组件
- [ ] 时间列是否设置了固定宽度（建议 120px）
- [ ] Alert 组件是否使用了 title 属性而非 message 属性
