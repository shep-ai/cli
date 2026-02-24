## [1.49.1](https://github.com/shep-ai/cli/compare/v1.49.0...v1.49.1) (2026-02-24)

### Bug Fixes

- **agents:** isolate rejection feedback by phase for plan/merge prompts ([#113](https://github.com/shep-ai/cli/issues/113)) ([b9fafff](https://github.com/shep-ai/cli/commit/b9fafff82cdcdb6b37ac829e122ade279aad5938))

# [1.49.0](https://github.com/shep-ai/cli/compare/v1.48.0...v1.49.0) (2026-02-23)

### Bug Fixes

- **agents:** handle merge node rejection loop ([#111](https://github.com/shep-ai/cli/issues/111)) ([fd1fff3](https://github.com/shep-ai/cli/commit/fd1fff33ca2dc88bf06fbdebafb83115cbec340a))

### Features

- **web:** add approval/rejection flows to control center drawers ([#109](https://github.com/shep-ai/cli/issues/109)) ([8ca3a89](https://github.com/shep-ai/cli/commit/8ca3a898cf23fc0a75325adbd8c4d96af1b87d3c))

# [1.48.0](https://github.com/shep-ai/cli/compare/v1.47.0...v1.48.0) (2026-02-23)

### Bug Fixes

- **web:** correct add-repo node position shifting in control center ([#039](https://github.com/shep-ai/cli/issues/039)) ([#108](https://github.com/shep-ai/cli/issues/108)) ([3612c55](https://github.com/shep-ai/cli/commit/3612c559142133c8eefd5ad1af57ea3e6fb14e5e))

### Features

- **domain:** auto-init git repos for feature creation ([#101](https://github.com/shep-ai/cli/issues/101)) ([41c3969](https://github.com/shep-ai/cli/commit/41c39696d834d72c643867496ed82eb3eb782fca))
- **web:** auto-relayout canvas after feature deletion ([#107](https://github.com/shep-ai/cli/issues/107)) ([ff2df01](https://github.com/shep-ai/cli/commit/ff2df01cc78b80c1fa3c63fcc8cb6bcb8e15baf9))
- **web:** enhance merge review with branch info, phases, and chat input ([#106](https://github.com/shep-ai/cli/issues/106)) ([ae1899c](https://github.com/shep-ai/cli/commit/ae1899cef740c4977315bffd5bede76aa402057e))

# [1.47.0](https://github.com/shep-ai/cli/compare/v1.46.0...v1.47.0) (2026-02-23)

### Features

- **web:** add push and open-pr checkbox controls to feature create drawer ([#103](https://github.com/shep-ai/cli/issues/103)) ([dc9003c](https://github.com/shep-ai/cli/commit/dc9003cd1c639cdb5933c647ec7cfd9d894f55ce))

# [1.46.0](https://github.com/shep-ai/cli/compare/v1.45.0...v1.46.0) (2026-02-23)

### Features

- **web:** show empty state when no repositories in control center ([#100](https://github.com/shep-ai/cli/issues/100)) ([62a5033](https://github.com/shep-ai/cli/commit/62a503344b65729a57037038a435902db2e06089)), closes [#038](https://github.com/shep-ai/cli/issues/038)

# [1.45.0](https://github.com/shep-ai/cli/compare/v1.44.2...v1.45.0) (2026-02-23)

### Features

- **cli:** add repo ls and repo show commands for repository management ([#99](https://github.com/shep-ai/cli/issues/99)) ([85a6d9b](https://github.com/shep-ai/cli/commit/85a6d9b3cd8a6aae52e42eb3fcdc3eba62f04f1f))

## [1.44.2](https://github.com/shep-ai/cli/compare/v1.44.1...v1.44.2) (2026-02-23)

### Bug Fixes

- **domain:** resolve branch detection and schema path bugs ([#98](https://github.com/shep-ai/cli/issues/98)) ([1dd3976](https://github.com/shep-ai/cli/commit/1dd3976c7811562c4c371eb623928e421a491c5a))

## [1.44.1](https://github.com/shep-ai/cli/compare/v1.44.0...v1.44.1) (2026-02-23)

### Bug Fixes

- **web:** add missing storybook mock and ci build check ([#97](https://github.com/shep-ai/cli/issues/97)) ([343bc77](https://github.com/shep-ai/cli/commit/343bc77a2dede6d80019730f8ed4e02d305c88cf))

# [1.44.0](https://github.com/shep-ai/cli/compare/v1.43.0...v1.44.0) (2026-02-23)

### Features

- **domain:** promote repository to first-class entity ([#92](https://github.com/shep-ai/cli/issues/92)) ([f98c485](https://github.com/shep-ai/cli/commit/f98c4859eb80df95521f568c4bb097b1bfeaaf86))

# [1.43.0](https://github.com/shep-ai/cli/compare/v1.42.0...v1.43.0) (2026-02-23)

### Features

- **cli:** auto-open browser when `shep ui` starts ([#95](https://github.com/shep-ai/cli/issues/95)) ([9ef0781](https://github.com/shep-ai/cli/commit/9ef0781222cbe19f72552a0784b8face5a27f62d))

# [1.42.0](https://github.com/shep-ai/cli/compare/v1.41.1...v1.42.0) (2026-02-23)

### Features

- **cli:** add first-run onboarding wizard ([#93](https://github.com/shep-ai/cli/issues/93)) ([7cde82a](https://github.com/shep-ai/cli/commit/7cde82a4a78c08f88a3caf9a7d7aaf899c067646))

## [1.41.1](https://github.com/shep-ai/cli/compare/v1.41.0...v1.41.1) (2026-02-23)

### Bug Fixes

- **web:** use os.platform() instead of process.platform for runtime evaluation ([#94](https://github.com/shep-ai/cli/issues/94)) ([57e0893](https://github.com/shep-ai/cli/commit/57e0893e2bf2e78d51465ef763d4e62df6566c23))

# [1.41.0](https://github.com/shep-ai/cli/compare/v1.40.2...v1.41.0) (2026-02-23)

### Features

- **agents:** replace direct git service calls with agent-driven merge ([#91](https://github.com/shep-ai/cli/issues/91)) ([5f8a13d](https://github.com/shep-ai/cli/commit/5f8a13de3dc6cb6d2c90b74e736f811ba118f143))

## [1.40.2](https://github.com/shep-ai/cli/compare/v1.40.1...v1.40.2) (2026-02-22)

### Bug Fixes

- **domain:** add ajv-formats for date-time validation ([#90](https://github.com/shep-ai/cli/issues/90)) ([4ff5ed5](https://github.com/shep-ai/cli/commit/4ff5ed50f2a069e56876b20a751d142217e0b654))

## [1.40.1](https://github.com/shep-ai/cli/compare/v1.40.0...v1.40.1) (2026-02-22)

### Bug Fixes

- **tsp:** regenerate types and json schemas from current typespec models ([#89](https://github.com/shep-ai/cli/issues/89)) ([e4d96e9](https://github.com/shep-ai/cli/commit/e4d96e94424cd54248fdb5e5220abddd7b64a67b))

# [1.40.0](https://github.com/shep-ai/cli/compare/v1.39.0...v1.40.0) (2026-02-22)

### Features

- **agents:** add gemini cli executor with streaming and token auth ([#88](https://github.com/shep-ai/cli/issues/88)) ([dc8a3ca](https://github.com/shep-ai/cli/commit/dc8a3ca7a8b39557776b78a874a8acdebbb41e64))

# [1.39.0](https://github.com/shep-ai/cli/compare/v1.38.0...v1.39.0) (2026-02-22)

### Features

- **agents:** add prd approval iterations with interactive tui review ([#86](https://github.com/shep-ai/cli/issues/86)) ([c574d1b](https://github.com/shep-ai/cli/commit/c574d1b5a7ebba2b81431089300b54a79677aac8))

# [1.38.0](https://github.com/shep-ai/cli/compare/v1.37.3...v1.38.0) (2026-02-22)

### Features

- **web:** add prd questionnaire component and folder open api ([#79](https://github.com/shep-ai/cli/issues/79)) ([17f26f6](https://github.com/shep-ai/cli/commit/17f26f6a16fdd69631ca25efa7e015ba5b417528))

## [1.37.3](https://github.com/shep-ai/cli/compare/v1.37.2...v1.37.3) (2026-02-22)

### Bug Fixes

- **cli:** include feature short id in approve/reject hints ([#87](https://github.com/shep-ai/cli/issues/87)) ([c803bd9](https://github.com/shep-ai/cli/commit/c803bd962b76733b46822e0b02f618dee2a53e54))

## [1.37.2](https://github.com/shep-ai/cli/compare/v1.37.1...v1.37.2) (2026-02-22)

### Bug Fixes

- **agents:** detect crashed processes on resume and fix timing display ([#85](https://github.com/shep-ai/cli/issues/85)) ([7074929](https://github.com/shep-ai/cli/commit/7074929588401b3e27a7ca54620c75d5544c0e93))

## [1.37.1](https://github.com/shep-ai/cli/compare/v1.37.0...v1.37.1) (2026-02-19)

### Bug Fixes

- **agents:** correct approval wait timing attribution and bar overflow ([#84](https://github.com/shep-ai/cli/issues/84)) ([7ff5748](https://github.com/shep-ai/cli/commit/7ff57482a404b21fe5f2b8e926c525f047639a88))

# [1.37.0](https://github.com/shep-ai/cli/compare/v1.36.0...v1.37.0) (2026-02-19)

### Features

- **api:** replace per-ide launcher classes with json-driven launcher ([#83](https://github.com/shep-ai/cli/issues/83)) ([a8b73b5](https://github.com/shep-ai/cli/commit/a8b73b5fb8b6ef5352fcbd84ac3d3d33348dee09))

# [1.36.0](https://github.com/shep-ai/cli/compare/v1.35.3...v1.36.0) (2026-02-19)

### Features

- **agents:** track and display approval wait times in phase timings ([#82](https://github.com/shep-ai/cli/issues/82)) ([33e66d3](https://github.com/shep-ai/cli/commit/33e66d363a47eebef68e8da010c5c5a5fb2b93d3))

## [1.35.3](https://github.com/shep-ai/cli/compare/v1.35.2...v1.35.3) (2026-02-19)

### Bug Fixes

- **agents:** record phase timing on failure and update lifecycle per node ([#81](https://github.com/shep-ai/cli/issues/81)) ([a59c949](https://github.com/shep-ai/cli/commit/a59c949cc18b020014b778b263d7200bd2b8e661))

## [1.35.2](https://github.com/shep-ai/cli/compare/v1.35.1...v1.35.2) (2026-02-19)

### Bug Fixes

- **agents:** add missing phase timing for implement/merge nodes and fix pr creation ([#80](https://github.com/shep-ai/cli/issues/80)) ([1d97df9](https://github.com/shep-ai/cli/commit/1d97df996466bc61991350b2571b082fc85c9f8b))

## [1.35.1](https://github.com/shep-ai/cli/compare/v1.35.0...v1.35.1) (2026-02-19)

# [1.35.0](https://github.com/shep-ai/cli/compare/v1.34.0...v1.35.0) (2026-02-19)

### Features

- **cli:** add `shep feat logs` command ([#78](https://github.com/shep-ai/cli/issues/78)) ([27c62e8](https://github.com/shep-ai/cli/commit/27c62e8872bee0a15618b94b9e7eb45cbae4a3d9))

# [1.34.0](https://github.com/shep-ai/cli/compare/v1.33.1...v1.34.0) (2026-02-19)

### Features

- **agents:** add structured agent caller for agent-agnostic structured output ([#77](https://github.com/shep-ai/cli/issues/77)) ([b5e527c](https://github.com/shep-ai/cli/commit/b5e527c781cb3049a3f3d4f8fa89972322bd49b3))

## [1.33.1](https://github.com/shep-ai/cli/compare/v1.33.0...v1.33.1) (2026-02-19)

# [1.33.0](https://github.com/shep-ai/cli/compare/v1.32.1...v1.33.0) (2026-02-19)

### Features

- **dx:** add /shep-kit:new-feature-fast skill ([04feb3c](https://github.com/shep-ai/cli/commit/04feb3c98387ba242eeb5b9c77eff4c09a246db3))
- **web:** add repository node actions with action buttons ([#74](https://github.com/shep-ai/cli/issues/74)) ([af410d1](https://github.com/shep-ai/cli/commit/af410d17c58a4b0a779d477e1ac81929e1d3a0d5))

## [1.32.1](https://github.com/shep-ai/cli/compare/v1.32.0...v1.32.1) (2026-02-18)

### Bug Fixes

- **build:** include public/ directory in web production build ([a63668a](https://github.com/shep-ai/cli/commit/a63668af84aa64d33faa5d80a8ea6215b3255674))

# [1.32.0](https://github.com/shep-ai/cli/compare/v1.31.0...v1.32.0) (2026-02-18)

### Features

- **web:** add optimistic feature creation with instant feedback ([#72](https://github.com/shep-ai/cli/issues/72)) ([edd81d8](https://github.com/shep-ai/cli/commit/edd81d8ae41976eed60f19f4149c4d370bb317b5))

# [1.31.0](https://github.com/shep-ai/cli/compare/v1.30.0...v1.31.0) (2026-02-18)

### Features

- **agents:** add post-implementation merge flow with PR and approval gates ([#63](https://github.com/shep-ai/cli/issues/63)) ([b5131f9](https://github.com/shep-ai/cli/commit/b5131f9a5696ddcb897c6e44dbedfb073fb29b2a))

# [1.30.0](https://github.com/shep-ai/cli/compare/v1.29.1...v1.30.0) (2026-02-18)

### Features

- **web:** add AllAgentTypes story for FeatureNode agent type icons ([#71](https://github.com/shep-ai/cli/issues/71)) ([563667c](https://github.com/shep-ai/cli/commit/563667c0200dfa0d17a185cd34ba84de03217560))

## [1.29.1](https://github.com/shep-ai/cli/compare/v1.29.0...v1.29.1) (2026-02-18)

# [1.29.0](https://github.com/shep-ai/cli/compare/v1.28.0...v1.29.0) (2026-02-18)

### Features

- **web:** add delete feature node with confirmation dialog ([#68](https://github.com/shep-ai/cli/issues/68)) ([481b1e5](https://github.com/shep-ai/cli/commit/481b1e5a5f6a66d0dc324be02ff360b011dddc28))

# [1.28.0](https://github.com/shep-ai/cli/compare/v1.27.0...v1.28.0) (2026-02-18)

### Features

- **web:** add approval flags to feature create drawer and api route ([#69](https://github.com/shep-ai/cli/issues/69)) ([beee790](https://github.com/shep-ai/cli/commit/beee790f089b6190428f0d77cdb899bf3dcb1226))

# [1.27.0](https://github.com/shep-ai/cli/compare/v1.26.0...v1.27.0) (2026-02-18)

### Bug Fixes

- **ci:** suppress CVE-2026-26960 and add trivyignores to filesystem scans ([#67](https://github.com/shep-ai/cli/issues/67)) ([45232d3](https://github.com/shep-ai/cli/commit/45232d325ee8737911ae7d47520cfce1740c579f))

### Features

- **domain:** add agent notification system with SSE streaming ([#65](https://github.com/shep-ai/cli/issues/65)) ([ee3d7d4](https://github.com/shep-ai/cli/commit/ee3d7d40169a5981c3df287af297005adeaa9931))

# [1.26.0](https://github.com/shep-ai/cli/compare/v1.25.0...v1.26.0) (2026-02-17)

### Features

- **web:** add feature actions (ide/shell) to drawer with api routes ([#66](https://github.com/shep-ai/cli/issues/66)) ([f6fc838](https://github.com/shep-ai/cli/commit/f6fc838e03c90bf9d3e87a6fdf59f1c07f46aa6e))

# [1.25.0](https://github.com/shep-ai/cli/compare/v1.24.0...v1.25.0) (2026-02-17)

### Features

- **web:** wire control center create feature to API with async submit flow ([#64](https://github.com/shep-ai/cli/issues/64)) ([d9f7ed1](https://github.com/shep-ai/cli/commit/d9f7ed1564ba050400fc67a0ebe17668667ec1de))

# [1.24.0](https://github.com/shep-ai/cli/compare/v1.23.2...v1.24.0) (2026-02-17)

### Bug Fixes

- **cli:** route web ui through use-case bridge and stabilize tests ([#62](https://github.com/shep-ai/cli/issues/62)) ([e79643e](https://github.com/shep-ai/cli/commit/e79643e0520077fda690c964e0ef27f64ddd643f))

### Features

- **cli:** add upgrade command ([#59](https://github.com/shep-ai/cli/issues/59)) ([1e2d3c1](https://github.com/shep-ai/cli/commit/1e2d3c13f1a11ef53cf0c0c7a727fa5c768f5bdb))

## [1.23.2](https://github.com/shep-ai/cli/compare/v1.23.1...v1.23.2) (2026-02-16)

### Bug Fixes

- **cli:** web ui startup, shutdown, and phase timing improvements ([#61](https://github.com/shep-ai/cli/issues/61)) ([c8aae95](https://github.com/shep-ai/cli/commit/c8aae954d659981751d62ed23ae731b36824b6e1))

## [1.23.1](https://github.com/shep-ai/cli/compare/v1.23.0...v1.23.1) (2026-02-16)

### Bug Fixes

- **cli:** correct Next.js route types import path ([#60](https://github.com/shep-ai/cli/issues/60)) ([37e030b](https://github.com/shep-ai/cli/commit/37e030b97e43a20347d2eeeecd8573c0a6e3763d))

# [1.23.0](https://github.com/shep-ai/cli/compare/v1.22.1...v1.23.0) (2026-02-16)

### Features

- **web:** add feature drawer inspector panel ([#55](https://github.com/shep-ai/cli/issues/55)) ([e79b0fc](https://github.com/shep-ai/cli/commit/e79b0fc805dfbc219c7db0995547d41f93cdb019))

## [1.22.1](https://github.com/shep-ai/cli/compare/v1.22.0...v1.22.1) (2026-02-16)

### Bug Fixes

- **ci:** correct cursor tool definitions and add post-install verification ([#58](https://github.com/shep-ai/cli/issues/58)) ([8b60f2c](https://github.com/shep-ai/cli/commit/8b60f2cf2aa0f1913907f8b216803fcc87952d89))

# [1.22.0](https://github.com/shep-ai/cli/compare/v1.21.0...v1.22.0) (2026-02-16)

### Features

- **web:** add control center with repo-feature canvas ([#49](https://github.com/shep-ai/cli/issues/49)) ([f576a7d](https://github.com/shep-ai/cli/commit/f576a7df5e8dcdceef2059af2d441b662db2c6f7))

# [1.21.0](https://github.com/shep-ai/cli/compare/v1.20.1...v1.21.0) (2026-02-16)

### Features

- **cli:** add unified tool installer with dynamic json-based tool registry ([#57](https://github.com/shep-ai/cli/issues/57)) ([ba57e94](https://github.com/shep-ai/cli/commit/ba57e94d4619f858a5477d415f4118d2364a2b66))

## [1.20.1](https://github.com/shep-ai/cli/compare/v1.20.0...v1.20.1) (2026-02-16)

# [1.20.0](https://github.com/shep-ai/cli/compare/v1.19.0...v1.20.0) (2026-02-15)

### Bug Fixes

- **cli:** limit fallback slug length to 50 chars ([c5ccb18](https://github.com/shep-ai/cli/commit/c5ccb18479d4e1b4510e78fd335a7295d8c46838))
- **cli:** remove unused type import from show command ([19988f0](https://github.com/shep-ai/cli/commit/19988f0c0f68ccf12d52b174ccb720182c9c6fbd))
- **test:** update e2e test for auto-resolved duplicate slugs ([85f17c5](https://github.com/shep-ai/cli/commit/85f17c53d3a1d042d65d65c8295f352bfed0c66a))

### Features

- **specs:** add 016-hitl-approval-gates implementation plan ([334ac72](https://github.com/shep-ai/cli/commit/334ac727698c872e1fb6fc76b9c8fb4d23d21aec))
- **specs:** add 016-hitl-approval-gates research ([af9ce5d](https://github.com/shep-ai/cli/commit/af9ce5d5ad56537304b46ab5c5bd571b336e36d1))
- **specs:** add 016-hitl-approval-gates specification ([53b89e4](https://github.com/shep-ai/cli/commit/53b89e4c29ee1ab8dd7c41a5c936ca9ef5619065))
- **cli:** add feat review, approve, and reject commands ([3d2cf05](https://github.com/shep-ai/cli/commit/3d2cf05731d30ec2f3b4d8cef73ee5202b437d4e))
- **cli:** add phase timing breakdown and approval context to feat show ([d160335](https://github.com/shep-ai/cli/commit/d160335663db9811fbfcf25e07fce0ddbfe6aa76))
- **agents:** add phase timing recording to graph node execution ([4ba8882](https://github.com/shep-ai/cli/commit/4ba888221dc026537bd9527e1faaf0bec947f3de))
- **agents:** add typed approval gates and phase timing infrastructure ([ec194e3](https://github.com/shep-ai/cli/commit/ec194e38138bb797c308639f8aefbeb4f4350f05))
- **cli:** add worktree, spec path and detailed review hint to feat new output ([6d4af44](https://github.com/shep-ai/cli/commit/6d4af44ac93719e5a5b3adc2b67725df0e8be397))
- **agents:** add yaml validation and auto-repair loops to feature agent graph ([76ba86b](https://github.com/shep-ai/cli/commit/76ba86b021554d95fd046f5e3de1dbbd8eb0679e))
- **agents:** fix approval resume, unique slug resolution, and plan phase 7 ([ae2bb24](https://github.com/shep-ai/cli/commit/ae2bb24861317ce467a804db4fa7643f172656db))
- **cli:** update feat new flags and default approval behavior ([46e1f12](https://github.com/shep-ai/cli/commit/46e1f12659ce16aff542353672fbec0486b06bb4))

# [1.19.0](https://github.com/shep-ai/cli/compare/v1.18.0...v1.19.0) (2026-02-15)

### Bug Fixes

- **cli:** add .js extensions to registry imports and fix lint warnings ([1461a79](https://github.com/shep-ai/cli/commit/1461a793c5834cab7912c4495242470a48724f37))
- **cli:** change antigravity binary from agy to antigravity ([7eaf0d5](https://github.com/shep-ai/cli/commit/7eaf0d50d9169758a96797df2d46e25cede0ee68))

### Features

- **specs:** add 018-feat-ide-open implementation plan ([cc1cef9](https://github.com/shep-ai/cli/commit/cc1cef9c97b24517d50180f8460ca14465d5df2f))
- **specs:** add 018-feat-ide-open research ([3ac8259](https://github.com/shep-ai/cli/commit/3ac82597a7e990b71002e63f4be2275f0685555c))
- **specs:** add 018-feat-ide-open specification ([e1b13a2](https://github.com/shep-ai/cli/commit/e1b13a2ced7b36beb7a8aa840ffbc16471e73fc0))
- **specs:** add 018-feat-ide-open specification ([cb064f9](https://github.com/shep-ai/cli/commit/cb064f9c17eeb3250df92d244a001c967cdb6401))
- **tsp:** add editor type enum and use throughout codebase ([0a4961b](https://github.com/shep-ai/cli/commit/0a4961b85cde13519bfa467273d3e22b093fb1d4))
- **cli:** add ide launcher implementations for all 5 editors ([f1978c2](https://github.com/shep-ai/cli/commit/f1978c23cc7fdec0678f196f83d573e926a5344c))
- **cli:** add ide launcher interface for per-ide launch files ([e6c87cd](https://github.com/shep-ai/cli/commit/e6c87cdc9341653787c5f26ee8915f5e60d22618))
- **cli:** add ide launcher registry and antigravity to settings prompt ([c0297ab](https://github.com/shep-ai/cli/commit/c0297ab22d95d535d1634b3d3c9d34efa7f3c6be))
- **cli:** add settings ide command for editor configuration ([f0d45f2](https://github.com/shep-ai/cli/commit/f0d45f25f3b09c5d6a905d8c335c8471e4cc1478))
- **cli:** add shep ide command to open features in editor ([48cfc30](https://github.com/shep-ai/cli/commit/48cfc304b11c2a5eeaab4c1b6f7872cdc8090a78))

# [1.18.0](https://github.com/shep-ai/cli/compare/v1.17.0...v1.18.0) (2026-02-15)

### Bug Fixes

- **web:** apply prettier formatting to 18 web ui files ([68a9c1b](https://github.com/shep-ai/cli/commit/68a9c1b6df2c6eb2583116fdad063fdb58e1f765))
- **config:** disable tailwind classnames-order eslint rule conflicting with prettier ([2a6f29d](https://github.com/shep-ai/cli/commit/2a6f29d619c28eabe60d34dc0e687abf424002b8))
- **agents:** harden implement node with retry, mcp isolation, and phase resume ([81dd865](https://github.com/shep-ai/cli/commit/81dd8656f58d078039d58e081b4eaa502e39c6e7))
- **config:** resolve tailwind eslint plugin config for tailwind v4 ([f129f52](https://github.com/shep-ai/cli/commit/f129f526e15acc92408316cb07317d113626faca))

### Features

- **specs:** add 017-fix-feat-claude-impl implementation plan ([033d25c](https://github.com/shep-ai/cli/commit/033d25c0b9d7f9f06ac6ff15c537c14954178b07))
- **specs:** add 017-fix-feat-claude-impl research ([f406865](https://github.com/shep-ai/cli/commit/f406865cf71f0a42f9b8f937d6bb114d07f85f38))
- **specs:** add 017-fix-feat-claude-impl specification ([5376c74](https://github.com/shep-ai/cli/commit/5376c74f4547df135e1aeb6b227e94bb1d2929ad))

# [1.17.0](https://github.com/shep-ai/cli/compare/v1.16.0...v1.17.0) (2026-02-15)

### Features

- **agents:** add agent executor provider for settings-driven resolution ([09d6213](https://github.com/shep-ai/cli/commit/09d6213cc5b8eb408f7593fd142465fbade59068))
- **agents:** add cursor cli as supported ai coding agent ([a86a540](https://github.com/shep-ai/cli/commit/a86a5406c4398f2943a57a16f5b83ec5d4d170ab))
- **specs:** add cursor support specification ([264cdd2](https://github.com/shep-ai/cli/commit/264cdd2430e2d7f0a17f74c7ddd668e4b8e6a83c))
- **cli:** improve feat ls columns with repo, agent, and relative time ([2643796](https://github.com/shep-ai/cli/commit/26437967c3172ad1992845e6c113e50053e55668))

# [1.16.0](https://github.com/shep-ai/cli/compare/v1.15.1...v1.16.0) (2026-02-13)

### Bug Fixes

- **agents:** resolve implement node crash and suppress executor noise in feat new ([4c1b0ae](https://github.com/shep-ai/cli/commit/4c1b0ae935954ca34d9bf50bc90b7f53db7b5748))

### Features

- **agents:** replace implement node placeholder with phase-level orchestrator ([d91be0d](https://github.com/shep-ai/cli/commit/d91be0d9bfc647ac5a27f1dcf5cd44490c4a11c8))

## [1.15.1](https://github.com/shep-ai/cli/compare/v1.15.0...v1.15.1) (2026-02-12)

# [1.15.0](https://github.com/shep-ai/cli/compare/v1.14.2...v1.15.0) (2026-02-12)

### Bug Fixes

- **agents:** add mock executor for deterministic e2e tests and fix ci failures ([acb0caa](https://github.com/shep-ai/cli/commit/acb0caaf4385641c639b0c6309c4e2a2d4dd7b35))
- **agents:** close stdin and add debug logging to executor ([1150979](https://github.com/shep-ai/cli/commit/1150979ee9d89a630384abce81ceb76107dd5204))
- **cli,tests:** resolve e2e test issues ([2d71b8c](https://github.com/shep-ai/cli/commit/2d71b8cc5de1a679975cddd5201d35072965c5dd))

### Features

- **specs:** add 013-feature-agent research ([8273351](https://github.com/shep-ai/cli/commit/8273351b33c6f834cfc3879fe70f93fa661062e3))
- **specs:** add 013-feature-agent specification ([d2e638d](https://github.com/shep-ai/cli/commit/d2e638d7c8d39064f43c1bdb1bf11cc70d0a7707))
- **cli,agents:** add agent management commands and fix worker initialization ([d270829](https://github.com/shep-ai/cli/commit/d27082958d2718e812ce238a6f62554b675006b5))
- **agents:** add agent run cli, feature deletion, and executor wiring ([59176bb](https://github.com/shep-ai/cli/commit/59176bbb091d6f235966a846f333bb348c7f0fed))
- **agents:** add observability, management commands, and executor fix ([ce64cb0](https://github.com/shep-ai/cli/commit/ce64cb0831df44d76ff64543248f6d00d4b6c69e))
- **agents:** ai metadata generation, real-time status, and clean agent contexts ([baf12c3](https://github.com/shep-ai/cli/commit/baf12c3c36cce45e13f86ad61f1cb4ac80d12140))
- **specs:** complete 013-feature-agent specification ([8cc97f9](https://github.com/shep-ai/cli/commit/8cc97f92e74851ec7de9ee597e7a9f72829c9339))
- **agents:** implement feature-agent sdlc orchestration system ([e306dc9](https://github.com/shep-ai/cli/commit/e306dc9ffc191177a0681c8c3301e60db2f6f5e0))
- **agents:** stream-json executor with real-time log visibility ([e59727d](https://github.com/shep-ai/cli/commit/e59727da620f4688e94ee30400ffc674e0982d6a))

## [1.14.2](https://github.com/shep-ai/cli/compare/v1.14.1...v1.14.2) (2026-02-12)

### Bug Fixes

- **dx:** align repo pills with feature cards and add-repo button ([dd98716](https://github.com/shep-ai/cli/commit/dd98716b2df9de56a2f8bece02dc94307963ba80))
- **dx:** remove simulation badge, redesign repo browser modal ([7bc56dd](https://github.com/shep-ai/cli/commit/7bc56dda5b06a89b21a8bd9d5daa9a3bb5a91b69))

## [1.14.1](https://github.com/shep-ai/cli/compare/v1.14.0...v1.14.1) (2026-02-12)

# [1.14.0](https://github.com/shep-ai/cli/compare/v1.13.0...v1.14.0) (2026-02-12)

### Bug Fixes

- **web:** add fade-in animation on sidebar expand ([746acc8](https://github.com/shep-ai/cli/commit/746acc888c847885c74f6a0e7bcb8e2328bc680a))
- address pr [#46](https://github.com/shep-ai/cli/issues/46) review feedback (code changes) ([5e14d07](https://github.com/shep-ai/cli/commit/5e14d0765a653a6be1be492a2a6ad174f60e85a1))
- build with tailwinds ([7d9b38d](https://github.com/shep-ai/cli/commit/7d9b38dc573a6ecadd4ab8217b3cf82c07697b3e))
- **deps:** bump storybook to 8.6.15 for env variable exposure vulnerability ([8c27b7b](https://github.com/shep-ai/cli/commit/8c27b7b1b6d55c43a4944c9062b90b91f4dd5104))
- **web:** features section opacity-only collapse, no position/size animation ([53cf464](https://github.com/shep-ai/cli/commit/53cf46409192cb3beb0fba1a189a20ac93c05232))
- **web:** fix docker build and add test ids to sidebar components ([41d1078](https://github.com/shep-ai/cli/commit/41d1078c6a18986d924f059487e0b28558c97f48))
- **web:** fix resize observer mock and css formatting ([781d912](https://github.com/shep-ai/cli/commit/781d912f4ebae6868760daa629d81478b6ac67d4))
- **config:** ignore docs/poc in prettier to fix format check ([f531635](https://github.com/shep-ai/cli/commit/f531635792219e7d166e5162b757743a2f2f818f))
- **web:** mock next.js in storybook for layout components ([157e6c0](https://github.com/shep-ai/cli/commit/157e6c00cfa98c6461208074513d46e4bb6afc56))
- symlink .cursor ([4ce6e46](https://github.com/shep-ai/cli/commit/4ce6e466197712f3689b779d640518c94cdeeb3f))
- tests ([5ffd2bb](https://github.com/shep-ai/cli/commit/5ffd2bbaac1abfc63540cc4ac2529bc6f1f17fee))
- **web:** use deferred mount for sidebar logo fade animation ([d7e626e](https://github.com/shep-ai/cli/commit/d7e626eb865944d6eb6ed86b557ae5d5e4b730e6))

### Features

- **specs:** add 014-ui-sidebar implementation plan ([053e727](https://github.com/shep-ai/cli/commit/053e727e5a96e8e2eef25116065584e365ad831b))
- **specs:** add 014-ui-sidebar research ([2eb903e](https://github.com/shep-ai/cli/commit/2eb903ee6a105b50268e8285e26cb3d2372e6596))
- **specs:** add 014-ui-sidebar specification ([d9d5c0b](https://github.com/shep-ai/cli/commit/d9d5c0b8e31b4f0816c501b43d9723d840db0581))
- **specs:** add 014-ui-sidebar specification ([bd42fba](https://github.com/shep-ai/cli/commit/bd42fba40965b306da4d5c28851e756688aa8c1e))
- **web:** add collapsible sidebar with icon mode and tooltips ([6696abc](https://github.com/shep-ai/cli/commit/6696abcf7b34179a5cb36e23c2163d367def0d4a))
- **web:** add elapsed-time and sidebar-nav-item components with tests ([9b88517](https://github.com/shep-ai/cli/commit/9b8851769cf36cd2d6b41fb89daf1ba0cb31d68c))
- **web:** add feature list, status group, and app sidebar components ([11bcab3](https://github.com/shep-ai/cli/commit/11bcab3eb1ad6ec9a367005e80b00421a9fa915b))
- **web:** add sidebar foundation with shadcn primitives and barrel exports ([ea70c6c](https://github.com/shep-ai/cli/commit/ea70c6c067f7a8dfa4f97aef62be2270ff11e8f9))
- **web:** add status badge summary for collapsed sidebar ([3b4d4e6](https://github.com/shep-ai/cli/commit/3b4d4e60c2dd4d3a5c6b50345b850ac99869564c))
- **dx:** enhance poc ui components and remove outdated screenshots ([71f73ba](https://github.com/shep-ai/cli/commit/71f73bac5bdf0a476f98a6327be9a56ba383d0c7))
- **web:** polish sidebar visual hierarchy, density, and interactions ([cb02685](https://github.com/shep-ai/cli/commit/cb02685fd6238cac3afbb55d78198f02b42206e2))
- **poc:** show repo on canvas when selected - no ideas ([a112189](https://github.com/shep-ai/cli/commit/a1121893014502196198c7118de8ff63f4b5ca59))
- **specs:** update 014-ui-sidebar specs to reflect completed 013-ui-arch ([28765d8](https://github.com/shep-ai/cli/commit/28765d8ca5f31614180b707394ab4694155e2f96))

# [1.13.0](https://github.com/shep-ai/cli/compare/v1.12.0...v1.13.0) (2026-02-11)

### Bug Fixes

- **web:** fix e2e tests and format mdx docs for dashboard layout ([db97a44](https://github.com/shep-ai/cli/commit/db97a444c673caf228aab3ccd722abbbdda37ba6))

### Features

- **specs:** add 013-ui-arch implementation plan and task breakdown ([bc7793e](https://github.com/shep-ai/cli/commit/bc7793e5bedad7b144959d948a4e7ee180596bfa))
- **specs:** add 013-ui-arch research ([87828b1](https://github.com/shep-ai/cli/commit/87828b14ad7e564f0c09ff382ed066c8a7a0604b))
- **specs:** add 013-ui-arch specification ([4ed2b53](https://github.com/shep-ai/cli/commit/4ed2b53a0c9c6b70bbda424bfba5d306bfec5e9e))
- **web:** implement four-tier component architecture ([4b6c15c](https://github.com/shep-ai/cli/commit/4b6c15c6fdce9e333ded69bfb381c87e788a8a99))

# [1.12.0](https://github.com/shep-ai/cli/compare/v1.11.0...v1.12.0) (2026-02-11)

### Features

- **dx:** add implementation phases view with live simulation ([eb9153c](https://github.com/shep-ai/cli/commit/eb9153cd71ad9bc2ffb6f593d1dbf69b8eb9f9a3))
- **poc:** enhance environment cards with cleaner design and full actions ([f8d0eff](https://github.com/shep-ai/cli/commit/f8d0eff3c3c0c55950f38828410bc654d601d44c))

# [1.11.0](https://github.com/shep-ai/cli/compare/v1.10.0...v1.11.0) (2026-02-10)

### Bug Fixes

- **dx:** format poc files with prettier ([196ef6b](https://github.com/shep-ai/cli/commit/196ef6b3409ec8027d87457dcbb52a5a768955d0))

### Features

- **dx:** add environment cards sidebar to poc ([f39342f](https://github.com/shep-ai/cli/commit/f39342fb4f5feddfebd6ab9fde9d8ede5fe58c0f))

# [1.10.0](https://github.com/shep-ai/cli/compare/v1.9.1...v1.10.0) (2026-02-10)

### Bug Fixes

- **specs:** address code review bugs in templates and scripts ([7bcf9c1](https://github.com/shep-ai/cli/commit/7bcf9c1f18b2539cb9bea4186b02fca2b1b52a9f))
- **specs:** remove frontmatter from generated markdown output ([11d1dce](https://github.com/shep-ai/cli/commit/11d1dce554da2e037537a64443dca4a57edb0569))
- **specs:** remove old markdown templates from shep-kit skills ([6bad5b1](https://github.com/shep-ai/cli/commit/6bad5b19c8981c000c4ca38f663c1e2f9f11d01f))

### Features

- **specs:** add 011-shepkit-support-yaml-specs implementation plan ([054dc95](https://github.com/shep-ai/cli/commit/054dc9539aa39d022f308875b1728a7994be2c17))
- **specs:** add 011-shepkit-support-yaml-specs research ([ffcb0f1](https://github.com/shep-ai/cli/commit/ffcb0f1e693c1c9ad3bca3a50a4e816c68de0c22))
- **specs:** add 011-shepkit-support-yaml-specs specification ([38ac895](https://github.com/shep-ai/cli/commit/38ac8951d13fbfe878fbf2ef5b6a2e78d0da7475))
- **specs:** add 012-autonomous-pr-review-loop implementation plan ([c5b3750](https://github.com/shep-ai/cli/commit/c5b375004babbce576f0fcbe3e11286dc27595c6))
- **specs:** add 012-autonomous-pr-review-loop research ([c5bdedf](https://github.com/shep-ai/cli/commit/c5bdedfe707afde78f914782023973259d241a49))
- **specs:** add 012-autonomous-pr-review-loop specification ([e9bdf6c](https://github.com/shep-ai/cli/commit/e9bdf6ccd2af5303bc5aa95f636635162a3dfde9))
- **specs:** add autonomous review loop to commit-pr skill ([930897d](https://github.com/shep-ai/cli/commit/930897d9e4e7f935dcfef85ae09063d381ca8b1d))
- **specs:** extract spec artifact base entity in 011 research ([bb04953](https://github.com/shep-ai/cli/commit/bb04953f28af99e6369ab2c1939f744ca3060b16))
- **specs:** implement yaml-first spec workflow for shep-kit ([cebf437](https://github.com/shep-ai/cli/commit/cebf4374427fed575448dc91ae56bbd745ad1f4a))
- **specs:** revise 011 research with typespec-first approach ([7e82149](https://github.com/shep-ai/cli/commit/7e82149a415c9a55a202ee81990106d764766e59))

## [1.9.1](https://github.com/shep-ai/cli/compare/v1.9.0...v1.9.1) (2026-02-09)

### Bug Fixes

- **deps:** add pnpm 10 compatibility for better-sqlite3 native bindings ([6686bd2](https://github.com/shep-ai/cli/commit/6686bd236dad4cf0d12d4cbe6903595afc77532d))

# [1.9.0](https://github.com/shep-ai/cli/compare/v1.8.2...v1.9.0) (2026-02-08)

### Features

- **specs:** add 009-langchain-agent-infra spec and research ([032ff70](https://github.com/shep-ai/cli/commit/032ff70de254577122b91cddcafb04b76939d1f5))
- **specs:** add agent-agnostic implementation plan for langchain-agent-infra ([0bf7d8e](https://github.com/shep-ai/cli/commit/0bf7d8e8dac5a991384fee72b7af194e5518a6c4))
- **specs:** add crash recovery protocol to research ([31e6d03](https://github.com/shep-ai/cli/commit/31e6d03f4e18b9a4614b0825e5f1916ac5feeae4))
- **agents:** implement langchain agent orchestration infrastructure ([3fd1963](https://github.com/shep-ai/cli/commit/3fd1963bc930ff12419c2c2e73c8a98cd5159e7c))
- **agents:** implement streaming architecture for real-time agent output ([707b49a](https://github.com/shep-ai/cli/commit/707b49a5a5e0a1729e64ff864558b24aa1f6344d))
- **specs:** use claude code subprocess wrapper for agent execution ([fc5edca](https://github.com/shep-ai/cli/commit/fc5edcaf6c9e64240ab2da049ede8c333945a3dd))

## [1.8.2](https://github.com/shep-ai/cli/compare/v1.8.1...v1.8.2) (2026-02-08)

### Bug Fixes

- **cli:** resolve production packaging failures after npm install ([0528769](https://github.com/shep-ai/cli/commit/052876959fde759dcc27afc25a7f9990db63c8f0))

## [1.8.1](https://github.com/shep-ai/cli/compare/v1.8.0...v1.8.1) (2026-02-08)

### Bug Fixes

- **cli:** resolve correct production path for web directory ([b54ff6b](https://github.com/shep-ai/cli/commit/b54ff6b4513d5d30a6500533d3765bc90ef3e086))

# [1.8.0](https://github.com/shep-ai/cli/compare/v1.7.0...v1.8.0) (2026-02-08)

### Features

- **specs:** add 010-enforce-di-compliance specification (completed) ([4e7fe35](https://github.com/shep-ai/cli/commit/4e7fe3574c5801cee45aca8d2dbde9126a15e603))

# [1.7.0](https://github.com/shep-ai/cli/compare/v1.6.3...v1.7.0) (2026-02-08)

### Features

- **specs:** add 009-langchain-agent-infra specification ([a7d33fa](https://github.com/shep-ai/cli/commit/a7d33fa2b61bac12170e8b3cbd0db2dd5e94a15b))
- **skills:** add spec directory scaffolding to parallel-task skill ([55027c9](https://github.com/shep-ai/cli/commit/55027c949ad9a990a368f37cae3f168f1561ab56))

## [1.6.3](https://github.com/shep-ai/cli/compare/v1.6.2...v1.6.3) (2026-02-08)

## [1.6.2](https://github.com/shep-ai/cli/compare/v1.6.1...v1.6.2) (2026-02-08)

### Bug Fixes

- **cli:** add diagnostic output to build integrity tests ([84ab11c](https://github.com/shep-ai/cli/commit/84ab11c59a9f6363e6fe9de8f09b0dba8fceba17))
- **cli:** correct dist path in cli test runner ([d7fc418](https://github.com/shep-ai/cli/commit/d7fc418c1b57b305dea9a571b4295579a3bf4cfb))
- **cli:** make build integrity tests resilient to ci environment ([0e4d2d8](https://github.com/shep-ai/cli/commit/0e4d2d815bb5134976d8fa72791e53694c9f3257))
- **cli:** resolve @/ path aliases in compiled dist output ([c13401e](https://github.com/shep-ai/cli/commit/c13401e9aa9aac135b52d828c1fe887e7b083dfa))

## [1.6.1](https://github.com/shep-ai/cli/compare/v1.6.0...v1.6.1) (2026-02-08)

# [1.6.0](https://github.com/shep-ai/cli/compare/v1.5.0...v1.6.0) (2026-02-08)

### Bug Fixes

- **cli:** correct bin path to dist/src/presentation/cli/index.js ([d9ea0e4](https://github.com/shep-ai/cli/commit/d9ea0e4ca2ae8c39f32f9023bda6be00d53c8847))
- **test:** skip agent config e2e tests when claude binary unavailable ([d726a6b](https://github.com/shep-ai/cli/commit/d726a6b939d32d721da4c5a35a78497cf6e7d092))

### Features

- **specs:** add 008-agent-configuration implementation plan ([f85c70f](https://github.com/shep-ai/cli/commit/f85c70fb2c3ba7011d6849ca6faebd3c4a550706))
- **specs:** add 008-agent-configuration research ([a88b8e8](https://github.com/shep-ai/cli/commit/a88b8e87f4df7874e1e1d51b2b5565d7e5ab9312))
- **specs:** add 008-agent-configuration specification ([8f37d8b](https://github.com/shep-ai/cli/commit/8f37d8b523a5c81ad9d864ade947ca64ce3e8a61))
- **agents:** add agent config typespec models, migration, and infrastructure ([4959ca8](https://github.com/shep-ai/cli/commit/4959ca81e2e6a9d21d326463449ee732ecad317b))
- **agents:** add agent validator, use cases, and tui wizard ([c03fee3](https://github.com/shep-ai/cli/commit/c03fee347eeb08a608f47810d0ca500f424ed6dc))
- **cli:** add settings agent e2e tests and fix repository load bug ([d7a6532](https://github.com/shep-ai/cli/commit/d7a653224f4e85db23236b6523a57cd09a7c5a2a))
- **cli:** add shep settings agent command with interactive wizard ([dc42051](https://github.com/shep-ai/cli/commit/dc42051da9623ec728227a44e193c7bf91484b62))

# [1.5.0](https://github.com/shep-ai/cli/compare/v1.4.0...v1.5.0) (2026-02-08)

### Features

- **specs:** add 007-ui-command implementation plan ([f8a2251](https://github.com/shep-ai/cli/commit/f8a22510f2e6790ac586ec17bd8e88585740f32c))
- **specs:** add 007-ui-command research ([8b144a5](https://github.com/shep-ai/cli/commit/8b144a5f3f203f44435d3c13739ee78e49f7df41))
- **specs:** add 007-ui-command specification ([e8088fa](https://github.com/shep-ai/cli/commit/e8088fa348d2997207fe0ca1fb479ff08ade3ff8))
- **cli:** add shep ui command to serve web ui ([e762643](https://github.com/shep-ai/cli/commit/e76264331d7b53a11f9db232701f7449a5ed39a2))
- **specs:** switch 007 research to in-process programmatic api ([0c79807](https://github.com/shep-ai/cli/commit/0c798072899cedf91f808fe251b1a3dd8093962c))

# [1.4.0](https://github.com/shep-ai/cli/compare/v1.3.1...v1.4.0) (2026-02-05)

### Features

- **specs:** add 006-cli-settings-commands specification ([3f337c2](https://github.com/shep-ai/cli/commit/3f337c2289dbf052ebeeb15976c6727b545c088c))
- **shep-kit:** add autonomous implementation executor with validation gates ([eaca076](https://github.com/shep-ai/cli/commit/eaca07684773786946ebb718f9c161c41bab0d38))
- **specs:** add hierarchical help system requirements ([023389d](https://github.com/shep-ai/cli/commit/023389d55d1fe10c1cd6ed88c94f133e08170e02)), closes [#7](https://github.com/shep-ai/cli/issues/7)
- **specs:** add implementation plan for 006-cli-settings-commands ([4444b31](https://github.com/shep-ai/cli/commit/4444b31053a3f54b2d66a0e7d1041344d663307b))
- **cli:** add ui foundation for settings commands ([c894051](https://github.com/shep-ai/cli/commit/c894051aedeadbd51ab0bc6f1e9de09a7388ff31))
- **specs:** complete research for 006-cli-settings-commands ([f41f374](https://github.com/shep-ai/cli/commit/f41f3746d62c214fe930e008bb0ad679f7c2f3f4))
- **cli:** implement init command with help text (green) ([e3b57d4](https://github.com/shep-ai/cli/commit/e3b57d4ba24c232a2d141c3d47b647a23519a72c))
- **cli:** implement show command with output formatters (green) ([eee7340](https://github.com/shep-ai/cli/commit/eee7340ab5ef8e580619cd696891b8637fc7f3af))

## [1.3.1](https://github.com/shep-ai/cli/compare/v1.3.0...v1.3.1) (2026-02-05)

### Bug Fixes

- **ci:** remove trivy sarif steps and suppress telemetry noise ([#22](https://github.com/shep-ai/cli/issues/22)) ([e3db5b9](https://github.com/shep-ai/cli/commit/e3db5b9e0edcc1a18fffa1b0adcc0a51076ccd28))

# [1.3.0](https://github.com/shep-ai/cli/compare/v1.2.0...v1.3.0) (2026-02-05)

### Bug Fixes

- **ci:** completely disable claude-review workflow ([#17](https://github.com/shep-ai/cli/issues/17)) ([c803cbc](https://github.com/shep-ai/cli/commit/c803cbc35a0bac32ffcfa19057e1c6ebfdb43a64))
- **ci:** delete claude-review.yml workflow file ([#18](https://github.com/shep-ai/cli/issues/18)) ([4ff1629](https://github.com/shep-ai/cli/commit/4ff162991d5d6c45d02ff34e186964ac168fe6f4))
- **ci:** enable credential persistence for semantic-release ([#16](https://github.com/shep-ai/cli/issues/16)) ([bffac14](https://github.com/shep-ai/cli/commit/bffac1498a1f249c5f70e49fe94f6a65de5614cc))
- **ci:** limit main branch to 1 concurrent workflow ([#21](https://github.com/shep-ai/cli/issues/21)) ([4dc5b84](https://github.com/shep-ai/cli/commit/4dc5b84a82aabdde3ad05fa433e46311ce5308aa))
- **ci:** suppress cve-2026-0775 npm vulnerability ([#20](https://github.com/shep-ai/cli/issues/20)) ([c5d3635](https://github.com/shep-ai/cli/commit/c5d3635170f891526fa5e02babb4a02af9ece6fd))
- **ci:** use release_token for semantic-release to bypass branch protection ([#19](https://github.com/shep-ai/cli/issues/19)) ([17438b5](https://github.com/shep-ai/cli/commit/17438b5335b6a1eb4b85c3484e75f60c41dcbc33))

### Features

- **specs:** add 005 global-settings-service specification ([#14](https://github.com/shep-ai/cli/issues/14)) ([427344e](https://github.com/shep-ai/cli/commit/427344e23846a90d3389987c0cb1684024b1c127)), closes [#005](https://github.com/shep-ai/cli/issues/005)
- **web:** add component library foundation with shadcn/ui and storybook ([#9](https://github.com/shep-ai/cli/issues/9)) ([e4601fa](https://github.com/shep-ai/cli/commit/e4601fa5a7f0d0e32e3a72431258cce1f03fc196))
- **ci:** add security scanning gates with release blocking ([#8](https://github.com/shep-ai/cli/issues/8)) ([1e16f2d](https://github.com/shep-ai/cli/commit/1e16f2ddd28a6b7ebf72147835a1c6117b136427))

### BREAKING CHANGES

- **specs:** All feature plans MUST now follow Test-Driven Development

* Update shep-kit:plan skill to MANDATE TDD planning structure
* Update plan.md template with explicit TDD cycle phases
* Update tasks.md template with RED-GREEN-REFACTOR breakdown
* Update spec-driven-workflow.md to emphasize MANDATORY TDD
* Update CLAUDE.md to highlight TDD requirement in planning
* Rewrite 005-global-settings-service plan/tasks with TDD structure
  - Phase 1-2: Foundational (no tests)
  - Phase 3: TDD Cycle 1 (Domain Layer)
  - Phase 4: TDD Cycle 2 (Application Layer)
  - Phase 5: TDD Cycle 3 (Persistence Layer)
  - Phase 6: TDD Cycle 4 (Repository Layer)
  - Phase 7: TDD Cycle 5 (CLI Integration)
  - Phase 8: Documentation

Key Changes:

- Tests are written FIRST in every TDD cycle (RED phase)
- Implementation written to pass tests (GREEN phase)
- Code refactored while keeping tests green (REFACTOR phase)
- Old non-TDD plans backed up as plan-old.md, tasks-old.md

This ensures all future features follow proper TDD workflow.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- fix(ci): use v1.0+ prompt parameter in claude-review workflow

Changed direct_prompt to prompt to match claude-code-action@v1 API.
The v0.x parameter name was causing the action to skip execution.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- feat(config): add build pipeline and typespec code generation

phase 1: build pipeline & code generation setup (foundational)

- install dependencies: better-sqlite3, @blackglory/better-sqlite3-migrations,
  @typespec-tools/emitter-typescript, tsyringe, reflect-metadata
- configure typescript decorators (experimentalDecorators, emitDecoratorMetadata)
- add @domain/generated/\* path alias to tsconfig.json
- configure typescript emitter in tspconfig.yaml
- add generate/tsp:codegen scripts with pre-hooks (prebuild, pretest, prelint)
- update ci workflow to run pnpm generate in all jobs
- update pre-commit hook to generate types before lint-staged
- track src/domain/generated/ in git (typespec-generated domain models)
- exclude src/domain/generated/ from eslint (auto-generated code)
- verify typespec compilation works end-to-end

build flow: typespec → generate → build → test

part of specs/005-global-settings-service

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- fix(config): ignore nested build output directories in eslint

* Change `.next/**` to `**/.next/**` to catch Next.js build dirs at any level
* Change `storybook-static/**` to `**/storybook-static/**` for Storybook builds
* Fixes lint failures from workspace build outputs in src/presentation/web/.next/

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- feat(tsp): add settings domain model with nested configuration types

* Create Settings entity extending BaseEntity (singleton pattern)
* Add ModelConfiguration for AI model selection per agent
* Add UserProfile for optional user identity (name, email, github)
* Add EnvironmentConfig for editor and shell preferences
* Add SystemConfig for auto-update and log level settings
* Update domain entities index to export Settings model
* Generate TypeScript types in src/domain/generated/output.ts
* All nested models have sensible defaults for first-run experience

Phase 2/8 complete: TypeSpec Settings Model & Generation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- style(tsp): fix prettier formatting in generated output.ts

* Change enum string values from double quotes to single quotes
* Fixes CI/CD format:check failure
* No functional changes, only style formatting

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- fix(config): auto-format generated types after typespec compilation

* Add prettier --write to tsp:codegen script after compilation
* Ensures generated TypeScript follows project code style (single quotes)
* Fixes CI/CD format:check failures due to double quotes in generated code
* Generated files now maintain consistent formatting across commits

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- fix(docker): include typespec files in build context

* Add tspconfig.yaml and tsp/ directory to builder stage COPY
* Remove tsp/ and tspconfig.yaml from .dockerignore exclusions
* TypeSpec files are required during build for code generation (prebuild hook)
* Fixes Docker Build and Trivy (container) CI/CD failures
* Build now succeeds with pnpm generate → TypeScript compilation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- feat(domain): implement settings defaults factory with tdd

Phase 3 implementation following red-green-refactor cycle.

- created comprehensive test suite (15 tests)
- implemented createDefaultSettings() factory function
- extracted constants for maintainability
- disabled claude review workflow per user preference
- updated tasks.md with phase 1, 2, 3 complete

tests: 15/15 unit tests passing, all validations passing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- feat(application): implement settings use cases with tdd

phase 4 implementation following red-green-refactor cycle.

- created comprehensive test suite (26 tests total)
- mock repository helper for unit testing
- initialize settings use case (idempotent initialization)
- load settings use case (with error handling)
- update settings use case (full settings update)
- clean architecture with repository interface
- tsyringe dependency injection
- reflect-metadata for decorators

tests: 26/26 use case tests passing, all validations passing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- feat(domain): implement sqlite persistence layer with tdd

phase 5 implementation following red-green-refactor cycle.

- created comprehensive integration tests (13 tests total)
- database helper for in-memory test databases
- shep directory service (~/.shep/ with 700 permissions)
- sqlite connection module (singleton with wal mode)
- manual migration system (user_version tracking)
- settings table migration (flattened schema)
- all pragmas configured for performance
- idempotent migrations with transaction support

tests: 13/13 integration tests passing, all validations passing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- feat(infrastructure): implement sqlite settings repository with tdd

Completes Phase 6 (Infrastructure - Repository Layer) following strict TDD methodology.

RED Phase:

- Created 32 integration tests for SQLiteSettingsRepository
- Tests cover initialize(), load(), update() operations
- Tests verify singleton constraint enforcement
- Tests confirm SQL injection prevention with prepared statements
- Tests validate database mapping (snake_case ↔ camelCase)

GREEN Phase:

- Implemented SQLiteSettingsRepository with @injectable decorator
- Used prepared statements with named parameters for all operations
- Implemented bidirectional database mapping (flatten/unflatten)
- All 32 integration tests passing

REFACTOR Phase:

- Extracted mapping functions to settings.mapper.ts
- Optimized SQL queries with prepared statements
- Maintained test coverage (141/141 tests passing)

Test Results:

- Repository tests: 32/32 passing
- Total suite: 141/141 passing
- All validation checks passing (lint, format, typecheck, tsp)

Files Changed:

- tests/integration/infrastructure/repositories/sqlite-settings.repository.test.ts (new)
- src/infrastructure/repositories/sqlite-settings.repository.ts (new)
- src/infrastructure/persistence/sqlite/mappers/settings.mapper.ts (new)
- specs/005-global-settings-service/tasks.md (updated)

Note: DI container configuration deferred to Phase 7 (CLI integration)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- feat(cli): implement settings initialization with di container and tdd

Completes Phase 7 (CLI Integration) following strict TDD methodology.

RED Phase:

- Created 11 E2E tests for CLI settings initialization
- Tests verify directory creation, database setup, settings persistence
- Tests cover concurrent access, error recovery, environment isolation
- Initial results: 8/11 tests failing as expected

GREEN Phase:

- Created DI container (src/infrastructure/di/container.ts)
- Configured tsyringe with database, repositories, and use cases
- Created settings service (src/infrastructure/services/settings.service.ts)
- Implemented global settings singleton access pattern
- Updated CLI entry point with async bootstrap function
- Added reflect-metadata import and DI initialization
- All 11 E2E tests passing

REFACTOR Phase:

- Improved error handling with specific messages for each failure point
- Bootstrap function separated for database and settings initialization
- Fixed ESLint errors (require() imports, unused variables)
- All 152 tests passing after refactoring

Test Results:

- E2E settings tests: 11/11 passing
- Total test suite: 152/152 passing
- All validation checks passing (lint, format, typecheck, tsp)

Files Changed:

- tests/e2e/cli/settings-initialization.test.ts (new - 11 E2E tests)
- src/infrastructure/di/container.ts (new - DI configuration)
- src/infrastructure/services/settings.service.ts (new - global singleton)
- src/presentation/cli/index.ts (updated - bootstrap with DI)
- specs/005-global-settings-service/tasks.md (updated - Phase 7 complete)

Key Features:

- Automatic settings initialization on first CLI run
- Global settings access throughout application
- Dependency injection with tsyringe
- Database migrations run automatically
- Graceful error handling and recovery
- Environment variable isolation for testing

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

- docs(specs): complete phase 8 - documentation for global-settings-service

Phase 8: Documentation & Finalization (TDD Complete)

Updates:

- CLAUDE.md: Added Settings domain model, DI container,
  TypeSpec-first architecture
- docs/architecture/settings-service.md: Comprehensive
  architecture documentation
- docs/development/cicd.md: Document TypeSpec compilation
  in CI/CD
- docs/development/tdd-guide.md: Added sections on testing
  TypeSpec-generated code and in-memory SQLite repositories
- docs/development/typespec-guide.md: Complete TypeSpec
  domain modeling guide
- specs/005-global-settings-service/spec.md: Marked all
  success criteria as completed, Phase: Complete
- specs/005-global-settings-service/tasks.md: All Phase 8
  tasks completed, acceptance checklist satisfied

Feature complete:

- 152/152 tests passing (all green)
- All validations passing (lint, format, typecheck, tsp)
- Smoke test successful (shep version works with settings)
- TDD workflow followed for ALL phases (RED → GREEN → REFACTOR)

# [1.2.0](https://github.com/shep-ai/cli/compare/v1.1.0...v1.2.0) (2026-02-02)

### Features

- **ci:** add docker build and push to github container registry ([#7](https://github.com/shep-ai/cli/issues/7)) ([9c4ea7d](https://github.com/shep-ai/cli/commit/9c4ea7da6b24f7e3e127e25e0aae06003448116f))

# [1.1.0](https://github.com/shep-ai/cli/compare/v1.0.1...v1.1.0) (2026-02-02)

### Features

- **dx:** add shep-kit:merged skill for post-merge cleanup ([e7b7818](https://github.com/shep-ai/cli/commit/e7b7818bdea118e00b087f94050001a047672fbe))

## [1.0.1](https://github.com/shep-ai/cli/compare/v1.0.0...v1.0.1) (2026-02-02)

### Bug Fixes

- **test:** read version from package.json dynamically ([45616ee](https://github.com/shep-ai/cli/commit/45616ee5b4ef025a5fc21e026d53df61682ff90c))

# 1.0.0 (2026-02-02)

### Bug Fixes

- **config:** fix test and build scripts for cli project ([eb6be50](https://github.com/shep-ai/cli/commit/eb6be50f433a55e22a44b4b7db96a95f047682fe))
- **ci:** ignore release commits in commitlint ([3d048bd](https://github.com/shep-ai/cli/commit/3d048bd73f162246ae125fbe84b3baa214c62f7f))
- **config:** let pnpm action read version from package.json ([6738877](https://github.com/shep-ai/cli/commit/6738877065942b9fd42e03c5d692c360d6669f9e))

### Features

- **dx:** add claude code hooks and skills for tsp workflow ([#1](https://github.com/shep-ai/cli/issues/1)) ([4fa4225](https://github.com/shep-ai/cli/commit/4fa4225ff6d479d2186c16f2f11311a1eb5043e7))
- **cli:** add cli scaffolding with commander.js and e2e tests ([#2](https://github.com/shep-ai/cli/issues/2)) ([a2b4259](https://github.com/shep-ai/cli/commit/a2b42595db6106e6da85049c6b85e2325f803b4a))
- **ci:** add semantic-release for automated publishing ([#4](https://github.com/shep-ai/cli/issues/4)) ([ee90892](https://github.com/shep-ai/cli/commit/ee908923e8e9c15d1eb600563770f179b259e3af))
- **specs:** add shep-kit spec-driven development workflow ([#3](https://github.com/shep-ai/cli/issues/3)) ([9855982](https://github.com/shep-ai/cli/commit/9855982095af255ef115e3fc337e7999ca2b70c9))

# Changelog

All notable changes to this project will be documented in this file.

This changelog is automatically generated by [semantic-release](https://github.com/semantic-release/semantic-release) based on [Conventional Commits](https://www.conventionalcommits.org/).
