# 课程内容审查与整改清单

审查日期：2026-10-10（Asia/Shanghai）  
项目位置：`/Users/shaozhenjie/class-server/github.io`  
审查基线提交：`9dd001b402b566bf129385ad90f08646d9d19875`

## 使用说明

这份文档汇总本轮检查已发现的问题，包括正文、测验、参考代码、图示与原始实验材料之间的矛盾。本文档是交给修改者的任务清单；整理时没有修改课程文件。

共 52 项：C 语言 18 项、数据库 20 项、人工智能 13 项、计算机网络范围建议 1 项。这个数量包括需要限定的教学简化与待确认事项，并非 52 个已证实的硬错误。

文件行号对应上述基线。修改过程中行号会变化，请同时按问题编号、章节标题和引述关键词定位。文中的绝对路径可在当前工作区直接打开。

问题类型分为：

- **确定问题**：已核对原文、原始材料、代码行为或权威资料，能够明确说明哪里不成立。
- **教学改进**：涉及难度衔接、教材范围、练习交付等，不等于某个知识点错误。
- **待确认**：现有资料不足以确定学校规定或历史事实，应补依据或明确限定，不能自行编造结论。

优先级分为：

- **P1**：直接导致错误判题、错误实验结果、运行故障或身份权限失效，应在交给学生前处理。
- **P2**：基础概念错误、内部矛盾或会误导学生的表述，应在课程定稿前处理。
- **P3**：教学范围或表达优化，按实际课程目标决定。

修改时应同步核对正文、章末总结、测验答案与解析、实验参考答案、图示组件和课程设计文档。只改其中一个位置，可能留下同一错误的其他版本。历史题库如与标准冲突，应标明争议与版本，不应把历史错误答案继续当作通用知识。

## 总体判断

| 课程 | 判断 |
| --- | --- |
| C 语言 | 章节主线合理，但测验、边界输入和部分基础概念需要纠错，当前不宜直接定稿。 |
| 数据库 | 实验贯穿教学的思路合适，但身份验证、数据基线、恢复流程和模拟卷交付存在明显问题。 |
| 人工智能 | 通俗案例较好，部分史实和绝对化表述需要纠正，数学部分需要明确先修要求。 |
| 计算机网络 | 当前校园网络入门定位与八课内容基本一致，本次没有确认明显硬错误；完整大学课程的扩充属于可选范围调整。 |

## 整改顺序

1. 先处理测验无法答对、C 程序边界错误、数据库身份验证和 SQL 预期结果。
2. 再统一字段、学号、实验场景、导入恢复步骤和图示。
3. 纠正 C / 数据库 / AI 的概念与史实表述。
4. 补齐或调整模拟卷、应用工程交付和数学预备内容。
5. 按每项验收条件复核，并返回“问题编号—修改文件—验证结果”的对照表。

## 一、C 语言课程

### C-01　四道测验没有任何可被判对的选项

- **类型 / 优先级**：确定功能错误，P1。
- **位置**：[判题归一化函数](/Users/shaozhenjie/class-server/github.io/components/quiz/Quiz.tsx:18)、[正确性比较](/Users/shaozhenjie/class-server/github.io/components/quiz/Quiz.tsx:68)。四题分别为[程序入口](/Users/shaozhenjie/class-server/github.io/content/docs/c/00-intro-and-compilation.mdx:92)、[程序结构](/Users/shaozhenjie/class-server/github.io/content/docs/c/11-exam-prep-and-exercises.mdx:37)、[scanf](/Users/shaozhenjie/class-server/github.io/content/docs/c/02-input-output.mdx:87)、[fopen](/Users/shaozhenjie/class-server/github.io/content/docs/c/09-file-operations.mdx:87)。
- **问题**：前两题的答案以“C 语言”开头，被 `normalizeOption` 误删 `C`；选项仅去除序号后仍保留“C 语言”，因此不匹配。后两题的选项使用单引号，答案使用双引号，同样没有匹配项；scanf 格式字符串写成单引号本身也是错误示范。
- **修改建议**：采用明确的选项标识或可靠的答案表示，避免对无序号的答案任意删字；同时纠正 C 字符串引号。同步题面、选项、答案与解析。
- **验收条件**：四题正确选项均判对，其余均判错；以“C 语言”开头的答案不会被截断；全部可解析题至少有一个匹配选项，单选题只有一个正确选项。

### C-02　单词统计程序把换行算成单词，未处理读取失败

- **类型 / 优先级**：确定代码错误，P1。
- **位置**：[正文程序](/Users/shaozhenjie/class-server/github.io/content/docs/c/05-arrays-and-strings.mdx:170)、[实验参考程序](/Users/shaozhenjie/class-server/github.io/content/docs/c/10-experiments.mdx:356)、[实验验收总结](/Users/shaozhenjie/class-server/github.io/content/docs/c/10-experiments.mdx:508)、[状态机图示](/Users/shaozhenjie/class-server/github.io/components/c/CFigures.tsx:675)。
- **问题**：`fgets` 保留换行，但循环只认 ASCII 空格为分隔符。空行、纯空格行以及尾随空格都会错误计数。代码还未检查 `fgets` 返回值，直接 EOF 或读取失败后可能访问未初始化数组。
- **修改建议**：明确“单词”及分隔符定义，正确处理行尾与读取失败，同步状态机说明、图示、正文和实验答案。若支持制表符等空白，需按定义统一实现；给出超长输入的截断或继续读取策略。
- **验收条件**：空行和全空格行为 0；`hello ` 后换行为 1；首尾及连续空格处理正确；正常多词、直接 EOF 均安全；不越界，长行策略明确。

### C-03　getchar 循环无法可靠处理 EOF

- **类型 / 优先级**：确定代码错误，P1；EOF 数值表述为 P2。
- **位置**：[返回值与示例](/Users/shaozhenjie/class-server/github.io/content/docs/c/02-input-output.mdx:166)、[字符统计](/Users/shaozhenjie/class-server/github.io/content/docs/c/04-loops-and-control.mdx:119)、[实验字符统计](/Users/shaozhenjie/class-server/github.io/content/docs/c/10-experiments.mdx:137)。固定 `EOF=-1` 还见[文件章节](/Users/shaozhenjie/class-server/github.io/content/docs/c/09-file-operations.mdx:120)和[读写函数图示](/Users/shaozhenjie/class-server/github.io/components/c/CFigures.tsx:744)。
- **问题**：使用 `char` 接收 `getchar()` 的 `int` 返回值，循环只检查换行。输入在没有末尾换行时结束，会不断读取 EOF 而不退出。EOF 宏也不保证固定为 -1，只保证负值。
- **修改建议**：用 `int` 接收，循环同时处理换行和 EOF，必要时区分读取失败；使用 `EOF` 宏，不硬编码 -1。
- **验收条件**：`abc\n`、`abc` 后 EOF、直接 EOF 均及时退出，计数正确，不丢失 EOF 判断能力。

### C-04　getchar“只能从键盘读取”的正确答案错误

