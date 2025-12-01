
// 每页日志数量（可按需调整）
const LOGS_PAGE_SIZE = 10;

// 日志原始数据 & 当前页
let allLogs = [];
let currentLogsPage = 1;

// Body 字段格式化
function formatBody(body) {
  if (!body) return '';

  if (typeof body === 'string') return body;

  // MockServer body 通用结构：
  // { "type": "STRING", "string": "..." }
  // { "type": "JSON",   "value": "{...}" }
  // 以及部分历史版本 / 场景下的 json / rawJson 字段
  if (typeof body === 'object') {
    // 优先从这些字段里取真正内容
    const candidate =
      body.value !== undefined
        ? body.value
        : body.string !== undefined
          ? body.string
          : body.json !== undefined
            ? body.json
            : body.rawJson !== undefined
              ? body.rawJson
              : null;

    if (candidate != null) {
      if (typeof candidate === 'string') {
        // 尝试按 JSON 美化
        try {
          return JSON.stringify(JSON.parse(candidate), null, 2);
        } catch {
          return candidate;
        }
      }
      try {
        return JSON.stringify(candidate, null, 2);
      } catch {
        return String(candidate);
      }
    }
  }

  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return String(body);
  }
}

// Headers 格式化：统一为 "name: value" 多行文本
function formatHeaders(headers) {
  if (!headers) return '';

  // 1) 记录请求里常见：{ name: [values] }
  if (!Array.isArray(headers) && typeof headers === 'object') {
    return Object.entries(headers)
      .map(([name, value]) =>
        `${name}: ${Array.isArray(value) ? value.join(', ') : String(value)}`
      )
      .join('\n');
  }

  // 2) Expectations / HttpResponse 等：[{ name, values }]
  if (Array.isArray(headers)) {
    return headers
      .map(
        h => `${h.name}: ${(h.values || []).join(', ')}`
      )
      .join('\n');
  }

  return String(headers);
}

// HTML 转义（避免 <textarea> / <pre> 里 XSS 问题）
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Body 折叠渲染：只显示前 maxLines 行 +「展开全部」
function renderCollapsibleBody(text, maxLines = 20) {
  if (!text) return '<em>无内容</em>';

  const str = String(text);
  const lines = str.split(/\r?\n/);

  // 不超过 maxLines：直接全部显示
  if (lines.length <= maxLines) {
    return `<pre>${escapeHtml(str)}</pre>`;
  }

  const head = lines.slice(0, maxLines).join('\n');
  const full = lines.join('\n');

  return `
    <pre>${escapeHtml(head)}\n...（共 ${lines.length} 行，已截断）</pre>
    <details>
      <summary>展开全部</summary>
      <pre>${escapeHtml(full)}</pre>
    </details>
  `;
}

async function checkHealth() {
  const dot = document.getElementById('health-dot');
  const text = document.getElementById('health-text');
  if (!dot || !text) return;

  try {
    const res = await fetch('/api/health');
    const data = await res.json();

    if (data.ok) {
      dot.className = 'health-dot healthy';
      text.textContent = 'MockServer: 正常';
    } else {
      dot.className = 'health-dot unhealthy';
      text.textContent = 'MockServer: 异常';
    }
  } catch (e) {
    dot.className = 'health-dot unhealthy';
    text.textContent = 'MockServer: 无法连接';
  }
}
function formatBody(body) {
  if (!body) return '';

  if (typeof body === 'string') return body;

  // MockServer 的 body 结构：{ type: 'STRING' | 'JSON', string / value: ... }
  if (body.type === 'STRING' && typeof body.string === 'string') {
    return body.string;
  }

  if (body.type === 'JSON' && body.value) {
    if (typeof body.value === 'string') {
      try {
        return JSON.stringify(JSON.parse(body.value), null, 2);
      } catch {
        return body.value;
      }
    }
    try {
      return JSON.stringify(body.value, null, 2);
    } catch {
      return String(body.value);
    }
  }

  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return String(body);
  }
}

