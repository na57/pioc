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

### 4. Ant Design message/notification/modal 必须使用 App.useApp()

**规则**: 在 Next.js 中使用 Ant Design 的 `message`、`notification`、`modal` 等静态方法时，必须使用 `App` 组件的 `useApp()` 钩子获取实例，而不是直接导入静态方法。

**示例**:
```tsx
import { App } from 'antd';

// ✅ 正确用法 - 使用 App.useApp()
export default function MyPage() {
  const { message, notification, modal } = App.useApp();
  
  const handleClick = () => {
    message.success('操作成功');
    // 或
    message.error('操作失败');
  };
  
  return <div>...</div>;
}

// ❌ 错误用法 - 直接导入静态方法
import { message } from 'antd';

export default function MyPage() {
  const handleClick = () => {
    message.error('操作失败'); // 会产生警告
  };
  
  return <div>...</div>;
}
```

**原因**: Ant Design v6 中，静态方法（如 `message.error()`）无法消费动态主题上下文，会导致警告：`Static function can not consume context like dynamic theme. Please use 'App' component instead.`

---

### 5. Ant Design Space 组件必须使用 orientation 属性

**规则**: 使用 Ant Design 的 `Space` 组件时，必须使用 `orientation` 属性来设置方向，不要使用已弃用的 `direction` 属性。

**示例**:
```tsx
import { Space } from 'antd';

// ✅ 正确用法 - 使用 orientation 属性
<Space orientation="vertical" size="middle">
  <div>Item 1</div>
  <div>Item 2</div>
</Space>

<Space orientation="horizontal" size="large">
  <Button>按钮1</Button>
  <Button>按钮2</Button>
</Space>

// ❌ 错误用法 - 使用已弃用的 direction 属性
<Space direction="vertical" size="middle">
  <div>Item 1</div>
  <div>Item 2</div>
</Space>
```

**原因**: Ant Design v6 中 `Space` 组件的 `direction` 属性已被弃用，使用 `orientation` 替代。

---

### 6. Ant Design Drawer 组件必须使用 size 属性

**规则**: 使用 Ant Design 的 `Drawer` 组件时，必须使用 `size` 属性来设置宽度，不要使用已弃用的 `width` 属性。

**示例**:
```tsx
import { Drawer } from 'antd';

// ✅ 正确用法 - 使用 size 属性
<Drawer
  title="详情"
  size="large"  // 'default' | 'large'
  open={visible}
  onClose={onClose}
>
  内容
</Drawer>

// ❌ 错误用法 - 使用已弃用的 width 属性
<Drawer
  title="详情"
  width={600}
  open={visible}
  onClose={onClose}
>
  内容
</Drawer>
```

**原因**: Ant Design v6 中 `Drawer` 组件的 `width` 属性已被弃用，使用 `size` 替代，可选值为 `'default'` 或 `'large'`。

---

### 7. Ant Design Spin 组件必须使用 description 属性

**规则**: 使用 Ant Design 的 `Spin` 组件时，必须使用 `description` 属性来设置加载提示文字，不要使用已弃用的 `tip` 属性。

**示例**:
```tsx
import { Spin } from 'antd';

// ✅ 正确用法 - 使用 description 属性
<Spin spinning={loading} description="加载中...">
  <div>内容</div>
</Spin>

<Spin spinning={aiSummaryLoading} description="AI 正在分析教学数据...">
  <Card>
    <div>分析结果</div>
  </Card>
</Spin>

// ❌ 错误用法 - 使用已弃用的 tip 属性
<Spin spinning={loading} tip="加载中...">
  <div>内容</div>
</Spin>
```

**原因**: Ant Design v6 中 `Spin` 组件的 `tip` 属性已被弃用，使用 `description` 替代。

---

### 8. 数据库插入必须使用 UTF-8 编码

**规则**: 在数据库中插入数据时，必须使用 UTF-8 编码，确保中文和其他多字节字符正确存储和显示。

**SQL 脚本要求**:

1. **必须设置字符集**: 每个 SQL 脚本文件开头必须包含 `SET NAMES utf8mb4;`
2. **文件编码**: SQL 脚本文件本身必须保存为 UTF-8 编码（不带 BOM）
3. **docker 命令执行**: 使用 docker 执行 SQL 时，确保使用 `-i` 参数以支持 UTF-8

**示例**:

```sql
-- ✅ 正确用法 - SQL 脚本开头设置字符集
SET NAMES utf8mb4;

INSERT INTO t_dws_gxjx_yjskcxxmx (kch, kcmc, kcjj) VALUES
('YJS2024001', '高级算法设计', '本课程深入讲解高级算法设计技术...');
```