- **类型 / 优先级**：确定知识与答案错误，P1。
- **位置**：[getchar 测验](/Users/shaozhenjie/class-server/github.io/content/docs/c/02-input-output.mdx:180)，答案在 188 行，相关标准输入描述在 69 行。
- **问题**：`getchar()` 从 `stdin` 读取，标准输入可以重定向到文件或管道；键盘只是常见交互来源。
- **修改建议**：修改选项、答案及解析，区分标准输入流与具体输入设备。
- **验收条件**：题目有且只有一个正确选项，文件重定向或管道示例与定义一致。

### C-05　普通字符常量被解释为占 1 字节

- **类型 / 优先级**：确定基础概念与答案错误，P2。
- **位置**：[字符常量解释](/Users/shaozhenjie/class-server/github.io/content/docs/c/01-types-variables-operators.mdx:83)、[测验](/Users/shaozhenjie/class-server/github.io/content/docs/c/01-types-variables-operators.mdx:91)、[小结](/Users/shaozhenjie/class-server/github.io/content/docs/c/01-types-variables-operators.mdx:209)。
- **问题**：普通整数字符常量 `'a'` 在 C 中是 `int` 类型，不能把一个字符等同于该表达式占 1 字节。`char c='a'` 的对象大小才是 1，`"a"` 的数组大小是 2。见 [C11 草案 §6.4.4.4](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf)。
- **修改建议**：区分常量类型、char 对象和字符串数组，重写不成立的选项和解析；说明 `int` 大小取决于实现。
- **验收条件**：`sizeof('a') == sizeof(int)`、`sizeof(char) == 1`、`sizeof("a") == 2` 的解释一致，不声称所有平台 `int` 都是 4 字节。

### C-06　数组被等同为常量指针或地址常量

- **类型 / 优先级**：确定基础概念错误，P2。
- **位置**：[数组名解释](/Users/shaozhenjie/class-server/github.io/content/docs/c/05-arrays-and-strings.mdx:38)、[数组不能赋值的理由](/Users/shaozhenjie/class-server/github.io/content/docs/c/05-arrays-and-strings.mdx:204)、[指针章节](/Users/shaozhenjie/class-server/github.io/content/docs/c/07-pointers-mastery.mdx:177)。
- **问题**：数组对象与指针对象不同。数组表达式在多数上下文转换为首元素指针，`sizeof`、一元 `&` 等上下文存在例外。数组不能整体赋值也不能简单归因为“地址常量”。
- **修改建议**：讲清对象类型、常见转换和例外，保留“可用指针访问数组”的直观解释，但不宣布二者等同。
- **验收条件**：用 `int a[5]; int *p=a;` 解释 `sizeof(a)` 和 `sizeof(p)`；解释 `&a` 与 `&a[0]` 类型和步长区别；不再用常量指针定义数组名。

### C-07　把普通程序地址当成物理 RAM 地址

- **类型 / 优先级**：确定的核心模型问题，P2。
- **位置**：[指针内存模型](/Users/shaozhenjie/class-server/github.io/content/docs/c/07-pointers-mastery.mdx:18)、[指针运算](/Users/shaozhenjie/class-server/github.io/content/docs/c/07-pointers-mastery.mdx:189)、[%p 表述](/Users/shaozhenjie/class-server/github.io/content/docs/c/02-input-output.mdx:40)、[物理地址图示](/Users/shaozhenjie/class-server/github.io/components/c/CFigures.tsx:216)、[链接器说明](/Users/shaozhenjie/class-server/github.io/content/docs/c/00-intro-and-compilation.mdx:133)、[课程设计](/Users/shaozhenjie/class-server/github.io/docs/teaching/c-course-design.md:51)。
- **问题**：常见操作系统上的普通应用得到的是进程虚拟地址，不能把 `&var`、`%p`、指针算术直接描述为物理 RAM 寻址，也不能说链接器绑定物理内存地址。示意门牌号可以保留，但必须说明地址空间和模型边界。
- **同步检索位置**：课程目录 11、40、50 行；指针章 12、18—22、189—193、202、205、216 行；编译章 41、133 行；数组章 10、110 行；函数章 73、80 行；结构体章 42、67 行；图示组件 216、540、566 行；课程设计 3、5、51、73 行。
- **修改建议**：统一为程序地址/进程地址空间并限定平台。涉及嵌入式、内核等直接物理访问的内容另作场景说明；不要机械替换所有出现“物理”的字词。
- **验收条件**：普通程序的取地址、打印地址、数组连续性和链接重定位，不再被解释为直接确定物理 RAM 位置。

### C-08　结构体对齐规则错误地使用成员 sizeof

- **类型 / 优先级**：确定规则错误，P2。
- **位置**：[结构体布局规则](/Users/shaozhenjie/class-server/github.io/content/docs/c/08-structs-and-typedef.mdx:113)、[图示规则](/Users/shaozhenjie/class-server/github.io/components/c/CFigures.tsx:455)、[设计文档](/Users/shaozhenjie/class-server/github.io/docs/teaching/c-course-design.md:83)、[布局例题](/Users/shaozhenjie/class-server/github.io/content/docs/c/08-structs-and-typedef.mdx:133)。
- **问题**：成员偏移和总大小遵循类型对齐要求及目标 ABI 等约束，不能普遍按成员大小和最大成员大小取整。反例 `struct Layout { char lead; char bytes[3]; };` 在本次 Clang C17 环境中，`bytes` 偏移 1、成员大小 3、结构体总大小 4。
- **修改建议**：区分对齐要求和 `sizeof`；对 12 字节等具体布局注明 int 大小、对齐、平台与未打包等前提。
- **验收条件**：能够解释上述数组成员反例；不把 `_Alignof` 与 `sizeof` 混同，不把单一 ABI 布局称为所有系统的标准布局。

### C-09　32 个关键字缺少 C 标准版本限定

- **类型 / 优先级**：标准版本边界缺失，P2。
- **位置**：[关键字数量](/Users/shaozhenjie/class-server/github.io/content/docs/c/00-intro-and-compilation.mdx:39)。
- **问题**：32 个对应旧 C89/C90，不能不限定版本地概括现代 C；示例同时采用 `%zu` 等较新标准用法。
- **修改建议**：明确课程标准与编译模式；如保留 32 个，应标成历史版本知识。
- **验收条件**：关键字介绍、示例语法和规定编译模式一致。

### C-10　sizeof 一律编译期求值的简化缺少条件

- **类型 / 优先级**：教学简化需补边界，P2。
- **位置**：[sizeof 介绍](/Users/shaozhenjie/class-server/github.io/content/docs/c/01-types-variables-operators.mdx:172)。
- **问题**：固定大小类型的常见例子可以在编译期得到大小，但变长数组相关 `sizeof` 可在运行时求值。
- **修改建议**：限定本章固定大小类型的范围，补充变长数组例外即可，不必为入门学生扩展复杂推导。
- **验收条件**：不再把任何 `sizeof` 都无条件说成编译期常量。

### C-11　enum 被解释为只允许列出的值

- **类型 / 优先级**：确定类型规则错误，P2。
- **位置**：[枚举定义](/Users/shaozhenjie/class-server/github.io/content/docs/c/08-structs-and-typedef.mdx:187)。
- **问题**：C 的枚举不是只允许预列值的严格封闭集合。本次 `enum State {OFF,ON}; enum State s=99;` 在 C17 编译并输出 99，语言机制并未自动拒绝这个值。
- **修改建议**：解释一组具名整数常量及其表达有限状态的用途，业务有效值需要校验；不要套用其他语言严格枚举的规则。
- **验收条件**：学生能够区分预期状态与语言实际允许的表示值。