function formatHeaders(headers) {
  if (!headers) return '';

  // 记录请求：headers 可能是 { name: [values] }
  if (!Array.isArray(headers) && typeof headers === 'object') {
    return Object.entries(headers)
      .map(([name, value]) =>
        `${name}: ${Array.isArray(value) ? value.join(', ') : String(value)
        }`
      )
      .join('\n');
  }

  // expectations：headers 是 [{ name, values }]
  if (Array.isArray(headers)) {
    return headers
      .map(
        h => `${h.name}: ${(h.values || []).join(', ')}`
      )
      .join('\n');
  }

  return String(headers);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* async function fetchExpectations() {
  const res = await fetch('/api/expectations');
  const data = await res.json();
  const tbody = document.querySelector('#exp-table tbody');
  tbody.innerHTML = '';

  (data || []).forEach(exp => {
    const tr = document.createElement('tr');

    const method = exp.httpRequest?.method || '';
    const path = exp.httpRequest?.path || '';
    const statusCode = exp.httpResponse?.statusCode || '';

    const requestBody = formatBody(exp.httpRequest?.body);
    const responseBody = formatBody(exp.httpResponse?.body);

    tr.innerHTML = `
      <td>${method}</td>
      <td>${path}</td>
      <td>${statusCode}</td>
      <td>
        <button
          data-method="${method}"
          data-path="${path}"
          class="btn-danger btn-del"
        >
          删除
        </button>

        <details style="margin-top:4px;">
          <summary>请求 Body</summary>
          <pre>${escapeHtml(requestBody)}</pre>
        </details>

        <details style="margin-top:4px;">
          <summary>响应 Body</summary>
          <pre>${escapeHtml(responseBody)}</pre>
        </details>
      </td>
    `;

    tbody.appendChild(tr);
  }); */

async function fetchExpectations() {
  const res = await fetch('/api/expectations');
  const data = await res.json();
  const tbody = document.querySelector('#exp-table tbody');
  tbody.innerHTML = '';

  (data || []).forEach(exp => {
    const tr = document.createElement('tr');

    const method = exp.httpRequest?.method || '';
    const path = exp.httpRequest?.path || '';
    const statusCode = exp.httpResponse?.statusCode || '';

    const requestBodyText = formatBody(exp.httpRequest?.body);
    const responseBodyText = formatBody(exp.httpResponse?.body);

    tr.innerHTML = `
      <td>${method}</td>
      <td>${path}</td>
      <td>${statusCode}</td>
      <td> 
        <details style="margin-top:4px;">
          <summary>请求 Body</summary>
          ${renderCollapsibleBody(requestBodyText, 20)}
        </details>

        <details style="margin-top:4px;">
          <summary>响应 Body</summary>
          ${renderCollapsibleBody(responseBodyText, 20)}
        </details>
      </td>
      <td>
        <button
          data-method="${method}"
          data-path="${path}"
          class="btn-danger btn-del"
        >
          删除
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // 保留原本的删除逻辑
  document.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const method = btn.getAttribute('data-method');
      const path = btn.getAttribute('data-path');
      if (!confirm(`确认删除 ${method} ${path} 的 expectation？`)) return;
      await fetch('/api/expectations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, path })
      });
      fetchExpectations();
    });
  });
}
/* 

// 保持原有删除逻辑不变
document.querySelectorAll('.btn-del').forEach(btn => {
  btn.addEventListener('click', async () => {
    const method = btn.getAttribute('data-method');
    const path = btn.getAttribute('data-path');
    if (!confirm(`确认删除 ${method} ${path} 的 expectation？`)) return;
    await fetch('/api/expectations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, path })
    });
    fetchExpectations();
  });
});
} */

/* async function fetchExpectations() {
  const res = await fetch('/api/expectations');
  const data = await res.json();
  const tbody = document.querySelector('#exp-table tbody');
  tbody.innerHTML = '';

  (data || []).forEach((exp, idx) => {
    const tr = document.createElement('tr');

    const method = exp.httpRequest?.method || '';
    const path = exp.httpRequest?.path || '';
    const statusCode = exp.httpResponse?.statusCode || '';

    tr.innerHTML = `
      <td>${method}</td>
      <td>${path}</td>
      <td>${statusCode}</td>
      <td>
        <button data-method="${method}" data-path="${path}" class="btn-danger btn-del">删除</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  document.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const method = btn.getAttribute('data-method');
      const path = btn.getAttribute('data-path');
      if (!confirm(`确认删除 ${method} ${path} 的 expectation？`)) return;
      await fetch('/api/expectations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, path })
      });
      fetchExpectations();
    });
  });
} */

