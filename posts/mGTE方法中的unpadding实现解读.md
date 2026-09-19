
**mGTE** 是阿里巴巴（通义实验室）2024 年提出的多语言长文本检索模型（全称 *Generalized Long-Context Text Representation and Reranking Models for Multilingual Text Retrieval*）。其 **unpadding** 方法是一种**计算效率优化技术**，主要用于避免在 padding tokens 上浪费算力，核心思想参考了 MosaicBERT（Portes et al., 2023）和 xFormers 的 variable length attention 实现。

---

## 核心动机

在 NLP 训练中，一个 batch 内的文本长度通常不一致。标准做法是用 `[PAD]` token 将短序列补齐到 batch 内的最大长度：

| 标准做法                        | 问题                                                   |
| ------------------------------- | ------------------------------------------------------ |
| 所有序列统一长度                | 短序列末尾的 padding tokens 没有语义信息               |
| 模型对整个张量做 Attention、FFN | 在 padding token 上执行大量冗余计算，浪费 GPU/内存带宽 |

---

## mGTE 的 Unpadding 方法

### 1. 基本思路：去除 Padding，拼接为单序列

mGTE 在训练和推理时，**将 mini-batch 中所有序列的 padding tokens 去掉**，然后把真实的 token 拼接成一个连续的长序列（逻辑上 batch size = 1），只在这个长序列上做计算。

```
Before (Standard):    [A, B, C, PAD, PAD]      [D, E, PAD, PAD, PAD]
After (Unpadding):     [A, B, C, D, E]  (concatenated into one sequence)
```

### 2. 技术实现：Variable Length Attention

为了不破坏各样本内部的注意力边界，mGTE 使用 **xFormers** 的 `variable length attention`（变长注意力）：

- 通过 `cu_seqlens`（cumulative sequence lengths）告诉 kernel 每个原始序列在长序列中的起止位置。
- Attention 计算时，每个序列只 attend 自己内部的 token，不会跨样本交互。
- 同时兼容 **FlashAttention** 的优化内核，保证计算效率与标准 Attention 一致。

### 3. 与 RoPE 的协同

mGTE 采用了 **RoPE（Rotary Position Embedding）** 替代 BERT 的绝对位置编码。在 unpadding 拼接后，RoPE 的旋转角度需要根据每个原始序列的相对位置重新应用，而不是全局位置。xFormers 的 variable length 实现支持这种 jagged（不规则）的 RoPE 应用。

### 4. 对 MLM 标签也做 Unpadding

mGTE 在预训练阶段使用 MLM（Masked Language Modeling）目标。除了对输入 token unpadding，它**对 MLM labels 也做 unpadding**，避免在预测非 mask 的 padding token 上浪费计算。

---

## 效果

mGTE 论文中的效率对比（Table 6）明确指出：

| 配置                                | 编码时间     |
| ----------------------------------- | ------------ |
| 无 Unpadding                        | 279 s        |
| **End-to-end Unpadding + xFormers** | **52 s**     |
| 与 BGE-M3 对比                      | 快 **14 倍** |

Unpadding 带来的主要收益是：
- **减少冗余计算**：不再对 padding token 做 Attention/FFN。
- **节省内存带宽**：避免读写无意义的 padding 数据。
- **端到端加速**：在训练（MLM）和推理（embedding 提取）阶段均可使用。

---

## 一句话总结

> **mGTE 的 unpadding 方法**：将 batch 内的 padding tokens 全部去掉，把真实 token 拼接成一个长序列，通过 xFormers 的 variable length attention 在单个长序列上完成各样本的独立注意力计算，从而避免在 padding 上浪费算力，显著加速训练和推理。
