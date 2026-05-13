现在还有一些问题
首先一进入到项目会白屏http://localhost:5173/api-proxy/fundmob/FundMNewApi/FundMNFInfo?pageIndex=1&pageSize=200&plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=web&Fcodes=018125,020256,015968,023829,014409,018168,010990,017193,023037,002963,016874,023602,011370,014439,021760,025491,015790,023452,019062,004753,003985,021034,021876,020107,022435,025446,025833,011103,013511,018291,015839,022122 在这个接口请求完成了要等一段时间界面才会出来这个帮我排查看看是什么问题


然后行情中心里面的https://data.eastmoney.com/dataapi/bkzj/getbkzj?key=f62&code=m%3A90%2Bs%3A4 这个接口会CORS需要做代理，正式和开发环境都需要做代理，不然接口数据返回不回来，
行业板块
风格板块
概念板块
地域板块 这四个板块的echart就渲染不出来了额额。具体看看[MARKET](./market.html)

设置中的数据同步模块，Box Name他是有规则的，现在的问题是，无法上传和下载同步json提示400，因为name的规则不合理，你可以看 [docs](./jsonbox-docs.md)里面的描述来修改。
重新设置boxname应该在外面也要放一个按钮，点击后可以重新生成boxname，存到localstorage里面。

导入配置后，我发现，分组item没有导入成功，没有显示出来分组的item，但是我们的配置是正确的[配置](./VSCode_基金助手配置备份_20260508140000.json),也帮我排查一下看看是什么问题。

已加载 9 个分组
fundService.ts:53 已加载 32 个基金
syncService.ts:32 同步服务已初始化
但是里面就只有一个全部的分组而已
<div data-v-b4e148ca="" class="group-tags-container"><div data-v-b4e148ca="" class="group-tag-item active"> 全部 </div></div>

fund-toolbar是不是少了个margintop，fund-toolbar放到layout-header里面去吧，不然会影响layout-content里面的布局，导致fund-list-main会出现额外的滚动条

fund-list-main有个滚动条，然后el-table又有一个滚动条，这导致了布局有点问题，就是还要在滚动一下，list-main撑满剩余空间，el-table也是撑满list-main的除去fund-toolbar剩余空间

添加基金、刷新基金列表、列设置的按钮放到stat-label的右侧

基金列表的操作列隐藏。

fund-name-row里面的fund-name没有自动省略就是没有ellipsis没生效

fund-tooltip-overlay的zindex改成2000吧，不然会和element的弹窗冲突，导致他的弹窗被压在了下面

基金加仓、减仓的逻辑要按照vscode的流程进行啊，加仓的话，用户输入palceholder“加仓中欧信息科技混合发起C一请选择买入日期的净值”，会出现一个下拉列表选择日期对应的净值，进行加仓，然后确认净值日期后，输入加仓的金额，完成加仓计算。
减仓的话用户输入减仓的份额就可以了placeholder需要显示提示，最多可以减仓多少份。

首页里面的分组group-tag-item好丑啊，样式优化一下，你看vscode里面的就很好看，间距也做好了。

基金详情页里面的基金概括显示为空，你看看[DETAIL](./detail.html)里面的写法就是获取数据的方式
http://localhost:5173/api-proxy/fundmob/FundMNewApi/FundMNDetail?FCODE=011370&deviceid=web&plat=Android&appType=ttjj&product=EFund&Version=1
请求方法:
GET
状态代码:
404 Not Found
http://localhost:5173/api-proxy/fundmob/FundMNewApi/FundMNManager?FCODE=011370&deviceid=web&plat=Android&appType=ttjj&product=EFund&Version=1
GET
状态代码:
404 Not Found
历史净值和累计收益
切换近3月近6月近1年近3年近5年没有数据，具体可以看detail.html里面是怎么写的。可能是接口没写对的问题。

设置分组弹窗
输入分组名称（须已存在）或与下拉一致，这个应该是像vscode那样，弹出分组管理器然后定位对应的分组和对应的基金，如果基金未分类的话，那么未分类高亮，然后对应的基金高亮。

group-tags-container的item的高度稍微缩小一点