### C-12　文本文件、二进制文件与原始内存转储混为一谈

- **类型 / 优先级**：确定知识和测验错误，P2。
- **位置**：[文件类型表](/Users/shaozhenjie/class-server/github.io/content/docs/c/09-file-operations.mdx:22)、[二进制文件测验](/Users/shaozhenjie/class-server/github.io/content/docs/c/09-file-operations.mdx:30)、[小结](/Users/shaozhenjie/class-server/github.io/content/docs/c/09-file-operations.mdx:170)、[块读写图示](/Users/shaozhenjie/class-server/github.io/components/c/CFigures.tsx:762)。
- **问题**：文本不限于 ASCII，也可使用 UTF-8 等编码；二进制文件并不必须与内存对象的表示完全一致，JPEG、EXE 等有自己的格式。`fwrite` 原样保存结构体是特定做法，不能推成所有二进制文件的定义，也有字节序、填充和 ABI 兼容问题。
- **修改建议**：区分文本编码、二进制格式、C 的流模式及原始对象转储，纠正“完全一致”的测验答案；块读写例子注明同类型/同布局等使用条件。
- **验收条件**：UTF-8 文本不被排除；二进制图片不被解释成结构体内存原样搬运；测验答案在明确条件下成立。

### C-13　fclose 被描述为保证立刻物理落盘

- **类型 / 优先级**：确定持久化保证错误，P2。
- **位置**：[fclose 说明](/Users/shaozhenjie/class-server/github.io/content/docs/c/09-file-operations.mdx:106)、[相关小结](/Users/shaozhenjie/class-server/github.io/content/docs/c/09-file-operations.mdx:173)。
- **问题**：关闭输出流会处理 C 流缓冲并关闭文件，但不保证立刻写入物理磁盘，关闭/写入本身也可能失败；不能由此承诺断电安全。
- **修改建议**：区分 C 流缓冲、OS 缓存与物理持久化，说明返回值检查；如提及 `fsync` 等，应标明平台，不必要求入门学生实现复杂持久化协议。
- **验收条件**：不再把 `fclose` 说成必然立刻落盘或绝对不丢数据。

### C-14　一个 getchar 被当成通用清除输入残留方案

- **类型 / 优先级**：简化方案适用范围不明，P2。
- **位置**：[清回车方案](/Users/shaozhenjie/class-server/github.io/content/docs/c/02-input-output.mdx:138)、[章节小结](/Users/shaozhenjie/class-server/github.io/content/docs/c/02-input-output.mdx:199)、[输入图示](/Users/shaozhenjie/class-server/github.io/components/c/CFigures.tsx:519)、[课程设计](/Users/shaozhenjie/class-server/github.io/docs/teaching/c-course-design.md:68)。
- **问题**：单次 `getchar()` 只消耗一个字符，数字后若还有空格或其他字符，就不保证吃掉回车。`scanf(" %c")` 会跳过空白，也不适合必须读取空白字符的任务。
- **修改建议**：写清输入严格为数字后立即换行的假设，或读到换行/EOF；说明各种方案是否保留空白。
- **验收条件**：`20  \nA\n` 不再把残余空格误读为下一字符；能够解释两种方案适用条件。

### C-15　main 入口表述忽略运行环境，并错误描述 OS 启动流程

- **类型 / 优先级**：确定的表述问题及环境边界缺失，P2。
- **位置**：[main 说明](/Users/shaozhenjie/class-server/github.io/content/docs/c/00-intro-and-compilation.mdx:78)、[入口测验解析](/Users/shaozhenjie/class-server/github.io/content/docs/c/00-intro-and-compilation.mdx:100)、[小结](/Users/shaozhenjie/class-server/github.io/content/docs/c/00-intro-and-compilation.mdx:197)、[综合复习](/Users/shaozhenjie/class-server/github.io/content/docs/c/11-exam-prep-and-exercises.mdx:40)、[设计口径](/Users/shaozhenjie/class-server/github.io/docs/teaching/c-course-design.md:129)。
- **问题**：宿主环境的入门可执行程序可以以 main 为用户代码入口，但“任何 C 程序”“永远”没有包括独立运行环境的差异；常见 OS 加载和运行时启动后才调用 main，不是总是直接寻找 main 执行。
- **修改建议**：明确本课的宿主环境与可执行程序范围，简述启动代码/运行时；避免让学生误以为每个 C 源文件都要定义 main。
- **验收条件**：普通程序主函数的教学保持清楚，同时不把 main 当作操作系统必然直接调用的机器入口。

### C-16　所有可执行语句都必须以分号结束的说法错误

- **类型 / 优先级**：确定语法概括错误，P2。
- **位置**：[分号规则](/Users/shaozhenjie/class-server/github.io/content/docs/c/00-intro-and-compilation.mdx:86)、[小结](/Users/shaozhenjie/class-server/github.io/content/docs/c/00-intro-and-compilation.mdx:198)。
- **问题**：复合语句、以复合语句为体的 if/while 等不要求整体末尾分号；机械加分号可能产生空语句并改变行为。
- **修改建议**：按表达式语句、跳转语句、控制语句等解释；指出 `do ... while (...);` 的末尾分号。
- **验收条件**：`if(x){...}`、`while(x){...}` 与 `do {...} while(x);` 的语法说明准确，不诱导学生给循环头误加分号。

### C-17　典型数据大小与 ASCII 模型缺少一致的平台假设

- **类型 / 优先级**：教材简化需限定，P2；不意味着所有典型大小示例错误。
- **位置**：[类型表](/Users/shaozhenjie/class-server/github.io/content/docs/c/01-types-variables-operators.mdx:45)、[sizeof 输出](/Users/shaozhenjie/class-server/github.io/content/docs/c/01-types-variables-operators.mdx:175)、[地址空间模型](/Users/shaozhenjie/class-server/github.io/content/docs/c/07-pointers-mastery.mdx:20)、[数组大小前提](/Users/shaozhenjie/class-server/github.io/content/docs/c/05-arrays-and-strings.mdx:37)、[指针图示](/Users/shaozhenjie/class-server/github.io/components/c/CFigures.tsx:247)。指针章 26、53 行也需核对。
- **问题**：表头虽然写典型大小，但普通 char 的有无符号、字节位数、int 和指针大小并不是 C 标准固定值；后文有时把演示模型说成必然。ASCII 数值例子也应说明采用该编码环境。
- **修改建议**：统一列出演示平台假设，如 8 位字节、int=4、实际指针大小及字符编码；char 的有无符号说明由实现决定。依赖大小的题目给足前提。
- **验收条件**：不单凭“32/64 位系统”推导所有类型大小，不把 `char` 无条件写为 -128 到 127，典型实现与标准保证分开。

### C-18　课程设计承诺的两套全真模拟机考未交付

