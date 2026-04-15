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
