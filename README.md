# dsh-model-provider-label

> 在 DeepSeek Harness 对话框模型选择器同时显示 **provider 显示名** 与 **模型名**，
> 让不同 provider 下的同名模型一眼可辨。
>
> Show the **provider display name** next to the model name in the DeepSeek
> Harness composer model seat, so identical model names from different
> providers become distinguishable.

[![GitHub release](https://img.shields.io/github/v/release/haiyoucuv/dsh-model-provider-label)](https://github.com/haiyoucuv/dsh-model-provider-label/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

默认模型选择器只显示模型名（如 `DeepSeek V4 Flash`）。当你配置多个
provider、且不同 provider 下有**同名的模型**时无法区分。本插件把 provider
的 displayName 一并显示：**`DeepSeek · DeepSeek V4 Flash`**。

## 效果

| 默认 | 安装本插件后 |
| ---- | ------------ |
| `DeepSeek V4 Flash` | `DeepSeek · DeepSeek V4 Flash` |
| `GPT-5` (provider A) | `ProviderA · GPT-5` |
| `GPT-5` (provider B) | `ProviderB · GPT-5` |

下拉菜单、推理等级选择、模型目录加载、错误提示等行为与默认实现完全一致——
本插件只是**遮蔽**了 `conversation.input.model` UI 槽位，用 priority 更低
的组件替换默认渲染，其余逻辑 100% 复用宿主 `modelDirectories` 服务。

## 安装

```sh
# 从 GitHub 安装（推荐）
dsh plugin --profile web add https://github.com/haiyoucuv/dsh-model-provider-label/archive/refs/tags/v0.1.0.tar.gz

# 或从本地目录安装（开发调试）
dsh plugin --profile web add link:/path/to/dsh-model-provider-label
```

安装后**重启 `dsh web`** 使浏览器端加载 client bundle。

> 提示：也可以直接用 pnpm 在 profile 目录安装：
>
> ```sh
> cd ~/.dsh/profiles/web && pnpm add https://github.com/haiyoucuv/dsh-model-provider-label/archive/refs/tags/v0.1.0.tar.gz
> ```

## 开发

```sh
pnpm install          # 安装 esbuild / typescript 等 dev 依赖
pnpm build            # 生成 lib/client.js（ModuleLoader 格式）+ lib/index.js
```

- 源码：`src/client/index.tsx`（apply / inject + 槽位遮蔽）、
  `src/client/ModelSelect.tsx`（改造后的模型选择器）
- 样式：`src/client/ModelSelect.module.css`
- 构建产物 `lib/` 已提交，安装无需本地构建

## 工作原理

DSH 的 `conversation.input.model` 是一个 **single 类型 UI 槽位**（slot），
默认由 `dsh-client-ui-model-selection` 以 `priority: 0` 注册。slot 系统规定
**同 priority 只能有一个注册，更低 priority 的注册会遮蔽（shadow）默认实现**
（`lowest renders`）。本插件用 `priority: -100` 注册同名槽位，因此渲染的是
我们的组件；目录数据仍来自宿主注入的 `modelDirectories` service（按会话共享，
与 /model 命令同一份状态），翻译复用宿主已注册的 `model` locale namespace
（不重复注册，避免 locale 冲突）。

## 自定义显示格式

编辑 `src/client/ModelSelect.tsx` 里的 `providerLabel` / `modelLabel` /
`triggerLabel` 组合即可，然后 `pnpm build` + 重启。

## License

MIT — 见 [LICENSE](LICENSE)