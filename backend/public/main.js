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
        `${name}: ${
          Array.isArray(value) ? value.join(', ') : String(value)
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
  });

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
}

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

async function fetchLogs() {
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
