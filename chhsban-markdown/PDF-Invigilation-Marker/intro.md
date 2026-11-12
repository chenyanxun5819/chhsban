# 专案目标：
- 从扫描文件提取监考人员名单提提，并做记号，另存档案。

# 名单来源：
- 老师名单：D:\chhsban\chhsban-markdown\PDF-Invigilation-Marker\老师名单.xlsx中的"老师名单"
- 座位区块：D:\chhsban\chhsban-markdown\PDF-Invigilation-Marker\老师名单.xlsx中的"座位区块"

# 分析标的：
- D:\chhsban\chhsban-markdown\PDF-Invigilation-Marker\sample.pdf

## 说明：
- 每次监考名单格式，大概都像D:\chhsban\chhsban-markdown\PDF-Invigilation-Marker\sample.pdf这种格式，有时是A3大小、有时是A4，里面可以看到老师的代码。
- 代码可以对应到"老师名单.xlsx"中的"代号 Initial"栏位。

## 任务说明：
- 从"sample.pdf"与"老师名单.xlsx"的"代号 Initial"对应后取所有的监考老师名单（单一值）, 然后在"sample.pdf"中依序把有监考老师的名单做标记，每位老师会有一张独立的监考表。
- 标记完以后，在"sample.pdf"的左上角，放上"老师名单.xlsx"的"老师名单.代号 Initial"+tab+"老师名单.教师姓名 Name"+"老师名单.座号"
- 将"老师名单.座号"比对"座位区块.座位号"以后，依"座位区块.区块"排序。这里请注意，区块表中的L是指左排，L1是左排第1区块，依序是L2、L3，要排一起；同理R是右排，依序R1、R2、R3，要排一起。C是指中间，CL是中间左排、CR是中间右排，CL1和CR1、CL2和CR2、CL3和CR3，要在一起。依这个方式排序，之后印出来比较好发给他们。
