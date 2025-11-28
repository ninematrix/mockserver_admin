
# MockServer Admin 使用说明

## 1. 项目简介

**mockserver-admin** 是一个为接口模拟而设计的 MockServer 管理面板，支持：

* 通过 UI 可视化管理 MockServer Expectations
* 多文件 Expectation 模块化维护
* 自动合并 expectations → initializerJson.json
* 支持查看请求日志、过滤、分页、查看完整请求/响应
* 支持健康检查状态指示

本项目适用于：

* 系统联调
* 自动化测试
* 新功能 PoC
* 无真实后台数据场景下的 Demo 演示

## 2. 功能 Features

### ✔ **MockServer 管理面板 UI**

* 展示所有已注册的 Expectation
* 新增 / 删除 / 刷新 Expectation
* 按 path 搜索
* 展示请求 Body / 响应 Body
* 最近请求日志查看（支持完整请求 headers + body）

### ✔ **Expectation 多文件管理**

* 按业务模块拆分多个 JSON 文件
* 自动合并生成 initializerJson.json
* 避免大文件难以维护
* 支持团队协作开发

### ✔ **健康检查**

* 前端 UI 定时执行 /mockserver/status
* 指示 MockServer 的运行状态（绿 / 灰 / 红）

### ✔ **完整 Docker 化**

* MockServer 服务
* 后端 Node 管理 API
* 前端页面
* 自动 merge 初始化文件

### ✔ **覆盖医院常见科室接口模拟**

包括但不限于：

* LIS：血常规、凝血、生化、大项小项、检验详情
* Check：CT、MRI、心电图、超声、检查所见/诊断
* Emergency：急诊血常规、急诊凝血、急诊生化等

---

## 3. 项目结构 Project Structure

```
mockserver-admin/
│
├── backend/                # 后端 Node.js 服务
│   ├── app.js
│   ├── public/             # 前端静态文件（打包后）
│   │   ├── index.html
│   │   └── main.js
│   ├── package.json
│   └── Dockerfile
│
├── config/                 # MockServer 初始化配置
│   ├── expectations/       # 按模块拆分的 expectations（手工维护）
│   │   ├── lis_list.json
│   │   ├── lis_detail.json
│   │   ├── check_list.json
│   │   ├── check_detail.json
│   │   ├── emergency_labs.json
│   │   └── ...
│   └── initializerJson.json  # merge.sh 自动生成，不要手写！
│
├── docker-compose.yml
├── README.md
├── merge.sh              # 多文件 → initializerJson.json 合并脚本
├── rebuild.sh            # 本机rebuil mockserver-admin镜像
└── ...（日志/脚本/其他工具）
```

---

## 4. 环境要求

* Docker 20+
* Docker Compose v2+
* Node.js（仅用于 merge 脚本，可选）
* Linux / macOS / Windows（WSL2）

---

## 5. 安装与部署

### **Clone 项目**

```sh
git clone https://github.com/xxx/mockserver-admin.git
cd mockserver-admin
```

---

### **1️⃣ 合并 Expectation 到 initializerJson.json**

```sh
./config/merge.sh
```

成功后会生成：

```
config/initializerJson.json
```

---

### **2️⃣ 启动 MockServer + 管理后台**

```sh
docker compose up -d
```

查看服务状态：

```sh
docker ps
```

访问前端 UI：

```
http://localhost:3000
```

MockServer API：

```
http://localhost:1080
```

---

## 6. 开发调试

### **实时查看 MockServer 日志**

```sh
docker logs mockserver -f
```

### **重启所有服务**

```sh
docker compose restart
```

### **清空并重新构建**

```sh
./rebuild.sh
```

---

## 
## Expectation 维护说明

MockServer 的所有接口模拟逻辑均由 *Expectation* 定义。
为便于多人协作、模块化维护，本项目采用 **多 JSON 文件分散管理 + 启动前自动合并** 的方式生成最终 `initializerJson.json`。

### 1. 目录结构

项目中的 Expectation 文件按功能模块拆分存放：

```
config/
  expectations/
    lis_list.json
    lis_detail.json
    check_list.json
    check_detail.json
    emergency_labs.json
    ...
  initializerJson.json     ← 合并生成结果（勿手动编辑）
  ```

* **`expectations/*.json`**
  每个文件表示若干条独立的 MockServer Expectation，可按业务模块创建多个文件。

* **`initializerJson.json`**
  MockServer 实际加载的初始化文件。
  由 `merge.sh` 自动生成，不应手动编辑。

---
### 2. Expectation 文件格式规范

每个 JSON 文件可以采用 **两种格式之一**：

### **① 单条 Expectation**

```json
{
  "httpRequest": {
    "method": "POST",
    "path": "/er/Exam/getLisList",
    "body": { ... }
  },
  "httpResponse": {
    "statusCode": 200,
    "headers": { "Content-Type": ["application/json"] },
    "body": { ... }
  }
}
```

---

