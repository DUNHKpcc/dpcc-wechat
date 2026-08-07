import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const sourceRoot = join(root, 'src')
const failures: string[] = []

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function collectFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? collectFiles(path) : [path]
  })
}

const source = collectFiles(sourceRoot)
  .filter((path) => /\.(ts|json|wxml|wxss)$/.test(path))
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n')

const forbiddenPatterns: Array<[RegExp, string]> = [
  [/\btestUserId\b/, '仍包含固定测试用户'],
  [/\bNew-Api-User\b/i, '仍向客户端请求注入用户 ID'],
  [/\bloginWithAccessToken\b/, '仍包含 Access Token 登录入口'],
  [/\bauthMode\s*:\s*['"](?:mock|access_token)['"]/, '仍处于测试鉴权模式'],
  [/\buseMockPrivateData\s*:\s*true\b/, '仍启用了私有模拟数据'],
  [/\bopen-type=['"]getPhoneNumber['"]/, '仍请求用户手机号码授权'],
  [/\bwx\.getUserProfile\b/, '仍请求用户头像或昵称授权'],
  [/\bwx\.getUserInfo\b/, '仍请求旧版用户信息授权'],
  [/wechat\.example\.com/, '仍使用示例 BFF 域名'],
  [/\bL8GobbjYTU60smjAHhKsr7AFwsGS\b/, '源码包含测试 Access Token'],
]

for (const [pattern, message] of forbiddenPatterns) {
  if (pattern.test(source)) failures.push(message)
}

const runtime = read('src/config/runtime.ts')
if (!/newApiBaseUrl:\s*'https:\/\//.test(runtime)) {
  failures.push('New API 地址不是 HTTPS')
}
if (!/bffBaseUrl:\s*'https:\/\//.test(runtime)) {
  failures.push('BFF 地址不是 HTTPS')
}

const legalPage = read('src/pages/legal/index.wxml')
const requiredLegalDisclosures = [
  '运营者与适用范围',
  '微信登录临时凭证',
  'OpenID 或 UnionID',
  '账户资料与服务数据',
  '保存期限与安全措施',
  '您的权利与撤回同意',
  '未勾选同意前，小程序不会调用 wx.login',
  'sjh2329952249@163.com',
]
for (const disclosure of requiredLegalDisclosures) {
  if (!legalPage.includes(disclosure)) {
    failures.push(`隐私政策缺少必要说明：${disclosure}`)
  }
}
if (/\/api\/(?:user-agreement|privacy-policy)/.test(source)) {
  failures.push('协议页面仍依赖可能无法渲染的远程 HTML')
}

const loginPage = read('src/pages/login/index.wxml')
if (!/open-type="agreePrivacyAuthorization"/.test(loginPage)) {
  failures.push('登录按钮未接入微信隐私授权确认')
}
if (
  !loginPage.includes('《用户服务协议》') ||
  !loginPage.includes('《隐私政策》')
) {
  failures.push('登录页缺少用户协议或隐私政策入口')
}

const authService = read('src/services/auth.ts')
if (
  !/user_agreement_version:\s*LEGAL_DOCUMENT_VERSION/.test(authService) ||
  !/privacy_policy_version:\s*LEGAL_DOCUMENT_VERSION/.test(authService)
) {
  failures.push('登录请求未携带协议版本')
}

const project = JSON.parse(read('project.config.json')) as {
  setting?: { urlCheck?: boolean; uploadWithSourceMap?: boolean }
}
if (project.setting?.urlCheck !== true) {
  failures.push('微信合法域名校验未开启')
}
if (project.setting?.uploadWithSourceMap !== false) {
  failures.push('生产上传仍包含 Source Map')
}

const app = JSON.parse(read('src/app.json')) as {
  __usePrivacyCheck__?: boolean
  pages?: string[]
}
if (app.__usePrivacyCheck__ !== true) {
  failures.push('未显式启用微信隐私合规检查')
}
if (app.pages?.[0] !== 'pages/models/index') {
  failures.push('小程序首页不是无需登录的公开模型目录')
}

const modelsPage = read('src/pages/models/index.ts')
if (
  !/getPublicModels/.test(modelsPage) ||
  /reLaunch\(\{\s*url:\s*['"]\/pages\/login\/index['"]/.test(modelsPage)
) {
  failures.push('公开模型目录仍会在浏览前强制登录')
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log('小程序静态上线检查通过')
