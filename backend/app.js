// app.js
const express = require('express');
const axios = require('axios');

const app = express();

// 从环境变量读取 MockServer 地址
const MOCKSERVER_HOST = process.env.MOCKSERVER_HOST || 'localhost';
const MOCKSERVER_PORT = process.env.MOCKSERVER_PORT || 1080;
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const mockServerBase = `http://${MOCKSERVER_HOST}:${MOCKSERVER_PORT}`;

// -----------------------------------------------------------------------------
// 获取当前 active expectations
// MockServer: PUT /mockserver/retrieve?type=ACTIVE_EXPECTATIONS[&format=JSON]
// body 是 request matcher，这里用 {} 表示不过滤
// -----------------------------------------------------------------------------
app.get('/api/expectations', async (_req, res) => {
  try {
    const response = await axios.put(
      `${mockServerBase}/mockserver/retrieve?type=ACTIVE_EXPECTATIONS&format=JSON`,
      {}, // 空 matcher
      { headers: { 'Content-Type': 'application/json' } }
    );
    res.json(response.data || []);
  } catch (err) {
    console.error(
      'Error retrieving expectations:',
      err?.response?.data || err.message
    );
    res.status(500).json({ error: 'Failed to retrieve expectations' });
  }
});

// -----------------------------------------------------------------------------
// 新增 expectation
// MockServer: PUT /mockserver/expectation
// body: 完整的 expectation JSON
// -----------------------------------------------------------------------------
app.post('/api/expectations', async (req, res) => {
  const { method, path, body, statusCode, responseBody } = req.body;

  if (!method || !path) {
    return res.status(400).json({ error: 'method 和 path 必填' });
  }

  const expectation = {
    httpRequest: {
      method: method.toUpperCase(),
      path: path
    },
    httpResponse: {
      statusCode: statusCode || 200,
      headers: [
        {
          name: 'Content-Type',
          values: ['application/json; charset=utf-8']
        }
      ],
      body: responseBody || '{}'
    }
  };

  // 如果需要对请求 body 做匹配，则加上 STRING matcher
  if (body && body.trim() !== '') {
    expectation.httpRequest.body = {
      type: 'STRING',
      string: body
    };
  }

  try {
    const response = await axios.put(
      `${mockServerBase}/mockserver/expectation`,
      expectation,
      { headers: { 'Content-Type': 'application/json' } }
    );
    res.json({ success: true, result: response.data });
  } catch (err) {
    console.error(
      'Error creating expectation:',
      err?.response?.data || err.message
    );
    res.status(500).json({ error: 'Failed to create expectation' });
  }
});

// -----------------------------------------------------------------------------
// 按 method + path 删除 expectations
// MockServer: PUT /mockserver/clear
// body: request matcher（例如 { "httpRequest": { "method": "POST", "path": "/xxx" } } ）
// -----------------------------------------------------------------------------
app.delete('/api/expectations', async (req, res) => {
  const { method, path } = req.body;

  if (!method || !path) {
    return res.status(400).json({ error: 'method 和 path 必填' });
  }

  const criteria = {
    httpRequest: {
      method: method.toUpperCase(),
      path: path
    }
  };

  try {
    await axios.put(
      `${mockServerBase}/mockserver/clear`,
      criteria,
      { headers: { 'Content-Type': 'application/json' } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(
      'Error clearing expectation:',
      err?.response?.data || err.message
    );
    res.status(500).json({ error: 'Failed to clear expectation' });
  }
});

// -----------------------------------------------------------------------------
// 删除全部 expectations（重置）
// MockServer: PUT /mockserver/reset
// body: 空对象 {}
// -----------------------------------------------------------------------------
app.delete('/api/expectations/all', async (_req, res) => {
  console.log(`/api/expectations/all called, resetting expectations`);
  try {
    await axios.put(
      `${mockServerBase}/mockserver/reset`,
      {},
      { headers: { 'Content-Type': 'application/json' } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(
      'Error resetting expectations:',
      err?.response?.data || err.message
    );
    res.status(500).json({ error: 'Failed to reset expectations' });
  }
});
// -----------------------------------------------------------------------------
// 日志：获取「请求 + 响应 + 时间」
// MockServer: PUT /mockserver/retrieve?type=REQUEST_RESPONSES[&format=JSON]
// 返回 LogEventRequestAndResponse[]，包含 timestamp / httpRequest / httpResponse
// -----------------------------------------------------------------------------
app.get('/api/logs', async (_req, res) => {
  console.log(`/api/logs called, retrieving from ${mockServerBase}`);
  try {
    const response = await axios.put(
      `${mockServerBase}/mockserver/retrieve?type=REQUEST_RESPONSES&format=JSON`,
      {}, // 空 matcher，表示不过滤
      { headers: { 'Content-Type': 'application/json' } }
    );

    const arr = Array.isArray(response.data) ? response.data : [];

    // 统一成前端好用的扁平结构
    const normalized = arr.map(item => {
      const httpRequest = item.httpRequest || item.request || {};
      const httpResponse = item.httpResponse || item.response || {};
      return {
        timestamp: item.timestamp || null,
        method: httpRequest.method || '',
        path: httpRequest.path || '',
        requestHeaders: httpRequest.headers || {},
        requestBody: httpRequest.body || null,
        responseStatusCode:
          httpResponse.statusCode !== undefined
            ? httpResponse.statusCode
            : null,
        responseHeaders: httpResponse.headers || {},
        responseBody: httpResponse.body || null
      };
    });

    res.json(normalized);
  } catch (err) {
    console.error(
      'Retrieve REQUEST_RESPONSES error:',
      err?.response?.data || err.message
    );
    res.status(500).json({
      error: 'Failed to retrieve logs',
      details: err?.response?.data || err.message
    });
  }
});


// -----------------------------------------------------------------------------
// 健康检查：检查 MockServer 是否正常
// MockServer: PUT /mockserver/status   （官方推荐健康探针接口）
// -----------------------------------------------------------------------------
app.get('/api/health', async (_req, res) => {
  console.log(`/api/health called, checking MockServer at ${mockServerBase}`);
  try {
    const response = await axios.put(
      `${mockServerBase}/mockserver/status`,
      {}, // 空 body 即可
      { headers: { 'Content-Type': 'application/json' } }
    );

    // 只要能返回 200 就认为健康
    const ok = response.status === 200;

    res.json({
      ok,
      status: response.status,
      data: response.data || null
    });
  } catch (err) {
    console.error(
      'Health check error:',
      err?.response?.data || err.message
    );
    // 这里仍然返回 200，方便前端统一处理；用 ok=false 表示异常
    res.json({
      ok: false,
      error: err?.message || 'Health check failed'
    });
  }
});

// -----------------------------------------------------------------------------
// 启动服务
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`MockServer Admin UI listening on port ${PORT}`);
  console.log(`Using MockServer at ${mockServerBase}`);
});