### **② 多条 Expectation（数组形式）**

```json
[
  {
    "httpRequest": { ... },
    "httpResponse": { ... }
  },
  {
    "httpRequest": { ... },
    "httpResponse": { ... }
  }
]
```

两种形式均可在自动合并时被正确展开并加入最终 initializerJson.json。

---
### 3. 文件命名规范

建议以接口或业务模块为粒度命名：

* `lis_list.json`
* `lis_detail.json`
* `emergency_labs.json`
* `check_list.json`
* `check_detail.json`
* `ecg.json`
* `ct.json`

命名要求：

1. 全小写
2. 使用下划线分词
3. 按业务模块分类，保证文件内容独立

这样便于后期定位并维护某条接口的 expectation。

---
### 4. 自动合并机制

所有 `expectations/*.json` 会在构建或启动服务前被合并为：

```
config/initializerJson.json
```

由脚本：

```
config/merge.sh
```

负责完成。

### 合并逻辑如下：

1. 扫描 `config/expectations/` 下所有 `.json` 文件
2. 逐个读取并校验 JSON 格式
3. 单条或数组形式均自动展开为扁平数组
4. 写入最终 `initializerJson.json`

合并后的 initializerJson.json 结构：

```json
[
  { ... expectation A ... },
  { ... expectation B ... },
  { ... expectation C ... }
]
```

MockServer 容器启动时读取该文件并自动加载所有 expectation。

---
### 5. 维护流程

### **新增 Expectation**

1. 在 `config/expectations/` 下创建一个新的 JSON 文件，例如：

   ```
   emergency_blood.json
   ```

2. 写入一条或多条 Expectation

3. 执行脚本进行合并：

   ```sh
   ./config/merge.sh
   ```

4. 重新启动 mockserver：

   ```sh
   docker compose down
   docker compose up -d
   ```

---

### **修改 Expectation**

直接编辑对应的 JSON 文件（如 `lis_detail.json`），然后重复：

```sh
./config/merge.sh
docker compose restart mockserver
```

---

### **删除 Expectation**

删除目标 JSON 文件或其中的条目，重新执行：

```sh
./config/merge.sh
docker compose restart mockserver
```

---
### 6. 常见注意事项

* ❗ **不要直接编辑 `initializerJson.json`**
  它会被自动覆盖。

* ❗ 每个 JSON 文件必须是标准 JSON 格式
  不能带尾逗号、注释、或未关闭的括号。

* ❗ `httpRequest.body` 必须遵循 MockServer 的 JSON body 匹配规范：

  ```json
  "body": {
    "type": "JSON",
    "json": { ... }
  }
  ```

* ❗ 若不同文件中出现重复的 `httpRequest.path` 且匹配条件相同，
  MockServer 会按顺序使用最先匹配的一条。

---
### 7. 示例：典型 Expectation 文件（片段）

**示例：`lis_list.json`**

```json
{
  "httpRequest": {
    "method": "POST",
    "path": "/er/Exam/getLisList",
    "body": {
      "type": "JSON",
      "json": {
        "deptCode": "3201",
        "patientNo": "BA20250001"
      }
    }
  },
  "httpResponse": {
    "statusCode": 200,
    "body": {
      "code": "200",
      "msg": "success",
      "data": [ ... ]
    }
  }
}
```

---
### 8. 建议的最佳实践

* 按业务模块合理拆分文件
* 避免一个 JSON 文件过大
* 可以用 VSCode + JSON Schema 做格式校验
* 合并失败时检查是否存在格式不合法的 JSON
* 在 PR 中强制对 `expectations/*.json` 进行 code review

---

## 8. REST API（MockServer 管理后台）

后端公开 REST APIs 用于：

* 添加 Expectation
* 删除单个 Expectation
* 删除全部 Expectations
* 查询近期请求日志
* 检查 MockServer 启动状态

（如需我可生成完整接口文档）

---

## 9. 前端 UI 使用说明

* 可视化展示所有已注册 Expectations
* 新建 Expectation（POST/GET/PUT/DELETE）
* 输入 Path / Method / Body / Response
* 查看最近请求（含请求体、响应、headers）
* 健康检查状态实时刷新
* 支持按 path 过滤日志
* 支持查看完整请求（展开 headers + body）

---

## 10. 常见问题 FAQ

### ❓ 为什么我修改了 expectations，不生效？

你忘记执行：

```sh
./merge.sh
docker compose restart mockserver
```

---

### ❓ 为什么我在UI中修改了 expectations，不生效？

UI中对expectations的修改只对当前有效，重启mockserver后会丢失，如果需要修改，按expectation的维护进行。

---

### ❓ initializerJson.json 可以手动改吗？

不能。
该文件自动生成，每次 merge.sh 都会覆盖。

---

### ❓ 是否可以自动加载多个 JSON 文件？

可以，但 MockServer 只支持单一 initialization JSON。
因此本项目使用 merge.sh 合并后一次性加载。

---