- **类型 / 优先级**：确定的教学交付差距，P2。
- **位置**：[M9 交付承诺](/Users/shaozhenjie/class-server/github.io/docs/teaching/c-course-design.md:53)、[现有复习章定位](/Users/shaozhenjie/class-server/github.io/content/docs/c/11-exam-prep-and-exercises.mdx:10)、[典型题型自测](/Users/shaozhenjie/class-server/github.io/content/docs/c/11-exam-prep-and-exercises.mdx:33)。
- **问题**：现有复习章只有 13 道单选 Quiz，未见两套独立试卷、时长/分值、答卷与评分规则，也没有对应多选/判断的模拟部分。
- **修改建议**：补齐与最终确认考核范围一致的两套完整卷，或调整课程设计承诺，明确当前章节只是精选题型自测；不能仅改标题后继续宣称已经交付全真卷。
- **验收条件**：如保留承诺，两套试卷均能独立完成和评分，覆盖已确认题型及分值，题面与答案分开。

## 二、数据库课程

### DB-01　教师登录、会话与数据权限隔离没有真正实现

- **类型 / 优先级**：确定问题，P1。
- **位置**：[应用课认证要求](/Users/shaozhenjie/class-server/github.io/content/docs/database/07-application-integration.mdx:63)、[Node 登录](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:894)、[客户端登录请求](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:733)、[Python 登录](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:1031)。请求头信任发生在第 7 章 167、181 行和第 9 章 907、917、932、953、967 行；[注销](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:753)只清空前端变量。
- **问题**：登录仅查工号；密码输入框没有参与验证。后端直接把可自行填写的 `x-teacher-id` 当作身份。限制 `WHERE tid = ?` 只能过滤请求指定的工号，不能证明调用者就是该教师，也没有服务端会话可供注销。与“密码认证、Session/Token、严格权限隔离”的教学结论矛盾。[仿真器登录](/Users/shaozhenjie/class-server/github.io/components/database/InteractiveGradeSystem.tsx:272)同样忽略密码。
- **修改建议**：明确教学认证方案，加入凭证验证与服务器验证的登录状态，由该身份确定教师工号；注销使凭证失效。无认证的 CRUD 代码可以另列为 SQL 操作演示，但不能代替实验四的认证实现，也不能宣布满足身份鉴权验收。
- **验收条件**：错密码失败；未登录读写失败；伪造另一教师工号不能读取或修改其课程；注销后旧凭证不能继续使用；合法教师能完成自己的业务功能。

### DB-02　查询和图示使用不存在的字段

- **类型 / 优先级**：确定问题，P1。
- **位置**：[登录查询中的 prof](/Users/shaozhenjie/class-server/github.io/content/docs/database/07-application-integration.mdx:68)、[统一 DDL](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:66)、[Workbench 图示](/Users/shaozhenjie/class-server/github.io/components/database/DatabaseFigures.tsx:607)。图示组件另见 632、638、641、643、714 行；[防注入示例](/Users/shaozhenjie/class-server/github.io/content/docs/database/07-application-integration.mdx:32)及 44 行使用 `password`。
- **问题**：统一教师表字段是 `age`、`title`，部分正文与图示却用 `tage`、`prof`，复制执行会出现 Unknown column。当前四表也未定义 `password`，不能把带该字段的防注入查询直接当成当前可执行代码。
- **修改建议**：以统一 DDL 为准核对全部 SQL、图注、结果表和伪客户端。认证示例如需新表或字段，应同时给出定义并说明迁移关系。
- **验收条件**：所有声称可执行的示例字段存在；按统一建表脚本执行后不再报字段不存在。

### DB-03　查询预期结果混用原始基线与维护任务后的数据

- **类型 / 优先级**：确定问题，P1。
- **位置**：[题 6 结果](/Users/shaozhenjie/class-server/github.io/content/docs/database/02-single-table-queries.mdx:188)、[汇总表](/Users/shaozhenjie/class-server/github.io/content/docs/database/03-multi-table-and-aggregation.mdx:270)、[分组结果](/Users/shaozhenjie/class-server/github.io/content/docs/database/03-multi-table-and-aggregation.mdx:213)、[选课人数](/Users/shaozhenjie/class-server/github.io/content/docs/database/03-multi-table-and-aggregation.mdx:227)、[未选数据库人数](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:232)。
- **问题**：原始导入为学生 12、教师 10、课程 10、选课 24。按第 9 章 126—136 行的示例插入陈雷、删除工程数学并更新职称后，应为学生 13、教师 10、课程 9、选课 24。具体矛盾如下：

  | 查询 | 当前问题 | 正确口径 |
  | --- | --- | --- |
  | Q6 生成 `t_sinfo` | 第 2 章写 12 行；第 3 章汇总写 24 行并列 `t_sc` | 查询只取学生表；原始状态 12 行，示例插入后 13 行；这里也不应列选课表 |
  | Q12 年龄大于李平 | 第 3 章 276 行写 7 行 | 原始及上述维护后均为 8 行；该章 200—201 行和实验章 213 行已写 8 |
  | Q14 课程人数 | `c008` 写 11 人 | 原始及上述维护后为 10 人；`c003` 为 9 人 |
  | Q15 未选数据库 | 第 3 章 243、279 行及实验章 232 行固定写 8 人 | 原始状态 8 人；新增未选课学生后 9 人 |
  | Q13 按专业分组 | 第 3 章 213 行仅列原始四组 | 插入示例后还多“计算机科学与技术：1 人”一组 |

- **修改建议**：为每组题明确开始状态，统一正文、实验、总结表与图示。建议将原始导入命名为“状态 A”，将完成三个示例维护任务后命名为“状态 B”。按当前实验一任务顺序，正式十五道查询采用状态 B；状态 A 的数字只用于基线校验和明确标注的对照练习。两种状态的练习不要合并为默认连续执行的一条脚本。Q6 初次执行时 `t_sinfo` 应不存在；重复练习应说明如何在临时测试库处理该表已存在的情况，再重新生成结果。真实个人信息可变时，用查询语义、基线加变化量验收，不把所有学生的结果固定为同一数字。
- **验收条件**：从空库按规定顺序执行，行数与讲义一致；能说明换成另一个个人学号、姓名、年龄、专业后哪些预期会变化。

### DB-04　个人信息插入与后续查询的学号不一致

- **类型 / 优先级**：确定问题，P2。
- **位置**：[插入个人示例](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:127)、[按个人学号查询](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:147)。
- **问题**：插入的是 `2023001`，下一阶段题 1 却查 `2012001`，返回的不是刚插入的本人记录。
- **修改建议**：同一示例学号贯穿所有步骤，或者明确要求替换为学生刚插入的学号。
- **验收条件**：题 1 返回前置插入的个人记录。

### DB-05　命令行指定库不能覆盖脚本内的 USE

- **类型 / 优先级**：确定问题，P1。
- **位置**：[导入说明](/Users/shaozhenjie/class-server/github.io/content/docs/database/01-relational-tables-and-crud.mdx:153)、[实验导入](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:105)。原始脚本在 [数据包](/Users/shaozhenjie/class-server/github.io/docs/p1data.zip.zip)中。
- **问题**：把“修改脚本中的 `USE`”与“在 mysql 命令中指定目标库”写成替代方案。原脚本第一行确为 `use teachingdb_chen;`，执行时仍会切换到该库；现有命令还固定写 `teachingdb_chen`，没有解决个人库问题。
- **修改建议**：个人库导入前修改或移除脚本内的固定 `USE`；同步命令、图示与校验步骤的库名。
- **验收条件**：在临时环境使用不同个人库名导入，数据只进入指定个人库；校验 `SELECT DATABASE()` 和四表行数。