```bash
# ✅ 正确用法 - 使用 docker 执行 SQL 脚本
docker exec -i mysql mysql -uroot -proot123 mydb < /path/to/script.sql
```

**错误示例**:

```sql
-- ❌ 错误用法 - 未设置字符集
INSERT INTO t_dws_gxjx_yjskcxxmx (kch, kcmc) VALUES
('YJS2024001', 'é«˜çº§ç®—æ³•è®¾è®¡'); -- 乱码！
```

**验证方法**:

执行 SQL 后，查询数据验证中文显示正常：

```bash
docker exec mysql mysql -uroot -proot123 mydb -e "SET NAMES utf8mb4; SELECT kch, kcmc FROM t_dws_gxjx_yjskcxxmx;"
```

**注意事项**:
- 如果数据库表字符集不是 utf8mb4，需要先修改表字符集
- 对于已存在乱码的数据，需要删除后重新插入
- 建议在插入测试数据前，先清理表中已有的乱码数据

---

### 9. Ant Design List 组件已弃用，使用 Row/Col 替代

**规则**: Ant Design v6 中 `List` 组件已被标记为弃用，将在下一个主要版本中移除。应使用 `Row` 和 `Col` 组件替代。

**示例**:

```tsx
import { Row, Col, Card } from 'antd';

// ✅ 正确用法 - 使用 Row 和 Col 实现网格布局
<Row gutter={[16, 16]}>
  {dataList.map((item, index) => (
    <Col key={index} xs={24} sm={12} md={8} lg={8} xl={6} xxl={6}>
      <Card
        size="small"
        hoverable
        onClick={() => handleClick(item)}
        title={item.title}
      >
        {item.content}
      </Card>
    </Col>
  ))}
</Row>

// ❌ 错误用法 - 使用已弃用的 List 组件
import { List } from 'antd';

<List
  grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4, xxl: 4 }}
  dataSource={dataList}
  renderItem={(item) => (
    <List.Item>
      <Card>...</Card>
    </List.Item>
  )}
/>
```

**原因**: Ant Design v6 中 `List` 组件已被弃用，使用 `Row` 和 `Col` 替代可获得更好的灵活性和性能。

---

### 10. Ant Design Avatar 组件 src 属性不能传入空字符串

**规则**: 使用 Ant Design 的 `Avatar` 组件时，`src` 属性不能传入空字符串 (`""`)，应该传入 `null` 或 `undefined`，否则会导致浏览器重新下载整个页面。

**示例**:

```tsx
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

// ✅ 正确用法 - 将空字符串转换为 null
<Avatar
  src={record.zp || null}
  icon={<UserOutlined />}
  size="small"
/>

<Avatar
  src={user.avatar || null}
  icon={<UserOutlined />}
  size={80}
/>

// ❌ 错误用法 - 直接传入可能为空的字符串
<Avatar
  src={record.zp}  // 当 zp 为 "" 时会触发错误
  icon={<UserOutlined />}
  size="small"
/>
```

**原因**: 当 `img` 标签的 `src` 属性为空字符串时，浏览器会将其解析为当前页面 URL，导致重新下载整个页面，产生性能问题和控制台警告。

---

### 11. Ant Design Tabs 组件必须使用 items 属性

**规则**: 使用 Ant Design 的 `Tabs` 组件时，必须使用 `items` 属性来配置标签页，不要使用已弃用的 `TabPane` 子组件。

**示例**:

```tsx
import { Tabs } from 'antd';

// ✅ 正确用法 - 使用 items 属性
<Tabs
  activeKey={activeTab}
  onChange={setActiveTab}
  items={[
    {
      key: 'basic',
      label: '基本信息',
      children: <BasicInfo />,
    },
    {
      key: 'detail',
      label: '详细信息',
      children: <DetailInfo />,
    },
  ]}
/>

// ❌ 错误用法 - 使用已弃用的 TabPane 子组件
<Tabs activeKey={activeTab} onChange={setActiveTab}>
  <TabPane tab="基本信息" key="basic">
    <BasicInfo />
  </TabPane>
  <TabPane tab="详细信息" key="detail">
    <DetailInfo />
  </TabPane>
</Tabs>
```

**原因**: Ant Design v6 中 `Tabs.TabPane` 组件已被弃用，使用 `items` 属性替代可获得更好的类型支持和性能。

---

### 12. Ant Design Table 组件 rowKey 不要使用 index 参数

