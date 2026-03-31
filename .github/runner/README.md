# Self-Hosted Runner 部署文档

> 用途：在腾讯云 CVM（广州）上运行 GitHub Actions Self-Hosted Runner，  
> 专门负责 `cos-upload-*` job，将构建产物高速上传至腾讯云 COS。

---

## 目录

1. [前置条件](#1-前置条件)
2. [创建 GitHub PAT](#2-创建-github-pat)
3. [服务器安装 Docker](#3-服务器安装-docker)
4. [部署 Runner 容器](#4-部署-runner-容器)
5. [验证 Runner 在线](#5-验证-runner-在线)
6. [日常运维命令](#6-日常运维命令)
7. [故障排查](#7-故障排查)

---

## 1. 前置条件

| 项目 | 要求 |
|------|------|
| 服务器系统 | OpenCloudOS 9 / CentOS 9 / RHEL 9 |
| 服务器地域 | 腾讯云广州（与 COS bucket 同区域，内网上传） |
| 最低配置 | 2 核 4G |
| 端口要求 | 出站 443 放通（默认已开） |
| COS Bucket | `cobot-1254397474`，地域 `ap-guangzhou` |

---

## 2. 创建 GitHub PAT

PAT（Personal Access Token）用于让 Runner 容器自动向 GitHub 注册，**只需创建一次，永不过期**。

### 步骤

1. 打开浏览器，登录 GitHub，访问：  
   **[https://github.com/settings/tokens/new](https://github.com/settings/tokens/new)**

2. 填写表单：

   | 字段 | 值 |
   |------|-----|
   | Note | `ClawX Runner` |
   | Expiration | `No expiration` |
   | Scopes | ☑ `repo`（勾选后子选项自动全选） |

3. 点击 **Generate token**，复制生成的 `ghp_xxxxxxxxxxxx`，**立即保存**，页面关闭后不可再查看。

---

## 3. 服务器安装 Docker

SSH 登录腾讯云 CVM 后执行：

```bash
# 安装 Docker
dnf install -y dnf-utils
dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 启动并设置开机自启
systemctl enable docker
systemctl start docker

# 验证安装
docker --version
docker compose version
```

预期输出：
```
Docker version 27.x.x, build xxxxxxx
Docker Compose version v2.x.x
```

---

## 4. 部署 Runner 容器

### 4.1 创建工作目录

```bash
mkdir -p /opt/github-runner
cd /opt/github-runner
```

### 4.2 创建 Dockerfile

```bash
cat > Dockerfile << 'EOF'
FROM myoung34/github-runner:latest
RUN wget -q "https://cosbrowser.cloud.tencent.com/software/coscli/coscli-linux" \
      -O /usr/local/bin/coscli \
    && chmod +x /usr/local/bin/coscli
EOF
```

> 基于官方 Runner 镜像，预装 `coscli`，省去每次 job 重新下载的时间。

### 4.3 创建 docker-compose.yml

```bash
cat > docker-compose.yml << 'EOF'
services:
  github-runner:
    build: .
    image: github-runner-cos:latest
    container_name: github-runner-cos
    restart: always
    environment:
      - REPO_URL=${REPO_URL}
      - ACCESS_TOKEN=${GITHUB_TOKEN}
      - RUNNER_NAME=tencent-guangzhou
      - LABELS=self-hosted,linux,cos-upload
      - RUNNER_WORKDIR=/tmp/runner/work
      - RUNNER_SCOPE=repo
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - runner-work:/tmp/runner/work

volumes:
  runner-work:
EOF
```

### 4.4 创建 .env 配置文件

```bash
cat > .env << 'EOF'
REPO_URL=https://github.com/Emma-Alpha/MimiClaw
GITHUB_TOKEN=ghp_你的PAT粘贴到这里
EOF
```

> ⚠️ `.env` 文件包含密钥，**不要提交到 Git**。

### 4.5 构建并启动

```bash
cd /opt/github-runner

# 构建镜像（首次约需 2-3 分钟）
docker compose build

# 后台启动
docker compose up -d

# 查看启动日志（确认注册成功）
docker compose logs -f
```

### 4.6 注册成功的标志

日志中出现以下内容即为成功：

```
github-runner-cos  | # Authentication
github-runner-cos  | Generating a registration token...
github-runner-cos  | Connected to GitHub
github-runner-cos  | Listening for Jobs
```

---

## 5. 验证 Runner 在线

### 方式一：GitHub 控制台确认

打开仓库 → **Settings → Actions → Runners**，确认看到 `tencent-guangzhou`，状态为绿色 **Idle**。

### 方式二：触发测试 Workflow

在仓库 Actions 页面手动触发 **Test Self-Hosted Runner** workflow：  
**[https://github.com/Emma-Alpha/MimiClaw/actions/workflows/test-runner.yml](https://github.com/Emma-Alpha/MimiClaw/actions/workflows/test-runner.yml)**

点击 **Run workflow → Run workflow**，正常结果：

```
Runner: VM-0-13-opencloudos
coscli is pre-installed ✓
Uploading 50MB test file to COS...
Done! Time: 1s, Speed: ~50 MB/s   ← 内网速度
Cleanup done ✓
```

---

## 6. 日常运维命令

```bash
cd /opt/github-runner

# 查看运行状态
docker compose ps

# 实时查看日志
docker compose logs -f

# 重启 Runner
docker compose restart

# 停止 Runner
docker compose down

# 更新 Runner 到最新版本
docker compose pull
docker compose up -d --build

# 查看容器资源占用
docker stats github-runner-cos
```

---

## 7. 故障排查

### 问题：`Invalid configuration provided for token`

**原因**：PAT 权限不足，或 `.env` 里的 `GITHUB_TOKEN` 值不正确。

**解决**：
1. 重新生成 PAT，确保勾选了 `repo` scope
2. 检查 `.env` 文件内容：`cat /opt/github-runner/.env`
3. 更新后重启：`docker compose down && docker compose up -d`

---

### 问题：`docker compose` 命令不存在

**原因**：安装的是旧版 Docker，`compose` 作为独立命令存在。

**解决**：
```bash
# 检查版本
docker compose version || docker-compose version

# 如果是旧版，用连字符形式
docker-compose up -d
```

---

### 问题：Runner 显示 Offline

**原因**：容器意外停止，或服务器重启后容器未自动启动。

**解决**：
```bash
# 检查容器状态
docker ps -a | grep github-runner

# 重新启动
cd /opt/github-runner && docker compose up -d
```

---

### 问题：coscli 上传失败（403/权限错误）

**原因**：GitHub Secrets 中的 `COS_SECRET_ID` 或 `COS_SECRET_KEY` 配置有误。

**解决**：
1. 打开仓库 → **Settings → Secrets and variables → Actions**
2. 检查 `COS_SECRET_ID` 和 `COS_SECRET_KEY` 是否正确
3. 确认对应的腾讯云子账号有 COS `cobot-1254397474` 的读写权限

---

## 附：目录结构

```
/opt/github-runner/
├── Dockerfile          # 预装 coscli 的自定义 Runner 镜像
├── docker-compose.yml  # 容器编排配置
└── .env                # 密钥配置（不提交 Git）
```