### DB-06　跨库恢复缺少父表，关闭外键检查不能证明完整恢复

- **类型 / 优先级**：确定问题，P1。
- **位置**：[两表跨库恢复](/Users/shaozhenjie/class-server/github.io/content/docs/database/06-admin-backup-and-security.mdx:54)、[所谓标准解决方案](/Users/shaozhenjie/class-server/github.io/content/docs/database/06-admin-backup-and-security.mdx:66)、[实验对应步骤](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:440)。
- **问题**：只恢复学生、课程到空库，课程仍引用未恢复的教师表。默认关闭检查可能允许导入，但不会补齐父表；恢复检查也不会自动扫描此前导入的数据，见 [MySQL 外键说明](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html)。
- **修改建议**：若目标是可用关系数据库，应恢复所依赖父表及数据，并验证参照完整性；若原实验仅要求两表复制，应明确这是不完整副本及其使用限制，不把临时禁用约束称为完整性修复。
- **验收条件**：按声明的恢复目标检查表依赖和孤立记录；如要求可用数据库，教师父表存在，每个课程 `tid` 都有对应教师，后续正常操作能通过约束。

### DB-07　系统终端命令使用了 SQL 注释

- **类型 / 优先级**：确定问题，P1。
- **位置**：[恢复校验命令](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:431)。
- **问题**：`mysql ... -e "SELECT ...;" -- 确认恢复为 24 行` 放在 Bash 代码块中。`--` 不会开启 Shell 注释，后面的中文和数字会成为额外参数。
- **修改建议**：用独立 `#` 注释行或合法的 Shell 行尾注释；继续明确终端命令与 SQL 编辑器命令的执行位置。
- **验收条件**：整段可直接复制到规定终端执行，没有额外参数错误，得到实际行数。

### DB-08　实验二可选场景与原始实验要求不一致

- **类型 / 优先级**：确定问题，P2。
- **位置**：[第 4 章实验场景](/Users/shaozhenjie/class-server/github.io/content/docs/database/04-er-modeling-and-normalization.mdx:142)、[第 9 章实验场景](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:264)、[原始实验二](/Users/shaozhenjie/class-server/github.io/docs/实验二数据库设计.doc)。
- **问题**：第 4 章给运动会、仓库、商业零售、图书、教学；原始实验与第 9 章给教学、图书、库存、机票、人事，学生会得到不同任务范围。
- **修改建议**：统一正式实验选项；额外考试场景单列为迁移练习。
- **验收条件**：从任意章节查看实验二，都得到同一组选项和提交要求。

### DB-09　人事概念模型提到未定义的项目实体

- **类型 / 优先级**：确定问题，P2。
- **位置**：[人事管理场景](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:322)。
- **问题**：实体名单只有部门、员工、职务，下一行却定义“员工与项目 M:N”，未给项目实体、标识和属性。
- **修改建议**：补齐项目定义及联系属性，或删除没有需求依据的项目联系。
- **验收条件**：每条联系的参与实体均有定义，转换关系模式时能找到主外键来源。

### DB-10　两套全真模拟卷没有完整交付

- **类型 / 优先级**：确定的教学交付差距，P2。
- **位置**：[两套全真卷承诺](/Users/shaozhenjie/class-server/github.io/content/docs/database/08-exam-prep-and-migration.mdx:10)、[卷 A](/Users/shaozhenjie/class-server/github.io/content/docs/database/08-exam-prep-and-migration.mdx:44)、[卷 B](/Users/shaozhenjie/class-server/github.io/content/docs/database/08-exam-prep-and-migration.mdx:146)、[G5 达标要求](/Users/shaozhenjie/class-server/github.io/content/docs/database/08-exam-prep-and-migration.mdx:191)。另需同步[目录](/Users/shaozhenjie/class-server/github.io/content/docs/database/index.mdx:33)与[图示](/Users/shaozhenjie/class-server/github.io/components/database/DatabaseFigures.tsx:1225)。
- **问题**：卷 A 只有 50 分综合应用部分；卷 B 只有三个查询示例，均不具备宣称的 90 分钟、100 分完整试卷结构。现有材料也无法计算“75 分以上、综合与设计题得分率超过 80%”。
- **修改建议**：补全独立题面、全部题型、分值、答案及评分点，或改称综合练习/场景示例并调整课程设计和 G5；练习与参考答案分开，避免边看答案边自测。
- **验收条件**：如保留全真卷承诺，每套均可独立限时完成和评分，总分 100，题型结构与已确认考试说明一致。

### DB-11　考试是否闭卷、是否提供客户端需要教师确认

- **类型 / 优先级**：待确认，P2。
- **位置**：[考试条件断言](/Users/shaozhenjie/class-server/github.io/content/docs/database/08-exam-prep-and-migration.mdx:8)、[课程设计的谨慎表述](/Users/shaozhenjie/class-server/github.io/docs/teaching/database-course-design.md:23)、[原始考试说明](/Users/shaozhenjie/class-server/github.io/docs/数据库原理及应用机考复习题库-2026春.docx)。
- **问题**：所提供说明确认机考、90 分钟、主观题为主及题型分值，没有明确确认闭卷和不提供数据库客户端。不能把“没有承诺环境”推成“不提供环境”的学校规定。
- **修改建议**：将这些条件标为待教师确认，或者明确它们只是课堂模拟的训练条件；不要自行编造考试规则。
- **验收条件**：正式考试规定有教师或文件依据，所有章节口径一致；尚无依据时不以确定语气宣布。

### DB-12　网页仿真截图被允许作为本人实验运行证据

- **类型 / 优先级**：确定的教学验收问题，P2。
- **位置**：[仿真截图用途](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:535)、[仿真数据状态](/Users/shaozhenjie/class-server/github.io/components/database/InteractiveGradeSystem.tsx:214)。
- **问题**：指南明确允许课程网页仿真截图用于报告，但组件只使用本地状态和预置数据，不能证明学生实现了后端、MySQL 连接和持久化。
- **修改建议**：仿真保留为界面与操作参考；本人运行截图应来自自己的工程，并关联实际数据库结果。
- **验收条件**：修改成绩后能在 MySQL 查询到，重启应用后仍保留；报告能够证明运行的是本人实现而不是网页仿真器。

### DB-13　“零配置、纯标准库、双击即可运行”的工程承诺不成立

- **类型 / 优先级**：确定的教学交付问题，P2。
- **位置**：[零配置承诺](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:597)、[Node 依赖](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:877)、[Python 运行说明](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:989)、[第三方 pymysql](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:995)。第 7 章[服务端示例](/Users/shaozhenjie/class-server/github.io/content/docs/database/07-application-integration.mdx:136)同样缺环境准备。
- **问题**：Node 需要 express、mysql2，Python 需要第三方 pymysql；两版都有数据库密码占位符。没有完整的依赖安装、目录准备、配置、启动步骤，不符合零配置描述。课程设计对没有编程基础的学生还要求教师提供可运行骨架。
- **修改建议**：提供可运行最小工程或完整准备步骤，包括依赖、配置、初始化、启动和常见错误排查；用真实要求替换“零配置”措辞。
- **验收条件**：新学习者在规定环境中按步骤就能运行，不需猜测目录、依赖与连接参数；教学学时安排与实际前置准备相符。