**规则**: 使用 Ant Design 的 `Table` 组件时，`rowKey` 属性如果是函数，不要使用第二个参数 `index`，应该使用数据本身的唯一字段或者从 record 中组合生成 key。

**示例**:

```tsx
import { Table } from 'antd';

// ✅ 正确用法 - 使用数据字段名（推荐）
<Table
  dataSource={papers}
  rowKey="lwbh"  // 使用数据中的唯一字段
/>

// ✅ 正确用法 - 使用 record 组合生成 key
<Table
  dataSource={workloads}
  rowKey={(record) => `${record.kch}-${record.xnxqdm}`}
/>

// ❌ 错误用法 - 使用 index 参数（已弃用）
<Table
  dataSource={papers}
  rowKey={(record, index) => `paper-${index}`}  // index 参数已弃用
/>
```

**原因**: Ant Design v6 中 `rowKey` 函数的第二个参数 `index` 已被弃用，不再保证按预期工作。使用数据本身的唯一标识字段可以获得更好的性能和稳定性。

---

### 13. Ant Design Timeline 组件必须使用 items 属性

**规则**: 使用 Ant Design 的 `Timeline` 组件时，必须使用 `items` 属性来配置时间线节点，不要使用已弃用的 `Timeline.Item` 子组件。同时，`items` 中的内容字段应使用 `content` 而非 `children`。

**示例**:

```tsx
import { Timeline } from 'antd';
import type { TimelineProps } from 'antd';

// ✅ 正确用法 - 使用 items 属性，内容字段使用 content
const timelineItems: TimelineProps['items'] = items.map((item) => ({
  key: item.id,
  dot: typeIcons[item.type],
  color: typeColors[item.type],
  content: (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Tag color={typeColors[item.type]}>
          <FriendlyTime date={item.date} />
        </Tag>
        {item.isCurrent && <Tag color="green">当前</Tag>}
      </div>
      <div style={{ fontWeight: 500 }}>{item.title}</div>
      {item.description && (
        <div style={{ color: '#666', marginTop: 4 }}>{item.description}</div>
      )}
    </div>
  ),
}));

<Timeline mode="alternate" items={timelineItems} />

// ❌ 错误用法 - 使用已弃用的 Timeline.Item 子组件
<Timeline mode="alternate">
  {items.map((item) => (
    <Timeline.Item
      key={item.id}
      dot={typeIcons[item.type]}
      color={typeColors[item.type]}
    >
      <div style={{ marginBottom: 8 }}>
        <Tag color={typeColors[item.type]}>
          <FriendlyTime date={item.date} />
        </Tag>
        {item.isCurrent && <Tag color="green">当前</Tag>}
      </div>
      <div style={{ fontWeight: 500 }}>{item.title}</div>
      {item.description && (
        <div style={{ color: '#666', marginTop: 4 }}>{item.description}</div>
      )}
    </Timeline.Item>
  ))}
</Timeline>

// ❌ 错误用法 - items 中使用 children 而非 content
const timelineItems: TimelineProps['items'] = items.map((item) => ({
  key: item.id,
  dot: typeIcons[item.type],
  color: typeColors[item.type],
  children: <div>...</div>,  // 错误！应使用 content
}));
```

**原因**: 
- Ant Design v6 中 `Timeline.Item` 子组件已被弃用，使用 `items` 属性替代可获得更好的类型支持和性能。
- `items` 中的内容字段应使用 `content`，`children` 已被弃用。

---

## 检查清单

在提交代码前，请检查：

- [ ] 所有操作按钮是否使用了 ActionButton 组件
- [ ] 所有时间显示是否使用了 FriendlyTime 组件
- [ ] 时间列是否设置了固定宽度（建议 120px）
- [ ] Alert 组件是否使用了 title 属性而非 message 属性
- [ ] message/notification/modal 是否使用了 App.useApp() 而非直接导入静态方法
- [ ] Space 组件是否使用了 orientation 属性而非 direction 属性
- [ ] Drawer 组件是否使用了 size 属性而非 width 属性
- [ ] Spin 组件是否使用了 description 属性而非 tip 属性
- [ ] SQL 脚本是否包含 `SET NAMES utf8mb4;` 字符集设置
- [ ] 插入的中文数据是否正确显示，无乱码
- [ ] 是否避免使用已弃用的 List 组件（使用 Row/Col 替代）
- [ ] Avatar 组件的 src 属性是否为 null/undefined 而非空字符串
- [ ] Tabs 组件是否使用了 items 属性而非 TabPane 子组件
- [ ] Table 组件 rowKey 是否避免使用 index 参数
- [ ] Timeline 组件是否使用了 items 属性而非 Timeline.Item 子组件
