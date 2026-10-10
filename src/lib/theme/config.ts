import { ThemeConfig } from 'antd';

const theme: ThemeConfig = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
    // 扁平范式：布局底色与卡片同色（白色画布），层级靠 1px 发丝边框区分
    colorBgLayout: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Layout: {
      headerBg: '#001529',
      siderBg: '#001529',
    },
    Menu: {
      darkItemBg: '#001529',
      darkItemSelectedBg: '#1890ff',
    },
    // 扁平范式表格：表头与白色画布同色（透明），去除列间竖分隔线，
    // 列名加粗 + 表头底线与行分隔线承担结构（Notion/Linear 风格）
    Table: {
      headerBg: 'transparent',
      headerSplitColor: 'transparent',
    },
  },
};

export default theme;
