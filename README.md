Logo Animation — MVP

用户画像
	•	主目标：独立/小工作室动效师与内容创作者；常态化要在一周内批量产出 2–5 秒品牌片头、需透明视频/Lottie。
	•	次目标：不会 AE 的品牌运营/营销同学；要“有设计感、少学习、能复用”的成片。

用户痛点与需求（一句话）

要不模板味、可定制、成功率高的 logo 动画：上传即出、少清理、可轻微调、直接多格式透明导出。

差异化定位（一句话｜你的表述）

市场上第一个用户高自由度的、不依赖于模板的、注重设计感的 logo animation 设计 agent——解决现有模板预设无法满足各个 logo 的品牌化与设计感定制的问题。

## SVG Runtime & AI 生成动画规划

### 现有痛点

1. **模型无法直接操控真实 SVG**：当前只把 `vectorizedSvgUrl` 传给模型，它既看不到 SVG 层级结构，也没有 API 可以定位某个 path，导致生成的 TSX 只能写占位内容或干脆内联整段 SVG。
2. **生成代码易失效**：Remotion 运行在 Node 环境，常见的浏览器 SVG 库不可用；模型自己拼 `fetch + DOMParser` 容易失败，最终无法渲染。
3. **缺乏提示与约束**：现有 prompt 只包含 Remotion 官方说明，没有我们自定义的规范（例如必须显式声明 props、统一使用单引号、禁止内联原始 SVG 等）。

### 目标

- 构建一套在 Remotion 环境下可运行的 **SVG 动画运行时工具箱**，让模型能按 path ID / label 自由操控真实 SVG 元素。
- 通过 JSON Schema 与自定义 prompt 约束模型输出，保证生成的 TSX 合法、可编译、可渲染。
- 保持“非模板化”定位：模型仍旧编写 TSX，只是通过我们提供的 API 来操作真实素材。

### Runtime 工具设计

| 模块 | 作用 | 说明 |
| --- | --- | --- |
| `loadSvgSource(vectorizedSvgUrl)` | 远程下载 SVG 字符串 | 负责请求、异常处理，兼容 Node 环境 |
| `parseSvgToLayers(svg)` | 解析 SVG → Layer JSON | 使用 `svgson` 等库，保留 id、label、d、fill、bbox 等属性 |
| `useSvgLayers({ vectorizedSvgUrl })` | 核心 Hook，提供查询 | 内部调用 load+parse，返回 `all`、`byId`, `byLabel` 等方法 |
| `<SvgCanvas layers={...}>` | 输出 `<svg>` + `<path>` | 渲染真实 SVG 结构，保证模型可以在 JSX 中遍历、套 Remotion 动画 |

> 以上四项是“必须”实现的运行时层。其余动画效果（`spring`、`interpolate`、`Sequence` 等）直接使用 Remotion 原生 API，模型可自由组合。若后续发现高频的动画模式，再根据需要补充可选 helper。

> 借助以上工具，模型可以在 TSX 中直接调用这些 API，而我们负责底层解析与动画执行。

### 模型提示策略

1. 在现有 `remotion-system-prompt.md` 之后追加自定义说明：如何使用 `useSvgLayers`、`<SvgCanvas>`、`<AnimatePath>`，并明确禁止内联 SVG、要求 props 使用单引号、导出 `LogoAnimation` 等。
2. 使用 `response_format: json_schema`，确保模型返回的 JSON 字段完整且可解析。
3. 必要时提供一个最小示例（非模板，仅示范 API 用法），帮助模型理解如何调用我们的工具箱。

### 与渲染管线的整合

1. **生成阶段**：AI 输出 TSX → 写入 `remotion/.temp/<taskId>/` → 类型检查（强制 NodeNext 模块解析）→ 上传到 R2（保存 `animationModuleUrl`）。
2. **渲染阶段**：下载 TSX → 写入 `remotion/generated/` 并更新 manifest → 调用 Remotion 渲染 → 上传视频 → 清理临时文件、刷新 bundle。
3. **调试工具**：前端提供 SSE 调试面板，实时查看模型输出，便于迭代 prompt。

### 分阶段落地计划

