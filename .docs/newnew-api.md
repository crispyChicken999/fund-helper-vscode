## 问题

2026-07-21 起，当前基金估值接口：

```text
https://fundgz.1234567.com.cn/js/{fundCode}.js
```

对多个基金代码均返回：

```text
HTTP 301 Moved Permanently
Location: https://fund.eastmoney.com/notfound.html
```

Axios 会跟随重定向并取得 HTML 错误页，导致 `fundService.ts` 无法匹配 `jsonpgz(...)`，最终全部显示“暂无数据”。相关现象见 #676。

## 官网 H5 中的新估值接口

检查天天基金新版 H5：

```text
https://h5.1234567.com.cn/app/fund-details/?fCode=000001
```

在当前 H5 JS 中发现 `FundComApi.getValuationLast` 使用：

```text
GET/POST https://fundcomapi.tiantianfunds.com/mm/newCore/FundValuationLast
```

备用域名：

```text
https://fundcomapi.eastmoney.com/mm/newCore/FundValuationLast
```

请求示例：

```bash
curl -G 'https://fundcomapi.tiantianfunds.com/mm/newCore/FundValuationLast' \
  --data-urlencode 'FCODES=161725,001632,510300' \
  --data-urlencode 'FIELDS=FCODE,SHORTNAME,GSZZL,GZTIME,GSZ,NAV,PDATE'
```

接口支持批量基金代码。

## 字段映射

| 新接口 | 当前项目字段 | 含义 |
| --- | --- | --- |
| `FCODE` | `fundcode` | 基金代码 |
| `SHORTNAME` | `name` | 基金名称 |
| `GSZ` | `gsz` | 实时估值 |
| `GSZZL` | `gszzl` | 估值涨跌幅 |
| `GZTIME` | `gztime` | 估值时间 |
| `NAV` | `dwjz` | 上一净值 |
| `PDATE` | `jzrq` | 净值日期 |

## 实测结果

2026-07-21 盘中测试：

| 基金代码 | 结果 |
| --- | --- |
| `161725` | 返回实时估值 |
| `001632` | 返回实时估值 |
| `510300` | 返回实时估值 |
| `159915` | 返回实时估值 |
| `000001` | `GSZ/GSZZL/GZTIME` 为 `null` |
| `110022` | `GSZ/GSZZL/GZTIME` 为 `null` |
| `005827` | `GSZ/GSZZL/GZTIME` 为 `null` |

因此新接口可以恢复仍由天天基金提供估值的基金，但部分主动管理型基金目前数据侧已不再提供估值，需要对 `null` 做兼容展示。

## 修改建议

1. 将旧 `fundgz` JSONP 请求切换为 `FundValuationLast`。
2. 使用 `FCODES` 一次批量请求整个基金分组，避免当前每只基金单独请求。
3. 主域请求失败时切换至 `fundcomapi.eastmoney.com`。
4. 对 `GSZ === null` 的基金保留名称和正式净值，并显示“暂无盘中估值”，避免误报为基金不存在。
5. 新接口字段可以直接映射到现有 `FundService` 数据结构，主要展示与收益计算逻辑可以继续复用。
