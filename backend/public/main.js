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


async function fetchExpectations() {
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
}

async function fetchLogs() {
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
}
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