1. **Runtime 初版**：实现 `loadSvgSource`、`parseSvgToLayers`、`useSvgLayers`、`<SvgCanvas>` 四个核心模块，验证 Remotion 中能正确渲染真实 SVG。
2. **Prompt 更新**：把运行时 API 说明追加到系统提示中，保持 JSON Schema 约束。
3. **生成/渲染联调**：确保模型生成的 TSX 可以调用新 runtime，并在渲染阶段操控真实 SVG。
4. **迭代扩展（可选）**：在不限制模型自由的前提下按需提供 helper（例如常见动画原语、Timeline DSL、bbox 规则等）。

> 以上规划确保模型既有充分自由度，又能稳定地对真实 Logo 执行动画，是“非模板化”定位的核心前提。

制作流程（业务层细节，不涉技术实现）
	1.	上传与准备
	•	使用 vTracer (vTrace) 在上传后完成位图矢量化与自动去底；收集品牌参数（主辅色、节奏、气质关键词、用途场景）。
	2.	分层与规范化（vTrace）
	•	通过 vTrace 获取层级清晰的分层 SVG；合并碎层/命名规范/清理冗余，得到“可动画”的层列表与层属性。
	3.	风格意图到方案草图
	•	基于品牌气质与层结构，生成 1–3 个有设计感的动效思路（入场节奏、镜头段落、遮罩/描边/形变等稳态原语的组合）。
	4.	可视预览与轻量编辑
	•	在网页端预览；只开放关键参数：总时长、段落顺序与延迟、入场方式、缓动、背景/品牌色。
	5.	渲染与导出（Remotion）
	•	使用 Remotion 完成渲染；一键导出 WebM（Alpha）/MP4/GIF；（Lottie 在路径可映射时提供）。
	6.	质量兜底与反馈
	•	对高风险结构自动降级为“安全过场”以保证可用；失败样本进入回训池，持续提升成功率与观感稳定性。

开发路线（核心 MVP）

1. 上传与素材处理
   - 交付：真实可用的上传组件与后端接口，包含尺寸/大小校验与错误提示；原始文件和处理结果的存储方案。
   - 能力：整合 vTracer (vTrace) 进行位图矢量化和去底，直接产出规范化分层数据。

2. 分层与规范化管线
   - 交付：与上传流程打通的 vTrace（或确定替代方案）集成，生成可动画的层列表。
   - 能力：实现自动命名、碎层合并、冗余清理与失败日志，全部基于真实处理结果提供回退策略。

3. 动效方案生成
   - 交付：至少一条完整的真实 logo 动画方案（段落、原语、时序、缓动），从品牌配置与分层数据直接生成并持久化。
   - 能力：定义动画原语库与参数范围，建立品牌特征到动画方案的映射逻辑或模型调用。

4. 实时预览与轻量编辑
   - 交付：基于真实方案的前端预览组件（Remotion 或既定渲染引擎），支持调节时长、段落顺序、缓动等核心参数。
   - 能力：所有调节结果写回数据源，可刷新复现，并提供基本的进度与错误提示。

5. 渲染与导出
   - 交付：可运行的渲染服务，支持透明 WebM、MP4、GIF 导出，满足条件时提供 Lottie。
   - 能力：搭建渲染任务队列、状态反馈与文件落盘/下载流程，失败时返回真实错误并支持重试。

6. 质量兜底（核心范围内）
   - 交付：针对真实输入的复杂度检测与“安全过场”降级策略，确保最坏情况下仍能产出可用动画。
   - 能力：收集失败样本与日志，为规则或模型迭代提供真实数据支撑。

矢量分层语义标注策略

1. 矢量化与结构化
   - 使用 vTracer 将位图转换为 SVG，并通过 `svgo`/`svgson` 等工具解析成结构化数据，为每个 path/g 生成稳定的 `id`，记录颜色、边界框、面积等特征。
   - 保留原始 SVG 以便最终写回标注，但后续处理全部基于结构化 JSON。

2. 上下文准备
   - 为每个元素构建精简摘要（`id`、几何信息、颜色），控制数据量，保证传给模型的 token 可控。
   - 同时准备原始 Logo 图片（URL 或 base64），让模型可以对照视觉结果理解元素组成。

3. 模型标注
   - 调用多模态大模型，请求按 `{id, label, reason}`（或约定格式）输出，不要求模型改写 SVG，只做语义命名。
   - 标签名称由模型根据原图与元素特征自行命名，必要时可约束输出格式或提供示例，但不预设固定集合。
   - 通过 OpenRouter 提供的 API（例如 `minimax/minimax-m2`），以环境变量提供的 `OPENROUTER_API_KEY` 调用多模态模型；示例调用方式沿用 `openai.chat.completions.create` 并同时上传原图 URL 与结构化摘要。