function setLogsData(list) {
  allLogs = Array.isArray(list) ? list : [];
  currentLogsPage = 1;
  renderLogsPage();
}

// 根据当前 allLogs + path 过滤 + 时间倒序，得到最终列表
function getFilteredSortedLogs() {
  const pathInput = document.getElementById('log-path-filter');
  const filter = pathInput ? pathInput.value.trim() : '';

  let logs = allLogs.slice();

  if (filter) {
    logs = logs.filter(item =>
      (item.path || '').startsWith(filter)
    );
  }

  // 按时间倒序（新 -> 旧），没有时间的放最后
  logs.sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0;
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return a.timestamp < b.timestamp ? 1 : -1;
  });

  return logs;
}

// 渲染当前页日志
function renderLogsPage(page) {
  const container = document.getElementById('logs');
  const pageInfo = document.getElementById('logs-page-info');
  if (!container) return;

  const logs = getFilteredSortedLogs();
  const total = logs.length;
  const pageSize = LOGS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  currentLogsPage = page
    ? Math.min(Math.max(page, 1), totalPages)
    : Math.min(Math.max(currentLogsPage, 1), totalPages);

  container.innerHTML = '';

  if (!total) {
    container.textContent = '暂无请求日志';
    if (pageInfo) pageInfo.textContent = '';
    return;
  }

  const start = (currentLogsPage - 1) * pageSize;
  const pageItems = logs.slice(start, start + pageSize);

  pageItems.forEach(item => {
    const method = item.method || '';
    const path = item.path || '';
    const timeText = item.timestamp || '';
    const statusCode =
      item.responseStatusCode !== null &&
        item.responseStatusCode !== undefined
        ? String(item.responseStatusCode)
        : '';

    const reqHeadersText = formatHeaders(item.requestHeaders);
    const reqBodyText = formatBody(item.requestBody);
    const respHeadersText = formatHeaders(item.responseHeaders);
    const respBodyText = formatBody(item.responseBody);

    const div = document.createElement('div');
    div.innerHTML = `
      <div>
        <strong>${escapeHtml(method)} ${escapeHtml(path)}</strong>
        ${timeText
        ? `<span style="margin-left:8px;color:#666;">${escapeHtml(
          timeText
        )}</span>`
        : ''
      }
        ${statusCode
        ? `<span style="margin-left:8px;color:#666;">状态: ${escapeHtml(
          statusCode
        )}</span>`
        : ''
      }
      </div>
      <details style="margin-top:4px;">
        <summary>查看完整请求 / 响应</summary>
        <div style="margin-top:4px;">
          <strong>Request Headers</strong>
          ${renderCollapsibleBody(reqHeadersText, 20)}
        </div>
        <div style="margin-top:4px;">
          <strong>Request Body</strong>
          ${renderCollapsibleBody(reqBodyText, 20)}
        </div>
        <div style="margin-top:4px;">
          <strong>Response Headers</strong>
          ${renderCollapsibleBody(respHeadersText, 20)}
        </div>
        <div style="margin-top:4px;">
          <strong>Response Body</strong>
          ${renderCollapsibleBody(respBodyText, 20)}
        </div>
      </details>
      <hr />
    `;
    container.appendChild(div);
  });

  if (pageInfo) {
    pageInfo.textContent = `第 ${currentLogsPage} / ${totalPages} 页，共 ${total} 条`;
  }
}

