import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 清空现有数据（开发环境）
  await prisma.forumLike.deleteMany()
  await prisma.forumComment.deleteMany()
  await prisma.forumPost.deleteMany()
  await prisma.review.deleteMany()
  await prisma.favorite.deleteMany()
  await prisma.message.deleteMany()
  await prisma.order.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()

  // 分类
  const categories = await Promise.all(
    [
      { name: '电子数码', icon: '📱', sort: 1 },
      { name: '图书教材', icon: '📚', sort: 2 },
      { name: '生活用品', icon: '🏠', sort: 3 },
      { name: '运动户外', icon: '⚽', sort: 4 },
      { name: '其他', icon: '📦', sort: 5 },
    ].map((c) => prisma.category.create({ data: c }))
  )

  // 用户
  const admin = await prisma.user.create({
    data: { phone: '13800000000', nickname: '昭院管理员', isAdmin: true, avatar: null },
  })
  const user1 = await prisma.user.create({
    data: { phone: '13800000001', nickname: '小昭', avatar: null },
  })
  const user2 = await prisma.user.create({
    data: { phone: '13800000002', nickname: '阿闲', avatar: null },
  })
  const user3 = await prisma.user.create({
    data: { phone: '13800000003', nickname: '集集', avatar: null },
  })

  // 示例商品（图片用占位服务，后续可替换为本地图）
  const img = (seed: string) => `https://picsum.photos/seed/${seed}/600/600`

  const productsData = [
    { title: '九成新山地自行车 26寸', desc: '毕业转手，骑行不到半年，车况良好，送车锁和打气筒。', price: 450, cond: '轻微使用痕迹', cat: '运动户外', seller: user1, seed: 'bike' },
    { title: '考研数学全套复习资料', desc: '张宇+李永乐全套，笔记工整，含真题解析。', price: 60, cond: '轻微使用痕迹', cat: '图书教材', seller: user2, seed: 'kaoyan' },
    { title: '小米蓝牙耳机 AirDots', desc: '音质不错，续航正常，配原装充电仓。', price: 89, cond: '几乎全新', cat: '电子数码', seller: user3, seed: 'earbuds' },
    { title: '宿舍小电风扇', desc: '静音款，三档风力，夏天必备。', price: 25, cond: '几乎全新', cat: '生活用品', seller: user1, seed: 'fan' },
    { title: '二手 iPad 2019 128G', desc: '成色新，无划痕，电池健康 92%，带保护壳。', price: 1600, cond: '几乎全新', cat: '电子数码', seller: user2, seed: 'ipad' },
    { title: '大学英语四六级真题', desc: '近五年真题+听力原文，含答题卡。', price: 20, cond: '轻微使用痕迹', cat: '图书教材', seller: user3, seed: 'cet' },
    { title: '宿舍台灯 护眼', desc: '三档色温，可充电，晚上学习不打扰室友。', price: 35, cond: '几乎全新', cat: '生活用品', seller: user1, seed: 'lamp' },
    { title: '羽毛球拍一对', desc: '全碳素，含球包和三个球。', price: 80, cond: '轻微使用痕迹', cat: '运动户外', seller: user2, seed: 'badminton' },
    { title: '机械键盘 青轴', desc: '87键，RGB 背光，打字手感一流。', price: 150, cond: '轻微使用痕迹', cat: '电子数码', seller: user3, seed: 'keyboard' },
    { title: '高等数学教材 同济版', desc: '上下册，无笔记，几乎全新。', price: 30, cond: '几乎全新', cat: '图书教材', seller: user1, seed: 'math' },
    { title: '折叠晾衣架', desc: '不锈钢，宿舍阳台晾晒神器。', price: 15, cond: '明显使用痕迹', cat: '生活用品', seller: user2, seed: 'rack' },
    { title: '篮球 斯伯丁', desc: '正品，外场用，气密性好。', price: 70, cond: '轻微使用痕迹', cat: '运动户外', seller: user3, seed: 'basketball' },
    { title: 'Kindle 电子书阅读器', desc: 'Paperwhite 4，护眼墨水屏，盖泡面神器。', price: 380, cond: '几乎全新', cat: '电子数码', seller: user1, seed: 'kindle' },
    { title: '考研英语 恋练有词', desc: '朱伟版，附赠网课笔记。', price: 25, cond: '轻微使用痕迹', cat: '图书教材', seller: user2, seed: 'words' },
    { title: '保温杯 316不锈钢', desc: '500ml，保温 12 小时，全新未拆封。', price: 40, cond: '全新', cat: '生活用品', seller: user3, seed: 'cup' },
  ]

  for (const p of productsData) {
    const category = categories.find((c) => c.name === p.cat)!
    await prisma.product.create({
      data: {
        title: p.title,
        description: p.desc,
        price: p.price,
        images: JSON.stringify([img(p.seed), img(p.seed + '2'), img(p.seed + '3')]),
        condition: p.cond,
        sellerId: p.seller.id,
        categoryId: category.id,
      },
    })
  }

  // ==================== 校园论坛示例帖子 ====================
  const forumPostsData: {
    title: string
    content: string
    section: 'STUDY' | 'QA' | 'LIFE' | 'NOTIFY' | 'HELP'
    author: { id: string }
    images: string[]
    likes: number
    views: number
  }[] = [
    {
      title: '考研数学复习时间表分享（附资料清单）',
      content:
        '去年上岸，整理了一份自己的复习节奏：\n\n3-6 月：基础阶段，过一遍教材 + 做课后题，重点是理解概念，不要急着刷题。\n7-9 月：强化阶段，刷 660/1000 题，错题本一定要建立。\n10-11 月：真题阶段，按套卷计时做，近 15 年真题至少两遍。\n12 月：模拟 + 回顾错题，保持手感。\n\n资料清单：张宇基础 30 讲、李永乐线代讲义、历年真题解析。需要的同学可以私信我，部分纸质资料还在。',
      section: 'STUDY',
      author: user2,
      images: [],
      likes: 24,
      views: 312,
    },
    {
      title: '图书馆四楼的自习室几点开门？',
      content: '最近想早起去占座，但是每次去都已经满了。有同学知道图书馆四楼几点开门吗？另外是不是周末时间不一样？',
      section: 'QA',
      author: user3,
      images: [],
      likes: 8,
      views: 156,
    },
    {
      title: '一食堂新开的砂锅窗口测评',
      content:
        '今天中午去试了一食堂二楼新开的砂锅窗口，分享一下：\n\n价格：12-16 元，算是比较划算\n份量：米饭可以免费续，男生也够吃\n口味：我点的麻辣牛肉，辣度适中，汤底不错\n排队：11:40 之后要排 10 分钟左右\n\n总体推荐，就是窗口只有一个，人多了有点慢。',
      section: 'LIFE',
      author: user1,
      images: [img('canteen'), img('canteen2')],
      likes: 31,
      views: 478,
    },
    {
      title: '【活动通知】本周六社团招新集市，欢迎来摆摊',
      content:
        '本周六上午 9:00-16:00，在中心广场有社团招新集市。\n\n目前已有 20+ 社团报名，包括：\n· 摄影社\n· 动漫社\n· 辩论队\n· 篮球队\n· 吉他社\n\n想加入社团的同学不要错过，现场可以直接报名。需要招募新成员的社团，请在周四前联系学生会办公室登记摊位。',
      section: 'NOTIFY',
      author: admin,
      images: [],
      likes: 15,
      views: 620,
    },
    {
      title: '急！求借一个充电宝，晚上还',
      content: '人在教学楼 A301，手机只剩 3% 了，撑不到回宿舍。有在附近同学能借个充电宝吗？晚上一定还，可以请喝奶茶。',
      section: 'HELP',
      author: user3,
      images: [],
      likes: 3,
      views: 88,
    },
    {
      title: '雅思口语怎么练才能不卡壳？',
      content:
        '准备明年申请出国，现在口语一开口就卡，主要是脑子里先想中文再翻译，速度完全跟不上。\n\n有没有同学考过雅思的？想问几个问题：\n1. 每天都练的话，多长时间的积累能看到明显提升？\n2. 用 ChatGPT 这种 AI 陪练有效果吗？\n3. 有没有推荐的素材或者话题库？\n\n先谢谢了。',
      section: 'STUDY',
      author: user1,
      images: [],
      likes: 12,
      views: 203,
    },
  ]

  const createdPosts: { id: string }[] = []
  for (const p of forumPostsData) {
    const post = await prisma.forumPost.create({
      data: {
        title: p.title,
        content: p.content,
        section: p.section,
        images: JSON.stringify(p.images),
        likes: p.likes,
        views: p.views,
        authorId: p.author.id,
      },
    })
    createdPosts.push(post)
  }

  // 示例评论（带回复）——挂在考研帖和一食堂帖下
  const kaoyanPost = createdPosts[0]
  const canteenPost = createdPosts[2]

  const c1 = await prisma.forumComment.create({
    data: {
      postId: kaoyanPost.id,
      authorId: user3.id,
      content: '资料清单太有用了！请问真题解析是哪一家的？',
    },
  })
  await prisma.forumComment.create({
    data: {
      postId: kaoyanPost.id,
      authorId: user2.id,
      parentId: c1.id,
      content: '我用的是李永乐的，够用了，重点是刷透不要贪多。',
    },
  })
  await prisma.forumComment.create({
    data: {
      postId: kaoyanPost.id,
      authorId: user1.id,
      content: '收藏了，明年就轮到我了，感谢学长！',
    },
  })

  const c2 = await prisma.forumComment.create({
    data: {
      postId: canteenPost.id,
      authorId: user2.id,
      content: '麻辣牛肉确实不错，比之前的窗口好吃多了。',
    },
  })
  await prisma.forumComment.create({
    data: {
      postId: canteenPost.id,
      authorId: user3.id,
      parentId: c2.id,
      content: '那我明天也去试试，谢谢推荐。',
    },
  })

  // 点赞记录（给考研帖补几条，保证 likes 与 ForumLike 一致的部分可见）
  await prisma.forumLike.createMany({
    data: [
      { userId: user1.id, postId: kaoyanPost.id },
      { userId: user3.id, postId: kaoyanPost.id },
      { userId: user2.id, postId: canteenPost.id },
    ],
  })

  console.log('✅ 种子数据注入完成')
  console.log('   管理员账号: 13800000000 / 验证码 123456')
  console.log('   测试账号:   13800000001 (小昭), 13800000002 (阿闲), 13800000003 (集集)')
  console.log(`   论坛帖子:   ${createdPosts.length} 篇`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
