/*
 * 极简中英双语支持（无依赖、无构建）。
 *
 * 用法：
 *   1. 页面 <head> 里最先引入：<script src="assets/i18n.js?v=1"></script>
 *   2. 需要翻译的元素加 data-i18n="key"（纯文本）或 data-i18n-html="key"（含链接/加粗等富文本）；
 *      属性翻译用 data-i18n-attr="placeholder:key,aria-label:key2"。
 *   3. JS 里用 window.BlogI18N.t("key", {n: 3}) 取词。
 *   4. 导航栏左上角放切换按钮：
 *      <button class="lang-option" data-lang="zh">中</button>
 *      <button class="lang-option" data-lang="en">EN</button>
 *      （点击事件在本文件里统一接管。）
 *
 * 语言选择优先级：localStorage("blog_lang") > 浏览器语言（zh* 用中文，其余英文）。
 * 切换语言后会派发 "bloglangchange" 事件，列表页/详情页监听后重渲染。
 */
(function () {
  "use strict";

  var STORAGE_KEY = "blog_lang";
  var LANG_EVENT = "bloglangchange";

  var DICT = {
    /* ------------------------------ 中文 ------------------------------ */
    zh: {
      "common.backHome": "回到首页",
      "common.langSwitch": "切换语言",
      "nav.aria": "主导航",
      "nav.about": "关于我",
      "nav.blogs": "博客",
      "nav.projects": "项目",
      "nav.publications": "论文与荣誉",
      "footer.built": "本站基于 HTML、CSS 与 GitHub Pages 构建。",
      "footer.backProfile": "返回个人主页",
      "footer.backArticles": "返回文章列表",

      "about.docTitle": "关于王子腾",
      "about.profileAria": "个人照片与链接",
      "about.linksAria": "个人链接",
      "about.imageAlt": "王子腾的照片",
      "about.intro":
        '我是<a href="https://www.cqut.edu.cn/">重庆理工大学</a>（CQUT）计算机技术专业三年级硕士研究生，具备扎实的计算机与大数据基础，拥有机器学习与深度学习的实践经验，热衷于打造能产生真实世界影响的 AI 解决方案。目前我正在寻找 AI 领域的全职机会，希望发挥所长、不断成长，并创造切实的价值。我随时准备迎接新的挑战，欢迎通过 <a href="mailto:ztwang0407@163.com">ztwang0407@163.com</a> 与我联系！',
      "about.education": "教育经历",
      "about.eduMaster": "计算机技术硕士",
      "about.eduBachelor": "计算机科学与工程学士",
      "about.work": "实习与工作经历",
      "about.workY1": "2026年9月 - 至今",
      "about.workY2": "2026年7月 - 2026年9月",
      "about.workY3": "2026年3月 - 2026年7月",
      "about.workEmbodied": "具身视觉实习生",
      "about.workAlgorithm": "算法实习生",
      "about.schoolCqut": "重庆理工大学",
      "about.schoolHaue": "河南工程学院",
      "about.workCompany1": "松延动力",
      "about.workCompany2": "重庆正大能科科技有限公司",
      "about.workCompany3": "成都量子矩阵科技",
      "about.skills": "专业技能",
      "about.projects": "项目",
      "about.projBlogKicker": "博客",
      "about.projBlogTitle": "个人博客",
      "about.projBlogDesc": "围绕 AI 与软件开发的笔记、项目日志和技术写作。",
      "about.projGhKicker": "GitHub",
      "about.projGhTitle": "代码仓库",
      "about.projGhDesc": "持续学习中的实验、工具与实现记录。",

      "articles.docTitle": "文章 - ztwang",
      "articles.kicker": "博客",
      "articles.h1": "文章",
      "articles.desc": "学习笔记、项目复盘和技术观察会整理在这里。",
      "articles.index": "索引",
      "articles.allPosts": "全部文章",
      "articles.search": "搜索",
      "articles.searchPlaceholder": "标题、标签、摘要...",
      "articles.filtersAria": "文章标签筛选",
      "articles.empty": "没有找到匹配的文章。",

      "post.docTitle": "文章 - ztwang",
      "post.back": "返回文章列表",
      "post.loading": "正在加载文章...",
      "post.missingSlug": "缺少文章 slug。",
      "post.notFound": "没有找到这篇文章",
      "post.httpError": "{label}加载失败（HTTP {status}）",
      "post.indexLabel": "文章索引",
      "post.bodyLabel": "文章正文",
      "post.indexBadFormat": "文章索引格式不正确",
      "post.openNewTab": "新窗口打开",
      "post.download": "下载",
      "post.pdfHint":
        '没有显示内容？请<a href="{file}" target="_blank" rel="noopener">在新窗口打开 PDF</a>（移动端浏览器一般不支持内嵌预览）。',
      "post.htmlHint":
        '页面在独立容器里原样渲染。如果显示异常，可以<a href="{file}" target="_blank" rel="noopener">在新窗口打开</a>，或在 index.json 里把这一篇改成 <code>"embed": "inline"</code> 让它融入本站排版。',
      "post.inlineHint":
        '该 HTML 文章以 <code>"embed": "inline"</code> 方式嵌入，原文样式已移除；想保留原页面外观就去掉 index.json 里的这个字段。',
      "post.noContent": "这个 HTML 文件里没有可显示的内容",
      "post.mathFallback":
        "公式渲染库（KaTeX）没能加载，下面按 LaTeX 原文显示。检查网络后刷新页面即可恢复。",
      "post.zhOnly": "该文章目前仅提供中文版本。",
      "post.enOnly": "该文章目前仅提供英文版本。",

      "home.indexFailed": "文章索引加载失败",
      "home.tagAll": "全部",
      "home.readMore": "阅读全文",

      "meta.minRead": "{n} 分钟阅读",
      "posts.pdfDoc": "PDF 文档",
      "posts.htmlDoc": "网页文章",

      "pub.kicker": "学术档案",
      "pub.h1": "论文与荣誉",
      "pub.pubKicker": "论文",
      "pub.pubTitle": "代表性论文",
      "pub.awardKicker": "奖项",
      "pub.awardTitle": "荣誉与奖项",

      "pub.patent.title": "双向并行局部注意力视觉 Transformer 方法",
      "pub.patent.meta": "Ziteng Wang, Junjie Wang, Xin Feng, 发明专利, CN118736295A, 2024",
      "pub.patent.abs":
        "本发明公开了双向并行局部注意力视觉Transformer方法，涉及计算机视觉技术领域。本发明首先在特征层面对补丁进行分组，在每个组内执行局部注意力操作，有效利用特征空间中补丁之间的关系，弥补信息丢失的问题，其次，为了有效融合补丁之间的信息，将基于语义的局部注意力和基于图像的局部注意力进行并行结合，通过双向自适应学习来增强ViT模型在小数据集上的性能，实验结果表明，该方法在计算量为15.2GFLOPs和参数量为57.2M的情况下，分别在CIFAR‑10数据集以及CIFAR‑100数据集上实现了97.93％和85.80％的准确性，相较其他方法，双向并行局部注意力的视觉Transformer在增强局部引导能力的同时，保持了局部注意力所需属性的有效性。",
      "pub.uav.title": "基于角度信息对无人机有效定位的研究",
      "pub.uav.meta": "王子腾, 李西然, 张佳怡, 刘凯, 河南工程学院学报, 2024",
      "pub.uav.abs":
        "无人机飞行技术对维护国家权益和捍卫国防安全具有重要意义，而纯方位无源定位是无人机编队调整和飞行的核心问题。针对发射信号无人机位置无偏差且编号已知的情况，给出了基于角度信息的无人机定位模型。在发射信号无人机位置无偏差情况下，除了指定两架编号特定的无人机，还需要一架无人机发射信号就可以实现接收信号无人机的有效定位。对于发射信号和接收信号无人机位置均略有偏差的问题，针对不同角度信息提出了具体的调整方案，使得无人机能够更加精确地到达指定位置，并对每个问题给出了相应的算例。",

      "award.hydrogen.title": "氢能全链条关键参数集成智能传感与仪器系统研发与应用",
      "award.hydrogen.meta": "重庆市重大科研项目（先进制造专项），2026，参研",
      "award.hydrogen.desc": "负责多源数据耦合的氢泄漏智能化风险监控与预警算法研发。",
      "award.piano.title": "AI赋能高校钢琴教育课堂“人机协同”混合式教学模式创新与实践研究",
      "award.piano.meta": "吉林省高教科研课题, 2026，参研",
      "award.piano.desc": "立项编号：JGJX26D0562。",
      "award.mathorcup16.title": "第十六届 MathorCup 数学应用挑战赛",
      "award.mathorcup16.meta": "中国优选法统筹法与经济数学研究会, 2026",
      "award.mathorcup16.desc": "西南赛区二等奖。第一负责人",
      "award.huawei22.title": "“华为杯”第二十二届中国研究生数学建模竞赛",
      "award.huawei22.meta": "中国学位与研究生教育学会, 2025",
      "award.huawei22.desc": "国家一等奖、全国第26名。第一负责人",
      "award.league1.title": "重庆理工大学优秀共青团员",
      "award.league1.meta": "重庆理工大学, 2025-2026",
      "award.zhongqing7.title": "第七届中青杯全国大学生数学建模竞赛",
      "award.zhongqing7.meta": "中国国际科技促进会综合素质与职业发展教育专业委员会, 2025",
      "award.zhongqing7.desc": "国家三等奖。第一负责人",
      "award.mcm.title": "美国大学生 MCM/ICM 数学建模竞赛",
      "award.mcm.meta": "美国数学及其应用联合会, 2025",
      "award.mcm.desc": "Meritorious Winner（一等奖）。第一负责人",
      "award.aiComp.title": "重庆市第一届 AI 大模型创新应用大赛",
      "award.aiComp.meta": "重庆市教育委员会, 2025",
      "award.aiComp.desc": "重庆市一等奖。第一负责人",
      "award.mathorcup15.title": "第十五届 MathorCup 数学应用挑战赛",
      "award.mathorcup15.meta": "中国优选法统筹法与经济数学研究会, 2025",
      "award.mathorcup15.desc": "西南赛区二等奖。第一负责人",
      "award.bigdata5.title": "第五届 MathorCup 数学应用挑战赛—大数据竞赛",
      "award.bigdata5.meta": "中国优选法统筹法与经济数学研究会, 2024",
      "award.bigdata5.desc": "全国三等奖。第二负责人",
      "award.scholarship.title": "重庆理工大学一等奖学金",
      "award.scholarship.meta": "重庆理工大学, 2024-2025",
      "award.outstandingGrad.title": "重庆理工大学优秀研究生",
      "award.outstandingGrad.meta": "重庆理工大学, 2024-2025",
      "award.innovation.title": "重庆理工大学科技创新先进个人",
      "award.innovation.meta": "重庆理工大学, 2024-2025",
      "award.league2.title": "重庆理工大学优秀共青团员",
      "award.league2.meta": "重庆理工大学, 2024-2025",
      "award.cup.title": "“高教社杯”全国大学生数学建模竞赛",
      "award.cup.meta": "高教社, 2022",
      "award.cup.desc": "全国一等奖、河南省第一名。第一负责人",
    },

    /* ------------------------------ English ------------------------------ */
    en: {
      "common.backHome": "Back to home",
      "common.langSwitch": "Switch language",
      "nav.aria": "Main navigation",
      "nav.about": "About Me",
      "nav.blogs": "Blogs",
      "nav.projects": "Projects",
      "nav.publications": "Publications & Awards",
      "footer.built": "This page is built with HTML, CSS and GitHub Pages.",
      "footer.backProfile": "Back to profile",
      "footer.backArticles": "Back to articles",

      "about.docTitle": "About Ziteng Wang",
      "about.profileAria": "Profile",
      "about.linksAria": "Profile links",
      "about.imageAlt": "Portrait of Ziteng Wang",
      "about.intro":
        'I am currently a third-year Master’s student specializing in Computer Technology at <a href="https://www.cqut.edu.cn/">Chongqing University of Technology</a> (CQUT). I possess a solid foundation in computer science and big data, along with practical experience in machine learning and deep learning, and I am passionate about developing AI-driven solutions that deliver real-world impact. I am currently seeking full-time opportunities in the AI field, where I hope to apply my expertise, grow professionally, and create meaningful value. I am ready to embrace new challenges and welcome you to contact me at <a href="mailto:ztwang0407@163.com">ztwang0407@163.com</a>!',
      "about.education": "Education",
      "about.eduMaster": "Master of Computer Technology",
      "about.eduBachelor": "Bachelor of Computer Science and Engineering",
      "about.work": "Work Experience",
      "about.workY1": "Sept. 2026 - Now",
      "about.workY2": "Jul. 2026 - Sept. 2026",
      "about.workY3": "Mar. 2026 - Jul. 2026",
      "about.workEmbodied": "Embodied Vision Intern",
      "about.workAlgorithm": "Algorithm Intern",
      "about.schoolCqut": "Chongqing University of Technology",
      "about.schoolHaue": "Henan University of Engineering",
      "about.workCompany1": "Noetix Robotics",
      "about.workCompany2": "CHONGQING ZDNK SOFTWARE CORP.",
      "about.workCompany3": "Quantum Matrix of Chengdu",
      "about.skills": "Technical Skills",
      "about.projects": "Projects",
      "about.projBlogKicker": "Blog",
      "about.projBlogTitle": "Personal Blog",
      "about.projBlogDesc": "Notes, project logs, and technical writing around AI and software development.",
      "about.projGhKicker": "GitHub",
      "about.projGhTitle": "Code Repository",
      "about.projGhDesc": "Experiments, tools, and implementation records from ongoing learning.",

      "articles.docTitle": "Posts - ztwang",
      "articles.kicker": "Blog",
      "articles.h1": "Blog",
      "articles.desc": "Study notes, project write-ups, and observations on technology live here.",
      "articles.index": "Index",
      "articles.allPosts": "All Posts",
      "articles.search": "Search",
      "articles.searchPlaceholder": "Title, tag, or summary...",
      "articles.filtersAria": "Post tag filters",
      "articles.empty": "No matching posts found.",

      "post.docTitle": "Article - ztwang",
      "post.back": "Back to articles",
      "post.loading": "Loading article...",
      "post.missingSlug": "Missing post slug.",
      "post.notFound": "Article not found",
      "post.httpError": "Failed to load {label} (HTTP {status})",
      "post.indexLabel": "post index",
      "post.bodyLabel": "article body",
      "post.indexBadFormat": "Invalid post index format",
      "post.openNewTab": "Open in new tab",
      "post.download": "Download",
      "post.pdfHint":
        'Nothing showing? <a href="{file}" target="_blank" rel="noopener">Open the PDF in a new window</a> (mobile browsers usually do not support embedded PDF preview).',
      "post.htmlHint":
        'This page renders as-is inside an isolated container. If it looks off, <a href="{file}" target="_blank" rel="noopener">open it in a new window</a>, or set <code>"embed": "inline"</code> in index.json to blend it into this site.',
      "post.inlineHint":
        'This HTML article is embedded with <code>"embed": "inline"</code>, so its original styles are removed. Remove that field in index.json to keep the original look.',
      "post.noContent": "No displayable content in this HTML file",
      "post.mathFallback":
        "The formula renderer (KaTeX) failed to load, so the LaTeX source is shown below. Refresh the page with network access to restore it.",
      "post.zhOnly": "This article is currently available in Chinese only.",
      "post.enOnly": "This article is currently available in English only.",

      "home.indexFailed": "Failed to load the post index",
      "home.tagAll": "All",
      "home.readMore": "Read more",

      "meta.minRead": "{n} min read",
      "posts.pdfDoc": "PDF document",
      "posts.htmlDoc": "Web page",

      "pub.kicker": "Academic Profile",
      "pub.h1": "Publications & Awards",
      "pub.pubKicker": "Publications",
      "pub.pubTitle": "Selected Publications",
      "pub.awardKicker": "Awards",
      "pub.awardTitle": "Honors & Awards",

      "pub.patent.title": "Bidirectional Parallel Local-Attention Vision Transformer",
      "pub.patent.meta": "Ziteng Wang, Junjie Wang, Xin Feng, Invention Patent, CN118736295A, 2024",
      "pub.patent.abs":
        "This invention discloses a bidirectional parallel local-attention vision Transformer method, relating to the field of computer vision. The method first groups patches at the feature level and performs local attention within each group, effectively exploiting the relationships between patches in feature space to compensate for information loss. To further fuse information across patches, semantic-based local attention and image-based local attention are combined in parallel, and bidirectional adaptive learning enhances the ViT model’s performance on small datasets. Experimental results show that, with 15.2 GFLOPs of computation and 57.2M parameters, the method achieves 97.93% accuracy on CIFAR-10 and 85.80% on CIFAR-100. Compared with other methods, the bidirectional parallel local-attention vision Transformer strengthens local guidance while preserving the properties required by local attention.",
      "pub.uav.title": "Research on Effective UAV Positioning Based on Angle Information",
      "pub.uav.meta": "Ziteng Wang, Xiran Li, Jiayi Zhang, Kai Liu, Journal of Henan University of Engineering, 2024",
      "pub.uav.abs":
        "UAV flight technology is of great significance to safeguarding national rights and national defense security, and bearing-only passive localization is a core problem in UAV formation adjustment and flight. For the case where the signal-emitting UAVs are free of position bias and have known IDs, we present a UAV localization model based on angle information. When the emitting UAVs have no position bias, besides two UAVs with designated IDs, only one additional UAV needs to emit signals to achieve effective localization of the receiving UAVs. For the case where both emitting and receiving UAVs have slight position deviations, we propose concrete adjustment schemes for different angle information so that the UAVs can reach their designated positions more precisely, with worked examples given for each problem.",

      "award.hydrogen.title":
        "R&D and Application of an Intelligent Sensing and Instrumentation System Integrating Key Parameters Across the Hydrogen Energy Chain",
      "award.hydrogen.meta":
        "Major Science and Technology Project of Chongqing (Advanced Manufacturing Program), 2026 · Participant",
      "award.hydrogen.desc":
        "Responsible for developing multi-source data-coupled intelligent hydrogen-leak risk monitoring and early-warning algorithms.",
      "award.piano.title":
        "Innovation and Practice of a Human–Machine Collaborative Blended Teaching Model for AI-Empowered College Piano Education",
      "award.piano.meta": "Jilin Province Higher Education Research Project, 2026 · Participant",
      "award.piano.desc": "Project No. JGJX26D0562.",
      "award.mathorcup16.title": "The 16th MathorCup Mathematical Application Challenge",
      "award.mathorcup16.meta":
        "Chinese Society of Optimization, Overall Planning and Economic Mathematics, 2026",
      "award.mathorcup16.desc": "Second Prize, Southwest Division · Team leader",
      "award.huawei22.title": "“Huawei Cup” 22nd China Postgraduate Mathematical Contest in Modeling",
      "award.huawei22.meta": "China Academic Degrees and Graduate Education Association, 2025",
      "award.huawei22.desc": "National First Prize, 26th place nationwide · Team leader",
      "award.league1.title": "Outstanding Communist Youth League Member of CQUT",
      "award.league1.meta": "Chongqing University of Technology, 2025-2026",
      "award.zhongqing7.title":
        "The 7th Zhongqing Cup National College Student Mathematical Modeling Contest",
      "award.zhongqing7.meta":
        "China International Science and Technology Promotion Association, 2025",
      "award.zhongqing7.desc": "National Third Prize · Team leader",
      "award.mcm.title": "MCM/ICM Mathematical Contest in Modeling (USA)",
      "award.mcm.meta": "COMAP (Consortium for Mathematics and Its Applications), 2025",
      "award.mcm.desc": "Meritorious Winner (First Prize) · Team leader",
      "award.aiComp.title": "The 1st Chongqing AI Large Model Innovation and Application Competition",
      "award.aiComp.meta": "Chongqing Municipal Education Commission, 2025",
      "award.aiComp.desc": "Chongqing First Prize · Team leader",
      "award.mathorcup15.title": "The 15th MathorCup Mathematical Application Challenge",
      "award.mathorcup15.meta":
        "Chinese Society of Optimization, Overall Planning and Economic Mathematics, 2025",
      "award.mathorcup15.desc": "Second Prize, Southwest Division · Team leader",
      "award.bigdata5.title":
        "The 5th MathorCup Mathematical Application Challenge — Big Data Competition",
      "award.bigdata5.meta":
        "Chinese Society of Optimization, Overall Planning and Economic Mathematics, 2024",
      "award.bigdata5.desc": "National Third Prize · Second member",
      "award.scholarship.title": "CQUT First-Class Scholarship",
      "award.scholarship.meta": "Chongqing University of Technology, 2024-2025",
      "award.outstandingGrad.title": "Outstanding Graduate of CQUT",
      "award.outstandingGrad.meta": "Chongqing University of Technology, 2024-2025",
      "award.innovation.title": "CQUT Individual Award for Scientific and Technological Innovation",
      "award.innovation.meta": "Chongqing University of Technology, 2024-2025",
      "award.league2.title": "Outstanding Communist Youth League Member of CQUT",
      "award.league2.meta": "Chongqing University of Technology, 2024-2025",
      "award.cup.title": "“Higher Education Press Cup” National College Student Mathematical Modeling Contest",
      "award.cup.meta": "Higher Education Press, 2022",
      "award.cup.desc": "National First Prize, 1st place in Henan Province · Team leader",
    },
  };

  var current = null;

  function normalize(lang) {
    return lang === "en" ? "en" : "zh";
  }

  function detect() {
    try {
      var saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "zh" || saved === "en") return saved;
    } catch (error) {
      /* 隐私模式下 localStorage 不可用，走浏览器语言 */
    }
    var language = (window.navigator && window.navigator.language) || "";
    return /^zh/i.test(language) ? "zh" : "en";
  }

  function getLang() {
    if (!current) current = detect();
    return current;
  }

  function interpolate(value, params) {
    if (!params) return value;
    return String(value).replace(/\{(\w+)\}/g, function (match, key) {
      return params[key] != null ? String(params[key]) : match;
    });
  }

  /** 取词：先当前语言，回退中文，再回退 key 本身。支持 {name} 占位符。 */
  function t(key, params) {
    var table = DICT[getLang()] || DICT.zh;
    var value = table[key];
    if (value == null) value = DICT.zh[key];
    if (value == null) return key;
    return interpolate(value, params);
  }

  /** 把当前语言应用到 DOM：data-i18n / data-i18n-html / data-i18n-attr。 */
  function apply(root) {
    root = root || document;

    root.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });

    root.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });

    root.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(",").forEach(function (pair) {
        var parts = pair.split(":");
        var attr = (parts[0] || "").trim();
        var key = (parts[1] || "").trim();
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });

    document.documentElement.lang = getLang() === "zh" ? "zh-CN" : "en";

    root.querySelectorAll(".lang-option[data-lang]").forEach(function (button) {
      var active = button.getAttribute("data-lang") === getLang();
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setLang(lang) {
    var next = normalize(lang);
    var changed = next !== getLang();
    current = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      /* 忽略存储失败，本次会话内仍然生效 */
    }
    apply();
    if (changed) {
      try {
        document.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: { lang: next } }));
      } catch (error) {
        /* 极老浏览器没有 CustomEvent 就不通知了 */
      }
    }
  }

  /* 左上角切换按钮：事件统一接管，四个页面零重复代码。 */
  document.addEventListener("click", function (event) {
    var button = event.target.closest(".lang-option[data-lang]");
    if (!button) return;
    setLang(button.getAttribute("data-lang"));
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      apply();
    });
  } else {
    apply();
  }

  window.BlogI18N = { t: t, getLang: getLang, setLang: setLang, apply: apply, LANG_EVENT: LANG_EVENT };
})();
