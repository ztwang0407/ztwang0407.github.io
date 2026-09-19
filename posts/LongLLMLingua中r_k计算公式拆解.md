这个公式来自 **LongLLMLingua** 的 **Question-Aware Coarse-Grained Compression**（公式2），计算每个文档与 query 的相关性得分 $r_k$。

---

## 1. 公式拆解

$$r_k = \frac{1}{N_c} \sum_{i=1}^{N_c} p(x_i^{que,restrict} \mid \mathbf{x}_k^{doc}) \cdot \log p(x_i^{que,restrict} \mid \mathbf{x}_k^{doc})$$

其中：
- $\mathbf{x}_k^{doc}$：第 $k$ 个文档
- $x_i^{que,restrict}$：query 的第 $i$ 个 token（后面拼接了一个**限制性语句** $x^{restrict}$）
- $N_c$：query + restrict 的总 token 数
- $p(\cdot \mid \mathbf{x}_k^{doc})$：给定文档后，小模型预测该 token 的条件概率

---

## 2. 为什么要这样计算 $r_k$

### 原因一：用 $p(query|doc)$ 而不是 $p(doc|query)$

这是方向上的关键反转：

| 方向                                          | 问题                                                         |
| --------------------------------------------- | ------------------------------------------------------------ |
| $p(\mathbf{x}_k^{doc} \mid \mathbf{x}^{que})$ | 文档太长，包含大量无关信息。即使文档包含答案，**无关内容也会稀释整体困惑度**，导致不同文档的得分拉不开差距。 |
| $p(\mathbf{x}^{que} \mid \mathbf{x}_k^{doc})$ | query 短且聚焦。如果文档包含答案，模型预测 query 会非常容易（概率高）；如果文档无关，模型预测 query 很困难（概率低）。**区分度强**。 |

> 论文原文："documents often contain a significant amount of irrelevant information. Even when conditioned on $\mathbf{x}^{que}$, the perplexity scores computed for entire documents may not be sufficiently distinct."

---

### 原因二：公式 $p \log p$ 的信息论含义

这个形式不是标准的困惑度（PPL），而是 **信息论中"期望自信息"（expected self-information）的负数**，即**负的期望编码长度**：

- $-\log p$：该 token 的 **surprisal**（自信息），模型预测它所需的编码长度
- $p \cdot (-\log p)$：该 token 的 **期望编码长度**
- $p \cdot \log p$：期望编码长度的 **负数**

**直观理解：**
- 当文档与 query **高度相关**时，给定文档后模型预测 query 的 token 非常"确定"，概率 $p$ 高，期望编码长度小，$p \log p$ 接近 0（$r_k$ 大）。
- 当文档与 query **不相关**时，模型预测困难，概率 $p$ 低，期望编码长度大，$p \log p$ 更负（$r_k$ 小）。

**为什么用 $p \log p$ 而不是简单的 $-\frac{1}{N}\sum \log p$（标准困惑度）？**

1. **鲁棒性**：$p \log p$ 对极低概率的惩罚更温和。如果个别 token 概率极低（如 0.001），标准困惑度中 $-\log p$ 会爆增至 6.9，严重扭曲整体评分；但 $p \log p \approx -0.007$，几乎不影响。这使得 $r_k$ 更关注**整体的概率质量分布**，而不是被个别异常 token 主导。

2. **压缩视角**：LongLLMLingua 秉承"LLM is Compression"框架。$p \log p$ 衡量的是**在文档帮助下，压缩 query 所需的期望信息量**。文档越相关，压缩 query 所需的信息越少，$r_k$ 越高。

---

### 原因三：Restrict 语句（正则化）

公式中的 $x^{que,restrict}$ 不是原始 query，而是 query + 一句限制性提示（如："We can get the answer to this question in the given documents"）。

**作用：**
- **强化关联**：明确告诉小模型"这个 query 的答案就在这些文档里"，引导模型更积极地利用文档信息来预测 query。
- **抑制幻觉**：作为正则化项，防止小模型在没有相关文档时"编造"出看似合理的 query 概率。

> 论文原文："It can be regarded as a regularization term that mitigates the impact of hallucinations."

---

### 原因四：用于粗粒度文档筛选

$r_k$ 是 **coarse-grained（文档级别）** 的筛选指标。LongLLMLingua 先用 $r_k$ 在所有文档中排序，只保留 $r_k$ **最高**的一批文档（如图3a所示，相比 BM25、Embedding 等方法，它的 recall 最高）。

然后，在保留下来的文档上，再用 **contrastive perplexity**（公式3）做细粒度的 token 级压缩。

---

## 一句话总结

> $r_k$ 衡量的是：**给定文档后，模型"压缩"query 所需的期望信息量**。$r_k$ 越高，说明文档让模型预测 query 越轻松，即文档与 query 越相关。用 $p \log p$ 而不是标准困惑度，是为了更鲁棒地反映整体的概率质量分布，同时 restrict 语句起到强化关联和抑制幻觉的作用。