async function fetchLogs() {
  const res = await fetch('/api/logs');
  const data = await res.json();
  setLogsData(data);
}


/* async function fetchLogs() {
  const container = document.getElementById('logs');
  const pathInput = document.getElementById('log-path-filter');
  const pathFilter = (pathInput && pathInput.value.trim()) || '';

  const res = await fetch('/api/logs');
  let data = await res.json();

  if (!Array.isArray(data)) {
    data = [];
  }

  // MockServer 返回的顺序是按时间正序，这里反转 -> 时间倒序（最新在前）
  const reversed = data.slice().reverse();

  // 本地按 path 过滤（简单前缀匹配，也可以改成 includes）
  const filtered = pathFilter
    ? reversed.filter(req => (req.path || '').startsWith(pathFilter))
    : reversed;

  // 最多显示 50 条，避免太长
  const latest = filtered.slice(0, 50);

  container.innerHTML = '';

  if (!latest.length) {
    container.textContent = '暂无请求日志';
    return;
  }

  latest.forEach((req, index) => {
    const method = req.method || '';
    const path = req.path || '';
    const headersText = formatHeaders(req.headers);
    const bodyText = formatBody(req.body);

    const div = document.createElement('div');
    div.innerHTML = `
      <pre>${index + 1}. ${method} ${path}</pre>
      <details>
        <summary>查看完整请求</summary>
        <pre>Headers:
${escapeHtml(headersText)}

Body:
${escapeHtml(bodyText)}</pre>
      </details>
      <hr />
    `;
    container.appendChild(div);
  });
}

 */
/* async function fetchLogs() {
  const res = await fetch('/api/logs');
  const data = await res.json();
  const container = document.getElementById('logs');
  container.innerHTML = '';

  (data || []).slice(-20).reverse().forEach(req => {
    const div = document.createElement('div');
    const method = req.method || '';
    const path = req.path || '';
    const body = req.body || '';
    div.innerHTML = `
      <pre>${method} ${path}\n${body}</pre>
    `;
    container.appendChild(div);
  });
} */
/* 
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('create-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = {
      method: formData.get('method'),
      path: formData.get('path'),
      body: formData.get('body'),
      statusCode: Number(formData.get('statusCode') || 200),
      responseBody: formData.get('responseBody')
    };
    const res = await fetch('/api/expectations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      alert('创建失败');
      return;
    }
    alert('创建成功');
    form.reset();
    fetchExpectations();
  }); */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('create-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = {
      method: formData.get('method'),
      path: formData.get('path'),
      body: formData.get('body'),
      statusCode: Number(formData.get('statusCode') || 200),
      responseBody: formData.get('responseBody')
    };
    const res = await fetch('/api/expectations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      alert('创建失败');
      return;
    }
    alert('创建成功');
    form.reset();
    fetchExpectations();
  });

  document.getElementById('reset-all').addEventListener('click', async () => {
    if (!confirm('确认删除所有 expectations？')) return;
    await fetch('/api/expectations/all', { method: 'DELETE' });
    fetchExpectations();
  });
  /* 
    const pathInput = document.getElementById('log-path-filter');
    if (pathInput) {
      // 输入时立即按 path 过滤并回到第一页
      pathInput.addEventListener('input', () => {
        currentLogsPage = 1;
        renderLogsPage();
      });
    }
  
    const prevBtn = document.getElementById('logs-prev');
    const nextBtn = document.getElementById('logs-next');
  
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentLogsPage > 1) {
          currentLogsPage -= 1;
          renderLogsPage();
        }
      });
    }
  
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentLogsPage += 1;
        renderLogsPage();
      });
    }
   */

  document.getElementById('refresh-exp').addEventListener('click', fetchExpectations);
  document.getElementById('refresh-logs').addEventListener('click', fetchLogs);

  // 初始加载
  fetchExpectations();
  fetchLogs();

  // ✅ 健康检查：启动时检查一次
  checkHealth();
  // ✅ 每 5 秒检查一次
  setInterval(checkHealth, 5000);
});
