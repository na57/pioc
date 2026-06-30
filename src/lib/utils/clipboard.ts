/**
 * 复制文本到剪贴板（兼容 Safari 等非 HTTPS 环境）
 *
 * navigator.clipboard.writeText 仅在安全上下文（HTTPS 或 localhost）下可用，
 * Safari 在 HTTP 环境下 navigator.clipboard 为 undefined。
 * 此函数提供 fallback 方案：使用 document.execCommand('copy')。
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  // Fallback: 使用 textarea + execCommand
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const success = document.execCommand('copy');
    if (!success) {
      throw new Error('execCommand copy failed');
    }
  } finally {
    document.body.removeChild(textarea);
  }
}