4. 标签写回
   - 根据模型返回结果，把语义标签写入原 SVG 的对应元素（例如 `<g data-layer="logomark">`），保持结构一致，便于动画引擎使用。
   - 对模型输出做格式校验，必要时允许人工修正并将案例回流提示词调优。

AI 标注环境变量
- `OPENROUTER_API_KEY`：OpenRouter API 密钥（部署时填写，默认留空）。
- `OPENROUTER_API_BASE_URL`：可选，自定义网关地址，默认 `https://openrouter.ai/api/v1`。
- `OPENROUTER_HTTP_REFERER` / `OPENROUTER_HTTP_TITLE`：可选，用于 OpenRouter 排名统计。
- `OPENROUTER_LOGO_LABEL_MODEL`：可选，指定使用的模型名称，默认 `minimax/minimax-m2`。

下一阶段实现计划（Remotion 集成）
1. 安装官方建议依赖  
   - 锁定版本安装 `remotion`、`@remotion/cli`，在 `package.json` 中新增 `remotion:studio`、`remotion:render` 等脚本。
   - 可选：安装 `@remotion/eslint-plugin`，并针对 `remotion/` 目录启用规则。

2. 建立 Remotion 目录结构  
   - 新建 `remotion/` 目录，包含：
     - `Root.tsx` 或 `RemotionRoot.tsx`：集中注册 `<Composition>`。
     - `index.ts`: 调用 `registerRoot(RemotionRoot)`。
     - `generated/LogoAnimation.tsx`: AI 生成代码落地文件；初始可写占位组件。

3. 编写最小占位 Composition 验证渲染链路  
   - 在 `RemotionRoot` 中注册一个占位组件（简单的文字或空组件），通过 `pnpm remotion:studio` 与 `pnpm remotion:render` 验证工具链可运行。

4. 整理 AI 生成代码的提示与接口  
   - 阅读 `remotion-system-prompt.md`，结合语义标签 JSON，定义调用 OpenRouter 时的 `system`/`user` 消息结构与输出要求（合法 TSX、导出组件等）。

5. （待骨架完成后）串联 AI → Remotion → 渲染
   - 新建 API / server action 调用 OpenRouter 生成 TSX 写入 `generated/LogoAnimation.tsx`。
   - 触发 Remotion 渲染（CLI 或 Node API），记录产物与异常，前端接入生成按钮与预览。

功能实现细化步骤
- 任务与素材管理  
  1. 上传完成后生成 `taskId`，保存原图、矢量 SVG、语义标签（数据库）。  
  2. 提供 `GET /api/tasks/:id` 返回任务详情，为后续生成动画复用。

- AI 动画生成 API  
  1. 新建 `POST /api/tasks/:id/generate-animation`：读取任务数据 → 组织提示词 → 调用 OpenRouter。  
  2. 解析返回的 Remotion TSX，写入 `remotion/generated/${taskId}.tsx`；记录输出与日志。

- 代码编译与快速校验  
  1. 对生成文件运行 `pnpm exec tsc --noEmit` 或 ESLint，仅检查 `remotion` 目录，捕获语法错误。  
  2. 若失败，返回错误信息给前端，并保留生成的原始代码供调试。

- 视频预览与渲染  
  1. 成功生成组件后，调用 `remotion render remotion/index.ts taskId out/<taskId>.webm`（或使用 `@remotion/renderer` Node API）。  
  2. 渲染完成后保存视频文件路径，更新任务状态；失败则写入失败日志。

- 前端交互  
  1. 在仪表板或上传完成页提供“生成动画”按钮，调用上面 API，显示生成进度。  
  2. 提供预览播放器（Remotion Player 或视频标签）展示生成结果，并允许重新生成。

数据库现状与扩展计划
- 当前 `src/db/schema.ts` 仅包含用户鉴权与支付相关表：`user`、`session`、`account`、`verification`、`payment`、`creditsHistory`。  
- 尚未创建 Logo 动画任务相关表，后续接入 Supabase 时需新增，例如：  
  - `logo_task`：存储任务元信息（原始图片路径、矢量 SVG、语义标签 JSON、AI 生成代码路径、渲染视频路径、任务状态、关联用户等）。  
  - `logo_task_log`：记录各环节日志与错误，便于调试与重试。  
- 按现有 Drizzle 模式定义表结构，并通过 Supabase 迁移/连接，保持与既有 ORM 一致性。