### DB-14　1NF 原子性与重复列设计的解释混在一起

- **类型 / 优先级**：确定的概念解释问题，P2。
- **位置**：[score1/score2 解释](/Users/shaozhenjie/class-server/github.io/content/docs/database/01-relational-tables-and-crud.mdx:22)。
- **问题**：若每个成绩列只存单个原子值，不能仅凭有 `score1`、`score2` 就说破坏字段原子性。重复列组、不易扩展、无法正确关联课程，与“一个字段塞多个值”是不同问题。
- **修改建议**：说明成绩属于学生—课程联系，分别举例解释多值字段与重复列设计；在采用某种 1NF 定义时写清定义，不以简化口号代替分析。
- **验收条件**：学生能解释联系表为何需要 `(sid, cid, score)`，并区分字段多值与重复列问题。

### DB-15　SQL 的 UNKNOWN 被写成 FALSE

- **类型 / 优先级**：确定问题，P2。
- **位置**：[NULL 比较](/Users/shaozhenjie/class-server/github.io/content/docs/database/02-single-table-queries.mdx:58)。
- **问题**：`UNKNOWN（假）` 混淆三值逻辑。WHERE 中 FALSE 与 UNKNOWN 都被排除，但 `NOT UNKNOWN` 仍是 UNKNOWN，与 `NOT FALSE` 不同。
- **修改建议**：明确 TRUE、FALSE、UNKNOWN，讲清 WHERE 只保留 TRUE，并同步 NULL 相关题目解析。
- **验收条件**：NULL、NOT、AND/OR 的示例不会把 UNKNOWN 当成 FALSE 推演。

### DB-16　1:1 联系转表遗漏唯一约束

- **类型 / 优先级**：应补齐约束，P2。
- **位置**：[1:1 转换规则](/Users/shaozhenjie/class-server/github.io/content/docs/database/04-er-modeling-and-normalization.mdx:68)、[章末总结](/Users/shaozhenjie/class-server/github.io/content/docs/database/04-er-modeling-and-normalization.mdx:323)、[实验规则](/Users/shaozhenjie/class-server/github.io/content/docs/database/09-experiments.mdx:391)。
- **问题**：只放外键不能保证 1:1，多行仍能引用同一目标行，实际可能成为 1:N。
- **修改建议**：采用外键实现 1:1 时说明 UNIQUE；是否 NOT NULL 按参与约束决定。采用共享主键或独立联系表时，同样给出满足业务基数的约束。
- **验收条件**：尝试第二条重复引用时被拒绝，同时合法的可选参与不被误拒绝。

### DB-17　隔离级别混用标准定义与 InnoDB 实现

- **类型 / 优先级**：确定问题，P2。
- **位置**：[隔离级别表](/Users/shaozhenjie/class-server/github.io/content/docs/database/06-admin-backup-and-security.mdx:188)。
- **问题**：把 RR 统一写成避免幻读且靠 Next-Key Lock，混淆标准定义、InnoDB 快照读与锁定读；把 Serializable 解释为“强制事务完全排队”也不成立，可串行化允许符合等价串行结果的不冲突并发。
- **修改建议**：分开概念表与具体数据库实现，区分普通 SELECT 和锁定读的行为。参照 [InnoDB 隔离级别说明](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)。
- **验收条件**：用两个会话说明快照读和锁定读差别；不把所有 SELECT 都描述为加范围锁，不把可串行化等同于所有事务逐个执行。

### DB-18　索引的树结构被等同为独立物理文件

- **类型 / 优先级**：确定问题，P2。
- **位置**：[索引存储解释](/Users/shaozhenjie/class-server/github.io/content/docs/database/06-admin-backup-and-security.mdx:204)。
- **问题**：“每个索引都是一棵独立的 B+ 树文件”不准确。常见 InnoDB file-per-table 一个 `.ibd` 文件包含同一表的数据和索引，见 [官方表空间说明](https://dev.mysql.com/doc/refman/8.4/en/innodb-file-per-table-tablespaces.html)。
- **修改建议**：区分逻辑树、页和表空间文件；说明索引占存储空间及维护成本即可。
- **验收条件**：不再以“每新增一个索引就必新增一个独立文件”解释开销。

### DB-19　DETERMINISTIC 被写成所有存储函数必需的声明

- **类型 / 优先级**：确定问题，P2。
- **位置**：[函数声明要求](/Users/shaozhenjie/class-server/github.io/content/docs/database/05-views-and-procedures.mdx:146)。
- **问题**：特性声明不是对所有函数一律必需的语法项；未写确定性时默认 NOT DETERMINISTIC。二进制日志相关接受条件取决于服务器配置，应另讲。见 [MySQL CREATE FUNCTION](https://dev.mysql.com/doc/refman/8.4/en/create-procedure.html)。
- **修改建议**：按实际函数性质声明，说明相关配置条件，不能为了避开创建错误随意标成确定性函数。
- **验收条件**：学生能区分“函数是否确定性”与“某服务器接受创建所需条件”。

### DB-20　主键设计与查询方法被写成唯一合法方案

- **类型 / 优先级**：确定的表述问题，P2。
- **位置**：[借阅/购买主键](/Users/shaozhenjie/class-server/github.io/content/docs/database/08-exam-prep-and-migration.mdx:40)、[同页 sale_id 主键](/Users/shaozhenjie/class-server/github.io/content/docs/database/08-exam-prep-and-migration.mdx:152)、[未选数据库解法](/Users/shaozhenjie/class-server/github.io/content/docs/database/03-multi-table-and-aggregation.mdx:242)。第 3 章 335 行已经认可 LEFT JOIN。
- **问题**：“主键必须包含时间”遗漏流水 ID 等有效设计；仅用日期也未必能区分同日多次事件。“必须用 NOT IN 或 NOT EXISTS”遗漏 LEFT JOIN + IS NULL 等等价查询。
- **修改建议**：从业务唯一性推导主键，示例方法写成推荐而不是唯一规则；接受结果等价、NULL 语义正确的解法。
- **验收条件**：同一读者多次借同一本书或同一会员多次买同一商品，均能被唯一识别；等价正确 SQL 不被误判。

## 三、人工智能课程

### AI-01　把 2017 年 Transformer 写成注意力机制的起点

- **类型 / 优先级**：确定史实错误，P2。
- **位置**：[2017 年表](/Users/shaozhenjie/class-server/github.io/content/docs/ai/02-history-of-ai.mdx:176)。
- **问题**：“谷歌提出注意力机制”把两个发展阶段合并；神经机器翻译的相关注意力研究至少已有 [Bahdanau 等人 2014 年论文](https://arxiv.org/abs/1409.0473)。“今天所有大语言模型”也过于绝对。
- **修改建议**：区分已有注意力研究与 2017 年提出 Transformer 架构，说明其对主流模型的影响，避免覆盖所有模型的断言。
- **验收条件**：时间线不再把注意力研究与 Transformer 架构视为同一次发明。

### AI-02　把 2022 年写成生成内容能力的诞生时间

- **类型 / 优先级**：确定史实错误，P2。
- **位置**：[生成式 AI 起点](/Users/shaozhenjie/class-server/github.io/content/docs/ai/03-abilities-and-applications.mdx:176)。
- **问题**：生成技术在 2022 年以前已存在，例如 [2014 年 GAN 原论文](https://arxiv.org/abs/1406.2661)包含生成样本实验。2022 年可以描述大众普及阶段，不能写成首次学会创作。
- **修改建议**：区分技术发展和大众使用转折，配一个早期生成模型例子。
- **验收条件**：不再宣称 2022 年之前 AI 没有生成能力。

### AI-03　猫识别实验时长错误，首次学习概念的宣称缺乏限定

- **类型 / 优先级**：确定史实错误及无依据结论，P2。
- **位置**：[猫识别年表](/Users/shaozhenjie/class-server/github.io/content/docs/ai/02-history-of-ai.mdx:162)。
- **问题**：原论文摘要写训练三天，课程写一周；“机器第一次从原始数据中自己学出了概念”没有可支持的限定。见 [大规模无监督学习原论文](https://arxiv.org/abs/1112.6209)。
- **修改建议**：按原论文核对时长，表述为大规模无监督特征学习的代表性成果，说明数据与任务范围。
- **验收条件**：具体事实与论文一致，不把一个代表性成果写成整个机器学习史的首次。

### AI-04　两次寒冬、三次浪潮与“三起三落”不一致

- **类型 / 优先级**：内部叙述不一致，P2。
- **位置**：[历史总结](/Users/shaozhenjie/class-server/github.io/content/docs/ai/02-history-of-ai.mdx:112)、[三起三落](/Users/shaozhenjie/class-server/github.io/content/docs/ai/02-history-of-ai.mdx:114)、[后续复盘](/Users/shaozhenjie/class-server/github.io/content/docs/ai/04-challenges-and-future.mdx:208)。第 2 章 220 行图示标题亦需同步。
- **问题**：正文讲两次寒冬，标题与总结写三次落潮，未交代第三次“落”是什么。
- **修改建议**：按实际讲授的阶段统一措辞，例如三次浪潮、两次寒冬；如果采用别的分期，应解释依据。
- **验收条件**：标题、年表、正文和复盘使用同一分期逻辑。

### AI-05　现代翻译被描述为已解决上下文歧义、不会出错

- **类型 / 优先级**：确定的误导性绝对表述，P2。
- **位置**：[上下文问题已解决](/Users/shaozhenjie/class-server/github.io/content/docs/ai/02-history-of-ai.mdx:108)、[spirit 不会搞错](/Users/shaozhenjie/class-server/github.io/content/docs/ai/03-abilities-and-applications.mdx:162)。
- **问题**：将明显改善描述为彻底解决，并与后续关于错误和幻觉的提醒冲突，容易造成学生过度信任。
- **修改建议**：说明语境建模有所改善，但罕见用法、语境不足等仍可能翻错，需要核验。
- **验收条件**：不再保证现代翻译必然正确，能力介绍与局限介绍一致。

### AI-06　强 AI、AGI 与单任务能力的分类混用

- **类型 / 优先级**：概念与表述需要限定，P2。
- **位置**：[弱 / 强 AI 分类](/Users/shaozhenjie/class-server/github.io/content/docs/ai/01-what-is-ai.mdx:107)、[AGI 定义](/Users/shaozhenjie/class-server/github.io/content/docs/ai/01-what-is-ai.mdx:116)、[弱 AI 总结](/Users/shaozhenjie/class-server/github.io/content/docs/ai/01-what-is-ai.mdx:170)。另需检查 110、115、125 行。
- **问题**：直接把强 AI 与 AGI 等同，定义成“做什么都行”；把现有模型概括为只会一件或几件事，难以容纳能够跨多个任务工作的基础模型。意识/真正理解的主张和通用能力指标不是同一概念。
- **修改建议**：明确本课采用的术语定义，分别解释能力范围与意识/理解讨论；不把 AGI 定义为无所不能，对现实是否达到某定义以证据和定义为条件。
- **验收条件**：学生能解释多任务能力、通用能力与意识之间的区别，分类不会与后续大模型案例冲突。

### AI-07　从“没有意识”推出“没有目标、风险只在人类使用”

- **类型 / 优先级**：确定的逻辑和内部矛盾，P2。
- **位置**：[风险观点](/Users/shaozhenjie/class-server/github.io/content/docs/ai/04-challenges-and-future.mdx:76)、[人的使用归因](/Users/shaozhenjie/class-server/github.io/content/docs/ai/04-challenges-and-future.mdx:80)、[强化学习目标](/Users/shaozhenjie/class-server/github.io/content/docs/ai/07-ways-machines-learn.mdx:56)、[奖励规则漏洞](/Users/shaozhenjie/class-server/github.io/content/docs/ai/07-ways-machines-learn.mdx:65)。第 4 章 85 行相关总结需同步。
- **问题**：优化目标、奖励和系统行动目标不需要主观意识。后文已经解释模型优化目标和钻奖励规则漏洞，前文却断言没有目标、只需规范使用者。
- **修改建议**：区分主观意愿与设计的优化目标，讲清误用、模型错误、目标设计和部署约束等来源；保持讨论平衡，不用意识问题直接排除系统风险。
- **验收条件**：风险课与训练、强化学习课的“目标”概念一致。

### AI-08　算法偏见测验设定了过于单一的根因

- **类型 / 优先级**：题干与解析归因过度，P2。
- **位置**：[算法偏见测验](/Users/shaozhenjie/class-server/github.io/content/docs/ai/04-challenges-and-future.mdx:243)。
- **问题**：训练数据是重要来源，但测量标签、模型和制度设计、部署方式也可能引入偏见，不能无条件作为唯一“最根本”来源。参见 [NIST 对偏见来源的说明](https://www.nist.gov/news-events/news/2022/03/theres-more-ai-bias-biased-data-nist-report-highlights)。
- **修改建议**：题干改为本例或常见来源之一；解析补充其他来源，避免单一根因背诵。
- **验收条件**：正确答案不再暗示消除数据偏见就消除了所有系统偏见。

### AI-09　图灵测试的固定通过线与理解能力被混淆

- **类型 / 优先级**：确定的表述问题，P2。
- **位置**：[30% 判定线](/Users/shaozhenjie/class-server/github.io/content/docs/ai/04-challenges-and-future.mdx:39)、[通过测试即会思考](/Users/shaozhenjie/class-server/github.io/content/docs/ai/01-what-is-ai.mdx:80)。
- **问题**：图灵原文中的五分钟、70% 正确辨认率是预测，不是通用考试规则；具体 2014 年活动的规则不等于统一图灵测试标准。对话表现也不直接证明意识或真正理解，见 [图灵 1950 原文的大学转载](https://www.cse.msu.edu/~cse841/papers/Turing.html)。
- **修改建议**：区分思想实验、作者预测和具体活动的规则；“通过”的含义限于该测试条件下的行为表现。
- **验收条件**：不把 30% 当成一般固定通过线，不把聊天表现直接证明成理解或意识。

### AI-10　翻译轶事与聊天程序重测结论缺少可追溯来源

- **类型 / 优先级**：待核实来源，P2；不是已经证明故事虚假的结论。
- **位置**：[伏特加与烂肉故事](/Users/shaozhenjie/class-server/github.io/content/docs/ai/02-history-of-ai.mdx:98)、[应用课复用](/Users/shaozhenjie/class-server/github.io/content/docs/ai/03-abilities-and-applications.mdx:162)、[重测大幅下滑](/Users/shaozhenjie/class-server/github.io/content/docs/ai/04-challenges-and-future.mdx:45)。
- **问题**：虽用“笑话”作标题，正文仍把故事当真实翻译事件解释原因，未说明具体系统、时间与原始记录；聊天程序重测成绩也未给可查出处。
- **修改建议**：轶事明确标为流传的教学故事，或者换成有原始记录的案例；事实性重测结论补测试条件、来源和结果。
- **验收条件**：保留史实口吻的内容有可追溯证据，否则不能用它证明真实历史过程。

### AI-11　从通俗概论到数学推导缺少先修桥梁

- **类型 / 优先级**：教学改进，P2；本轮未据此认定公式错误。
- **位置**：[课程阅读顺序](/Users/shaozhenjie/class-server/github.io/content/docs/ai/index.mdx:11)、[梯度部分](/Users/shaozhenjie/class-server/github.io/content/docs/ai/05-how-machines-learn.mdx:91)、[链式法则](/Users/shaozhenjie/class-server/github.io/content/docs/ai/06-how-neural-networks-work.mdx:118)、[向量与矩阵](/Users/shaozhenjie/class-server/github.io/content/docs/ai/07-how-language-models-answer.mdx:42)。
- **问题**：前四课面向普通读者，后段直接用偏导、链式法则、指数对数、矩阵乘法、点积和 softmax，现有数据/学习方式章节没有补这些数学基础。
- **修改建议**：明确目标学生与先修要求；提供少量预备例题和不依赖推导的阅读主线，或把深入推导标为进阶部分。
- **验收条件**：零基础学生有可完成的路径，学习公式的学生知道需要先掌握什么，题目难度与已教内容匹配。

### AI-12　把 XOR 局限直接写成第一次 AI 寒冬的原因

- **类型 / 优先级**：因果过度简化、需限定，P3。
- **位置**：[感知机测验](/Users/shaozhenjie/class-server/github.io/content/docs/ai/02-history-of-ai.mdx:242)，解析在 250 行。
- **问题**：单层感知机的能力限制可作为相关背景，但不能据此把整个 AI 领域的第一次寒冬归为单一算法问题。
- **修改建议**：写成部分研究路线遇到的限制之一；如要讲资助变化与领域低潮，提供历史依据和多因素说明。
- **验收条件**：测验不会让学生把 XOR 限制背成整个领域寒冬的唯一原因。

### AI-13　用户增长统计和“史上最快”需要注明时间与口径

- **类型 / 优先级**：待补统计来源及限定，P3。
- **位置**：[ChatGPT 年表](/Users/shaozhenjie/class-server/github.io/content/docs/ai/02-history-of-ai.mdx:183)、[相关测验](/Users/shaozhenjie/class-server/github.io/content/docs/ai/02-history-of-ai.mdx:274)。
- **问题**：“两个月月活破亿，史上最快”未附统计来源、估计方法、比较对象和时间范围，读者容易把历史说法当作持续有效的排名。
- **修改建议**：补当时的估计出处和比较口径；若保留排名，限定为该统计发布时及其比较范围，不自行编造最新排名。
- **验收条件**：读者能查到数字来源并知道它是历史估计还是持续更新指标。

## 四、计算机网络课程

### NET-01　完整课程覆盖范围需要按用途决定

- **类型 / 优先级**：教学改进，P3；不是已确认的内容错误。
- **位置**：[课程说明](/Users/shaozhenjie/class-server/github.io/content/docs/network/index.mdx:11)。
- **问题**：当前八课主要覆盖校园网络应用、分层、IP、封装、字节序、IPv4 子网、最长前缀匹配与 ARP。这与页面的入门目标基本匹配。只有在准备把它用作完整大学《计算机网络》时，覆盖范围才不足。
- **修改建议**：若保持入门单元定位，保留明确的范围说明即可；若改成完整课程，另行安排 TCP 建连与关闭、可靠传输、流量与拥塞控制、UDP、DNS、路由协议、IPv6、链路差错控制及基础安全等内容，不要未经范围确认直接扩写。
- **验收条件**：课程名称、学习目标、学时与实际覆盖范围一致。

## 五、已做验证与本轮边界

- 静态扫描了 82 道可解析测验，使用实际判题组件的归一化逻辑，确认四道题没有任何可被判为正确的选项。
- 将 23 段包含完整入口的 C 示例放在临时目录中，用 Clang、C17、`-Wall -Wextra` 编译，并对相关问题运行边界输入。编译通过不等于算法正确。
- 单词计数复现：空行得到 1，只有空格再换行得到 1，`hello ` 再换行得到 2，均与合理预期不符。
- 字符统计复现：输入 `abc` 后结束输入、不附换行，相关循环无法结束，测试超时后终止。
- 普通常量类型复现：本机 `sizeof('a')` 为 4，`sizeof(char)` 为 1。这不是要求所有平台的 `int` 都占 4 字节。
- 原始 SQL 数据取自 [数据压缩包](/Users/shaozhenjie/class-server/github.io/docs/p1data.zip.zip)。行数核对采用内存数据库中等价的数据查询和人工核对，没有连接或修改用户的 MySQL 数据库。
- 数据库应用验证使用原始 JavaScript 路由和模拟数据库：错误密码登录、未登录但伪造教师请求头读取/修改成绩，均被对应处理器接受。这是路由逻辑验证，不是完整 MySQL 部署验收。
- 原始实验与考试说明通过只读提取核对。真实 MySQL 全流程、所有页面的浏览器交互、所有历史题库答案与全部图像内容，没有做穷尽式验收。清单覆盖本轮已识别的问题，不意味着未列出的内容已经全部证明正确。

## 六、修改后统一验收

- [ ] P1 项逐项通过文中边界输入、身份验证或结果行数检查。
- [ ] 同一知识点在正文、测验、解析、实验与图示中保持一致。
- [ ] 明确 C 标准版本、编译器/平台假设和 MySQL 版本；典型实现不被表述为所有实现的规则。
- [ ] 数据库示例明确“原始导入状态”与“完成增删改后的状态”，每题结果可重现。
- [ ] 在临时测试数据库中完成导入、恢复、权限和应用功能验收，记录实际环境及结果。
- [ ] 新学习者可以按说明准备依赖、配置连接并运行应用；模拟截图与本人运行结果明确区分。
- [ ] 如保留全真模拟卷承诺，完整卷具备独立题面、分值、参考答案和评分说明；如调整为精选练习，应同步修改设计承诺与达标标准。尚未确认的考试规则标为待确认。
- [ ] 历史事实与统计结论提供可追溯来源，无法验证的轶事不作为史实证明。
- [ ] 最终提供逐项修改对照表；没有落实的建议保留原因和待办状态。
